const CACHE_NAME = 'baremos-v5.8.44';
const LOCAL_ASSETS = [
  './', 
  './index.html', 
  './styles.css?v=5.8.44', 
  './app.js?v=5.8.44', 
  './db.js?v=5.8.44',
  './baremo.json', 
  './manifest.json?v=5.8.44', 
  './version.json', 
  './VERSION',
  './icons/icon-192.png?v=5.8.44', 
  './icons/icon-512.png?v=5.8.44',
  './maps/trujui.png', './maps/cuartelv.png', './maps/moreno.png',
  './maps/gralrodriguez.png', './maps/tigre.png', './maps/sanmartin.png',
  './maps/olivos.png', './maps/pilarescobar.png'
];
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.6.0/dist/jspdf.plugin.autotable.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(async cache => {
    for (const url of LOCAL_ASSETS) {
      try { await cache.add(url); } catch (err) { console.warn('[SW]', url); }
    }
    for (const url of CDN_ASSETS) {
      try { const r = await fetch(url); if (r.ok) await cache.put(url, r); } catch (err) {}
    }
  }));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(r => {
      const c = r.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request.url, c));
      return r;
    }).catch(() => caches.match('./index.html') || caches.match('./')));
    return;
  }
  
  // ESTRATEGIA ESTRICTA: NUNCA CACHEAR LOS ARCHIVOS DE VERSIÓN
  if (url.pathname.endsWith('version.json') || url.pathname.endsWith('VERSION')) {
     event.respondWith(fetch(event.request, { cache: 'no-store' }));
     return;
  }
  
  event.respondWith(caches.match(event.request).then(cached => {
    if (cached) return cached;
    return fetch(event.request).then(r => {
      if (r.ok && url.origin === location.origin) {
        const c = r.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, c));
      }
      return r;
    }).catch(err => {
      console.warn('[SW] Fetch failed', err);
      throw err;
    });
  }));
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});