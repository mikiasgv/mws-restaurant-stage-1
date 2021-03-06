/**
 * Common database helper functions.
 */

class DBHelper {

  constructor(path){
    this.path = path;
  }

  static openDatabase(){
    // If the browser doesn't support service worker,
    // we don't care about having a database
    if (!navigator.serviceWorker) {
      return Promise.resolve();
    }
  
    return idb.open('mws-restaurant', 2, upgradeDb => {
      switch(upgradeDb.oldVersion) {
        case 0:
          upgradeDb.createObjectStore('restaurants', {keyPath: 'id'});
        case 1:
          upgradeDb.createObjectStore('reviews', { keyPath: 'id' }); 
        case 2:
          upgradeDb.createObjectStore('offline-reviews', { keyPath: 'id' });
        case 3:
          upgradeDb.createObjectStore('offline-favorites', { keyPath: 'id' });    
      }
    });
  }

  /**
 * Register the serviceworker and so...
 */
static registerServiceWorker(){
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(function(registration) {
      
      if (!navigator.serviceWorker.controller) {
        return;
      }
  
      if (registration.waiting) {
        DBHelper.updateReady(registration.waiting);
        return;
      }
  
      if (registration.installing) {
        DBHelper.trackInstalling(reg.installing);
        return;
      }
  
      registration.addEventListener('updatefound', function() {
        DBHelper.trackInstalling(registration.installing);
      });

      // Ensure refresh is only called once.
      // This works around a bug in "force update on reload".
      var refreshing;
      navigator.serviceWorker.addEventListener('controllerchange', function() {
        if (refreshing) return;
        window.location.reload();
        refreshing = true;
      });

      // Registration was successful
      console.log('ServiceWorker registration successful with scope: ', registration.scope);

    }, function(err) {
      // registration failed :(
      console.log('ServiceWorker registration failed: ', err);
    });
  }
}

static trackInstalling(worker){
  worker.addEventListener('statechange', function() {
    if (worker.state == 'installed') {
      DBHelper.updateReady(worker);
    }
  });
};

static updateReady(worker){
  worker.postMessage({action: 'skipWaiting'});
}

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/${DBHelper.path}`;
  }

  /**
   * Notify the user the connection status
   */
  static notificationDispature(message) {
    const event = new CustomEvent('customnotification', { detail: message });
    window.dispatchEvent(event);
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants() {
    DBHelper.path = 'restaurants';
    return new Promise(resolve => {
      fetch(DBHelper.DATABASE_URL)
      .then(response => response.json())
      .then(restaurants => {
        let indicator = 0;//Useful to show if the data is saved offline or online 1 0
        DBHelper.saveDataToIDB('restaurants', restaurants, indicator);
        resolve(restaurants);
      })
      .catch(err => {
        console.error(err);
        console.log('from cache');
        resolve(DBHelper.readDataFromIDB('restaurants'));
      });
    });
  }

  /**
   * Fetch all reviews.
   */
  static fetchReviews(id) {
    DBHelper.path = `reviews/?restaurant_id=${id}`;
    return new Promise(resolve => {
      fetch(DBHelper.DATABASE_URL)
      .then(response => response.json())
      .then(reviews => {
        let indicator = 0;//Useful to show if the data is saved offline or online 1 0
        DBHelper.saveDataToIDB('reviews', reviews, indicator);
        resolve(reviews);
      })
      .catch(err => {
        console.error(err);
        console.log('from cache');
        DBHelper.readDataFromIDB('reviews')
        .then((arrayOfReviews) =>  {
          if(arrayOfReviews) {
            resolve(arrayOfReviews.filter(r => r.restaurant_id == id));
          }
        });
      });
    });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id) {
    // fetch all restaurants with proper error handling.
    return new Promise((resolve, reject) => {
      DBHelper.fetchRestaurants()
      .then(restaurants => {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          resolve(restaurant);
        } else { // Restaurant does not exist in the database
          reject('Restaurant does not exist');
        }
      })
      .catch(err => reject(err));
    });
  }

  /**
   * Fetch a review by restaurant ID.
   */
  static fetchReviewsByRestaurantId(id) {
    // fetch all reviews with proper error handling.
    return new Promise((resolve, reject) => {
      DBHelper.fetchReviews(id)
      .then(reviews => {
        if (reviews) { // Got the review
          resolve(reviews);
        } else { // Review does not exist for the restaurant at hand
          reject('No review(s) for this restaurant');
        }
      })
      .catch(err => reject(err));
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine) {
    // Fetch all restaurants  with proper error handling
    return new Promise((resolve, reject) => {
      DBHelper.fetchRestaurants()
      .then((restaurants) => resolve(restaurants.filter(r => r.cuisine_type == cuisine)))
      .catch(err => reject(err));
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood) {
    // Fetch all restaurants
    return new Promise((resolve, reject) => {
      DBHelper.fetchRestaurants()
      .then((restaurants) => resolve(restaurants.filter(r => r.neighborhood == neighborhood)))
      .catch(err => reject(err));
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood) {
    // Fetch all restaurants
    return new Promise((resolve, reject) => {
      DBHelper.fetchRestaurants()
      .then(restaurants => {
        let results = restaurants;
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        resolve(results);
      })
      .catch(err => reject(err));
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods() {
    // Fetch all restaurants
    return new Promise((resolve, reject) => {
      DBHelper.fetchRestaurants()
      .then((restaurants) => {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
        // Remove duplicates from neighborhoods
        resolve(neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i));
      })
      .catch(err => reject(err));
    });
    
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines() {
    // Fetch all restaurants
    return new Promise((resolve, reject) => {
      DBHelper.fetchRestaurants()
      .then((restaurants) => {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        resolve(cuisines.filter((v, i) => cuisines.indexOf(v) == i));
      })
      .catch(err => reject(err));
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.id}`);
  }

  static imageAltForRestaurant(restaurant) {
    return (`Descriptive image of ${restaurant.name} restaurant`);
  }

  /**
   * Map marker for a restaurant.
   */
   static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
      })
      marker.addTo(newMap);
    return marker;
  } 

  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

  //https://stackoverflow.com/questions/18884249/checking-whether-something-is-iterable
  /**
   * 
   * check if the object is iterable or not
   */
  static isIterable(obj) {
    // checks for null and undefined
    if (obj == null) {
      return false;
    }
    return typeof obj[Symbol.iterator] === 'function';
  }

  /**
   * Save data to the api server while the app is online
   * then after a successful save it will sve the review
   * to indexed review db
   */
  static saveReviewToDatabase(url, data, store) {
    return new Promise(function(resolve, reject){
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      .then(response => response.json())
      .then(function (review) {
        let indicator = 0;//Useful to show if the data is saved offline or online 1 0
        resolve(DBHelper.saveDataToIDB(store, review, indicator));
      })
      .catch(function (error) {
        reject(error)
      });
    });
    
  }

  /**
   * Save any data forwarded to indexdb with a given store name
   */
  static saveDataToIDB(storeName, items, indicator) {
    return new Promise((resolve, reject) => {
      DBHelper.openDatabase()
      .then(db => {
        if (!db) return;

        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);

        //check if the item(s) is iterable
        if(DBHelper.isIterable(items)) {
          items.forEach(item => store.put(item));
        } else {
          store.put(items);
        }

        if(indicator) {
          DBHelper.notificationDispature("The data is saved to the browser cache, it will be posted to the server when the app is online...");
        }

        return tx.complete;
      })
      .then(() => resolve(items))
      .catch(err => reject(err));
    });
      
  }

  /**
   * 
   * Read data from indexeddb with a given store name
   */
  static readDataFromIDB(storeName) {
    return new Promise((resolve, reject) => {
      DBHelper.openDatabase()
      .then((db ) => {
        if (!db) return;

        var tx = db.transaction(storeName, 'readonly');
        var store = tx.objectStore(storeName);

        resolve(store.getAll());
      })
      .catch(err => reject(err));
    });
  }

  /**
   * 
   * Remove all the data from indexeddb with a given store name
   */
  static clearAllDataFromIDB(storeNames) {
    return DBHelper.openDatabase()
          .then((db ) => {
            if (!db) return;

            var tx = db.transaction(storeNames, 'readwrite');
            var store = tx.objectStore(storeNames);
            store.clear();
            return tx.complete;
          });
  }

  /**
   * 
   * Mark a selected restaurant a a vavorite or otherwise
   */
  static markARestaurantAsToggle(restaurant, storeName, isFav) {
    //let isFav = restaurant.is_favorite == "true" ? "false" : "true";
    let url = `http://localhost:1337/restaurants/${restaurant.id}/?is_favorite=${isFav}`;
    return new Promise(function(resolve, reject){
      fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(restaurant)
      })
      .then(response => response.json())
      .then(function (favorited) {
        let indicator = 0;//Useful to show if the data is saved offline or online 1 0
        resolve(DBHelper.saveDataToIDB(storeName, favorited, indicator));
      })
      .catch(function (error) {
        reject(error)
      });
    });
    
  }

  //offlin online indicator
  static checkNetworkStatus() {
    return new Promise((resolve) => {
      if (navigator.onLine) {
        //Check if the server is up and running
        fetch('http://localhost:1337/restaurants/?limit=1')
        .then((resp) => {
          if(resp.ok) {
            resolve(true);
          }
          resolve(false);
        })
        .catch(() => resolve(false)); 
      } else {
        resolve(false);
      }
    });
  } 

  static handleConnectionChange() {
    return new Promise((resolve) => {
      DBHelper.checkNetworkStatus()
      .then((status) => {
        if(status){
          console.log("You are online.");
          DBHelper.notificationDispature("You are online.");
          //Read all reviwes from offline store if there are any and post them to the server
          DBHelper.readDataFromIDB('offline-reviews')
          .then(function(offlineReviews){
            if (typeof offlineReviews !== 'undefined' && offlineReviews.length > 0) {
              // the array is defined and has at least one element
              let allReviews = [];
              offlineReviews.forEach(review => {
                review.id = "";
                allReviews.push(DBHelper.saveReviewToDatabase('http://localhost:1337/reviews/', review, 'reviews'));
              });
              
              Promise.all(allReviews)
              .then(function(fulfiledReviews){
                if(fulfiledReviews) {
                  DBHelper.clearAllDataFromIDB('offline-reviews')
                  .then(() => {
                    if(fulfiledReviews) {
                      DBHelper.notificationDispature("All the reviews saved offline are now posted to the server");
                      resolve(fulfiledReviews)
                    }
                  })
                  .catch(() => resolve(false));
                }
              })
              .catch(() => resolve(false));
            }
          })
          .catch(() => resolve(false));
          
        } else {
          console.log("You lost connection.");
          DBHelper.notificationDispature("You lost connection.");
          DBHelper.readDataFromIDB('offline-reviews')
          .then(function(offlineReviews){
            if (typeof offlineReviews !== 'undefined' && offlineReviews.length > 0) {
              // the array is defined and has at least one element
              console.log("Getting reviews from offline store while offline");
              DBHelper.notificationDispature("The app is offline, accessing data from the browser cache.");
              resolve(offlineReviews);
            }
          })
          .catch(() => {
            DBHelper.notificationDispature("You lost connection.");
            resolve(false)
          });
        }
      });
    });
    
  }

  static handleOfflineFavorites() {
    return new Promise((resolve) => {
      DBHelper.checkNetworkStatus()
      .then((status) => {
        if(status){
          console.log("You are now back online.");
          DBHelper.notificationDispature("You are online.");
          //Read all reviwes from offline store
          DBHelper.readDataFromIDB('offline-favorites')
          .then(function(offlineFavorites){
            if (typeof offlineFavorites !== 'undefined' && offlineFavorites.length > 0) {
              // the array is defined and has at least one element
              let allFavorites = [];
              offlineFavorites.forEach(favorite => {
                allFavorites.push(DBHelper.markARestaurantAsToggle(favorite, 'restaurants', favorite.is_favorite));
              });
              
              Promise.all(allFavorites)
              .then(function(updatedFavorites){
                console.log('Offline favorites has now saved to the DB');
                if(updatedFavorites) {
                  DBHelper.clearAllDataFromIDB('offline-favorites')
                  .then(() => {
                    DBHelper.notificationDispature("All the restaurants favored offline are now posted to the server!");
                    resolve(updatedFavorites)
                  })
                  .catch(() => resolve(false));
                }
              })
              .catch(() => resolve(false));
            }
          })
          .catch(() => resolve(false));
        } else {
          console.log("You lost connection.");
          DBHelper.notificationDispature("You lost connection.");
          DBHelper.readDataFromIDB('offline-favorites')
          .then((offlineFavorites) => {
            if (typeof offlineFavorites !== 'undefined' && offlineFavorites.length > 0) {
              // the array is defined and has at least one element
              console.log("Getting favorites from offline store while offline");
              DBHelper.notificationDispature("The app is offline, accessing data from the browser cache.");
              resolve(offlineFavorites);
            }
          })
          .catch(() => resolve(false));
        }
      });
    });
    
  }

}

