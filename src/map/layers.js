import TileLayer from 'ol/layer/Tile.js';
import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS.js';
import OSM from 'ol/source/OSM.js';
import XYZ from 'ol/source/XYZ.js';
import VectorTileLayer from 'ol/layer/VectorTile.js';
import { applyStyle } from 'ol-mapbox-style';
import { hardcodedLayers, apiKey, tileMatrixSet } from '../config/constants.js';

export function createTileLayerFromList(result, layerId, onError, mapboxAccessToken) {
  const layerInfo = hardcodedLayers.find(l => l.id === layerId);
  if (layerInfo && layerInfo.type === 'osm') {
    return new TileLayer({ opacity: 1, source: new OSM() });
  }
  if (layerInfo && layerInfo.type === 'mapbox') {
    const vtLayer = new VectorTileLayer({ declutter: true, visible: true });
    applyStyle(vtLayer, layerInfo.styleUrl, { accessToken: mapboxAccessToken });
    return vtLayer;
  }
  if (layerInfo && layerInfo.type === 'esri_sat') {
    return new TileLayer({ opacity: 1, source: new XYZ({ url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attributions: 'Tiles © Esri' }) });
  }
  if (layerInfo && layerInfo.type === 'cartodb_dark') {
    return new TileLayer({ opacity: 1, source: new XYZ({ url: 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attributions: '© OpenStreetMap contributors © CARTO' }) });
  }
  const options = optionsFromCapabilities(result, { layer: layerId, matrixSet: tileMatrixSet, requestEncoding: 'REST' });
  const optionsWithApiKey = { ...options, tileLoadFunction: (tile, src) => { tile.getImage().src = `${src}?api-key=${apiKey}`; } };
  const layer = new TileLayer({ opacity: 1, source: new WMTS(optionsWithApiKey) });
  if (onError) { layer.getSource().once('tileloaderror', onError); }
  return layer;
}


