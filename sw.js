const CACHE_VERSION = 'ct-v2-20261014-1';
const CACHE_NAME = 'ct-cache-' + CACHE_VERSION;
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './core.js',
  './fix.js',
  './fix2.js',
  './fix3.js',
  './icon.svg',
  './manifest.json',
  './tonconnect-manifest.json'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(ASSETS).catch(function(){ return Promise.resolve(); });
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(key){
        return key.indexOf('ct-cache-') === 0 && key !== CACHE_NAME;
      }).map(function(key){
        return caches.delete(key);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event) {
  var request = event.request;
  if (!request || request.method !== 'GET') return;

  var url = new URL(request.url);
  var isSameOrigin = url.origin === self.location.origin;
  var isHtmlRequest = request.mode === 'navigate' || /\.(html|htm)$/.test(url.pathname);

  if (!isSameOrigin && !(request.destination === 'style' || request.destination === 'script' || request.destination === 'font')) {
    return;
  }

  event.respondWith(
    caches.match(request).then(function(cached){
      if (cached) {
        return cached;
      }

      return fetch(request).then(function(response){
        if (response && response.ok && isSameOrigin) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache){
            cache.put(request, copy);
          }).catch(function(){});
        }
        return response;
      }).catch(function(){
        if (isHtmlRequest) {
          return caches.match('./index.html') || caches.match('./') || Response.redirect('./index.html');
        }
        return caches.match(request) || Response.error();
      });
    })
  );
});
