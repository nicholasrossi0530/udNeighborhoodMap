var ViewModel = function() {
    var self = this;
    this.locations = ko.observableArray(locations);
    this.filterText = ko.observable();
    this.foodCategories = ko.observableArray([
      'All',
      'American',
      'Mexican',
      'Asian',
      'Eastern'
    ]);
    this.selectedFoodCategory = ko.observable();
    this.foodCategoryHandler = function () {
      showFilteredListings(self.selectedFoodCategory());
    };
    this.showPlaceInfo = function(place) {
        populateInfoWindow(markers[place.rank], largeInfowindow);
    };
}


var map;

// Create a new blank array for all the listing markers.
var markers = [];

var locations = [
  {title: 'Lunchbox Laboratory', location: {lat: 47.6189447, lng: -122.1912699}, rank: 0, category: 'American'},
  {title: 'Chipotle', location: {lat: 47.6135929, lng: -122.1998673}, rank: 1, category: 'Mexican'},
  {title: 'Little Sheep Mongolian Hot Pot', location: {lat: 47.623208, lng: -122.133275}, rank: 2, category: 'Asian'},
  {title: 'Dough Zone™ Dumpling House', location: {lat: 47.617573, lng: -122.127884}, rank: 3, category: 'Asian'},
  {title: 'Afghan Cuisine', location: {lat: 47.628323, lng: -122.149430}, rank: 4, category: 'Eastern'},
  {title: 'Pagliacci Pizza', location: {lat: 47.6172132, lng: -122.2028705}, rank: 5, category: 'American'}
];

// Create placemarkers array to use in multiple functions to have control
// over the number of places that show.
var placeMarkers = [];

var largeInfowindow = {};

function initMap() {
  // Create a styles array to use with the map.
  var styles = [
    {
      featureType: 'water',
      stylers: [
        { color: '#19a0d8' }
      ]
    },{
      featureType: 'administrative',
      elementType: 'labels.text.stroke',
      stylers: [
        { color: '#ffffff' },
        { weight: 6 }
      ]
    },{
      featureType: 'administrative',
      elementType: 'labels.text.fill',
      stylers: [
        { color: '#e85113' }
      ]
    },{
      featureType: 'road.highway',
      elementType: 'geometry.stroke',
      stylers: [
        { color: '#efe9e4' },
        { lightness: -40 }
      ]
    },{
      featureType: 'transit.station',
      stylers: [
        { weight: 9 },
        { hue: '#e85113' }
      ]
    },{
      featureType: 'road.highway',
      elementType: 'labels.icon',
      stylers: [
        { visibility: 'off' }
      ]
    },{
      featureType: 'water',
      elementType: 'labels.text.stroke',
      stylers: [
        { lightness: 100 }
      ]
    },{
      featureType: 'water',
      elementType: 'labels.text.fill',
      stylers: [
        { lightness: -100 }
      ]
    },{
      featureType: 'poi',
      elementType: 'geometry',
      stylers: [
        { visibility: 'on' },
        { color: '#f0e4d3' }
      ]
    },{
      featureType: 'road.highway',
      elementType: 'geometry.fill',
      stylers: [
        { color: '#efe9e4' },
        { lightness: -25 }
      ]
    }
  ];

  // Constructor creates a new map - only center and zoom are required.
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 47.620443, lng: -122.191765},
    zoom: 13,
    styles: styles,
    mapTypeControl: false
  });

  largeInfowindow = new google.maps.InfoWindow();

  // These are the real estate listings that will be shown to the user.
  // Normally we'd have these in a database instead.
  var locations = [
    {title: 'Lunchbox Laboratory', location: {lat: 47.6189447, lng: -122.1912699}},
    {title: 'Chipotle', location: {lat: 47.6135929, lng: -122.1998673}},
    {title: 'Little Sheep Mongolian Hot Pot', location: {lat: 47.623208, lng: -122.133275}},
    {title: 'Dough Zone™ Dumpling House', location: {lat: 47.617573, lng: -122.127884}},
    {title: 'Afghan Cuisine', location: {lat: 47.628323, lng: -122.149430}},
    {title: 'Pagliacci Pizza', location: {lat: 47.6172132, lng: -122.2028705}}
  ];

  // Style the markers a bit. This will be our listing marker icon.
  var defaultIcon = makeMarkerIcon('0091ff');

  // Create a "highlighted location" marker color for when the user
  // mouses over the marker.
  var highlightedIcon = makeMarkerIcon('FFFF24');

  // The following group uses the location array to create an array of markers on initialize.
  for (var i = 0; i < locations.length; i++) {
    // Get the position from the location array.
    var position = locations[i].location;
    var title = locations[i].title;
    // Create a marker per location, and put into markers array.
    var marker = new google.maps.Marker({
      position: position,
      title: title,
      animation: google.maps.Animation.DROP,
      icon: defaultIcon,
      id: i
    });
    // Push the marker to our array of markers.
    markers.push(marker);
    // Create an onclick event to open the large infowindow at each marker.
    marker.addListener('click', function() {
      if(this.icon.url.includes('FFFF24')) {
        this.setIcon(defaultIcon);
      } else {
        this.setIcon(highlightedIcon);
      }
      for (var i = 0; i < markers.length; i++) {
        if(markers[i] !== this){
          markers[i].setIcon(defaultIcon);
        }
      }
      populateInfoWindow(this, largeInfowindow);
    });
  }
  showListings();
}

// This function populates the infowindow when the marker is clicked. We'll only allow
// one infowindow which will open at the marker that is clicked, and populate based
// on that markers position.
function populateInfoWindow(marker, infowindow) {
  // Check to make sure the infowindow is not already opened on this marker.
  if (infowindow.marker != marker) {
    // Clear the infowindow content to give the streetview time to load.
    infowindow.setContent('');
    infowindow.marker = marker;
    // Make sure the marker property is cleared if the infowindow is closed.
    infowindow.addListener('closeclick', function() {
      marker.setIcon(makeMarkerIcon('0091ff'));
      infowindow.marker = null;
    });
    var streetViewService = new google.maps.StreetViewService();
    var radius = 50;
    // In case the status is OK, which means the pano was found, compute the
    // position of the streetview image, then calculate the heading, then get a
    // panorama from that and set the options
    function getYelpData(data, status) {
        $.ajax({
            url: 'https://cors-anywhere.herokuapp.com/https://api.yelp.com/v3/businesses/search?client_id=UWULhd2T5_6Ft99qTTM-_A&'+
                'latitude=' + marker.position.lat() +
                '&longitude=' + marker.position.lng() +
                '&term=' + marker.title,
            headers:{'Authorization': 'Bearer ' +
                'HLKPEa4JvGcoLakKN3yIQDG7XJjMnRFczYTSDszgtpSUOv5Eb_C4_yHV9GBrO8Xetvz38twlFgu9iC8gn8UhlmATFJX9Td4maWdd1AhZPOnLsT3Y9bDmKGxiCA-CW3Yx'},
        }).done(function(result){
            infowindow.setContent('<a href="' + result.businesses[0].url + '">' + marker.title + '</a>' +
            '<div> Yelp: ' + result.businesses[0].rating + '/5 ' + result.businesses[0].review_count + ' reviews</div>' +
            '<a href="' + result.businesses[0].url + '">' +
            '<img src="'+ result.businesses[0].image_url + '" class=yelp-image></a>');
        }).fail(function(e){
          infowindow.setContent('<div>No Street View Found</div>');
        });
    }
    // Use streetview service to get the closest streetview image within
    // 50 meters of the markers position
    streetViewService.getPanoramaByLocation(marker.position, radius, getYelpData);
    // Open the infowindow on the correct marker.
    infowindow.open(map, marker);
  }
}

// This function will loop through the markers array and display them all.
function showListings() {
  var bounds = new google.maps.LatLngBounds();
  // Extend the boundaries of the map for each marker and display the marker
  for (var i = 0; i < markers.length; i++) {
    markers[i].setMap(map);
    bounds.extend(markers[i].position);
  }
  map.fitBounds(bounds);
}

// This function will loop through the markers array and display them based on the selected filter.
function showFilteredListings(filterText) {
  for (var i = 0; i < locations.length; i++) {
    if(locations[i].category === filterText || filterText === 'All') {
      markers[locations[i].rank].setMap(map);
    }
    else {
      markers[locations[i].rank].setMap(null);
    }
  }
}

// This function will loop through the listings and hide them all.
function hideMarkers(markers) {
  for (var i = 0; i < markers.length; i++) {
    markers[i].setMap(null);
  }
}

// This function takes in a COLOR, and then creates a new marker
// icon of that color. The icon will be 21 px wide by 34 high, have an origin
// of 0, 0 and be anchored at 10, 34).
function makeMarkerIcon(markerColor) {
  var markerImage = new google.maps.MarkerImage(
    'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|'+ markerColor +
    '|40|_|%E2%80%A2',
    new google.maps.Size(21, 34),
    new google.maps.Point(0, 0),
    new google.maps.Point(10, 34),
    new google.maps.Size(21,34));
  return markerImage;
}

ko.applyBindings(new ViewModel());