// Keeps Scorecard working offline. Bump CACHE when the files change.
const CACHE = 'scorecard-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './apple-touch-icon.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Serve from the cache right away, and refresh the cache in the background.
const fromCache = (e, key) => caches.open(CACHE).then(async c => {
  const hit = await c.match(key);
  const net = fetch(e.request).then(res => {
    if (res && (res.ok || res.type === 'opaque')) c.put(key, res.clone());
    return res;
  }).catch(() => null);
  e.waitUntil(net);
  return hit || (await net) || new Response('Scorecard is offline.', {status: 503});
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate' && url.origin === location.origin) e.respondWith(fromCache(e, './index.html'));
  else if (url.origin === location.origin || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') e.respondWith(fromCache(e, req));
});
