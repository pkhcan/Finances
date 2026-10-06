// Keeps the app's own files on your device so it opens instantly and works offline.
// Your financial data is never cached here — it always comes from Supabase.
// When you change any app file, bump this version so phones pick up the update.
const CACHE = 'finances-v1';
const APP_FILES = [
  './', './index.html', './config.js', './supabase.js', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) return; // data: always live

  if (url.origin === location.origin){
    // app files: try the network first so updates show up, fall back to the saved copy offline
    event.respondWith(
      fetch(req).then(res => {
        if (res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
  } else if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com')){
    // fonts: saved copy first
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
      }))
    );
  }
});
