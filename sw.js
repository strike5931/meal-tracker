// Service Worker - 離線快取
var CACHE = 'meal-tracker-v3';
var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/data.js',
  './js/storage.js',
  './js/render.js',
  './js/settings.js',
  './js/app.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      // 單檔失敗（例如尚未生成 icon PNG）不中斷整體安裝
      return Promise.all(ASSETS.map(function(url) {
        return cache.add(url).catch(function() { /* 忽略 */ });
      }));
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE; })
                            .map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  // cache-first，網路失敗時回退 cache
  e.respondWith(
    caches.match(req).then(function(cached) {
      if (cached) return cached;
      return fetch(req).then(function(res) {
        // 同源才進入 cache
        if (res && res.status === 200 && new URL(req.url).origin === location.origin) {
          var clone = res.clone();
          caches.open(CACHE).then(function(c) { c.put(req, clone); });
        }
        return res;
      }).catch(function() {
        // 網路失敗且無 cache：回 index 做 SPA fallback
        if (req.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
