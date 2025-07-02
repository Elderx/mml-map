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
    function updatePermalink(center, zoom, layerId) {
      const [lon, lat] = toLonLat(center);
      const latStr = lat.toFixed(7);
      const lonStr = lon.toFixed(7);
      const z = Math.round(zoom * 1000) / 1000;
      const params = `?lat=${latStr}&lon=${lonStr}&z=${z}&layer=${layerId}`;
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
    if (params.lat && params.lon && params.z && params.layer) {
      const idx = hardcodedLayers.findIndex(l => l.id === params.layer);
      if (idx !== -1) initialLayerIdx = idx;
      initialZoom = parseFloat(params.z);
      const lat = parseFloat(params.lat);
      const lon = parseFloat(params.lon);
      if (!isNaN(lat) && !isNaN(lon)) {
        initialCenter = fromLonLat([lon, lat]);
      }
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
      });
      mainMapDiv.appendChild(singleLayerSelectorDiv);
      showSingleLayerSelector(true);
    }
    addSingleLayerSelectorToMap();

    // --- Split screen logic ---
    let leftMap = null;
    let rightMap = null;
    let leftLayerId = hardcodedLayers[1].id;
    let rightLayerId = hardcodedLayers[0].id;
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
      });
      rightLayerSelectorDiv = createLayerSelectorDropdown(rightLayerId, function (newLayerId) {
        const newLayer = createTileLayer(newLayerId);
        rightMap.getLayers().setAt(0, newLayer);
        rightLayerId = newLayerId;
      });
      document.getElementById('map-left').appendChild(leftLayerSelectorDiv);
      document.getElementById('map-right').appendChild(rightLayerSelectorDiv);
      syncViews(leftMap, rightMap);
      syncViews(rightMap, leftMap);
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

    splitToggle.addEventListener('click', function () {
      if (!isSplit) {
        activateSplitScreen();
        splitToggle.textContent = 'Single screen';
      } else {
        deactivateSplitScreen();
        splitToggle.textContent = 'Split screen';
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
      updatePermalink(center, zoom, layerId);
    });

    // Add default controls and our custom control
    import('ol/control').then(({ defaults }) => {
      defaults().extend([]).forEach(ctrl => map.addControl(ctrl));
    });

    // --- After map is created ---
    // Marker logic
    let searchMarkerLayer = null;
    function showSearchMarker(lon, lat) {
      // Remove previous marker layer if exists
      if (searchMarkerLayer) {
        map.removeLayer(searchMarkerLayer);
      }
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
      searchMarkerLayer = new VectorLayer({ source: vectorSource, zIndex: 100 });
      map.addLayer(searchMarkerLayer);
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
          // Pan and zoom the main map
          if (map && map.getView) {
            map.getView().setCenter(fromLonLat([lng, lat]));
            map.getView().setZoom(14);
            showSearchMarker(lng, lat);
          }
        });
      }
    } else {
      // If Google API is not loaded, show a warning in the console
      console.warn('Google Maps Places API not loaded. Search bar will not work.');
    }
  });