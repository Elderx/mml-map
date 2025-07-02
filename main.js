import Map from 'ol/Map.js';
import TileLayer from 'ol/layer/Tile.js';
import View from 'ol/View.js';
import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS.js';
import WMTSCapabilities from 'ol/format/WMTSCapabilities.js';
import { fromLonLat, toLonLat } from 'ol/proj';
import Control from 'ol/control/Control.js';
import OSM from 'ol/source/OSM.js';

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

    // Custom Layer Switcher Buttons Control
    class LayerButtonsControl extends Control {
      constructor(opt_options) {
        const options = opt_options || {};
        const element = document.createElement('div');
        element.className = 'ol-unselectable ol-control layer-buttons-control';
        element.style.display = 'flex';
        element.style.flexDirection = 'column';
        element.style.gap = '8px';
        element.style.background = 'rgba(255,255,255,0.97)';
        element.style.padding = '10px 12px';
        element.style.borderRadius = '10px';
        element.style.boxShadow = '0 2px 12px rgba(0,0,0,0.13)';
        element.style.margin = '10px';
        element.style.position = 'absolute';
        element.style.top = '10px';
        element.style.right = '10px';
        element.style.left = 'auto';
        element.style.bottom = 'auto';
        element.style.alignItems = 'stretch';
        element.style.zIndex = 2;
        element.style.maxWidth = '220px';
        element.style.minWidth = '120px';
        element.style.boxSizing = 'border-box';
        element.style.overflow = 'hidden';

        hardcodedLayers.forEach((layer, idx) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.innerText = layer.name;
          btn.style.fontSize = '1em';
          btn.style.padding = '10px 10px';
          btn.style.border = 'none';
          btn.style.borderRadius = '6px';
          btn.style.background = idx === initialLayerIdx ? '#1976d2' : '#e0e0e0'; // selected
          btn.style.color = idx === initialLayerIdx ? 'white' : '#333';
          btn.style.cursor = 'pointer';
          btn.style.transition = 'background 0.2s, color 0.2s';
          btn.style.outline = 'none';
          btn.style.margin = '0';
          btn.style.textAlign = 'left';
          btn.style.whiteSpace = 'nowrap';
          btn.style.overflow = 'hidden';
          btn.style.textOverflow = 'ellipsis';
          btn.style.width = '100%';
          btn.setAttribute('data-layer-id', layer.id);
          if (idx === initialLayerIdx) btn.classList.add('active-layer-btn');

          btn.addEventListener('click', function () {
            // Remove active style from all buttons
            Array.from(element.children).forEach(child => {
              child.style.background = '#e0e0e0';
              child.style.color = '#333';
              child.classList.remove('active-layer-btn');
            });
            // Set active style
            btn.style.background = '#1976d2';
            btn.style.color = 'white';
            btn.classList.add('active-layer-btn');
            // Switch layer
            const selectedLayer = hardcodedLayers.find(l => l.id === layer.id);
            const newLayer = createTileLayer(layer.id, function() {
              alert('Failed to load tiles for layer: ' + selectedLayer.name);
            });
            map.getLayers().setAt(0, newLayer);
            // Update URL using current map view center and zoom
            const view = map.getView();
            const center = view.getCenter();
            const zoom = view.getZoom();
            updatePermalink(center, zoom, layer.id);
          });

          element.appendChild(btn);
        });

        super({
          element: element,
          target: options.target
        });
      }
    }

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
      map.addControl(new LayerButtonsControl());
      defaults().extend([]).forEach(ctrl => map.addControl(ctrl));
    });
  });