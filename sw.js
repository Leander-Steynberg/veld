// Veld offline service worker. Raise VERSION with every new build.
const VERSION = 'veld-pwa-1';
const CORE = ['./', './index.html', './manifest.json', './icon-180.png', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
function timeout(ms){ return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)); }
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // The app page: newest copy when there is signal (3 s limit), stored copy when there is not.
  if (req.mode === 'navigate' || (url.origin === location.origin && url.pathname.endsWith('/index.html'))) {
    e.respondWith(
      Promise.race([fetch(req, {cache: 'no-store'}), timeout(3000)])
        .then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }
  // Fonts and icons: stored copy first, fetched once and kept.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || url.origin === location.origin) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res;
    }).catch(() => hit)));
  }
});
