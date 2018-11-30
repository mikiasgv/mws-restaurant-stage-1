const CACHE_NAME_STATIC = 'restaurant-app-stat-v15';
const CACHE_NAME_DYNAMIC = 'restaurant-app-dynamic-v15';
const cacheFiles = [
    '/',
    '/manifest.json',
    '/index.html',
    '/restaurant.html',
    'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css',
    '/css/styles.css',
    '/js/idb.js',
    'https://unpkg.com/leaflet@1.3.1/dist/leaflet.js',
    '/js/dbhelper.js',
    '/js/main.js',
    '/js/restaurant_info.js',
    '/data/restaurants.json',
    '/img/1.jpg',
    '/img/2.jpg',
    '/img/3.jpg',
    '/img/4.jpg',
    '/img/5.jpg',
    '/img/6.jpg',
    '/img/7.jpg',
    '/img/8.jpg',
    '/img/9.jpg',
    '/img/10.jpg',
    '/img/favicons/favicon-16x16.png',
    '/img/favicons/favicon-32x32.png',
    '/img/favicons/favicon-96x96.png',
    '/img/favicons/favicon-192.png',
    '/img/favicons/favicon-512.png'
  ];
//absssasas
self.addEventListener('install', function(event) {
    event.waitUntil(
      caches.open(CACHE_NAME_STATIC).then(function(cache) {
        return cache.addAll(cacheFiles);
      })
    );
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.filter(function(cacheName) {
            return cacheName.startsWith('restaurant-app-') &&
                   cacheName != CACHE_NAME_STATIC && cacheName != CACHE_NAME_DYNAMIC;
          }).map(function(cacheName) {
            return caches.delete(cacheName);
          })
        );
      })
    );
});

/**
 * The below code is taken from the site "Service Workers: an Introduction, By Matt Gaunt"
 * It was listed as "Additional Resources" on UDACITY
 * URL: https://developers.google.com/web/fundamentals/primers/service-workers/
 */
self.addEventListener('fetch', function(event) {
    //console.log(event.request);
    event.respondWith(
      caches.match(event.request)
        .then(function(response) {
          // Cache hit - return response
          if (response) {
            return response;
          }
  
          // IMPORTANT: Clone the request. A request is a stream and
          // can only be consumed once. Since we are consuming this
          // once by cache and once by the browser for fetch, we need
          // to clone the response.
          var fetchRequest = event.request.clone();
  
          return fetch(fetchRequest)
            .then(function(response) {
              // Check if we received a valid response
              if(!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
  
              var responseToCache = response.clone();
  
              caches.open(CACHE_NAME_DYNAMIC)
                .then(function(cache) {
                  cache.put(event.request, responseToCache);
                });
  
              return response;
            }).catch(function(err){
                console.log(err);
            });
        })
      );
  });

  self.addEventListener('message', function(event){
    if(event.data.action == 'skipWaiting'){
        self.skipWaiting();
    }
  });