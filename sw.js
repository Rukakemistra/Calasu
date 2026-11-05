/* C.L.S — file nhớ sẵn.
 * Giữ sẵn một bản trang web và các thư viện để mở app gần như tức thì, mạng yếu vẫn mở được.
 * Dữ liệu (Apps Script, Spotify, Gemini, ảnh trên Drive) KHÔNG đi qua đây: luôn lấy thẳng từ mạng.
 * Mỗi lần mở app, bản mới nhất trên GitHub được tải ngầm để dùng cho lần mở sau;
 * trang web sẽ hiện dòng "Có bản mới" nếu muốn dùng ngay.
 */
const PAGE_CACHE = 'cls-trang';
const LIB_CACHE = 'cls-thu-vien-v1';
const LIB_HOSTS = ['cdnjs.cloudflare.com', 'unpkg.com', 'cdn.tailwindcss.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', () => { self.skipWaiting(); });

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = [PAGE_CACHE, LIB_CACHE];
    for (const name of await caches.keys()) {
      if (!keep.includes(name)) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Trang web của app (mở từ biểu tượng hoặc gõ địa chỉ)
  if (req.mode === 'navigate' && url.origin === self.location.origin && url.href.startsWith(self.registration.scope)) {
    event.respondWith(trangWeb(event));
    return;
  }
  // Thư viện dựng giao diện (React, biểu đồ, biểu tượng, Tailwind, phông chữ)
  if (LIB_HOSTS.includes(url.hostname)) {
    event.respondWith(thuVien(event));
    return;
  }
  // Còn lại (dữ liệu, ảnh, Apps Script...): để trình duyệt tự lấy từ mạng như bình thường.
});

async function trangWeb(event) {
  const key = self.registration.scope;
  const cache = await caches.open(PAGE_CACHE);
  const cached = await cache.match(key);
  const fromNetwork = fetch(event.request).then((res) => {
    if (res && res.ok && res.type === 'basic') cache.put(key, res.clone());
    return res;
  });
  if (cached) {
    event.waitUntil(fromNetwork.catch(() => {}));
    return cached;
  }
  try {
    return await fromNetwork;
  } catch (err) {
    return Response.error();
  }
}

async function thuVien(event) {
  const cache = await caches.open(LIB_CACHE);
  const cached = await cache.match(event.request);
  const fromNetwork = fetch(event.request).then((res) => {
    if (res && (res.ok || res.type === 'opaque')) cache.put(event.request, res.clone());
    return res;
  });
  if (cached) {
    event.waitUntil(fromNetwork.catch(() => {}));
    return cached;
  }
  return fromNetwork;
}
