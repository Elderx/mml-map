import { hardcodedLayers, mapboxAccessToken } from './config/constants.js';
import { state } from './state/store.js';
import { loadCapabilities, createBaseMap, createSplitMaps, parseInitialFromParams } from './map/init.js';
import { createTileLayerFromList } from './map/layers.js';
import { createOverlayDropdown, mountOverlaySelectors } from './ui/overlayDropdown.js';
import { enableOverlayInfoClickHandlers, disableOverlayInfoClickHandlers } from './map/overlayInfoClick.js';
import { showClickMarker } from './draw/markers.js';
import { showAllDrawables, copyDrawnFeatures, clearDrawnFeatures } from './draw/showables.js';
import { wireDrawButtons, wireRemoveFeaturesButton, enableMarkerClickHandler } from './draw/tools.js';
import { setupGooglePlacesAutocomplete } from './search/googlePlaces.js';
import { fetchOverlayCapabilities } from './overlays/fetchCapabilities.js';
import { getQueryParams } from './utils/query.js';
import { updatePermalinkWithFeatures, updatePermalink } from './map/permalink.js';
import { syncViews } from './map/sync.js';
import { createLayerSelectorDropdown } from './ui/layerSelector.js';
import { updateAllOverlays } from './map/overlays.js';
import { fromLonLat } from 'ol/proj';
import 'ol/ol.css';

async function bootstrap() {
  const params = getQueryParams();
  const { initialCenter, initialZoom, initialIsSplit } = parseInitialFromParams(params);
  const result = await loadCapabilities();

  const mainMapDiv = document.getElementById('map');
  const splitToggle = document.getElementById('split-toggle');
  const splitMapsContainer = document.getElementById('split-maps-container');

  createBaseMap(result, initialCenter, initialZoom, state.initialLayerIdx);

  let singleLayerSelectorDiv = null;
  function showSingleLayerSelector(show) { if (singleLayerSelectorDiv) singleLayerSelectorDiv.style.display = show ? 'block' : 'none'; }
  function addSingleLayerSelectorToMap() {
    if (singleLayerSelectorDiv) singleLayerSelectorDiv.remove();
    singleLayerSelectorDiv = createLayerSelectorDropdown(hardcodedLayers[state.initialLayerIdx].id, function (newLayerId) {
      const newLayer = createTileLayerFromList(result, newLayerId, null, mapboxAccessToken);
      state.map.getLayers().setAt(0, newLayer);
      const view = state.map.getView();
      updatePermalink(view.getCenter(), view.getZoom(), newLayerId, false);
    });
    mainMapDiv.appendChild(singleLayerSelectorDiv);
    showSingleLayerSelector(true);
  }
  addSingleLayerSelectorToMap();

  function activateSplitScreen() {
    state.isSplit = true;
    document.getElementById('map').style.display = 'none';
    splitMapsContainer.style.display = 'block';
    showSingleLayerSelector(false);
    if (state.leftMap) state.leftMap.setTarget(null);
    if (state.rightMap) state.rightMap.setTarget(null);
    const mainView = state.map.getView();
    const center = mainView.getCenter(); const zoom = mainView.getZoom(); const rotation = mainView.getRotation();
    createSplitMaps(result, center, zoom, rotation);
    enableOverlayInfoClickHandlers();
    state.leftMapMoveendListener = function () { if (!state.restoringFromPermalink && state.permalinkInitialized) updatePermalinkWithFeatures(); };
    state.rightMapMoveendListener = function () { if (!state.restoringFromPermalink && state.permalinkInitialized) updatePermalinkWithFeatures(); };
    state.leftMap.on('moveend', state.leftMapMoveendListener);
    state.rightMap.on('moveend', state.rightMapMoveendListener);
    const leftLayerSelectorDiv = createLayerSelectorDropdown(state.leftLayerId, function(newLayerId) { state.leftLayerId = newLayerId; const newLayer = createTileLayerFromList(result, newLayerId, null, mapboxAccessToken); state.leftMap.getLayers().setAt(0, newLayer); updatePermalinkWithFeatures(); });
    leftLayerSelectorDiv.style.left = '10px'; leftLayerSelectorDiv.style.right = 'auto';
    const rightLayerSelectorDiv = createLayerSelectorDropdown(state.rightLayerId, function(newLayerId) { state.rightLayerId = newLayerId; const newLayer = createTileLayerFromList(result, newLayerId, null, mapboxAccessToken); state.rightMap.getLayers().setAt(0, newLayer); updatePermalinkWithFeatures(); });
    document.getElementById('map-left').appendChild(leftLayerSelectorDiv);
    document.getElementById('map-right').appendChild(rightLayerSelectorDiv);
    copyDrawnFeatures('main', 'left', state.map, state.leftMap);
    copyDrawnFeatures('main', 'right', state.map, state.rightMap);
    clearDrawnFeatures('main', state.map);
  }
  function deactivateSplitScreen() {
    state.isSplit = false;
    splitMapsContainer.style.display = 'none';
    document.getElementById('map').style.display = 'block';
    showSingleLayerSelector(true);
    if (state.leftMap) state.leftMap.setTarget(null);
    if (state.rightMap) state.rightMap.setTarget(null);
    if (state.leftMap && state.leftMapMoveendListener) state.leftMap.un('moveend', state.leftMapMoveendListener);
    state.leftMapMoveendListener = null;
    if (state.rightMap && state.rightMapMoveendListener) state.rightMap.un('moveend', state.rightMapMoveendListener);
    state.rightMapMoveendListener = null;
    copyDrawnFeatures('left', 'main', state.leftMap, state.map);
    clearDrawnFeatures('left', state.leftMap);
    clearDrawnFeatures('right', state.rightMap);
  }
  const _activateSplitScreen = activateSplitScreen; const _deactivateSplitScreen = deactivateSplitScreen;
  function activateSplitScreenWrapped() { _activateSplitScreen(); if (state.leftMap && state.rightMap) { syncViews(state.leftMap, state.rightMap); syncViews(state.rightMap, state.leftMap); } enableOverlayInfoClickHandlers(); showAllDrawables(showClickMarker); }
  function deactivateSplitScreenWrapped() { _deactivateSplitScreen(); enableOverlayInfoClickHandlers(); showAllDrawables(showClickMarker); }

  if (initialIsSplit) {
    setTimeout(() => { activateSplitScreenWrapped(); splitToggle.textContent = 'Single screen'; restoreFeaturesFromURL(params); }, 0);
  } else {
    restoreFeaturesFromURL(params);
  }
  splitToggle.addEventListener('click', function () {
    if (!state.isSplit) { activateSplitScreenWrapped(); splitToggle.textContent = 'Single screen'; if (state.drawingMode === 'marker') { enableMarkerClickHandler(); } updatePermalinkWithFeatures(); }
    else { deactivateSplitScreenWrapped(); splitToggle.textContent = 'Split screen'; if (state.drawingMode === 'marker') { enableMarkerClickHandler(); } updatePermalinkWithFeatures(); }
  });

  state.map.on('moveend', function () { if (!state.restoringFromPermalink && state.permalinkInitialized) { updatePermalinkWithFeatures(); } });
  import('ol/control').then(({ defaults }) => { defaults().extend([]).forEach(ctrl => state.map.addControl(ctrl)); });

  setupGooglePlacesAutocomplete();
  wireDrawButtons(updatePermalinkWithFeatures);
  wireRemoveFeaturesButton(updatePermalinkWithFeatures);

  await fetchOverlayCapabilities();
  mountOverlaySelectors(mainMapDiv, updatePermalinkWithFeatures);

  enableOverlayInfoClickHandlers();

  function restoreFeaturesFromURL(params) {
    state.restoringFromPermalink = true;
    state.drawingMode = null;
    state.markerCoords = null; if (params.markerLat && params.markerLon) { const lat = parseFloat(params.markerLat); const lon = parseFloat(params.markerLon); if (!isNaN(lat) && !isNaN(lon)) { state.markerCoords = [lon, lat]; } }
    state.lineCoords = null; if (params.line) { const coords = params.line.split(';').map(pair => pair.split(',').map(Number)); if (coords.length >= 2 && coords.every(pair => pair.length === 2 && !isNaN(pair[0]) && !isNaN(pair[1]))) { state.lineCoords = coords.map(pair => fromLonLat([pair[0], pair[1]])); } }
    state.polygonCoords = null; if (params.polygon) { const coords = params.polygon.split(';').map(pair => pair.split(',').map(Number)); if (coords.length >= 3 && coords.every(pair => pair.length === 2 && !isNaN(pair[0]) && !isNaN(pair[1]))) { state.polygonCoords = coords.map(pair => fromLonLat([pair[0], pair[1]])); } }
    state.measureCoords = null; if (params.measure) { const coords = params.measure.split(';').map(pair => pair.split(',').map(Number)); if (coords.length >= 2 && coords.every(pair => pair.length === 2 && !isNaN(pair[0]) && !isNaN(pair[1]))) { state.measureCoords = coords.map(pair => fromLonLat([pair[0], pair[1]])); } }
    state.overlayLayers = []; if (params.overlays) {
      state.overlayLayers = params.overlays.split(';').filter(Boolean);
      state.digiroadOverlayLayers = state.overlayLayers.filter(name => state.digiroadOverlayList.some(l => l.name === name));
      state.genericOverlayLayers = state.overlayLayers.filter(name => state.genericOverlayList.some(l => l.name === name));
      updateAllOverlays();
    }
    showAllDrawables(showClickMarker);
    state.restoringFromPermalink = false;
    state.permalinkInitialized = true;
    updatePermalinkWithFeatures();
  }
}

bootstrap();


