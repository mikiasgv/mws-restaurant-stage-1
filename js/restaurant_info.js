let restaurant;
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {  
  initMap();
  DBHelper.openDatabase();
  DBHelper.registerServiceWorker();
  /**
   * This will check the connection status on page first load
   * if there are data saved offline then will send it to the database
   */
  window.onload = () => {
    handleConnectionChange();
  };
});

/**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL()
  .then(restaurant => {
    self.newMap = L.map('map', {
      center: [restaurant.latlng.lat, restaurant.latlng.lng],
      zoom: 16,
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
    fillBreadcrumb();
    DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
  })
  .catch(err => console.error(err));
}  
 
/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
} */

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = () => {
  return new Promise((resolve, reject) => {
    if (self.restaurant) { // restaurant already fetched!
      resolve(self.restaurant)
      return;
    }
    const id = getParameterByName('id');
    if (!id) { // no id found in URL
      reject('No restaurant id in URL');
    } else {
      createReviewFormHTML(id);
      DBHelper.fetchRestaurantById(id)
      .then(restaurant => {
        self.restaurant = restaurant;
        fetchReviewsOfResturant(id)
        .then(reviews => {
          self.restaurant.reviews = reviews;
          fillRestaurantHTML();
          resolve(restaurant);
        })
        .catch(err => {
          self.restaurant.reviews = [];
          fillRestaurantHTML();
        });
      })
      .catch(err => reject(err));
    }
  });
}

/**
 * Change date to human readable format
 */
reviewDate = (rDate) => {
  let newDate = new Date(Number(rDate));
  return `${newDate.getDate()} / ${(newDate.getMonth()+1)} / ${newDate.getFullYear()}`;
}

/**
 * Get current restaurant from page URL and get its review.
 */
fetchReviewsOfResturant = (id) => {
  return new Promise((resolve, reject) => {
    DBHelper.fetchReviewsByRestaurantId(id)
    .then(reviews => {
      resolve(reviews);
    })
    .catch(err => reject(err));
  });
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const imageURL = DBHelper.imageUrlForRestaurant(restaurant);
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.srcset = `${imageURL}.jpg 320w, ${imageURL}-420px.jpg 420w, 
                  ${imageURL}-600px.jpg 600w, ${imageURL}-800px.jpg 800w`;
  //image.sizes = "(max-width: 600px) 100vw, (max-width: 915px) 33.3vw, (min-width: 1120px) 25vw, (min-width: 1520px) 20vw";                
  
  image.sizes = "(max-width: 915px) 100vw,  (max-width: 1120px) 56vw 20vw";
  image.alt = DBHelper.imageAltForRestaurant(restaurant);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  const caption = document.createElement('caption');
  caption.id = "schedule-caption";
  caption.classList.add('screenreader');
  caption.innerHTML = 'restaurant working schedule';
  //creating the table heder
  const rowH = document.createElement('tr');
  rowH.tabIndex = 0;

  const dayH = document.createElement('th');
  dayH.innerHTML = 'Day';
  dayH.scope = "col";
  rowH.appendChild(dayH);

  const dayT = document.createElement('th');
  dayT.innerHTML = 'Time';
  dayT.scope = "col";
  rowH.appendChild(dayT);

  hours.appendChild(rowH);

  hours.appendChild(caption);
  for (let key in operatingHours) {
    const row = document.createElement('tr');
    row.tabIndex = 0;

    const day = document.createElement('td');
    day.innerHTML = key;
    day.scope = "row";
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    time.scope = "row";
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const div = document.createElement('div');
  div.classList.add("review-header");
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.classList.add("review-name");
  name.innerHTML = review.name;
  name.tabIndex = 0;
  div.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = reviewDate(review.updatedAt);
  date.classList.add("review-date");
  date.tabIndex = 0;
  div.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  rating.classList.add("review-rating");
  rating.tabIndex = 0;
  div.appendChild(rating);

  li.appendChild(div);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  comments.tabIndex = 0;
  li.appendChild(comments);



  return li;
}

/**
 * With a given review(s) it will append the review next to the 
 * existing reviews on the page
 */
addNewReviewsToPage = (reviews) => {
  if(Array.isArray(reviews)) {
    const ul = document.getElementById('reviews-list');
    reviews.forEach(review => {
      ul.appendChild(createReviewHTML(review));
    });
    ul.scrollIntoView(true);
  } else if(!(Object.keys(reviews).length === 0 && reviews.constructor === Object)) {
    const ul = document.getElementById('reviews-list');
    ul.appendChild(createReviewHTML(reviews));
    ul.scrollIntoView(true);
  }
}

handleConnectionChange = () => {
  DBHelper.handleConnectionChange();
}

/**
 * Save data to the api server while the app is online
 */
postDataFromThePage = (url, data, store) => {
  DBHelper.saveReviewToDatabase(url, data, store)
  .then(function(review){
    addNewReviewsToPage(review);
  });
}

/**
 * Create new reviews form HTML and add it to the webpage.
 */

createReviewFormHTML = (id) => {
  const section = document.getElementById('add-new-review-container');
  
  const divContainer = document.createElement('div');
  divContainer.classList.add('form-wrapper');

  const divTitle = document.createElement('div');
  divTitle.classList.add('form-title');

  const title = document.createElement('h3');
  title.innerHTML = 'Add New Review';
  divTitle.appendChild(title);

  const divContent = document.createElement('div');
  divContent.classList.add('form-content');

  const form = document.createElement('form');
  form.action = "#";
  form.method = "POST";
  form.setAttribute('aria-label', "Add a review");

  const reviewId = document.createElement('input');
  reviewId.type = "number";
  reviewId.name = "id";
  reviewId.id = "id";
  reviewId.value = null;
  reviewId.setAttribute('aria-hidden', true);
  reviewId.hidden = true;

  const restaurantId = document.createElement('input');
  restaurantId.type = "number";
  restaurantId.name = "restaurant_id";
  restaurantId.id = "restaurant_id";
  restaurantId.value = id;
  restaurantId.setAttribute('aria-hidden', true);
  restaurantId.hidden = true;

  
  const divName = document.createElement('div');
  divName.classList.add('textfield');

  const namelbl = document.createElement('label');
  namelbl.setAttribute('for', 'name');
  namelbl.innerHTML = "* Name:";
  divName.appendChild(namelbl);

  const nameinput = document.createElement('input');
  nameinput.type = "text";
  nameinput.name = "name";
  nameinput.id = "name";
  nameinput.required = true;
  nameinput.setAttribute('aria-required', true);
  divName.appendChild(nameinput);

  const createdAt = document.createElement('input');
  createdAt.type = "text";
  createdAt.name = "createdAt";
  createdAt.id = "createdAt";
  createdAt.value = new Date().getTime();
  createdAt.setAttribute('aria-hidden', true);
  createdAt.hidden = true;

  const updatedAt = document.createElement('input');
  updatedAt.type = "text";
  updatedAt.name = "updatedAt";
  updatedAt.id = "updatedAt";
  updatedAt.value = new Date().getTime();
  updatedAt.setAttribute('aria-hidden', true);
  updatedAt.hidden = true;

  const divRating = document.createElement('div');
  divRating.classList.add('textfield');

  const ratinglabel = document.createElement('label');
  ratinglabel.setAttribute('for', 'rating');
  ratinglabel.innerHTML = "* Rating:";
  divRating.appendChild(ratinglabel);

  const ratingsOption = [1,2,3,4,5];

  const ratingSelectList = document.createElement("select");
  ratingSelectList.id = "rating";
  ratingSelectList.name = "rating";
  ratingSelectList.required = true;

  let optionFirst = document.createElement("option");
  optionFirst.value = "";
  optionFirst.innerHTML = "Please choose a rating";
  ratingSelectList.appendChild(optionFirst);

  for (let i = 0; i < ratingsOption.length; i++) {
      let option = document.createElement("option");
      option.value = ratingsOption[i];
      option.innerHTML = ratingsOption[i];
      ratingSelectList.appendChild(option);
  }

  divRating.appendChild(ratingSelectList);

  const divComment = document.createElement('div');
  divComment.classList.add('textfield');

  const commentlabel = document.createElement('label');
  commentlabel.setAttribute('for', 'comments');
  commentlabel.innerHTML = "Comments:";
  divComment.appendChild(commentlabel);

  const commentTextArea = document.createElement('textarea');
  commentTextArea.name = "comments";
  commentTextArea.id = "comments";
  commentTextArea.cols = "4";
  divComment.appendChild(commentTextArea);

  const divSubmit = document.createElement('div');
  divSubmit.classList.add('form-submit');

  const submitButton = document.createElement('button');
  submitButton.classList.add('submit-btn');
  submitButton.type = "submit";
  submitButton.innerHTML = "Add Review";
  divSubmit.appendChild(submitButton);
  
  form.appendChild(divTitle);
  form.appendChild(reviewId);
  form.appendChild(restaurantId);
  form.appendChild(divName);
  form.appendChild(createdAt);
  form.appendChild(updatedAt);
  form.appendChild(divRating);
  form.appendChild(divComment);
  form.appendChild(divSubmit);

  divContent.appendChild(form);
  divContainer.appendChild(divContent);
  section.appendChild(divContainer);

  //start the saving review process
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const postUrl = 'http://localhost:1337/reviews/';
    const data = {
      id:  "",
      restaurant_id: restaurantId.value,
      name: nameinput.value,
      createdAt: createdAt.value,
      updatedAt: updatedAt.value,
      rating: ratingSelectList.value,
      comments: commentTextArea.value
    };

    postDataFromThePage(postUrl, data, 'reviews');

  });
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
/**
 * Listene for network change
 */
window.addEventListener('online', DBHelper.handleConnectionChange);
window.addEventListener('offline', DBHelper.handleConnectionChange);