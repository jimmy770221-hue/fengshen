/* 封神 Service Worker：只管「雜湊檔名的圖片」。
   - 圖檔檔名含內容雜湊（xxx.3f2a1b9c.webp），內容不變檔名就不變，所以可以放心「有快取就直接用」
   - 頁面載入後在背景把清單裡所有圖存進裝置，之後離線、換頁都不必再下載
   - 清單更新時，不在新清單裡的舊圖會自動清掉
   - HTML、程式、資料檔不經過這裡（永遠抓最新），改程式不會被舊快取卡住 */
const CACHE = 'fengshen-assets';
const HASHED = /\/assets\/.+\.[0-9a-f]{8}\.webp(\?.*)?$/;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !HASHED.test(e.request.url)) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request);
    if (hit) return hit;
    const res = await fetch(e.request);
    if (res.ok) c.put(e.request, res.clone());
    return res;
  }));
});
self.addEventListener('message', e => {
  if (!e.data || e.data.type !== 'precache') return;
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    const keep = new Set(e.data.urls.map(u => new URL(u, self.registration.scope).href));
    for (const req of await c.keys()) if (!keep.has(req.url)) await c.delete(req);
    for (const url of keep) if (!(await c.match(url))) { try { await c.add(url); } catch (_) {} }
  })());
});
