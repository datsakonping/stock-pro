// Baht Book: ทำให้เปิดโปรแกรมได้แม้ไม่มีเน็ต
// หน้าโปรแกรม: ใช้ไฟล์ใหม่ล่าสุดเมื่อมีเน็ต ถ้าเน็ตไม่มีหรือช้าให้ใช้ไฟล์ที่เก็บไว้
// ไม่เก็บข้อมูลซิงก์หรือข้อความถึงผู้ช่วย เพราะคำขอเหล่านั้นไปที่ Worker โดยตรง
const CACHE = 'baht-book-v1';
const FONT_CACHE = 'baht-book-fonts-v1';
const PAGE = './';
const NETWORK_WAIT = 3500;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll([PAGE, './manifest.webmanifest'])).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function page(request) {
  const cache = await caches.open(CACHE);
  const network = fetch(request).then(res => {
    if (res.ok) cache.put(PAGE, res.clone());
    return res;
  });
  const cached = await cache.match(PAGE);
  if (!cached) return network;
  const slow = new Promise(resolve => setTimeout(() => resolve(null), NETWORK_WAIT));
  try {
    return (await Promise.race([network, slow])) || cached;
  } catch {
    return cached;
  }
}

async function font(request) {
  const cache = await caches.open(FONT_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok || res.type === 'opaque') cache.put(request, res.clone());
  return res;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (request.mode === 'navigate' && url.origin === location.origin) event.respondWith(page(request));
  else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') event.respondWith(font(request));
  else if (url.origin === location.origin) event.respondWith(caches.match(request, { ignoreSearch: true }).then(r => r || fetch(request)));
});
