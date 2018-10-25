/**
 * Common database helper functions.
 */

class DBHelper {

  static openDatabase(){
    // If the browser doesn't support service worker,
    // we don't care about having a database
    if (!navigator.serviceWorker) {
      return Promise.resolve();
    }
  
    return idb.open('mws-restaurant', 1, upgradeDb => {
      upgradeDb.createObjectStore('restaurants', {keyPath: 'id'});
    });
  }

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants() {
    return new Promise(resolve => {
      fetch(DBHelper.DATABASE_URL)
      .then(response => response.json())
      .then(restaurants => {
        DBHelper.openDatabase()
        .then(db => {
          if (!db) return;

          var tx = db.transaction('restaurants', 'readwrite');
          var restaurantStore = tx.objectStore('restaurants');
          restaurants.forEach(restaurant => restaurantStore.put(restaurant));
          
          resolve(restaurants);
        })
      })
      .catch(err => {
        console.error(err);
        console.log('from cache');
        return DBHelper.openDatabase()
        .then(db => {
          if (!db) return;
  
          var tx = db.transaction('restaurants');
          var restaurantStore = tx.objectStore('restaurants');
        
          resolve(restaurantStore.getAll());
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

}

