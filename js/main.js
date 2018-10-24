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
  registerServiceWorker();
});


/**
 * Register the serviceworker and so...
 */
registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(function(registration) {
      
      if (!navigator.serviceWorker.controller) {
        return;
      }
  
      if (registration.waiting) {
        updateReady(registration.waiting);
        return;
      }
  
      if (registration.installing) {
        trackInstalling(reg.installing);
        return;
      }
  
      registration.addEventListener('updatefound', function() {
        trackInstalling(registration.installing);
      });

      // Registration was successful
      console.log('ServiceWorker registration successful with scope: ', registration.scope);

    }, function(err) {
      // registration failed :(
      console.log('ServiceWorker registration failed: ', err);
    });
  }
}

trackInstalling = (worker) => {
  worker.addEventListener('statechange', function() {
    if (worker.state == 'installed') {
      updateReady(worker);
    }
  });
};

updateReady = (worker) => {
  worker.postMessage({action: 'skipWaiting'});
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
  //image.sizes = "(min-width: 601px) 33.3vw,  100vw";
  image.alt = DBHelper.imageAltForRestaurant(restaurant);
  article.append(image);

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

