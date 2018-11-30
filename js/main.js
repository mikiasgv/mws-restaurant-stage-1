let restaurants,
  neighborhoods,
  cuisines
var newMap
var markers = [];
const updateReadyUX = document.getElementById('new-updates-indicator');


/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap(); // added 
  fetchNeighborhoods();
  fetchCuisines();
  DBHelper.openDatabase();
  DBHelper.registerServiceWorker();
  window.onload = () => {
    handleOfflineFavorites();
  };
});

/**
 * Handles all the notifictions showen to the user
 */

handleNotification = (message) => {
  const notificationContainer = document.getElementById('online-offline-notification');
  const notificationBody = document.getElementById('notification-body');
  const closelbl = document.createElement('label');
  closelbl.id = "closeDesc";
  closelbl.innerHTML = "close notification";
  closelbl.setAttribute('aria-hidden', true);
  closelbl.hidden = true;
  notificationContainer.append(closelbl);
  const closeNotification = document.getElementById('close-notification');
  closeNotification.setAttribute('aria-describedby', 'closeDesc');
  closeNotification.setAttribute('aria-label', 'close notification');

  notificationBody.innerHTML = message.detail;
  notificationBody.tabIndex = 0;
  notificationContainer.classList.add('notification-show');
  notificationContainer.setAttribute('aria-hidden', false);
  notificationContainer.setAttribute('aria-live', 'assertive');
  notificationContainer.setAttribute('aria-describedby', 'notification-body');
  closeNotification.addEventListener('click', (event) => {
    event.preventDefault();
    notificationContainer.classList.remove('notification-show');
    notificationContainer.setAttribute('aria-hidden', true);
    notificationBody.tabIndex = -1;
    closeNotification.tabIndex = -1;
  });
}

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods()
  .then(neighborhoods => {
    self.neighborhoods = neighborhoods;
    fillNeighborhoodsHTML();
  })
  .catch(err => console.error(err));
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines()
  .then(cuisines => {
    self.cuisines = cuisines;
    fillCuisinesHTML();
  })
  .catch(err => console.error(err));
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize leaflet map, called from HTML.
 */
initMap = () => {
  self.newMap = L.map('map', {
        center: [40.722216, -73.987501],
        zoom: 12,
        scrollWheelZoom: false
      });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: 'pk.eyJ1IjoibWlraWd2IiwiYSI6ImNqbWcyY3IwcTB0NGozdnBmc2p2M2dqN2sifQ.kAPJgcS7yBpnaGysqYCbRQ',
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(newMap);

  updateRestaurants();
}
/* window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
} */

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood)
  .then(restaurants => {
    resetRestaurants(restaurants);
    fillRestaurantsHTML();
  })
  .catch(err => console.error(err));
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Favore unfavor a restorant on the DOM
 */
toggleFavoriteCheckbox = (label) => {

  if (label.getAttribute('aria-checked') === 'true') {
    label.setAttribute('aria-checked', 'false');
  }
  else {
    label.setAttribute('aria-checked', 'true');
  }

};

/**
 * Mark a restaurant as favorite
 */
//Mark as favorite on load if there are any marked when the app is offline
handleOfflineFavorites = () => {
  DBHelper.handleOfflineFavorites()
  .then((offlineFavorites) => {
    if(Array.isArray(offlineFavorites)) {
      offlineFavorites.forEach((offlineFavor) => {
        document.getElementById(`favorlbl${offlineFavor.id}`).setAttribute('aria-checked', offlineFavor.is_favorite);
      });
    } else if(!(Object.keys(offlineFavorites).length === 0 && offlineFavorites.constructor === Object)) {
      document.getElementById(`favorlbl${offlineFavor.id}`).setAttribute('aria-checked', offlineFavor.is_favorite);
    }
  });
}

/**
 * Add functionality to favor unfavor a restaurant
 */
favorARestaurant = (restaurant) => {
  restaurant.is_favorite = restaurant.is_favorite == "true" ? "false" : "true";

  DBHelper.checkNetworkStatus()
  .then((status) => {
    if(status) {//mark a restaurant as favorite while the app is online
      DBHelper.markARestaurantAsToggle(restaurant, 'restaurants', restaurant.is_favorite)
      .then((response) => {
        if(response){
          let message = {};
          message.detail = `You ${response.is_favorite == "true" ? "favored" : "unfavored"} ${response.name} restaurant`;
          handleNotification(message);
        }
      });
    } else {//mark a restaurant as favorite while the app is offline
      let indicator = 1;//Useful to show if the data is saved offline or online 1 0
      DBHelper.saveDataToIDB('offline-favorites', restaurant, indicator)
      .then((response) => {
        if(response){
          let message = {};
          message.detail = `You ${response.is_favorite == "true" ? "favored" : "unfavored"} ${response.name} restaurant`;
          handleNotification(message);
        }
      });
    }
  });
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');
  const article = document.createElement('article');
  const attr = document.createAttribute("role"); 
  attr.value = "article";
  article.setAttributeNode(attr);  
  const imageURL = DBHelper.imageUrlForRestaurant(restaurant);

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.srcset = `${imageURL}.jpg 320w, ${imageURL}-420px.jpg 420w, 
                  ${imageURL}-600px.jpg 600w, ${imageURL}-800px.jpg 800w`;
  image.sizes = "(max-width: 600px) 100vw, (max-width: 915px) 50vw, (max-width: 1120px) 33.3vw, (max-width: 1520px) 25vw, 20vw";              
  
  image.alt = DBHelper.imageAltForRestaurant(restaurant);
  article.append(image);

  const favoriteLabel = document.createElement('label');
  favoriteLabel.id = `favorlbl${restaurant.id}`;
  favoriteLabel.classList.add('favorite-label');
  favoriteLabel.tabIndex = 0;
  favoriteLabel.setAttribute('role', 'checkbox');
  favoriteLabel.setAttribute('aria-label', 'Mark a restaurant as your favorite');
  favoriteLabel.setAttribute('aria-checked', `${restaurant.is_favorite == "true" ? true : false}`);

  article.append(favoriteLabel);

  favoriteLabel.addEventListener('click', (event) => {
    event.preventDefault();
    
    toggleFavoriteCheckbox(favoriteLabel);
    favorARestaurant(restaurant);
  });
  
  // Execute a function when the user releases a key on the keyboard
  favoriteLabel.addEventListener("keyup", (event) => {
    event.stopPropagation();
    event.preventDefault();

    // Number 32 is the "Space" key on the keyboard
    if (event.keyCode === 32 ) {
      toggleFavoriteCheckbox(favoriteLabel);
      favorARestaurant(restaurant);
    }
  });

  const name = document.createElement('h3');
  name.innerHTML = restaurant.name;
  article.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  article.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  article.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  article.append(more);

  li.append(article);

  return li;
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });

} 
/* addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
} */

window.addEventListener('online', DBHelper.handleOfflineFavorites);
window.addEventListener('offline', DBHelper.handleOfflineFavorites);
/**
 * Listene for notification event
 */
window.addEventListener('customnotification', handleNotification);

