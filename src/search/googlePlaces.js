import { fromLonLat } from 'ol/proj';
import { state } from '../state/store.js';
import { showSearchMarker } from '../draw/markers.js';

export function setupGooglePlacesAutocomplete() {
  if (window.google && window.google.maps && window.google.maps.places) {
    const input = document.getElementById('search-bar');
    if (input) {
      const autocomplete = new window.google.maps.places.Autocomplete(input, { types: ['geocode', 'establishment'] });
      autocomplete.addListener('place_changed', function () {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) {
          alert('No details available for input: ' + place.name);
          return;
        }
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        if (state.map && state.map.getView) { state.map.getView().setCenter(fromLonLat([lng, lat])); state.map.getView().setZoom(14); }
        if (state.leftMap && state.leftMap.getView) { state.leftMap.getView().setCenter(fromLonLat([lng, lat])); state.leftMap.getView().setZoom(14); }
        if (state.rightMap && state.rightMap.getView) { state.rightMap.getView().setCenter(fromLonLat([lng, lat])); state.rightMap.getView().setZoom(14); }
        showSearchMarker(lng, lat);
      });
    }
  } else {
    console.warn('Google Maps Places API not loaded. Search bar will not work.');
  }
}


