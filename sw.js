// App-shell cache only (keeps the app installable + loads offline).
// Audio is streamed, not pre-cached, to avoid filling phone storage.
const CACHE = 'setlists-v1';
const SHELL = ['.', 'index.html', 'app.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())); });
self.addEventListener('activate', e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch', e=>{
  const url = new URL(e.request.url);
  if(url.pathname.includes('/audio/') || e.request.headers.get('range')) return; // let audio stream normally
  e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request)));
});
