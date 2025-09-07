import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import Icon from 'ol/style/Icon.js';
import Style from 'ol/style/Style.js';
import { fromLonLat } from 'ol/proj';
import { state } from '../state/store.js';
import { enableOverlayInfoClickHandlers } from '../map/overlayInfoClick.js';
import { updatePermalinkWithFeatures } from '../map/permalink.js';

function createMarkerLayer(lon, lat, zIndex, src) {
  const marker = new Feature({ geometry: new Point(fromLonLat([lon, lat])) });
  marker.setStyle(new Style({ image: new Icon({ anchor: [0.5, 1], src, scale: 1 }) }));
  const vectorSource = new VectorSource({ features: [marker] });
  return new VectorLayer({ source: vectorSource, zIndex });
}

export function showSearchMarker(lon, lat) {
  state.lastSearchCoords = [lon, lat];
  if (state.searchMarkerLayer) state.map && state.map.removeLayer(state.searchMarkerLayer);
  if (state.leftSearchMarkerLayer && state.leftMap) state.leftMap.removeLayer(state.leftSearchMarkerLayer);
  if (state.rightSearchMarkerLayer && state.rightMap) state.rightMap.removeLayer(state.rightSearchMarkerLayer);
  if (!state.isSplit) {
    state.searchMarkerLayer = createMarkerLayer(lon, lat, 100, 'https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi2.png');
    state.map.addLayer(state.searchMarkerLayer);
  } else {
    state.leftSearchMarkerLayer = createMarkerLayer(lon, lat, 100, 'https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi2.png');
    state.rightSearchMarkerLayer = createMarkerLayer(lon, lat, 100, 'https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi2.png');
    if (state.leftMap) state.leftMap.addLayer(state.leftSearchMarkerLayer);
    if (state.rightMap) state.rightMap.addLayer(state.rightSearchMarkerLayer);
  }
}

export function showClickMarker(lon, lat) {
  state.lastClickCoords = lon != null && lat != null ? [lon, lat] : null;
  state.markerCoords = state.lastClickCoords;
  if (state.clickMarkerLayer && state.map) state.map.removeLayer(state.clickMarkerLayer);
  if (state.leftClickMarkerLayer && state.leftMap) state.leftMap.removeLayer(state.leftClickMarkerLayer);
  if (state.rightClickMarkerLayer && state.rightMap) state.rightMap.removeLayer(state.rightClickMarkerLayer);
  if (!state.isSplit) {
    if (lon != null && lat != null) {
      state.clickMarkerLayer = createMarkerLayer(lon, lat, 101, 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="cyan" stroke="black" stroke-width="2"/></svg>');
      state.map.addLayer(state.clickMarkerLayer);
    }
  } else {
    if (lon != null && lat != null) {
      state.leftClickMarkerLayer = createMarkerLayer(lon, lat, 101, 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="cyan" stroke="black" stroke-width="2"/></svg>');
      state.rightClickMarkerLayer = createMarkerLayer(lon, lat, 101, 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="cyan" stroke="black" stroke-width="2"/></svg>');
      if (state.leftMap) state.leftMap.addLayer(state.leftClickMarkerLayer);
      if (state.rightMap) state.rightMap.addLayer(state.rightClickMarkerLayer);
    }
  }
  updatePermalinkWithFeatures();
  state.drawingMode = null;
  enableOverlayInfoClickHandlers();
}

export function clearAllMarkers() {
  if (state.clickMarkerLayer && state.map) state.map.removeLayer(state.clickMarkerLayer);
  if (state.leftClickMarkerLayer && state.leftMap) state.leftMap.removeLayer(state.leftClickMarkerLayer);
  if (state.rightClickMarkerLayer && state.rightMap) state.rightMap.removeLayer(state.rightClickMarkerLayer);
  state.clickMarkerLayer = null;
  state.leftClickMarkerLayer = null;
  state.rightClickMarkerLayer = null;
  state.markerCoords = null;
}


