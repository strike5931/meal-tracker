// Service Worker - 離線快取
var CACHE = 'meal-tracker-v6';
var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/data.js',
  './js/storage.js',
  './js/timing.js',
  './js/stats.js',
  './js/render.js',
  './js/statsui.js',
  './js/settings.js',
  './js/app.js',
  './js/vendor/chart.umd.min.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return Promise.all(ASSETS.map(function(url) {
        return cache.add(url).catch(function() {});
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
  e.respondWith(
    caches.match(req).then(function(cached) {
      if (cached) return cached;
      return fetch(req).then(function(res) {
        if (res && res.status === 200 && new URL(req.url).origin === location.origin) {
          var clone = res.clone();
          caches.open(CACHE).then(function(c) { c.put(req, clone); });
        }
        return res;
      }).catch(function() {
        if (req.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
