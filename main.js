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
        const view = leftMap.getView();
        updatePermalink(view.getCenter(), view.getZoom(), null, true, leftLayerId, rightLayerId);
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
        const view = rightMap.getView();
        updatePermalink(view.getCenter(), view.getZoom(), null, true, leftLayerId, rightLayerId);
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
        // Update URL on entering split mode
        const view = leftMap ? leftMap.getView() : map.getView();
        updatePermalink(view.getCenter(), view.getZoom(), null, true, leftLayerId, rightLayerId);
      } else {
        deactivateSplitScreen();
        splitToggle.textContent = 'Split screen';
        // Update URL on exiting split mode
        const view = map.getView();
        const layerId = map.getLayers().item(0).getSource().getLayer ? map.getLayers().item(0).getSource().getLayer() : hardcodedLayers[initialLayerIdx].id;
        updatePermalink(view.getCenter(), view.getZoom(), layerId, false);
      }
    });

    // Update URL on map moveend
    map.on('moveend', function () {
      const view = map.getView();
      const center = view.getCenter();
      const lonlat = toLonLat(center);
      console.log('DEBUG: map center (proj):', center, 'toLonLat:', lonlat);
      const zoom = view.getZoom();
      // Find current layer
      const currentLayerId = map.getLayers().item(0).getSource().getLayer ? map.getLayers().item(0).getSource().getLayer() : hardcodedLayers[initialLayerIdx].id;
      // Try to get the id from the hardcodedLayers array
      let layerId = hardcodedLayers.find(l => l.id === currentLayerId) ? currentLayerId : hardcodedLayers[initialLayerIdx].id;
      // Actually, let's track the active button
      const activeBtn = document.querySelector('.layer-buttons-control .active-layer-btn');
      if (activeBtn) layerId = activeBtn.getAttribute('data-layer-id');
      updatePermalink(center, zoom, layerId, isSplit, leftLayerId, rightLayerId);
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

    // Add click event listeners
    function handleMapClick(evt) {
      const coord = toLonLat(evt.coordinate);
      showClickMarker(coord[0], coord[1]);
    }
    map.on('singleclick', handleMapClick);

    // On load, if markerLat and markerLon are present, show the marker
    if (params.markerLat && params.markerLon) {
      const markerLat = parseFloat(params.markerLat);
      const markerLon = parseFloat(params.markerLon);
      if (!isNaN(markerLat) && !isNaN(markerLon)) {
        showClickMarker(markerLon, markerLat);
      }
    }

    // Remove features button logic
    document.getElementById('remove-features-btn').addEventListener('click', function () {
      // Remove click marker from all maps
      if (clickMarkerLayer) map.removeLayer(clickMarkerLayer);
      if (leftClickMarkerLayer && leftMap) leftMap.removeLayer(leftClickMarkerLayer);
      if (rightClickMarkerLayer && rightMap) rightMap.removeLayer(rightClickMarkerLayer);
      clickMarkerLayer = null;
      leftClickMarkerLayer = null;
      rightClickMarkerLayer = null;
      lastClickCoords = null;
      // Remove search marker from all maps
      if (searchMarkerLayer) map.removeLayer(searchMarkerLayer);
      if (leftSearchMarkerLayer && leftMap) leftMap.removeLayer(leftSearchMarkerLayer);
      if (rightSearchMarkerLayer && rightMap) rightMap.removeLayer(rightSearchMarkerLayer);
      searchMarkerLayer = null;
      leftSearchMarkerLayer = null;
      rightSearchMarkerLayer = null;
      lastSearchCoords = null;
      // Remove markerLat and markerLon from the URL
      const url = new URL(window.location.href);
      url.searchParams.delete('markerLat');
      url.searchParams.delete('markerLon');
      window.history.replaceState({}, '', url);
    });
  });