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

const apiKey = '977cd66e-8512-460a-83d3-cb405325c3ff',
  epsg = 'EPSG:3857',
  tileMatrixSet = 'WGS84_Pseudo-Mercator',
  capsUrl = `https://avoin-karttakuva.maanmittauslaitos.fi/avoin/wmts/1.0.0/WMTSCapabilities.xml?api-key=${apiKey}`;

const hardcodedLayers = [
  { id: 'taustakartta', name: 'Taustakartta', type: 'wmts' },
  { id: 'maastokartta', name: 'Maastokartta', type: 'wmts' },
  { id: 'selkokartta', name: 'Selkokartta', type: 'wmts' },
  { id: 'ortokuva', name: 'Ortokuva', type: 'wmts' },
  { id: 'osm', name: 'OpenStreetMap', type: 'osm' }
];

const parser = new WMTSCapabilities();
let map;

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

    const result = parser.read(text);

    function createTileLayer(layerId, onError) {
      const layerInfo = hardcodedLayers.find(l => l.id === layerId);
      if (layerInfo && layerInfo.type === 'osm') {
        return new TileLayer({
          opacity: 1,
          source: new OSM()
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
      if (lastClickCoords && lastClickCoords.length === 2) {
        params += `&markerLat=${lastClickCoords[1].toFixed(7)}&markerLon=${lastClickCoords[0].toFixed(7)}`;
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
      // Add selectors as DOM elements
      leftLayerSelectorDiv = createLayerSelectorDropdown(leftLayerId, function (newLayerId) {
        const newLayer = createTileLayer(newLayerId);
        leftMap.getLayers().setAt(0, newLayer);
        leftLayerId = newLayerId;
        // Update URL on left layer change in split mode
        updatePermalinkWithFeatures();
      });
      // Move left selector to top left
      leftLayerSelectorDiv.style.left = '10px';
      leftLayerSelectorDiv.style.right = '';
      leftLayerSelectorDiv.style.top = '10px';
      leftLayerSelectorDiv.style.position = 'absolute';
      rightLayerSelectorDiv = createLayerSelectorDropdown(rightLayerId, function (newLayerId) {
        const newLayer = createTileLayer(newLayerId);
        rightMap.getLayers().setAt(0, newLayer);
        rightLayerId = newLayerId;
        // Update URL on right layer change in split mode
        updatePermalinkWithFeatures();
      });
      document.getElementById('map-left').appendChild(leftLayerSelectorDiv);
      document.getElementById('map-right').appendChild(rightLayerSelectorDiv);
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
      leftMap = null;
      rightMap = null;
      leftLayerSelectorDiv = null;
      rightLayerSelectorDiv = null;
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
      if (lastSearchCoords) {
        if (searchMarkerLayer) map.removeLayer(searchMarkerLayer);
        leftSearchMarkerLayer = createSearchMarkerLayer(lastSearchCoords[0], lastSearchCoords[1]);
        rightSearchMarkerLayer = createSearchMarkerLayer(lastSearchCoords[0], lastSearchCoords[1]);
        if (leftMap) leftMap.addLayer(leftSearchMarkerLayer);
        if (rightMap) rightMap.addLayer(rightSearchMarkerLayer);
      }
      if (lastClickCoords) {
        if (clickMarkerLayer) map.removeLayer(clickMarkerLayer);
        leftClickMarkerLayer = createClickMarkerLayer(lastClickCoords[0], lastClickCoords[1]);
        rightClickMarkerLayer = createClickMarkerLayer(lastClickCoords[0], lastClickCoords[1]);
        if (leftMap) leftMap.addLayer(leftClickMarkerLayer);
        if (rightMap) rightMap.addLayer(rightClickMarkerLayer);
      }
      if (leftMap) leftMap.on('singleclick', handleMapClick);
      if (rightMap) rightMap.on('singleclick', handleMapClick);
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
    };
    deactivateSplitScreen = function() {
      if (leftMap) leftMap.un('singleclick', handleMapClick);
      if (rightMap) rightMap.un('singleclick', handleMapClick);
      if (leftClickMarkerLayer && leftMap) leftMap.removeLayer(leftClickMarkerLayer);
      if (rightClickMarkerLayer && rightMap) rightMap.removeLayer(rightClickMarkerLayer);
      leftClickMarkerLayer = null;
      rightClickMarkerLayer = null;
      if (leftSearchMarkerLayer && leftMap) leftMap.removeLayer(leftSearchMarkerLayer);
      if (rightSearchMarkerLayer && rightMap) rightMap.removeLayer(rightSearchMarkerLayer);
      leftSearchMarkerLayer = null;
      rightSearchMarkerLayer = null;
      _deactivateSplitScreen();
      if (lastClickCoords) {
        clickMarkerLayer = createClickMarkerLayer(lastClickCoords[0], lastClickCoords[1]);
        map.addLayer(clickMarkerLayer);
      }
      if (lastSearchCoords) {
        searchMarkerLayer = createSearchMarkerLayer(lastSearchCoords[0], lastSearchCoords[1]);
        map.addLayer(searchMarkerLayer);
      }
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
    };
    // If initialIsSplit, activate split screen after map is ready
    if (initialIsSplit) {
      setTimeout(() => {
        activateSplitScreen();
        splitToggle.textContent = 'Single screen';
      }, 0);
    }

    splitToggle.addEventListener('click', function () {
      if (!isSplit) {
        activateSplitScreen();
        splitToggle.textContent = 'Single screen';
        updatePermalinkWithFeatures();
      } else {
        deactivateSplitScreen();
        splitToggle.textContent = 'Split screen';
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

    // --- Drawing feature variables ---
    let drawnLineLayer = { main: null, left: null, right: null };
    let drawnLineFeature = { main: null, left: null, right: null };
    let drawnPolygonLayer = { main: null, left: null, right: null };
    let drawnPolygonFeature = { main: null, left: null, right: null };

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
    let clickMarkerLayer = null;
    let leftClickMarkerLayer = null;
    let rightClickMarkerLayer = null;
    let lastClickCoords = null; // [lon, lat]

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
      lastClickCoords = [lon, lat];
      // Remove previous marker layer if exists
      if (clickMarkerLayer) map.removeLayer(clickMarkerLayer);
      if (leftClickMarkerLayer && leftMap) leftMap.removeLayer(leftClickMarkerLayer);
      if (rightClickMarkerLayer && rightMap) rightMap.removeLayer(rightClickMarkerLayer);
      // Add to main map if not split
      if (!isSplit) {
        clickMarkerLayer = createClickMarkerLayer(lon, lat);
        map.addLayer(clickMarkerLayer);
      } else {
        // Add to both split maps
        leftClickMarkerLayer = createClickMarkerLayer(lon, lat);
        rightClickMarkerLayer = createClickMarkerLayer(lon, lat);
        if (leftMap) leftMap.addLayer(leftClickMarkerLayer);
        if (rightMap) rightMap.addLayer(rightClickMarkerLayer);
      }
      // Update URL with marker
      const view = isSplit && leftMap ? leftMap.getView() : map.getView();
      const zoom = view.getZoom();
      const center = view.getCenter();
      const layerId = !isSplit ? (map.getLayers().item(0).getSource().getLayer ? map.getLayers().item(0).getSource().getLayer() : hardcodedLayers[initialLayerIdx].id) : null;
      updatePermalink(center, zoom, layerId, isSplit, leftLayerId, rightLayerId);
    }

    // --- Drawing mode state and handler management ---
    let drawingMode = null;
    let markerClickHandlerActive = false;
    let drawInteraction = null;
    function enableMarkerClickHandler() {
      if (!markerClickHandlerActive) {
        map.on('singleclick', handleMapClick);
        markerClickHandlerActive = true;
      }
    }
    function disableMarkerClickHandler() {
      if (markerClickHandlerActive) {
        map.un('singleclick', handleMapClick);
        markerClickHandlerActive = false;
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
    }

    // Helper to clear drawn features for a given mapKey ('main', 'left', 'right')
    function clearDrawnFeatures(mapKey, mapObj) {
      if (drawnLineLayer[mapKey] && mapObj) mapObj.removeLayer(drawnLineLayer[mapKey]);
      drawnLineLayer[mapKey] = null;
      drawnLineFeature[mapKey] = null;
      if (drawnPolygonLayer[mapKey] && mapObj) mapObj.removeLayer(drawnPolygonLayer[mapKey]);
      drawnPolygonLayer[mapKey] = null;
      drawnPolygonFeature[mapKey] = null;
    }

    // Drawing tool selection (refactored for per-map)
    drawMarkerBtn.addEventListener('click', function () {
      drawingMode = 'marker';
      if (!isSplit) {
        clearDrawInteraction();
        clearDrawnFeatures('main', map);
        drawMenu.style.display = 'none';
        enableMarkerClickHandler();
      } else {
        clearDrawInteraction();
        clearDrawnFeatures('left', leftMap);
        drawMenu.style.display = 'none';
        enableMarkerClickHandler();
      }
    });
    drawLineBtn.addEventListener('click', function () {
      drawingMode = 'line';
      clearAllMarkers();
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
          drawnLineFeature.main = evt.feature;
          // Ensure the layer is present
          if (drawnLineLayer.main && map.getLayers().getArray().indexOf(drawnLineLayer.main) === -1) {
            map.addLayer(drawnLineLayer.main);
          }
          clearDrawInteraction();
          drawingMode = null;
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
        let rightFeature = null;
        drawInteractionLeft.on('drawstart', function (evt) {
          // Create matching feature on right map
          rightFeature = new Feature({ geometry: new LineString([]) });
          rightFeature.setStyle(new Style({ stroke: new Stroke({ color: 'blue', width: 3 }) }));
          vectorSourceRight.clear();
          vectorSourceRight.addFeature(rightFeature);
          // Sync geometry as user draws
          evt.feature.getGeometry().on('change', function () {
            const coords = evt.feature.getGeometry().getCoordinates();
            rightFeature.getGeometry().setCoordinates(coords);
          });
        });
        drawInteractionLeft.on('drawend', function (evt) {
          drawnLineFeature.left = evt.feature;
          drawnLineFeature.right = rightFeature;
          clearDrawInteraction();
          drawingMode = null;
          updatePermalinkWithFeatures();
        });
        leftMap.addInteraction(drawInteractionLeft);
        // Draw interaction for right map
        const drawInteractionRight = new Draw({ source: vectorSourceRight, type: 'LineString', maxPoints: 2 });
        let leftFeature = null;
        drawInteractionRight.on('drawstart', function (evt) {
          // Create matching feature on left map
          leftFeature = new Feature({ geometry: new LineString([]) });
          leftFeature.setStyle(new Style({ stroke: new Stroke({ color: 'blue', width: 3 }) }));
          vectorSourceLeft.clear();
          vectorSourceLeft.addFeature(leftFeature);
          // Sync geometry as user draws
          evt.feature.getGeometry().on('change', function () {
            const coords = evt.feature.getGeometry().getCoordinates();
            leftFeature.getGeometry().setCoordinates(coords);
          });
        });
        drawInteractionRight.on('drawend', function (evt) {
          drawnLineFeature.right = evt.feature;
          drawnLineFeature.left = leftFeature;
          clearDrawInteraction();
          drawingMode = null;
          updatePermalinkWithFeatures();
        });
        rightMap.addInteraction(drawInteractionRight);
        // Store both interactions for clearing
        drawInteraction = { left: drawInteractionLeft, right: drawInteractionRight };
      }
    });
    drawPolygonBtn.addEventListener('click', function () {
      drawingMode = 'polygon';
      clearAllMarkers();
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
          drawnPolygonFeature.main = evt.feature;
          // Ensure the layer is present
          if (drawnPolygonLayer.main && map.getLayers().getArray().indexOf(drawnPolygonLayer.main) === -1) {
            map.addLayer(drawnPolygonLayer.main);
          }
          clearDrawInteraction();
          drawingMode = null;
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
        let rightFeature = null;
        drawInteractionLeft.on('drawstart', function (evt) {
          // Create matching feature on right map
          rightFeature = new Feature({ geometry: new Polygon([]) });
          rightFeature.setStyle(new Style({ fill: new Fill({ color: 'rgba(0,200,255,0.5)' }), stroke: new Stroke({ color: 'blue', width: 2 }) }));
          vectorSourceRight.clear();
          vectorSourceRight.addFeature(rightFeature);
          // Sync geometry as user draws
          evt.feature.getGeometry().on('change', function () {
            const coords = evt.feature.getGeometry().getCoordinates();
            rightFeature.getGeometry().setCoordinates(coords);
          });
        });
        drawInteractionLeft.on('drawend', function (evt) {
          drawnPolygonFeature.left = evt.feature;
          drawnPolygonFeature.right = rightFeature;
          clearDrawInteraction();
          drawingMode = null;
          updatePermalinkWithFeatures();
        });
        leftMap.addInteraction(drawInteractionLeft);
        // Draw interaction for right map
        const drawInteractionRight = new Draw({ source: vectorSourceRight, type: 'Polygon' });
        let leftFeature = null;
        drawInteractionRight.on('drawstart', function (evt) {
          // Create matching feature on left map
          leftFeature = new Feature({ geometry: new Polygon([]) });
          leftFeature.setStyle(new Style({ fill: new Fill({ color: 'rgba(0,200,255,0.5)' }), stroke: new Stroke({ color: 'blue', width: 2 }) }));
          vectorSourceLeft.clear();
          vectorSourceLeft.addFeature(leftFeature);
          // Sync geometry as user draws
          evt.feature.getGeometry().on('change', function () {
            const coords = evt.feature.getGeometry().getCoordinates();
            leftFeature.getGeometry().setCoordinates(coords);
          });
        });
        drawInteractionRight.on('drawend', function (evt) {
          drawnPolygonFeature.right = evt.feature;
          drawnPolygonFeature.left = leftFeature;
          clearDrawInteraction();
          drawingMode = null;
          updatePermalinkWithFeatures();
        });
        rightMap.addInteraction(drawInteractionRight);
        // Store both interactions for clearing
        drawInteraction = { left: drawInteractionLeft, right: drawInteractionRight };
      }
    });
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

    // Helper to encode features in URL
    let restoringFromPermalink = false;
    let permalinkInitialized = false;
    function updatePermalinkWithFeatures() {
      if (restoringFromPermalink || !permalinkInitialized) return;
      // Get marker from lastClickCoords
      let markerStr = '';
      if (lastClickCoords && lastClickCoords.length === 2) {
        markerStr = `&markerLat=${lastClickCoords[1].toFixed(7)}&markerLon=${lastClickCoords[0].toFixed(7)}`;
      }
      // Get line
      let lineStr = '';
      let lineFeature = null;
      if (!isSplit) {
        if (drawnLineFeature.main) {
          lineFeature = drawnLineFeature.main;
        } else if (drawnLineLayer.main && drawnLineLayer.main.getSource().getFeatures().length > 0) {
          lineFeature = drawnLineLayer.main.getSource().getFeatures()[0];
        }
      } else {
        if (drawnLineFeature.left) {
          lineFeature = drawnLineFeature.left;
        } else if (drawnLineLayer.left && drawnLineLayer.left.getSource().getFeatures().length > 0) {
          lineFeature = drawnLineLayer.left.getSource().getFeatures()[0];
        }
      }
      if (lineFeature) {
        const coords = lineFeature.getGeometry().getCoordinates().map(c => toLonLat(c).map(n => n.toFixed(7)));
        lineStr = `&line=${coords.map(pair => pair.join(",")).join(';')}`;
      }
      // Get polygon
      let polyStr = '';
      let polyFeature = null;
      if (!isSplit) {
        if (drawnPolygonFeature.main) {
          polyFeature = drawnPolygonFeature.main;
        } else if (drawnPolygonLayer.main && drawnPolygonLayer.main.getSource().getFeatures().length > 0) {
          polyFeature = drawnPolygonLayer.main.getSource().getFeatures()[0];
        }
      } else {
        if (drawnPolygonFeature.left) {
          polyFeature = drawnPolygonFeature.left;
        } else if (drawnPolygonLayer.left && drawnPolygonLayer.left.getSource().getFeatures().length > 0) {
          polyFeature = drawnPolygonLayer.left.getSource().getFeatures()[0];
        }
      }
      if (polyFeature) {
        const coords = polyFeature.getGeometry().getCoordinates()[0].map(c => toLonLat(c).map(n => n.toFixed(7)));
        polyStr = `&polygon=${coords.map(pair => pair.join(",")).join(';')}`;
      }
      // Compose base params
      const view = isSplit && leftMap ? leftMap.getView() : map.getView();
      const zoom = view.getZoom();
      const center = view.getCenter();
      let params = `?lat=${toLonLat(center)[1].toFixed(7)}&lon=${toLonLat(center)[0].toFixed(7)}&z=${Math.round(zoom * 1000) / 1000}`;
      if (isSplit) {
        params += `&split=1&leftLayer=${leftLayerId}&rightLayer=${rightLayerId}`;
      } else {
        // Get current layer id robustly
        let layerId = map.getLayers().item(0).getSource().getLayer ? map.getLayers().item(0).getSource().getLayer() : hardcodedLayers[initialLayerIdx].id;
        params += `&layer=${layerId}`;
      }
      params += markerStr + lineStr + polyStr;
      window.history.replaceState({}, '', params);
    }

    // --- Restore features from URL on load ---
    function restoreFeaturesFromURL(params) {
      restoringFromPermalink = true;
      // Ensure no drawing tool is active after restoration
      drawingMode = null;
      // Marker
      if (params.markerLat && params.markerLon) {
        const lat = parseFloat(params.markerLat);
        const lon = parseFloat(params.markerLon);
        if (!isNaN(lat) && !isNaN(lon)) {
          showClickMarker(lon, lat);
        }
      }
      // Line
      if (params.line) {
        const coords = params.line.split(';').map(pair => pair.split(',').map(Number));
        if (coords.length >= 2 && coords.every(pair => pair.length === 2 && !isNaN(pair[0]) && !isNaN(pair[1]))) {
          const olCoords = coords.map(pair => fromLonLat([pair[0], pair[1]]));
          // Add to main or left/right depending on mode
          if (!isSplit) {
            // Remove any previous line layer
            if (drawnLineLayer.main && map) map.removeLayer(drawnLineLayer.main);
            const vectorSource = new VectorSource();
            const feature = new Feature({ geometry: new LineString(olCoords) });
            feature.setStyle(new Style({ stroke: new Stroke({ color: 'blue', width: 3 }) }));
            vectorSource.addFeature(feature);
            drawnLineLayer.main = new VectorLayer({ source: vectorSource, zIndex: 102 });
            map.addLayer(drawnLineLayer.main);
            drawnLineFeature.main = feature;
          } else {
            // Left
            if (drawnLineLayer.left && leftMap) leftMap.removeLayer(drawnLineLayer.left);
            const vectorSourceLeft = new VectorSource();
            const featureLeft = new Feature({ geometry: new LineString(olCoords) });
            featureLeft.setStyle(new Style({ stroke: new Stroke({ color: 'blue', width: 3 }) }));
            vectorSourceLeft.addFeature(featureLeft);
            drawnLineLayer.left = new VectorLayer({ source: vectorSourceLeft, zIndex: 102 });
            leftMap.addLayer(drawnLineLayer.left);
            drawnLineFeature.left = featureLeft;
            // Right
            if (drawnLineLayer.right && rightMap) rightMap.removeLayer(drawnLineLayer.right);
            const vectorSourceRight = new VectorSource();
            const featureRight = new Feature({ geometry: new LineString(olCoords) });
            featureRight.setStyle(new Style({ stroke: new Stroke({ color: 'blue', width: 3 }) }));
            vectorSourceRight.addFeature(featureRight);
            drawnLineLayer.right = new VectorLayer({ source: vectorSourceRight, zIndex: 102 });
            rightMap.addLayer(drawnLineLayer.right);
            drawnLineFeature.right = featureRight;
          }
        }
      }
      // Polygon
      if (params.polygon) {
        const coords = params.polygon.split(';').map(pair => pair.split(',').map(Number));
        if (coords.length >= 3 && coords.every(pair => pair.length === 2 && !isNaN(pair[0]) && !isNaN(pair[1]))) {
          const olCoords = coords.map(pair => fromLonLat([pair[0], pair[1]]));
          // Add to main or left/right depending on mode
          if (!isSplit) {
            // Remove any previous polygon layer
            if (drawnPolygonLayer.main && map) map.removeLayer(drawnPolygonLayer.main);
            const vectorSource = new VectorSource();
            const feature = new Feature({ geometry: new Polygon([olCoords]) });
            feature.setStyle(new Style({ fill: new Fill({ color: 'rgba(0,200,255,0.5)' }), stroke: new Stroke({ color: 'blue', width: 2 }) }));
            vectorSource.addFeature(feature);
            drawnPolygonLayer.main = new VectorLayer({ source: vectorSource, zIndex: 103 });
            map.addLayer(drawnPolygonLayer.main);
            drawnPolygonFeature.main = feature;
          } else {
            // Left
            if (drawnPolygonLayer.left && leftMap) leftMap.removeLayer(drawnPolygonLayer.left);
            const vectorSourceLeft = new VectorSource();
            const featureLeft = new Feature({ geometry: new Polygon([olCoords]) });
            featureLeft.setStyle(new Style({ fill: new Fill({ color: 'rgba(0,200,255,0.5)' }), stroke: new Stroke({ color: 'blue', width: 2 }) }));
            vectorSourceLeft.addFeature(featureLeft);
            drawnPolygonLayer.left = new VectorLayer({ source: vectorSourceLeft, zIndex: 103 });
            leftMap.addLayer(drawnPolygonLayer.left);
            drawnPolygonFeature.left = featureLeft;
            // Right
            if (drawnPolygonLayer.right && rightMap) rightMap.removeLayer(drawnPolygonLayer.right);
            const vectorSourceRight = new VectorSource();
            const featureRight = new Feature({ geometry: new Polygon([olCoords]) });
            featureRight.setStyle(new Style({ fill: new Fill({ color: 'rgba(0,200,255,0.5)' }), stroke: new Stroke({ color: 'blue', width: 2 }) }));
            vectorSourceRight.addFeature(featureRight);
            drawnPolygonLayer.right = new VectorLayer({ source: vectorSourceRight, zIndex: 103 });
            rightMap.addLayer(drawnPolygonLayer.right);
            drawnPolygonFeature.right = featureRight;
          }
        }
      }
      restoringFromPermalink = false;
      // Now allow URL updates
      permalinkInitialized = true;
      // Ensure URL is correct after restoration
      updatePermalinkWithFeatures();
    }

    // --- After map is created ---
    // Restore features from URL
    restoreFeaturesFromURL(params);

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
        lastClickCoords = null;
        lastSearchCoords = null;
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
      lastClickCoords = null;
    }
  });