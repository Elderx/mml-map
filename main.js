import Map from 'ol/Map.js';
import TileLayer from 'ol/layer/Tile.js';
import View from 'ol/View.js';
import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS.js';
import WMTSCapabilities from 'ol/format/WMTSCapabilities.js';
import { fromLonLat, toLonLat } from 'ol/proj';
import Control from 'ol/control/Control.js';
import OSM from 'ol/source/OSM.js';
import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import Icon from 'ol/style/Icon.js';
import Style from 'ol/style/Style.js';
import Draw from 'ol/interaction/Draw.js';
import Stroke from 'ol/style/Stroke.js';
import Fill from 'ol/style/Fill.js';
import LineString from 'ol/geom/LineString.js';
import Polygon from 'ol/geom/Polygon.js';
import Overlay from 'ol/Overlay.js';
import { getLength } from 'ol/sphere.js';
import TileWMS from 'ol/source/TileWMS.js';
import XYZ from 'ol/source/XYZ.js';
import { applyStyle } from 'ol-mapbox-style';
import VectorTileLayer from 'ol/layer/VectorTile.js';
import VectorTileSource from 'ol/source/VectorTile.js';

const mapboxAccessToken = 'pk.eyJ1IjoiZWxkZXJ4IiwiYSI6ImNqdHNrdHlmbDA1bjczem81ZTQzZnJ3engifQ.2PoeE03vtRBPj1D_-ESbrw';
const apiKey = '977cd66e-8512-460a-83d3-cb405325c3ff',
  epsg = 'EPSG:3857',
  tileMatrixSet = 'WGS84_Pseudo-Mercator',
  capsUrl = `https://avoin-karttakuva.maanmittauslaitos.fi/avoin/wmts/1.0.0/WMTSCapabilities.xml?api-key=${apiKey}`,
  wmsUrl = 'https://avoinapi.vaylapilvi.fi/vaylatiedot/digiroad/wms',
  wmsCapabilitiesUrl = 'https://avoinapi.vaylapilvi.fi/vaylatiedot/digiroad/wms?request=getcapabilities&service=wms';

// Mapbox base URL and attribution
const mbUrl = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiZWxkZXJ4IiwiYSI6ImNqdHNrdHlmbDA1bjczem81ZTQzZnJ3engifQ.2PoeE03vtRBPj1D_-ESbrw';
const mbAttr = '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const hardcodedLayers = [
  { id: 'taustakartta', name: 'Taustakartta', type: 'wmts' },
  { id: 'maastokartta', name: 'Maastokartta', type: 'wmts' },
  { id: 'selkokartta', name: 'Selkokartta', type: 'wmts' },
  { id: 'ortokuva', name: 'Ortokuva', type: 'wmts' },
  { id: 'osm', name: 'OpenStreetMap', type: 'osm' },
  { id: 'mapbox_light', name: 'Mapbox Light', type: 'mapbox', styleUrl: 'mapbox://styles/mapbox/light-v11' },
  { id: 'mapbox_dark', name: 'Mapbox Dark', type: 'mapbox', styleUrl: 'mapbox://styles/mapbox/dark-v11' },
  { id: 'mapbox_streets', name: 'Mapbox Streets', type: 'mapbox', styleUrl: 'mapbox://styles/mapbox/streets-v12' },
  { id: 'mapbox_outdoors', name: 'Mapbox Outdoors', type: 'mapbox', styleUrl: 'mapbox://styles/mapbox/outdoors-v12' },
  { id: 'esri_world_imagery', name: 'Esri World Imagery', type: 'esri_sat' },
  { id: 'cartodb_dark', name: 'CartoDB Dark', type: 'cartodb_dark' }
];

const parser = new WMTSCapabilities();
let map;
let restoringFromPermalink = false;
let permalinkInitialized = false;
let markerCoords = null;
let lineCoords = null;
let polygonCoords = null;
let measureCoords = null;
let drawingMode = null;
let lastClickCoords = null;
let clickMarkerLayer = null;
let leftClickMarkerLayer = null;
let rightClickMarkerLayer = null;
let drawnLineLayer = { main: null, left: null, right: null };
let drawnLineFeature = { main: null, left: null, right: null };
let drawnPolygonLayer = { main: null, left: null, right: null };
let drawnPolygonFeature = { main: null, left: null, right: null };
let measureLineLayer = { main: null, left: null, right: null };
let measureLineFeature = { main: null, left: null, right: null };
let measureLabelOverlay = { main: null, left: null, right: null };
let overlayLayers = [];
let overlayLayerObjects = { main: [], left: [], right: [] };
let wmsOverlayList = [];
let wmsOverlayLegends = {};
let digiroadOverlayList = [];
let digiroadOverlayLayers = [];
let genericOverlayList = [];
let genericOverlayLayers = [];
let genericOverlayLayerObjects = { main: [], left: [], right: [] };

let overlaySelectorDiv = null;
let leftOverlaySelectorDiv = null;
let rightOverlaySelectorDiv = null;

// Overlay dropdown state
let overlayDropdownOpen = false;
let overlayDropdownButton = null;
let overlayDropdownPanel = null;
let leftOverlayDropdownButton = null;
let leftOverlayDropdownPanel = null;
let rightOverlayDropdownButton = null;
let rightOverlayDropdownPanel = null;

// --- Overlay GetFeatureInfo popup logic ---
let overlayInfoPopup = null;
let overlayInfoPopupCloser = null;
function createOverlayInfoPopup() {
  if (overlayInfoPopup) overlayInfoPopup.remove();
  overlayInfoPopup = document.createElement('div');
  overlayInfoPopup.className = 'overlay-info-popup';
  overlayInfoPopup.style.position = 'absolute';
  overlayInfoPopup.style.minWidth = '260px';
  overlayInfoPopup.style.maxWidth = '420px';
  overlayInfoPopup.style.maxHeight = '350px';
  overlayInfoPopup.style.overflow = 'auto';
  overlayInfoPopup.style.background = 'rgba(255,255,255,0.98)';
  overlayInfoPopup.style.border = '2px solid #0077cc';
  overlayInfoPopup.style.borderRadius = '10px';
  overlayInfoPopup.style.boxShadow = '0 2px 16px rgba(0,0,0,0.18)';
  overlayInfoPopup.style.padding = '12px 16px 8px 16px';
  overlayInfoPopup.style.zIndex = 1001;
  overlayInfoPopup.style.fontSize = '1em';
  overlayInfoPopup.style.color = '#222';
  overlayInfoPopup.style.lineHeight = '1.5';
  overlayInfoPopup.style.pointerEvents = 'auto';
  overlayInfoPopup.style.userSelect = 'text';
  overlayInfoPopup.style.top = '0';
  overlayInfoPopup.style.left = '0';
  overlayInfoPopup.innerHTML = '';
  overlayInfoPopupCloser = document.createElement('button');
  overlayInfoPopupCloser.textContent = '×';
  overlayInfoPopupCloser.style.position = 'absolute';
  overlayInfoPopupCloser.style.top = '6px';
  overlayInfoPopupCloser.style.right = '10px';
  overlayInfoPopupCloser.style.background = 'none';
  overlayInfoPopupCloser.style.border = 'none';
  overlayInfoPopupCloser.style.fontSize = '1.5em';
  overlayInfoPopupCloser.style.cursor = 'pointer';
  overlayInfoPopupCloser.style.color = '#0077cc';
  overlayInfoPopupCloser.addEventListener('click', function() {
    overlayInfoPopup.style.display = 'none';
  });
  overlayInfoPopup.appendChild(overlayInfoPopupCloser);
  document.body.appendChild(overlayInfoPopup);
}
function showOverlayInfoPopup(html, pixel) {
  createOverlayInfoPopup();
  overlayInfoPopup.style.display = 'block';
  overlayInfoPopup.innerHTML += html;
  // Position popup near click (pixel is [x, y] in viewport)
  let x = pixel[0] + 10;
  let y = pixel[1] + 10;
  // Clamp to viewport
  const maxX = window.innerWidth - overlayInfoPopup.offsetWidth - 20;
  const maxY = window.innerHeight - overlayInfoPopup.offsetHeight - 20;
  if (x > maxX) x = maxX;
  if (y > maxY) y = maxY;
  overlayInfoPopup.style.left = x + 'px';
  overlayInfoPopup.style.top = y + 'px';
  // Add close button again (since innerHTML was set)
  overlayInfoPopup.appendChild(overlayInfoPopupCloser);
}
function clearOverlayInfoPopup() {
  if (overlayInfoPopup) overlayInfoPopup.style.display = 'none';
}
// --- Add click handler for overlays ---
function handleOverlayInfoClick(evt, mapObj, overlays) {
  if (drawingMode || overlays.length === 0) return;
  clearOverlayInfoPopup();
  const view = mapObj.getView();
  const coordinate = evt.coordinate;
  const pixel = mapObj.getEventPixel(evt.originalEvent);
  const resolution = view.getResolution();
  const projection = view.getProjection();
  let promises = [];
  overlays.forEach(layerName => {
    const layerObj = overlayLayerObjects[mapObj === map ? 'main' : mapObj === leftMap ? 'left' : 'right'].find(l => l.getSource().getParams().LAYERS === layerName);
    if (!layerObj) return;
    const url = layerObj.getSource().getFeatureInfoUrl(
      coordinate,
      resolution,
      projection,
      { 'INFO_FORMAT': 'text/html', 'QUERY_LAYERS': layerName }
    );
    if (url) {
      promises.push(
        fetch(url)
          .then(r => r.text())
          .then(html => ({ layerName, html }))
          .catch(() => null)
      );
    }
  });
  if (promises.length === 0) return;
  Promise.all(promises).then(results => {
    let anyContent = false;
    let html = '';
    results.forEach(res => {
      if (res && res.html && res.html.trim() && !/no features found/i.test(res.html)) {
        anyContent = true;
        const layerTitle = wmsOverlayList.find(l => l.name === res.layerName)?.title || res.layerName;
        html += `<div style="margin-bottom:12px;"><div style="font-weight:bold;font-size:1.08em;margin-bottom:4px;color:#0077cc;">${layerTitle}</div><div>${res.html}</div></div>`;
      }
    });
    if (anyContent) {
      showOverlayInfoPopup(html, pixel);
    }
  });
}
// Attach handler to all maps
function enableOverlayInfoClickHandlers() {
  // Remove previous listeners if any
  if (typeof map !== 'undefined' && overlayInfoClickHandlerMain) map.un('singleclick', overlayInfoClickHandlerMain);
  if (typeof leftMap !== 'undefined' && leftMap && overlayInfoClickHandlerLeft) leftMap.un('singleclick', overlayInfoClickHandlerLeft);
  if (typeof rightMap !== 'undefined' && rightMap && overlayInfoClickHandlerRight) rightMap.un('singleclick', overlayInfoClickHandlerRight);
  overlayInfoClickHandlerMain = function(evt) { handleOverlayInfoClick(evt, map, overlayLayers); };
  overlayInfoClickHandlerLeft = function(evt) { handleOverlayInfoClick(evt, leftMap, overlayLayers); };
  overlayInfoClickHandlerRight = function(evt) { handleOverlayInfoClick(evt, rightMap, overlayLayers); };
  if (typeof map !== 'undefined') map.on('singleclick', overlayInfoClickHandlerMain);
  if (typeof leftMap !== 'undefined' && leftMap) leftMap.on('singleclick', overlayInfoClickHandlerLeft);
  if (typeof rightMap !== 'undefined' && rightMap) rightMap.on('singleclick', overlayInfoClickHandlerRight);
}
let overlayInfoClickHandlerMain = null;
let overlayInfoClickHandlerLeft = null;
let overlayInfoClickHandlerRight = null;

// When drawing/marker mode is enabled, disable overlay info click handlers
function disableOverlayInfoClickHandlers() {
  if (typeof map !== 'undefined' && overlayInfoClickHandlerMain) map.un('singleclick', overlayInfoClickHandlerMain);
  if (typeof leftMap !== 'undefined' && leftMap && overlayInfoClickHandlerLeft) leftMap.un('singleclick', overlayInfoClickHandlerLeft);
  if (typeof rightMap !== 'undefined' && rightMap && overlayInfoClickHandlerRight) rightMap.un('singleclick', overlayInfoClickHandlerRight);
}

fetch(capsUrl)
  .then(function (response) {
    return response.text();
  })
  .then(function (text) {
    // DOM elements (define first!)
    const mainMapDiv = document.getElementById('map');
    const splitToggle = document.getElementById('split-toggle');
    const splitMapsContainer = document.getElementById('split-maps-container');
    // Drawing menu DOM elements (must be after HTML exists)
    const drawMenuToggle = document.getElementById('draw-menu-toggle');
    const drawMenu = document.getElementById('draw-menu');
    const drawMarkerBtn = document.getElementById('draw-marker-btn');
    const drawLineBtn = document.getElementById('draw-line-btn');
    const drawPolygonBtn = document.getElementById('draw-polygon-btn');
    const drawMeasureBtn = document.getElementById('draw-measure-btn');

    const result = parser.read(text);

    function createTileLayer(layerId, onError) {
      const layerInfo = hardcodedLayers.find(l => l.id === layerId);
      if (layerInfo && layerInfo.type === 'osm') {
        return new TileLayer({
          opacity: 1,
          source: new OSM()
        });
      }
      if (layerInfo && layerInfo.type === 'mapbox') {
        const vtLayer = new VectorTileLayer({
          declutter: true,
          visible: true
        });
        applyStyle(vtLayer, layerInfo.styleUrl, { accessToken: mapboxAccessToken });
        return vtLayer;
      }
      if (layerInfo && layerInfo.type === 'esri_sat') {
        return new TileLayer({
          opacity: 1,
          source: new XYZ({
            url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attributions: 'Tiles © Esri'
          })
        });
      }
      if (layerInfo && layerInfo.type === 'cartodb_dark') {
        return new TileLayer({
          opacity: 1,
          source: new XYZ({
            url: 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            attributions: '© OpenStreetMap contributors © CARTO'
          })
        });
      }
      const options = optionsFromCapabilities(result, {
        layer: layerId,
        matrixSet: tileMatrixSet,
        requestEncoding: 'REST'
      });
      const optionsWithApiKey = {
        ...options,
        tileLoadFunction: (tile, src) => {
          tile.getImage().src = `${src}?api-key=${apiKey}`;
        }
      };
      const layer = new TileLayer({
        opacity: 1,
        source: new WMTS(optionsWithApiKey)
      });
      if (onError) {
        layer.getSource().once('tileloaderror', onError);
      }
      return layer;
    }

    // Helper to parse query params
    function getQueryParams() {
      const params = {};
      window.location.search.replace(/\??([^=&]+)=([^&]*)/g, function(_, k, v) {
        params[k] = decodeURIComponent(v);
      });
      return params;
    }

    // Helper to update the URL
    function updatePermalink(center, zoom, layerId, isSplitMode, leftLayerId, rightLayerId) {
      const [lon, lat] = toLonLat(center);
      const latStr = lat.toFixed(7);
      const lonStr = lon.toFixed(7);
      const z = Math.round(zoom * 1000) / 1000;
      let params = `?lat=${latStr}&lon=${lonStr}&z=${z}`;
      if (isSplitMode) {
        params += `&split=1&leftLayer=${leftLayerId}&rightLayer=${rightLayerId}`;
      } else {
        params += `&layer=${layerId}`;
      }
      // Add marker coordinates if present
      if (markerCoords && markerCoords.length === 2) {
        params += `&markerLat=${markerCoords[1].toFixed(7)}&markerLon=${markerCoords[0].toFixed(7)}`;
      }
      window.history.replaceState({}, '', params);
    }

    // Helper to convert to map projection
    function fromLonLatArr(coord) {
      return fromLonLat([parseFloat(coord[0]), parseFloat(coord[1])]);
    }

    // Read initial state from URL
    const params = getQueryParams();
    let initialLayerIdx = 1; // default to maastokartta
    let initialZoom = 5;
    let initialCenter = fromLonLat([24.94, 60.19]); // fallback only if missing
    let initialIsSplit = false;
    let initialLeftLayerId = hardcodedLayers[1].id;
    let initialRightLayerId = hardcodedLayers[0].id;
    if (params.lat && params.lon && params.z) {
      initialZoom = parseFloat(params.z);
      const lat = parseFloat(params.lat);
      const lon = parseFloat(params.lon);
      if (!isNaN(lat) && !isNaN(lon)) {
        initialCenter = fromLonLat([lon, lat]);
      }
    }
    if (params.split === '1') {
      initialIsSplit = true;
      if (params.leftLayer && hardcodedLayers.find(l => l.id === params.leftLayer)) {
        initialLeftLayerId = params.leftLayer;
      }
      if (params.rightLayer && hardcodedLayers.find(l => l.id === params.rightLayer)) {
        initialRightLayerId = params.rightLayer;
      }
    } else if (params.layer) {
      const idx = hardcodedLayers.findIndex(l => l.id === params.layer);
      if (idx !== -1) initialLayerIdx = idx;
    }

    // Create the initial map with the correct layer and view
    let currentLayer = createTileLayer(hardcodedLayers[initialLayerIdx].id, function() {
      alert('Failed to load tiles for layer: ' + hardcodedLayers[initialLayerIdx].name);
    });
    map = new Map({
      layers: [currentLayer],
      target: 'map',
      view: new View({
        center: initialCenter,
        zoom: initialZoom,
      }),
      controls: [] // We'll add controls manually
    });
    // Set initial left/right layer ids for split mode
    let leftLayerId = initialLeftLayerId;
    let rightLayerId = initialRightLayerId;
    // Enable overlay info click handlers now that map is defined

    // --- Layer selector dropdown creation ---
    function createLayerSelectorDropdown(initialId, onChange) {
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.top = '10px';
      div.style.right = '10px';
      div.style.zIndex = 10;
      div.style.background = 'rgba(255,255,255,0.97)';
      div.style.padding = '10px 12px';
      div.style.borderRadius = '10px';
      div.style.boxShadow = '0 2px 12px rgba(0,0,0,0.13)';
      div.style.maxWidth = '220px';
      div.style.minWidth = '120px';
      div.style.boxSizing = 'border-box';
      div.style.overflow = 'hidden';

      const select = document.createElement('select');
      select.style.width = '100%';
      select.style.fontSize = '1em';
      select.style.padding = '8px';
      select.style.borderRadius = '6px';
      select.style.border = '1px solid #ccc';
      select.style.margin = '0';
      select.style.background = 'white';
      select.style.cursor = 'pointer';
      select.style.outline = 'none';
      select.style.textOverflow = 'ellipsis';
      select.style.whiteSpace = 'nowrap';

      hardcodedLayers.forEach(layer => {
        const option = document.createElement('option');
        option.value = layer.id;
        option.text = layer.name;
        select.appendChild(option);
      });
      select.value = initialId;
      div.appendChild(select);

      select.addEventListener('change', function () {
        onChange(this.value);
      });

      return div;
    }

    // --- Single map layer selector ---
    let singleLayerSelectorDiv = null;
    function showSingleLayerSelector(show) {
      if (singleLayerSelectorDiv) singleLayerSelectorDiv.style.display = show ? 'block' : 'none';
    }
    function addSingleLayerSelectorToMap() {
      if (singleLayerSelectorDiv) singleLayerSelectorDiv.remove();
      singleLayerSelectorDiv = createLayerSelectorDropdown(hardcodedLayers[initialLayerIdx].id, function (newLayerId) {
        const newLayer = createTileLayer(newLayerId);
        map.getLayers().setAt(0, newLayer);
        // Update URL on layer change in single mode
        const view = map.getView();
        updatePermalink(view.getCenter(), view.getZoom(), newLayerId, false);
      });
      mainMapDiv.appendChild(singleLayerSelectorDiv);
      showSingleLayerSelector(true);
    }
    addSingleLayerSelectorToMap();

    // --- Split screen logic ---
    let leftMap = null;
    let rightMap = null;
    let isSplit = false;
    let leftLayerSelectorDiv = null;
    let rightLayerSelectorDiv = null;
    let leftMapMoveendListener = null;
    let rightMapMoveendListener = null;

    // --- Map synchronization for split screen ---
    function syncViews(mapA, mapB) {
      let syncing = false;
      const viewA = mapA.getView();
      const viewB = mapB.getView();
      function updateB() {
        if (syncing) return;
        syncing = true;
        const centerA = viewA.getCenter();
        const zoomA = viewA.getZoom();
        const rotationA = viewA.getRotation();
        const centerB = viewB.getCenter();
        const zoomB = viewB.getZoom();
        const rotationB = viewB.getRotation();
        // Only update if different
        if (
          centerA[0] !== centerB[0] ||
          centerA[1] !== centerB[1] ||
          zoomA !== zoomB ||
          rotationA !== rotationB
        ) {
          viewB.setCenter(centerA.slice());
          viewB.setZoom(zoomA);
          viewB.setRotation(rotationA);
        }
        syncing = false;
      }
      viewA.on('change:center', updateB);
      viewA.on('change:resolution', updateB);
      viewA.on('change:rotation', updateB);
    }

    // --- Original split screen functions ---
    function activateSplitScreen() {
      isSplit = true;
      mainMapDiv.style.display = 'none';
      splitMapsContainer.style.display = 'block';
      showSingleLayerSelector(false);
      if (leftMap) leftMap.setTarget(null);
      if (rightMap) rightMap.setTarget(null);
      if (leftLayerSelectorDiv) leftLayerSelectorDiv.remove();
      if (rightLayerSelectorDiv) rightLayerSelectorDiv.remove();
      const mainView = map.getView();
      const center = mainView.getCenter();
      const zoom = mainView.getZoom();
      const rotation = mainView.getRotation();
      leftMap = new Map({
        target: 'map-left',
        layers: [createTileLayer(leftLayerId)],
        view: new View({ center: center.slice(), zoom, rotation }),
        controls: []
      });
      rightMap = new Map({
        target: 'map-right',
        layers: [createTileLayer(rightLayerId)],
        view: new View({ center: center.slice(), zoom, rotation }),
        controls: []
      });
      // Add moveend listener to leftMap and rightMap
      leftMapMoveendListener = function () {
        if (!restoringFromPermalink && permalinkInitialized) updatePermalinkWithFeatures();
      };
      rightMapMoveendListener = function () {
        if (!restoringFromPermalink && permalinkInitialized) updatePermalinkWithFeatures();
      };
      leftMap.on('moveend', leftMapMoveendListener);
      rightMap.on('moveend', rightMapMoveendListener);
      // Layer selectors for split maps
      leftLayerSelectorDiv = createLayerSelectorDropdown(leftLayerId, function(newLayerId) {
        leftLayerId = newLayerId;
        const newLayer = createTileLayer(newLayerId);
        leftMap.getLayers().setAt(0, newLayer);
        updatePermalinkWithFeatures();
      });
      // Move left selector to left side
      leftLayerSelectorDiv.style.left = '10px';
      leftLayerSelectorDiv.style.right = 'auto';
      rightLayerSelectorDiv = createLayerSelectorDropdown(rightLayerId, function(newLayerId) {
        rightLayerId = newLayerId;
        const newLayer = createTileLayer(newLayerId);
        rightMap.getLayers().setAt(0, newLayer);
        updatePermalinkWithFeatures();
      });
      document.getElementById('map-left').appendChild(leftLayerSelectorDiv);
      document.getElementById('map-right').appendChild(rightLayerSelectorDiv);
      // Copy drawn features from main to left
      copyDrawnFeatures('main', 'left', map, leftMap);
      // Add drawn features to right for display only
      copyDrawnFeatures('main', 'right', map, rightMap);
      // Remove drawn features from main map
      clearDrawnFeatures('main', map);
      // Drawing interaction only on left map
      if (drawingMode === 'line' && drawnLineLayer.left) {
        // Re-add draw interaction if needed
      }
      if (drawingMode === 'polygon' && drawnPolygonLayer.left) {
        // Re-add draw interaction if needed
      }
    }
    function deactivateSplitScreen() {
      isSplit = false;
      splitMapsContainer.style.display = 'none';
      mainMapDiv.style.display = 'block';
      showSingleLayerSelector(true);
      if (leftMap) leftMap.setTarget(null);
      if (rightMap) rightMap.setTarget(null);
      if (leftLayerSelectorDiv) leftLayerSelectorDiv.remove();
      if (rightLayerSelectorDiv) rightLayerSelectorDiv.remove();
      // Remove moveend listeners
      if (leftMap && leftMapMoveendListener) leftMap.un('moveend', leftMapMoveendListener);
      leftMapMoveendListener = null;
      if (rightMap && rightMapMoveendListener) rightMap.un('moveend', rightMapMoveendListener);
      rightMapMoveendListener = null;
      // Copy drawn features from left to main
      copyDrawnFeatures('left', 'main', leftMap, map);
      // Remove drawn features from left/right
      clearDrawnFeatures('left', leftMap);
      clearDrawnFeatures('right', rightMap);
      // Drawing interaction only on main map
      if (drawingMode === 'line' && drawnLineLayer.main) {
        // Re-add draw interaction if needed
      }
      if (drawingMode === 'polygon' && drawnPolygonLayer.main) {
        // Re-add draw interaction if needed
      }
    }
    // --- Refactored split screen logic ---
    // Save original functions
    const _activateSplitScreen = activateSplitScreen;
    const _deactivateSplitScreen = deactivateSplitScreen;
    activateSplitScreen = function() {
      _activateSplitScreen();
      if (leftMap && rightMap) {
        syncViews(leftMap, rightMap);
        syncViews(rightMap, leftMap);
      }
      showAllDrawables();
    };
    deactivateSplitScreen = function() {
      _deactivateSplitScreen();
      showAllDrawables();
    };
    // If initialIsSplit, activate split screen after map is ready
    if (initialIsSplit) {
      setTimeout(() => {
        activateSplitScreen();
        splitToggle.textContent = 'Single screen';
        restoreFeaturesFromURL(params);
      }, 0);
    } else {
      restoreFeaturesFromURL(params);
    }

    splitToggle.addEventListener('click', function () {
      if (!isSplit) {
        activateSplitScreen();
        splitToggle.textContent = 'Single screen';
        if (drawingMode === 'marker') enableMarkerClickHandler();
        updatePermalinkWithFeatures();
      } else {
        deactivateSplitScreen();
        splitToggle.textContent = 'Split screen';
        if (drawingMode === 'marker') enableMarkerClickHandler();
        updatePermalinkWithFeatures();
      }
    });

    // Update URL on map moveend
    map.on('moveend', function () {
      if (!restoringFromPermalink && permalinkInitialized) {
        updatePermalinkWithFeatures();
      }
    });

    // Add default controls and our custom control
    import('ol/control').then(({ defaults }) => {
      defaults().extend([]).forEach(ctrl => map.addControl(ctrl));
    });

    // --- After map is created ---
    // Marker logic
    let searchMarkerLayer = null;
    let leftSearchMarkerLayer = null;
    let rightSearchMarkerLayer = null;
    let lastSearchCoords = null; // [lon, lat]

    function createSearchMarkerLayer(lon, lat) {
      const marker = new Feature({
        geometry: new Point(fromLonLat([lon, lat]))
      });
      marker.setStyle(new Style({
        image: new Icon({
          anchor: [0.5, 1],
          src: 'https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi2.png',
          scale: 1
        })
      }));
      const vectorSource = new VectorSource({ features: [marker] });
      return new VectorLayer({ source: vectorSource, zIndex: 100 });
    }

    function showSearchMarker(lon, lat) {
      lastSearchCoords = [lon, lat];
      // Remove previous marker layer if exists
      if (searchMarkerLayer) map.removeLayer(searchMarkerLayer);
      if (leftSearchMarkerLayer && leftMap) leftMap.removeLayer(leftSearchMarkerLayer);
      if (rightSearchMarkerLayer && rightMap) rightMap.removeLayer(rightSearchMarkerLayer);
      // Add to main map if not split
      if (!isSplit) {
        searchMarkerLayer = createSearchMarkerLayer(lon, lat);
        map.addLayer(searchMarkerLayer);
      } else {
        // Add to both split maps
        leftSearchMarkerLayer = createSearchMarkerLayer(lon, lat);
        rightSearchMarkerLayer = createSearchMarkerLayer(lon, lat);
        if (leftMap) leftMap.addLayer(leftSearchMarkerLayer);
        if (rightMap) rightMap.addLayer(rightSearchMarkerLayer);
      }
    }

    // Google Places Autocomplete logic
    if (window.google && window.google.maps && window.google.maps.places) {
      const input = document.getElementById('search-bar');
      if (input) {
        const autocomplete = new window.google.maps.places.Autocomplete(input, {
          types: ['geocode', 'establishment'],
        });
        autocomplete.addListener('place_changed', function () {
          const place = autocomplete.getPlace();
          if (!place.geometry || !place.geometry.location) {
            alert('No details available for input: ' + place.name);
            return;
          }
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          // Always update all maps to the searched location
          if (map && map.getView) {
            map.getView().setCenter(fromLonLat([lng, lat]));
            map.getView().setZoom(14);
          }
          if (leftMap && leftMap.getView) {
            leftMap.getView().setCenter(fromLonLat([lng, lat]));
            leftMap.getView().setZoom(14);
          }
          if (rightMap && rightMap.getView) {
            rightMap.getView().setCenter(fromLonLat([lng, lat]));
            rightMap.getView().setZoom(14);
          }
          showSearchMarker(lng, lat);
        });
      }
    } else {
      // If Google API is not loaded, show a warning in the console
      console.warn('Google Maps Places API not loaded. Search bar will not work.');
    }

    // --- Click marker logic ---
    function createClickMarkerLayer(lon, lat) {
      const marker = new Feature({
        geometry: new Point(fromLonLat([lon, lat]))
      });
      marker.setStyle(new Style({
        image: new Icon({
          anchor: [0.5, 1],
          src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="cyan" stroke="black" stroke-width="2"/></svg>',
          scale: 1
        })
      }));
      const vectorSource = new VectorSource({ features: [marker] });
      return new VectorLayer({ source: vectorSource, zIndex: 101 });
    }

    function showClickMarker(lon, lat) {
      lastClickCoords = lon != null && lat != null ? [lon, lat] : null;
      markerCoords = lastClickCoords;
      // Remove previous marker layer if exists
      if (clickMarkerLayer && map) map.removeLayer(clickMarkerLayer);
      if (leftClickMarkerLayer && leftMap) leftMap.removeLayer(leftClickMarkerLayer);
      if (rightClickMarkerLayer && rightMap) rightMap.removeLayer(rightClickMarkerLayer);
      // Add to main map if not split
      if (!isSplit) {
        if (lon != null && lat != null) {
          clickMarkerLayer = createClickMarkerLayer(lon, lat);
          map.addLayer(clickMarkerLayer);
        }
      } else {
        if (lon != null && lat != null) {
          leftClickMarkerLayer = createClickMarkerLayer(lon, lat);
          rightClickMarkerLayer = createClickMarkerLayer(lon, lat);
          if (leftMap) leftMap.addLayer(leftClickMarkerLayer);
          if (rightMap) rightMap.addLayer(rightClickMarkerLayer);
        }
      }
      updatePermalinkWithFeatures();
      // Re-enable overlay info click handlers after marker is placed
      drawingMode = null;
      enableOverlayInfoClickHandlers();
    }

    // --- Drawing mode state and handler management ---
    let markerClickHandlerActive = false;
    let markerClickHandlerActiveLeft = false;
    let markerClickHandlerActiveRight = false;
    let drawInteraction = null;
    function enableMarkerClickHandler() {
      if (!isSplit) {
        if (!markerClickHandlerActive) {
          map.on('singleclick', handleMapClick);
          markerClickHandlerActive = true;
        }
      } else {
        if (leftMap && !markerClickHandlerActiveLeft) {
          leftMap.on('singleclick', handleMapClick);
          markerClickHandlerActiveLeft = true;
        }
        if (rightMap && !markerClickHandlerActiveRight) {
          rightMap.on('singleclick', handleMapClick);
          markerClickHandlerActiveRight = true;
        }
      }
    }
    function disableMarkerClickHandler() {
      if (!isSplit) {
        if (markerClickHandlerActive) {
          map.un('singleclick', handleMapClick);
          markerClickHandlerActive = false;
        }
      } else {
        if (leftMap && markerClickHandlerActiveLeft) {
          leftMap.un('singleclick', handleMapClick);
          markerClickHandlerActiveLeft = false;
        }
        if (rightMap && markerClickHandlerActiveRight) {
          rightMap.un('singleclick', handleMapClick);
          markerClickHandlerActiveRight = false;
        }
      }
    }
    // By default, no drawing mode is active
    disableMarkerClickHandler();

    // Helper to create line layer from coordinates
    function createLineLayer(coords) {
      const vectorSource = new VectorSource();
      const feature = new Feature({ geometry: new LineString(coords) });
      feature.setStyle(new Style({ stroke: new Stroke({ color: 'blue', width: 3 }) }));
      vectorSource.addFeature(feature);
      return { layer: new VectorLayer({ source: vectorSource, zIndex: 102 }), feature };
    }
    // Helper to create polygon layer from coordinates
    function createPolygonLayer(coords) {
      const vectorSource = new VectorSource();
      const feature = new Feature({ geometry: new Polygon([coords]) });
      feature.setStyle(new Style({ fill: new Fill({ color: 'rgba(0,200,255,0.5)' }), stroke: new Stroke({ color: 'blue', width: 2 }) }));
      vectorSource.addFeature(feature);
      return { layer: new VectorLayer({ source: vectorSource, zIndex: 103 }), feature };
    }
    // Helper to create measure line layer from coordinates
    function createMeasureLineLayer(coords) {
      const vectorSource = new VectorSource();
      const feature = new Feature({ geometry: new LineString(coords) });
      feature.setStyle(new Style({ stroke: new Stroke({ color: 'orange', width: 3, lineDash: [8, 8] }) }));
      vectorSource.addFeature(feature);
      return { layer: new VectorLayer({ source: vectorSource, zIndex: 104 }), feature };
    }
    // Helper to create a label overlay for the measure
    function createMeasureLabelOverlay(coord, text) {
      const div = document.createElement('div');
      div.className = 'measure-label';
      div.style.background = 'rgba(255,255,255,0.9)';
      div.style.border = '1px solid #ffa500';
      div.style.borderRadius = '6px';
      div.style.padding = '2px 6px';
      div.style.fontSize = '13px';
      div.style.color = '#d2691e';
      div.style.fontWeight = 'bold';
      div.textContent = text;
      return new Overlay({
        element: div,
        position: coord,
        positioning: 'bottom-center',
        stopEvent: false
      });
    }
    // Helper to format length
    function formatLength(line) {
      const length = getLength(line);
      return length > 1000 ? (length / 1000).toFixed(2) + ' km' : length.toFixed(2) + ' m';
    }
    // Helper to clear measure line and label
    function clearMeasureLine(mapKey, mapObj) {
      if (measureLineLayer[mapKey] && mapObj) mapObj.removeLayer(measureLineLayer[mapKey]);
      measureLineLayer[mapKey] = null;
      measureLineFeature[mapKey] = null;
      if (measureLabelOverlay[mapKey] && mapObj) mapObj.removeOverlay(measureLabelOverlay[mapKey]);
      measureLabelOverlay[mapKey] = null;
    }

    // Helper to copy features between maps
    function copyDrawnFeatures(from, to, mapFrom, mapTo) {
      // Line
      if (drawnLineLayer[to] && mapTo) mapTo.removeLayer(drawnLineLayer[to]);
      drawnLineLayer[to] = null;
      drawnLineFeature[to] = null;
      if (drawnLineFeature[from]) {
        const coords = drawnLineFeature[from].getGeometry().getCoordinates();
        const { layer, feature } = createLineLayer(coords);
        drawnLineLayer[to] = layer;
        drawnLineFeature[to] = feature;
        if (mapTo) mapTo.addLayer(layer);
      }
      // Polygon
      if (drawnPolygonLayer[to] && mapTo) mapTo.removeLayer(drawnPolygonLayer[to]);
      drawnPolygonLayer[to] = null;
      drawnPolygonFeature[to] = null;
      if (drawnPolygonFeature[from]) {
        const coords = drawnPolygonFeature[from].getGeometry().getCoordinates()[0];
        const { layer, feature } = createPolygonLayer(coords);
        drawnPolygonLayer[to] = layer;
        drawnPolygonFeature[to] = feature;
        if (mapTo) mapTo.addLayer(layer);
      }
      // Measure line
      if (measureLineLayer[to] && mapTo) mapTo.removeLayer(measureLineLayer[to]);
      if (measureLabelOverlay[to] && mapTo) mapTo.removeOverlay(measureLabelOverlay[to]);
      measureLineLayer[to] = null;
      measureLineFeature[to] = null;
      measureLabelOverlay[to] = null;
      if (measureLineFeature[from]) {
        const coords = measureLineFeature[from].getGeometry().getCoordinates();
        const { layer, feature } = createMeasureLineLayer(coords);
        measureLineLayer[to] = layer;
        measureLineFeature[to] = feature;
        if (mapTo) mapTo.addLayer(layer);
        // Add label overlay for measure only
        const len = formatLength(feature.getGeometry());
        const overlay = createMeasureLabelOverlay(coords[coords.length - 1], len);
        if (mapTo) mapTo.addOverlay(overlay);
        measureLabelOverlay[to] = overlay;
      }
    }

    // Helper to clear drawn features for a given mapKey ('main', 'left', 'right')
    function clearDrawnFeatures(mapKey, mapObj) {
      if (drawnLineLayer[mapKey] && mapObj) mapObj.removeLayer(drawnLineLayer[mapKey]);
      drawnLineLayer[mapKey] = null;
      drawnLineFeature[mapKey] = null;
      if (drawnPolygonLayer[mapKey] && mapObj) mapObj.removeLayer(drawnPolygonLayer[mapKey]);
      drawnPolygonLayer[mapKey] = null;
      drawnPolygonFeature[mapKey] = null;
      // Also clear measure line
      clearMeasureLine(mapKey, mapObj);
    }

    // --- Robust marker-style helpers for all drawables ---
    function showLine(coords) {
      lineCoords = coords && coords.length >= 2 ? coords : null;
      // Remove existing
      if (!isSplit) {
        if (drawnLineLayer.main && map) map.removeLayer(drawnLineLayer.main);
        drawnLineLayer.main = null;
        drawnLineFeature.main = null;
        if (coords && coords.length >= 2) {
          const { layer, feature } = createLineLayer(coords);
          drawnLineLayer.main = layer;
          drawnLineFeature.main = feature;
          map.addLayer(layer);
        }
      } else {
        if (drawnLineLayer.left && leftMap) leftMap.removeLayer(drawnLineLayer.left);
        if (drawnLineLayer.right && rightMap) rightMap.removeLayer(drawnLineLayer.right);
        drawnLineLayer.left = drawnLineLayer.right = null;
        drawnLineFeature.left = drawnLineFeature.right = null;
        if (coords && coords.length >= 2) {
          // Left
          const { layer: layerLeft, feature: featureLeft } = createLineLayer(coords);
          drawnLineLayer.left = layerLeft;
          drawnLineFeature.left = featureLeft;
          leftMap.addLayer(layerLeft);
          // Right
          const { layer: layerRight, feature: featureRight } = createLineLayer(coords);
          drawnLineLayer.right = layerRight;
          drawnLineFeature.right = featureRight;
          rightMap.addLayer(layerRight);
        }
      }
    }
    function showPolygon(coords) {
      polygonCoords = coords && coords.length >= 3 ? coords : null;
      // Remove existing
      if (!isSplit) {
        if (drawnPolygonLayer.main && map) map.removeLayer(drawnPolygonLayer.main);
        drawnPolygonLayer.main = null;
        drawnPolygonFeature.main = null;
        if (coords && coords.length >= 3) {
          const { layer, feature } = createPolygonLayer(coords);
          drawnPolygonLayer.main = layer;
          drawnPolygonFeature.main = feature;
          map.addLayer(layer);
        }
      } else {
        if (drawnPolygonLayer.left && leftMap) leftMap.removeLayer(drawnPolygonLayer.left);
        if (drawnPolygonLayer.right && rightMap) rightMap.removeLayer(drawnPolygonLayer.right);
        drawnPolygonLayer.left = drawnPolygonLayer.right = null;
        drawnPolygonFeature.left = drawnPolygonFeature.right = null;
        if (coords && coords.length >= 3) {
          // Left
          const { layer: layerLeft, feature: featureLeft } = createPolygonLayer(coords);
          drawnPolygonLayer.left = layerLeft;
          drawnPolygonFeature.left = featureLeft;
          leftMap.addLayer(layerLeft);
          // Right
          const { layer: layerRight, feature: featureRight } = createPolygonLayer(coords);
          drawnPolygonLayer.right = layerRight;
          drawnPolygonFeature.right = featureRight;
          rightMap.addLayer(layerRight);
        }
      }
    }
    function showMeasureLine(coords) {
      measureCoords = coords && coords.length >= 2 ? coords : null;
      // Remove existing
      if (!isSplit) {
        if (measureLineLayer.main && map) map.removeLayer(measureLineLayer.main);
        if (measureLabelOverlay.main && map) map.removeOverlay(measureLabelOverlay.main);
        measureLineLayer.main = null;
        measureLineFeature.main = null;
        measureLabelOverlay.main = null;
        if (coords && coords.length >= 2) {
          const { layer, feature } = createMeasureLineLayer(coords);
          measureLineLayer.main = layer;
          measureLineFeature.main = feature;
          map.addLayer(layer);
          const len = formatLength(feature.getGeometry());
          const overlay = createMeasureLabelOverlay(coords[coords.length - 1], len);
          map.addOverlay(overlay);
          measureLabelOverlay.main = overlay;
        }
      } else {
        if (measureLineLayer.left && leftMap) leftMap.removeLayer(measureLineLayer.left);
        if (measureLabelOverlay.left && leftMap) leftMap.removeOverlay(measureLabelOverlay.left);
        if (measureLineLayer.right && rightMap) rightMap.removeLayer(measureLineLayer.right);
        if (measureLabelOverlay.right && rightMap) rightMap.removeOverlay(measureLabelOverlay.right);
        measureLineLayer.left = measureLineLayer.right = null;
        measureLineFeature.left = measureLineFeature.right = null;
        measureLabelOverlay.left = measureLabelOverlay.right = null;
        if (coords && coords.length >= 2) {
          // Left
          const { layer: layerLeft, feature: featureLeft } = createMeasureLineLayer(coords);
          measureLineLayer.left = layerLeft;
          measureLineFeature.left = featureLeft;
          leftMap.addLayer(layerLeft);
          const len = formatLength(featureLeft.getGeometry());
          const overlayLeft = createMeasureLabelOverlay(coords[coords.length - 1], len);
          leftMap.addOverlay(overlayLeft);
          measureLabelOverlay.left = overlayLeft;
          // Right
          const { layer: layerRight, feature: featureRight } = createMeasureLineLayer(coords);
          measureLineLayer.right = layerRight;
          measureLineFeature.right = featureRight;
          rightMap.addLayer(layerRight);
          const overlayRight = createMeasureLabelOverlay(coords[coords.length - 1], len);
          rightMap.addOverlay(overlayRight);
          measureLabelOverlay.right = overlayRight;
        }
      }
    }

    // --- Drawing tool selection (refactored for per-map) ---
    drawLineBtn.addEventListener('click', function () {
      drawingMode = 'line';
      clearAllMarkers();
      disableOverlayInfoClickHandlers();
      if (!isSplit) {
        clearDrawInteraction();
        clearDrawnFeatures('main', map);
        drawMenu.style.display = 'none';
        disableMarkerClickHandler();
        // Add draw interaction for line
        const vectorSource = new VectorSource();
        drawnLineLayer.main = new VectorLayer({ source: vectorSource, zIndex: 102, style: new Style({ stroke: new Stroke({ color: 'blue', width: 3 }) }) });
        map.addLayer(drawnLineLayer.main);
        drawInteraction = new Draw({ source: vectorSource, type: 'LineString', maxPoints: 2 });
        drawInteraction.on('drawend', function (evt) {
          const coords = evt.feature.getGeometry().getCoordinates();
          showLine(coords);
          clearDrawInteraction();
          drawingMode = null;
          enableOverlayInfoClickHandlers();
          updatePermalinkWithFeatures();
        });
        map.addInteraction(drawInteraction);
      } else {
        clearDrawInteraction();
        clearDrawnFeatures('left', leftMap);
        clearDrawnFeatures('right', rightMap);
        drawMenu.style.display = 'none';
        disableMarkerClickHandler();
        // Add draw interaction for line on both left and right maps
        const vectorSourceLeft = new VectorSource();
        drawnLineLayer.left = new VectorLayer({ source: vectorSourceLeft, zIndex: 102, style: new Style({ stroke: new Stroke({ color: 'blue', width: 3 }) }) });
        leftMap.addLayer(drawnLineLayer.left);
        const vectorSourceRight = new VectorSource();
        drawnLineLayer.right = new VectorLayer({ source: vectorSourceRight, zIndex: 102, style: new Style({ stroke: new Stroke({ color: 'blue', width: 3 }) }) });
        rightMap.addLayer(drawnLineLayer.right);
        // Draw interaction for left map
        const drawInteractionLeft = new Draw({ source: vectorSourceLeft, type: 'LineString', maxPoints: 2 });
        drawInteractionLeft.on('drawend', function (evt) {
          const coords = evt.feature.getGeometry().getCoordinates();
          showLine(coords);
          clearDrawInteraction();
          drawingMode = null;
          enableOverlayInfoClickHandlers();
          updatePermalinkWithFeatures();
        });
        leftMap.addInteraction(drawInteractionLeft);
        // Draw interaction for right map
        const drawInteractionRight = new Draw({ source: vectorSourceRight, type: 'LineString', maxPoints: 2 });
        drawInteractionRight.on('drawend', function (evt) {
          const coords = evt.feature.getGeometry().getCoordinates();
          showLine(coords);
          clearDrawInteraction();
          drawingMode = null;
          enableOverlayInfoClickHandlers();
          updatePermalinkWithFeatures();
        });
        rightMap.addInteraction(drawInteractionRight);
        drawInteraction = { left: drawInteractionLeft, right: drawInteractionRight };
      }
    });
    drawPolygonBtn.addEventListener('click', function () {
      drawingMode = 'polygon';
      clearAllMarkers();
      disableOverlayInfoClickHandlers();
      if (!isSplit) {
        clearDrawInteraction();
        clearDrawnFeatures('main', map);
        drawMenu.style.display = 'none';
        disableMarkerClickHandler();
        // Add draw interaction for polygon
        const vectorSource = new VectorSource();
        drawnPolygonLayer.main = new VectorLayer({ source: vectorSource, zIndex: 103, style: new Style({ fill: new Fill({ color: 'rgba(0,200,255,0.5)' }), stroke: new Stroke({ color: 'blue', width: 2 }) }) });
        map.addLayer(drawnPolygonLayer.main);
        drawInteraction = new Draw({ source: vectorSource, type: 'Polygon' });
        drawInteraction.on('drawend', function (evt) {
          const coords = evt.feature.getGeometry().getCoordinates()[0];
          showPolygon(coords);
          clearDrawInteraction();
          drawingMode = null;
          enableOverlayInfoClickHandlers();
          updatePermalinkWithFeatures();
        });
        map.addInteraction(drawInteraction);
      } else {
        clearDrawInteraction();
        clearDrawnFeatures('left', leftMap);
        clearDrawnFeatures('right', rightMap);
        drawMenu.style.display = 'none';
        disableMarkerClickHandler();
        // Add draw interaction for polygon on both left and right maps
        const vectorSourceLeft = new VectorSource();
        drawnPolygonLayer.left = new VectorLayer({ source: vectorSourceLeft, zIndex: 103, style: new Style({ fill: new Fill({ color: 'rgba(0,200,255,0.5)' }), stroke: new Stroke({ color: 'blue', width: 2 }) }) });
        leftMap.addLayer(drawnPolygonLayer.left);
        const vectorSourceRight = new VectorSource();
        drawnPolygonLayer.right = new VectorLayer({ source: vectorSourceRight, zIndex: 103, style: new Style({ fill: new Fill({ color: 'rgba(0,200,255,0.5)' }), stroke: new Stroke({ color: 'blue', width: 2 }) }) });
        rightMap.addLayer(drawnPolygonLayer.right);
        // Draw interaction for left map
        const drawInteractionLeft = new Draw({ source: vectorSourceLeft, type: 'Polygon' });
        drawInteractionLeft.on('drawend', function (evt) {
          const coords = evt.feature.getGeometry().getCoordinates()[0];
          showPolygon(coords);
          clearDrawInteraction();
          drawingMode = null;
          enableOverlayInfoClickHandlers();
          updatePermalinkWithFeatures();
        });
        leftMap.addInteraction(drawInteractionLeft);
        // Draw interaction for right map
        const drawInteractionRight = new Draw({ source: vectorSourceRight, type: 'Polygon' });
        drawInteractionRight.on('drawend', function (evt) {
          const coords = evt.feature.getGeometry().getCoordinates()[0];
          showPolygon(coords);
          clearDrawInteraction();
          drawingMode = null;
          enableOverlayInfoClickHandlers();
          updatePermalinkWithFeatures();
        });
        rightMap.addInteraction(drawInteractionRight);
        drawInteraction = { left: drawInteractionLeft, right: drawInteractionRight };
      }
    });
    drawMeasureBtn.addEventListener('click', function () {
      drawingMode = 'measure';
      clearAllMarkers();
      disableOverlayInfoClickHandlers();
      if (!isSplit) {
        clearDrawInteraction();
        clearDrawnFeatures('main', map);
        clearMeasureLine('main', map);
        drawMenu.style.display = 'none';
        disableMarkerClickHandler();
        // Add draw interaction for measure line
        const vectorSource = new VectorSource();
        measureLineLayer.main = new VectorLayer({ source: vectorSource, zIndex: 104, style: new Style({ stroke: new Stroke({ color: 'orange', width: 3, lineDash: [8, 8] }) }) });
        map.addLayer(measureLineLayer.main);
        drawInteraction = new Draw({ source: vectorSource, type: 'LineString' });
        let labelOverlay = null;
        drawInteraction.on('drawstart', function (evt) {
          if (measureLabelOverlay.main && map) map.removeOverlay(measureLabelOverlay.main);
          const geom = evt.feature.getGeometry();
          geom.on('change', function () {
            const coords = geom.getCoordinates();
            if (coords.length > 1) {
              const len = formatLength(geom);
              if (!labelOverlay) {
                labelOverlay = createMeasureLabelOverlay(coords[coords.length - 1], len);
                map.addOverlay(labelOverlay);
              } else {
                labelOverlay.setPosition(coords[coords.length - 1]);
                labelOverlay.getElement().textContent = len;
              }
            }
          });
        });
        drawInteraction.on('drawend', function (evt) {
          const coords = evt.feature.getGeometry().getCoordinates();
          showMeasureLine(coords);
          clearDrawInteraction();
          drawingMode = null;
          enableOverlayInfoClickHandlers();
          updatePermalinkWithFeatures();
        });
        map.addInteraction(drawInteraction);
      } else {
        clearDrawInteraction();
        clearDrawnFeatures('left', leftMap);
        clearDrawnFeatures('right', rightMap);
        clearMeasureLine('left', leftMap);
        clearMeasureLine('right', rightMap);
        drawMenu.style.display = 'none';
        disableMarkerClickHandler();
        // Add draw interaction for measure line on both left and right maps
        const vectorSourceLeft = new VectorSource();
        measureLineLayer.left = new VectorLayer({ source: vectorSourceLeft, zIndex: 104, style: new Style({ stroke: new Stroke({ color: 'orange', width: 3, lineDash: [8, 8] }) }) });
        leftMap.addLayer(measureLineLayer.left);
        const vectorSourceRight = new VectorSource();
        measureLineLayer.right = new VectorLayer({ source: vectorSourceRight, zIndex: 104, style: new Style({ stroke: new Stroke({ color: 'orange', width: 3, lineDash: [8, 8] }) }) });
        rightMap.addLayer(measureLineLayer.right);
        // Draw interaction for left map
        const drawInteractionLeft = new Draw({ source: vectorSourceLeft, type: 'LineString' });
        let labelOverlayLeft = null;
        let rightFeature = null;
        let labelOverlayRight = null;
        drawInteractionLeft.on('drawstart', function (evt) {
          if (measureLabelOverlay.left && leftMap) leftMap.removeOverlay(measureLabelOverlay.left);
          if (measureLabelOverlay.right && rightMap) rightMap.removeOverlay(measureLabelOverlay.right);
          const geom = evt.feature.getGeometry();
          // Create matching feature on right map
          rightFeature = new Feature({ geometry: new LineString([]) });
          rightFeature.setStyle(new Style({ stroke: new Stroke({ color: 'orange', width: 3, lineDash: [8, 8] }) }));
          vectorSourceRight.clear();
          vectorSourceRight.addFeature(rightFeature);
          geom.on('change', function () {
            const coords = geom.getCoordinates();
            if (coords.length > 1) {
              const len = formatLength(geom);
              if (!labelOverlayLeft) {
                labelOverlayLeft = createMeasureLabelOverlay(coords[coords.length - 1], len);
                leftMap.addOverlay(labelOverlayLeft);
              } else {
                labelOverlayLeft.setPosition(coords[coords.length - 1]);
                labelOverlayLeft.getElement().textContent = len;
              }
              // Sync right
              rightFeature.getGeometry().setCoordinates(coords);
              if (!labelOverlayRight) {
                labelOverlayRight = createMeasureLabelOverlay(coords[coords.length - 1], len);
                rightMap.addOverlay(labelOverlayRight);
              } else {
                labelOverlayRight.setPosition(coords[coords.length - 1]);
                labelOverlayRight.getElement().textContent = len;
              }
            }
          });
        });
        drawInteractionLeft.on('drawend', function (evt) {
          const coords = evt.feature.getGeometry().getCoordinates();
          showMeasureLine(coords);
          clearDrawInteraction();
          drawingMode = null;
          enableOverlayInfoClickHandlers();
          updatePermalinkWithFeatures();
        });
        leftMap.addInteraction(drawInteractionLeft);
        // Draw interaction for right map
        const drawInteractionRight = new Draw({ source: vectorSourceRight, type: 'LineString' });
        let labelOverlayRight2 = null;
        let leftFeature = null;
        let labelOverlayLeft2 = null;
        drawInteractionRight.on('drawstart', function (evt) {
          if (measureLabelOverlay.right && rightMap) rightMap.removeOverlay(measureLabelOverlay.right);
          if (measureLabelOverlay.left && leftMap) leftMap.removeOverlay(measureLabelOverlay.left);
          const geom = evt.feature.getGeometry();
          // Create matching feature on left map
          leftFeature = new Feature({ geometry: new LineString([]) });
          leftFeature.setStyle(new Style({ stroke: new Stroke({ color: 'orange', width: 3, lineDash: [8, 8] }) }));
          vectorSourceLeft.clear();
          vectorSourceLeft.addFeature(leftFeature);
          geom.on('change', function () {
            const coords = geom.getCoordinates();
            if (coords.length > 1) {
              const len = formatLength(geom);
              if (!labelOverlayRight2) {
                labelOverlayRight2 = createMeasureLabelOverlay(coords[coords.length - 1], len);
                rightMap.addOverlay(labelOverlayRight2);
              } else {
                labelOverlayRight2.setPosition(coords[coords.length - 1]);
                labelOverlayRight2.getElement().textContent = len;
              }
              // Sync left
              leftFeature.getGeometry().setCoordinates(coords);
              if (!labelOverlayLeft2) {
                labelOverlayLeft2 = createMeasureLabelOverlay(coords[coords.length - 1], len);
                leftMap.addOverlay(labelOverlayLeft2);
              } else {
                labelOverlayLeft2.setPosition(coords[coords.length - 1]);
                labelOverlayLeft2.getElement().textContent = len;
              }
            }
          });
        });
        drawInteractionRight.on('drawend', function (evt) {
          const coords = evt.feature.getGeometry().getCoordinates();
          showMeasureLine(coords);
          clearDrawInteraction();
          drawingMode = null;
          enableOverlayInfoClickHandlers();
          updatePermalinkWithFeatures();
        });
        rightMap.addInteraction(drawInteractionRight);
        drawInteraction = { left: drawInteractionLeft, right: drawInteractionRight };
      }
    });
    drawMarkerBtn.addEventListener('click', function () {
      drawingMode = 'marker';
      clearAllMarkers();
      clearDrawInteraction();
      clearDrawnFeatures('main', map);
      if (leftMap) clearDrawnFeatures('left', leftMap);
      if (rightMap) clearDrawnFeatures('right', rightMap);
      drawMenu.style.display = 'none';
      enableMarkerClickHandler();
      disableOverlayInfoClickHandlers();
    });

    // --- Restore features from URL on load ---
    function restoreFeaturesFromURL(params) {
      restoringFromPermalink = true;
      drawingMode = null;
      // Marker
      markerCoords = null;
      if (params.markerLat && params.markerLon) {
        const lat = parseFloat(params.markerLat);
        const lon = parseFloat(params.markerLon);
        if (!isNaN(lat) && !isNaN(lon)) {
          markerCoords = [lon, lat];
        }
      }
      // Line
      lineCoords = null;
      if (params.line) {
        const coords = params.line.split(';').map(pair => pair.split(',').map(Number));
        if (coords.length >= 2 && coords.every(pair => pair.length === 2 && !isNaN(pair[0]) && !isNaN(pair[1]))) {
          lineCoords = coords.map(pair => fromLonLat([pair[0], pair[1]]));
        }
      }
      // Polygon
      polygonCoords = null;
      if (params.polygon) {
        const coords = params.polygon.split(';').map(pair => pair.split(',').map(Number));
        if (coords.length >= 3 && coords.every(pair => pair.length === 2 && !isNaN(pair[0]) && !isNaN(pair[1]))) {
          polygonCoords = coords.map(pair => fromLonLat([pair[0], pair[1]]));
        }
      }
      // Measure line
      measureCoords = null;
      if (params.measure) {
        const coords = params.measure.split(';').map(pair => pair.split(',').map(Number));
        if (coords.length >= 2 && coords.every(pair => pair.length === 2 && !isNaN(pair[0]) && !isNaN(pair[1]))) {
          measureCoords = coords.map(pair => fromLonLat([pair[0], pair[1]]));
        }
      }
      // Overlays
      overlayLayers = [];
      if (params.overlays) {
        overlayLayers = params.overlays.split(';').filter(Boolean);
        digiroadOverlayLayers = overlayLayers.filter(name => digiroadOverlayList.some(l => l.name === name));
        genericOverlayLayers = overlayLayers.filter(name => genericOverlayList.some(l => l.name === name));
        updateAllOverlays();
      }
      showAllDrawables();
      restoringFromPermalink = false;
      permalinkInitialized = true;
      updatePermalinkWithFeatures();
    }

    drawMenuToggle.addEventListener('click', function () {
      const style = window.getComputedStyle(drawMenu);
      if (style.display === 'none') {
        drawMenu.style.display = 'block';
      } else {
        drawMenu.style.display = 'none';
      }
    });

    // Remove features button logic (clear all drawn features and markers in all modes)
    const removeFeaturesBtn = document.getElementById('remove-features-btn');
    if (removeFeaturesBtn) {
      removeFeaturesBtn.addEventListener('click', function () {
        // Clear drawn features for all maps
        clearDrawnFeatures('main', map);
        if (leftMap) clearDrawnFeatures('left', leftMap);
        if (rightMap) clearDrawnFeatures('right', rightMap);
        clearMeasureLine('main', map);
        if (leftMap) clearMeasureLine('left', leftMap);
        if (rightMap) clearMeasureLine('right', rightMap);
        // Remove all marker layers
        if (clickMarkerLayer && map) map.removeLayer(clickMarkerLayer);
        if (searchMarkerLayer && map) map.removeLayer(searchMarkerLayer);
        if (leftClickMarkerLayer && leftMap) leftMap.removeLayer(leftClickMarkerLayer);
        if (rightClickMarkerLayer && rightMap) rightMap.removeLayer(rightClickMarkerLayer);
        if (leftSearchMarkerLayer && leftMap) leftMap.removeLayer(leftSearchMarkerLayer);
        if (rightSearchMarkerLayer && rightMap) rightMap.removeLayer(rightSearchMarkerLayer);
        clickMarkerLayer = null;
        searchMarkerLayer = null;
        leftClickMarkerLayer = null;
        rightClickMarkerLayer = null;
        leftSearchMarkerLayer = null;
        rightSearchMarkerLayer = null;
        markerCoords = null;
        lineCoords = null;
        polygonCoords = null;
        measureCoords = null;
        // Update URL
        updatePermalinkWithFeatures();
      });
    }

    // Helper to clear marker from all maps
    function clearAllMarkers() {
      if (clickMarkerLayer && map) map.removeLayer(clickMarkerLayer);
      if (leftClickMarkerLayer && leftMap) leftMap.removeLayer(leftClickMarkerLayer);
      if (rightClickMarkerLayer && rightMap) rightMap.removeLayer(rightClickMarkerLayer);
      clickMarkerLayer = null;
      leftClickMarkerLayer = null;
      rightClickMarkerLayer = null;
      markerCoords = null;
    }

    // Add CSS for measure label if not present
    if (!document.getElementById('measure-label-style')) {
      const style = document.createElement('style');
      style.id = 'measure-label-style';
      style.textContent = `.measure-label { pointer-events: none; }`;
      document.head.appendChild(style);
    }

    // Only allow marker placement when marker tool is active
    function handleMapClick(evt) {
      if (drawingMode === 'marker') {
        const coord = toLonLat(evt.coordinate);
        showClickMarker(coord[0], coord[1]);
      }
    }

    // Helper to clear drawing interactions
    function clearDrawInteraction() {
      if (!isSplit) {
        if (drawInteraction && map) map.removeInteraction(drawInteraction);
      } else {
        if (drawInteraction && drawInteraction.left && leftMap) leftMap.removeInteraction(drawInteraction.left);
        if (drawInteraction && drawInteraction.right && rightMap) rightMap.removeInteraction(drawInteraction.right);
      }
      drawInteraction = null;
    }

    // Add after permalinkInitialized and before first use
    function updatePermalinkWithFeatures() {
      if (restoringFromPermalink || !permalinkInitialized) return;
      let markerStr = '';
      if (markerCoords && markerCoords.length === 2) {
        markerStr = `&markerLat=${markerCoords[1].toFixed(7)}&markerLon=${markerCoords[0].toFixed(7)}`;
      }
      let lineStr = '';
      if (lineCoords && lineCoords.length >= 2) {
        const coords = lineCoords.map(c => toLonLat(c).map(n => n.toFixed(7)));
        lineStr = `&line=${coords.map(pair => pair.join(",")).join(';')}`;
      }
      let polyStr = '';
      if (polygonCoords && polygonCoords.length >= 3) {
        const coords = polygonCoords.map(c => toLonLat(c).map(n => n.toFixed(7)));
        polyStr = `&polygon=${coords.map(pair => pair.join(",")).join(';')}`;
      }
      let measureStr = '';
      if (measureCoords && measureCoords.length >= 2) {
        const coords = measureCoords.map(c => toLonLat(c).map(n => n.toFixed(7)));
        measureStr = `&measure=${coords.map(pair => pair.join(",")).join(';')}`;
      }
      let overlaysStr = '';
      const allOverlays = [...digiroadOverlayLayers, ...genericOverlayLayers];
      if (allOverlays.length > 0) {
        overlaysStr = `&overlays=${allOverlays.join(';')}`;
      }
      const view = isSplit && leftMap ? leftMap.getView() : map.getView();
      const zoom = view.getZoom();
      const center = view.getCenter();
      let params = `?lat=${toLonLat(center)[1].toFixed(7)}&lon=${toLonLat(center)[0].toFixed(7)}&z=${Math.round(zoom * 1000) / 1000}`;
      if (isSplit) {
        params += `&split=1&leftLayer=${leftLayerId}&rightLayer=${rightLayerId}`;
      } else {
        let layerId = map.getLayers().item(0).getSource().getLayer ? map.getLayers().item(0).getSource().getLayer() : hardcodedLayers[initialLayerIdx].id;
        params += `&layer=${layerId}`;
      }
      params += markerStr + lineStr + polyStr + measureStr + overlaysStr;
      window.history.replaceState({}, '', params);
    }

    // Replace all feature copying/clearing logic with robust show* logic
    function showAllDrawables() {
      showClickMarker(markerCoords ? markerCoords[0] : null, markerCoords ? markerCoords[1] : null);
      showLine(lineCoords);
      showPolygon(polygonCoords);
      showMeasureLine(measureCoords);
    }

    // Fetch and parse WMS overlays
    fetch(wmsCapabilitiesUrl)
      .then(r => r.text())
      .then(xmlText => {
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, 'text/xml');
        const layers = Array.from(xml.querySelectorAll('Layer > Layer'));
        digiroadOverlayList = layers.map(layer => {
          const name = layer.querySelector('Name')?.textContent;
          const title = layer.querySelector('Title')?.textContent;
          const legendUrl = layer.querySelector('LegendURL OnlineResource')?.getAttribute('xlink:href');
          if (name && title) {
            if (legendUrl) wmsOverlayLegends[name] = legendUrl;
            return { name, title, type: 'wms' };
          }
          return null;
        }).filter(Boolean);
        // After overlays loaded, add overlay selectors
        addOverlaySelectorToMap();
      });
    // --- Overlay state for both menus ---

    function createWMSOverlayLayer(layerName) {
      // Default WMS
      return new TileLayer({
        opacity: 0.7,
        source: new TileWMS({
          url: wmsUrl,
          params: { LAYERS: layerName, TRANSPARENT: true, VERSION: '1.3.0' },
          crossOrigin: 'anonymous',
        }),
        zIndex: 50,
      });
    }

    function updateAllOverlays() {
      // Remove all overlays from all maps
      ['main', 'left', 'right'].forEach(key => {
        (overlayLayerObjects[key] || []).forEach(layer => {
          if (key === 'main' && map) map.removeLayer(layer);
          if (key === 'left' && leftMap) leftMap.removeLayer(layer);
          if (key === 'right' && rightMap) rightMap.removeLayer(layer);
        });
        overlayLayerObjects[key] = [];
        (genericOverlayLayerObjects[key] || []).forEach(layer => {
          if (key === 'main' && map) map.removeLayer(layer);
          if (key === 'left' && leftMap) leftMap.removeLayer(layer);
          if (key === 'right' && rightMap) rightMap.removeLayer(layer);
        });
        genericOverlayLayerObjects[key] = [];
      });
      // Add Digiroad overlays to all active maps
      digiroadOverlayLayers.forEach(layerName => {
        const layer = createWMSOverlayLayer(layerName);
        overlayLayerObjects.main.push(layer);
        if (map) map.addLayer(layer);
        if (isSplit) {
          const leftLayer = createWMSOverlayLayer(layerName);
          overlayLayerObjects.left.push(leftLayer);
          if (leftMap) leftMap.addLayer(leftLayer);
          const rightLayer = createWMSOverlayLayer(layerName);
          overlayLayerObjects.right.push(rightLayer);
          if (rightMap) rightMap.addLayer(rightLayer);
        }
      });
      // Add generic overlays to all active maps
      genericOverlayLayers.forEach(layerName => {
        const layer = createWMSOverlayLayer(layerName);
        genericOverlayLayerObjects.main.push(layer);
        if (map) map.addLayer(layer);
        if (isSplit) {
          const leftLayer = createWMSOverlayLayer(layerName);
          genericOverlayLayerObjects.left.push(leftLayer);
          if (leftMap) leftMap.addLayer(leftLayer);
          const rightLayer = createWMSOverlayLayer(layerName);
          genericOverlayLayerObjects.right.push(rightLayer);
          if (rightMap) rightMap.addLayer(rightLayer);
        }
      });
    }

    function getOverlaySummary(selected, overlayList) {
      if (!selected || selected.length === 0) return 'No overlays';
      if (selected.length === 1) {
        const found = overlayList.find(l => l.name === selected[0]);
        return found ? found.title : selected[0];
      }
      if (selected.length <= 2) {
        return selected.map(n => {
          const found = overlayList.find(l => l.name === n);
          return found ? found.title : n;
        }).join(', ');
      }
      return `${selected.length} selected`;
    }

    function createOverlayDropdown(mapKey, selected, onChange, overlayList, labelText) {
      let dropdownButton = document.createElement('button');
      dropdownButton.type = 'button';
      dropdownButton.className = 'overlay-dropdown-btn';
      dropdownButton.style.width = '100%';
      dropdownButton.style.textAlign = 'left';
      dropdownButton.style.padding = '8px';
      dropdownButton.style.borderRadius = '6px';
      dropdownButton.style.border = '1px solid #ccc';
      dropdownButton.style.background = 'white';
      dropdownButton.style.cursor = 'pointer';
      dropdownButton.style.fontSize = '1em';
      dropdownButton.style.margin = '0';
      dropdownButton.style.boxSizing = 'border-box';
      dropdownButton.style.outline = 'none';
      dropdownButton.style.position = 'relative';
      dropdownButton.textContent = getOverlaySummary(selected, overlayList);
      let dropdownPanel = document.createElement('div');
      dropdownPanel.className = 'overlay-dropdown-panel';
      dropdownPanel.style.display = 'none';
      dropdownPanel.style.position = 'absolute';
      dropdownPanel.style.left = '0';
      dropdownPanel.style.top = '110%';
      dropdownPanel.style.width = '100%';
      dropdownPanel.style.background = 'rgba(255,255,255,0.97)';
      dropdownPanel.style.padding = '10px 12px';
      dropdownPanel.style.borderRadius = '10px';
      dropdownPanel.style.boxShadow = '0 2px 12px rgba(0,0,0,0.13)';
      dropdownPanel.style.maxWidth = '320px';
      dropdownPanel.style.minWidth = '180px';
      dropdownPanel.style.boxSizing = 'border-box';
      dropdownPanel.style.overflow = 'auto';
      dropdownPanel.style.maxHeight = '350px';
      dropdownPanel.style.zIndex = '100';
      // Label
      const label = document.createElement('div');
      label.textContent = labelText;
      label.style.fontWeight = 'bold';
      label.style.marginBottom = '8px';
      dropdownPanel.appendChild(label);
      // Options
      overlayList.forEach(layer => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.marginBottom = '6px';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = layer.name;
        checkbox.checked = selected.includes(layer.name);
        checkbox.style.marginRight = '8px';
        checkbox.addEventListener('change', function(e) {
          const newSelected = Array.from(dropdownPanel.querySelectorAll('input[type=checkbox]:checked')).map(cb => cb.value);
          onChange(newSelected);
          dropdownButton.textContent = getOverlaySummary(newSelected, overlayList);
        });
        row.appendChild(checkbox);
        const title = document.createElement('span');
        title.textContent = layer.title;
        title.style.flex = '1';
        row.appendChild(title);
        if (layer.type === 'wms' && wmsOverlayLegends[layer.name]) {
          const legend = document.createElement('img');
          legend.src = wmsOverlayLegends[layer.name];
          legend.style.height = '20px';
          legend.style.marginLeft = '8px';
          legend.style.background = '#fff';
          legend.style.border = '1px solid #ccc';
          legend.style.borderRadius = '3px';
          row.appendChild(legend);
        }
        dropdownPanel.appendChild(row);
      });
      // Dropdown open/close logic
      let open = false;
      function closeDropdown() {
        dropdownPanel.style.display = 'none';
        open = false;
      }
      function openDropdown() {
        dropdownPanel.style.display = 'block';
        open = true;
      }
      dropdownButton.addEventListener('click', function(e) {
        e.stopPropagation();
        if (open) {
          closeDropdown();
        } else {
          openDropdown();
        }
      });
      // Close on outside click
      document.addEventListener('click', function(e) {
        if (!dropdownPanel.contains(e.target) && e.target !== dropdownButton) {
          closeDropdown();
        }
      });
      // Container
      const container = document.createElement('div');
      container.style.position = 'relative';
      container.style.width = '100%';
      container.appendChild(dropdownButton);
      container.appendChild(dropdownPanel);
      return { container, dropdownButton, dropdownPanel };
    }

    function addOverlaySelectorToMap() {
      // Remove old
      if (overlayDropdownButton && overlayDropdownButton.parentElement) overlayDropdownButton.parentElement.remove();
      if (overlayDropdownPanel && overlayDropdownPanel.parentElement) overlayDropdownPanel.parentElement.remove();
      if (overlaySelectorDiv) overlaySelectorDiv.remove();
      // Digiroad overlays
      const digiroad = createOverlayDropdown('main', digiroadOverlayLayers, function(newSelected) {
        digiroadOverlayLayers = newSelected;
        updateAllOverlays();
        updatePermalinkWithFeatures();
      }, digiroadOverlayList, 'Digiroad overlays:');
      overlaySelectorDiv = digiroad.container;
      overlayDropdownButton = digiroad.dropdownButton;
      overlayDropdownPanel = digiroad.dropdownPanel;
      overlaySelectorDiv.style.position = 'absolute';
      overlaySelectorDiv.style.top = '60px';
      overlaySelectorDiv.style.right = '10px';
      overlaySelectorDiv.style.zIndex = 10;
      overlaySelectorDiv.style.maxWidth = '320px';
      overlaySelectorDiv.style.minWidth = '180px';
      overlaySelectorDiv.style.boxSizing = 'border-box';
      document.getElementById('map').appendChild(overlaySelectorDiv);
      // Generic overlays
      if (window.genericOverlaySelectorDiv) window.genericOverlaySelectorDiv.remove();
      const generic = createOverlayDropdown('main', genericOverlayLayers, function(newSelected) {
        genericOverlayLayers = newSelected;
        updateAllOverlays();
        updatePermalinkWithFeatures();
      }, genericOverlayList, 'Other overlays:');
      window.genericOverlaySelectorDiv = generic.container;
      generic.container.style.position = 'absolute';
      generic.container.style.top = '';
      generic.container.style.right = '10px';
      generic.container.style.zIndex = 10;
      generic.container.style.maxWidth = '320px';
      generic.container.style.minWidth = '180px';
      generic.container.style.boxSizing = 'border-box';
      generic.container.style.marginTop = '12px';
      // Insert after Digiroad dropdown to stack vertically
      overlaySelectorDiv.parentNode.insertBefore(generic.container, overlaySelectorDiv.nextSibling);
    }
  });