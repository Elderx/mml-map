// Centralized configuration and constants

export const mapboxAccessToken = 'pk.eyJ1IjoiZWxkZXJ4IiwiYSI6ImNqdHNrdHlmbDA1bjczem81ZTQzZnJ3engifQ.2PoeE03vtRBPj1D_-ESbrw';
export const apiKey = '977cd66e-8512-460a-83d3-cb405325c3ff';
export const epsg = 'EPSG:3857';
export const tileMatrixSet = 'WGS84_Pseudo-Mercator';
export const capsUrl = `https://avoin-karttakuva.maanmittauslaitos.fi/avoin/wmts/1.0.0/WMTSCapabilities.xml?api-key=${apiKey}`;
export const wmsUrl = 'https://avoinapi.vaylapilvi.fi/vaylatiedot/digiroad/wms';
export const wmsCapabilitiesUrl = 'https://avoinapi.vaylapilvi.fi/vaylatiedot/digiroad/wms?request=getcapabilities&service=wms';

// Mapbox base URL and attribution (kept for potential future use)
export const mbUrl = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiZWxkZXJ4IiwiYSI6ImNqdHNrdHlmbDA1bjczem81ZTQzZnJ3engifQ.2PoeE03vtRBPj1D_-ESbrw';
export const mbAttr = '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const hardcodedLayers = [
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


