// Simple obscurity gate. NOT real security — the audio folder name is the real barrier.
// Change PASSWORD below (and re-deploy) whenever you want.
const PASSWORD = "flowertones";

const $ = s => document.querySelector(s);
const audio = $('#audio');
let SETS = [];
let cur = { set: null, idx: -1 };

function fmt(s){ s=Math.max(0,Math.floor(s||0)); const m=Math.floor(s/60), ss=String(s%60).padStart(2,'0'); return `${m}:${ss}`; }
function trackUrl(set, t){ if(!t) return null; if(t.divider) return null; return t.src ? t.src : (t.file ? (set.dir + '/' + t.file) : null); }

// ---------- gate ----------
function unlock(){ $('#gate').classList.add('hidden'); $('#app').classList.remove('hidden'); boot(); }
$('#pwbtn').onclick = tryPw;
$('#pw').addEventListener('keydown', e => { if(e.key==='Enter') tryPw(); });
function tryPw(){ if($('#pw').value === PASSWORD){ localStorage.setItem('ok','1'); unlock(); } else { $('#pwerr').textContent = 'Nope, try again'; } }
if(localStorage.getItem('ok')==='1'){ unlock(); }

// ---------- data ----------
async function boot(){
  try{ SETS = await (await fetch('sets.json?v='+Date.now())).json(); }
  catch(e){ $('#view').innerHTML = '<p>Could not load sets.</p>'; return; }
  renderHome();
}

function countPlayable(s){ return s.tracks.filter(t=>trackUrl(s,t)).length; }
function countSongs(s){ return s.tracks.filter(t=>!t.divider).length; }

function renderHome(){
  let h = `<h1>Setlists</h1><div class="sub">${SETS.length} set${SETS.length!==1?'s':''} · tap one to open</div>`;
  SETS.forEach(s=>{
    const songs=countSongs(s), play=countPlayable(s);
    const extra = play<songs ? ` · ${play}/${songs} with audio` : '';
    h += `<div class="card" data-set="${s.id}"><div class="thumb">🎵</div>
      <div><div class="t">${s.name}</div><div class="m">${s.artist} · ${songs} songs${extra}</div></div></div>`;
  });
  $('#view').innerHTML = h;
  document.querySelectorAll('[data-set]').forEach(el=> el.onclick = ()=> renderSet(SETS.find(s=>s.id===el.dataset.set)));
}

function renderSet(s){
  localStorage.setItem('lastSet', s.id);
  let h = `<button class="back" id="back">‹ All sets</button>
    <h1>${s.name}</h1><div class="sub">${s.artist} · ${countSongs(s)} songs</div>
    <span class="pill" id="playall">▶ Play all</span><span class="pill" id="shuffle">🔀 Shuffle</span>`;
  let num=0;
  s.tracks.forEach((t,i)=>{
    if(t.divider){ h += `<div class="divider">${t.divider}</div>`; return; }
    num++;
    const playable = !!trackUrl(s,t);
    const note = t.note ? `<span class="note">${t.note}</span>` : '';
    const right = playable ? `<span class="d">${fmt(t.dur)}</span>` : `<span class="d pending">no audio yet</span>`;
    h += `<div class="row ${playable?'':'noaudio'}" data-i="${i}">
      <span class="n">${num}</span>
      <span class="ti">${t.title}${note}</span>${right}</div>`;
  });
  $('#view').innerHTML = h;
  $('#back').onclick = renderHome;
  const firstPlayable = s.tracks.findIndex(t=>trackUrl(s,t));
  $('#playall').onclick = ()=>{ if(firstPlayable>=0) play(s, firstPlayable); };
  $('#shuffle').onclick = ()=>{ const idxs=s.tracks.map((t,i)=>trackUrl(s,t)?i:-1).filter(i=>i>=0); if(idxs.length) play(s, idxs[Math.floor(Math.random()*idxs.length)]); };
  document.querySelectorAll('[data-i]').forEach(el=> el.onclick = ()=> play(s, +el.dataset.i));
  markPlaying();
}

function markPlaying(){
  document.querySelectorAll('.row').forEach(el=>{
    el.classList.toggle('playing', !!(cur.set && isCurrentView() && +el.dataset.i===cur.idx));
  });
}
function isCurrentView(){ return !!$('#back'); }

// ---------- player ----------
function play(set, idx){
  const t = set.tracks[idx]; const url = trackUrl(set, t);
  if(!url) return;
  cur.set = set; cur.idx = idx;
  audio.src = url; audio.play().catch(()=>{});
  $('#bar').classList.remove('hidden');
  $('#npTitle').textContent = t.title;
  $('#npSet').textContent = set.name + ' · ' + set.artist;
  setMedia(set, t); markPlaying();
}
function next(){ if(!cur.set) return; for(let i=cur.idx+1;i<cur.set.tracks.length;i++){ if(trackUrl(cur.set,cur.set.tracks[i])){ play(cur.set,i); return; } } }
function prev(){
  if(!cur.set) return;
  if(audio.currentTime > 3){ audio.currentTime = 0; return; }
  for(let i=cur.idx-1;i>=0;i--){ if(trackUrl(cur.set,cur.set.tracks[i])){ play(cur.set,i); return; } }
}
$('#toggle').onclick = ()=>{ if(audio.paused) audio.play(); else audio.pause(); };
$('#next').onclick = next; $('#prev').onclick = prev;
audio.addEventListener('play', ()=>{ $('#toggle').textContent='⏸'; if('mediaSession'in navigator) navigator.mediaSession.playbackState='playing'; });
audio.addEventListener('pause',()=>{ $('#toggle').textContent='▶'; if('mediaSession'in navigator) navigator.mediaSession.playbackState='paused'; });
audio.addEventListener('ended', next);
audio.addEventListener('timeupdate', ()=>{
  $('#cur').textContent = fmt(audio.currentTime);
  if(audio.duration){ $('#seek').value = (audio.currentTime/audio.duration)*1000; $('#dur').textContent = fmt(audio.duration); }
});
$('#seek').addEventListener('input', e=>{ if(audio.duration) audio.currentTime = (e.target.value/1000)*audio.duration; });

// ---------- volume ----------
const volEl = $('#volume'), muteEl = $('#mute');
let lastVol = parseFloat(localStorage.getItem('vol')); if(isNaN(lastVol)) lastVol = 1;
audio.volume = lastVol; volEl.value = Math.round(lastVol*100);
function volIcon(){ muteEl.textContent = (audio.muted || audio.volume===0) ? '🔇' : (audio.volume < 0.5 ? '🔉' : '🔊'); }
volEl.addEventListener('input', e=>{ const v=e.target.value/100; audio.volume=v; audio.muted=false; if(v>0) lastVol=v; localStorage.setItem('vol',v); volIcon(); });
muteEl.onclick = ()=>{ if(audio.muted||audio.volume===0){ audio.muted=false; audio.volume=lastVol||1; volEl.value=Math.round(audio.volume*100);} else { audio.muted=true; volEl.value=0; } volIcon(); };
volIcon();

// ---------- Media Session ----------
function setMedia(set, t){
  if(!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: set.artist, album: set.name,
    artwork: [{src:'icon-192.png',sizes:'192x192',type:'image/png'},{src:'icon-512.png',sizes:'512x512',type:'image/png'}] });
  navigator.mediaSession.setActionHandler('play', ()=>audio.play());
  navigator.mediaSession.setActionHandler('pause', ()=>audio.pause());
  navigator.mediaSession.setActionHandler('previoustrack', prev);
  navigator.mediaSession.setActionHandler('nexttrack', next);
  navigator.mediaSession.setActionHandler('seekto', d=>{ if(d.seekTime!=null) audio.currentTime=d.seekTime; });
}

if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
