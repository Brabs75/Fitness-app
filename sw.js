/* Offline support: the page comes from the network when it answers quickly, otherwise from the cache. */
const CACHE = 'programme-v3';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './apple-touch-icon.png',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
const withTimeout = (p, ms) => new Promise((ok, ko) => {
  const t = setTimeout(() => ko(new Error('timeout')), ms);
  p.then(v => { clearTimeout(t); ok(v); }, e => { clearTimeout(t); ko(e); });
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(withTimeout(fetch(req), 3000).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
      return res;
    }).catch(() => caches.match('./index.html').then(m => m || fetch(req))));
    return;
  }
  e.respondWith(caches.match(req).then(m => m || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
