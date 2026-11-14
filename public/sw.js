/*
 * Çevrimdışı destek: ziyaret edilen sayfaların kodu, verisi ve fontları önbelleğe alınır;
 * tekrar girişte internet gerekmez. Strateji:
 *  - Sayfa (HTML) istekleri: önce ağ, ağ yoksa önbellek (güncel sürüm öncelikli)
 *  - /assets, /data ve Google Fonts: önce önbellek (dosya adları içerik özetli, değişmez)
 * Sürüm değişince eski önbellek silinir.
 */
const CACHE = 'miras-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const fonts = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !fonts) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(req, c)); return r; })
      .catch(() => caches.match(req).then((r) => r || caches.match('/'))));
    return;
  }
  if (fonts || url.pathname.startsWith('/assets/') || url.pathname.startsWith('/data/') || url.pathname.startsWith('/3d/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {
      if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(CACHE).then((x) => x.put(req, c)); }
      return r;
    })));
  }
});
