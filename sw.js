var CACHE_NAME = 'restaurant-app-v1';
const cacheFiles = [
    '/',
    '/index.html',
    '/restaurant.html',
    '/css/styles.css',
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
    '/img/1-420px.jpg',
    '/img/1-600px.jpg',
    '/img/1-800px.jpg',
    '/img/2-420px.jpg',
    '/img/2-600px.jpg',
    '/img/2-800px.jpg',
    '/img/3-420px.jpg',
    '/img/3-600px.jpg',
    '/img/3-800px.jpg',
    '/img/4-420px.jpg',
    '/img/4-600px.jpg',
    '/img/4-800px.jpg',
    '/img/5-420px.jpg',
    '/img/5-600px.jpg',
    '/img/5-800px.jpg',
    '/img/6-420px.jpg',
    '/img/6-600px.jpg',
    '/img/6-800px.jpg',
    '/img/7-420px.jpg',
    '/img/7-600px.jpg',
    '/img/7-800px.jpg',
    '/img/8-420px.jpg',
    '/img/8-600px.jpg',
    '/img/8-800px.jpg',
    '/img/9-420px.jpg',
    '/img/9-600px.jpg',
    '/img/9-800px.jpg',
    '/img/10-420px.jpg',
    '/img/10-600px.jpg',
    '/img/10-800px.jpg',
    '/img/favicons/favicon-16x16.png',
    '/img/favicons/favicon-32x32.png',
    '/img/favicons/favicon-96x96.png'
  ];

self.addEventListener('install', function(event) {
    event.waitUntil(
      caches.open(CACHE_NAME).then(function(cache) {
        return cache.addAll(cacheFiles);
      })
    );
});

self.addEventListener('fetch', function(event) {
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
  
          return fetch(fetchRequest).then(
            function(response) {
              // Check if we received a valid response
              if(!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
  
              // IMPORTANT: Clone the response. A response is a stream
              // and because we want the browser to consume the response
              // as well as the cache consuming the response, we need
              // to clone it so we have two streams.
              var responseToCache = response.clone();
  
              caches.open(CACHE_NAME)
                .then(function(cache) {
                  cache.put(event.request, responseToCache);
                });
  
              return response;
            }
          );
        })
      );
  });