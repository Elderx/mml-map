import TileLayer from 'ol/layer/Tile.js';
import TileWMS from 'ol/source/TileWMS.js';
import { wmsUrl } from '../config/constants.js';
import { state } from '../state/store.js';

export function createWMSOverlayLayer(layerName) {
  return new TileLayer({
    opacity: 0.7,
    source: new TileWMS({ url: wmsUrl, params: { LAYERS: layerName, TRANSPARENT: true, VERSION: '1.3.0' }, crossOrigin: 'anonymous' }),
    zIndex: 50,
  });
}

export function updateAllOverlays() {
  ['main', 'left', 'right'].forEach(key => {
    (state.overlayLayerObjects[key] || []).forEach(layer => {
      if (key === 'main' && state.map) state.map.removeLayer(layer);
      if (key === 'left' && state.leftMap) state.leftMap.removeLayer(layer);
      if (key === 'right' && state.rightMap) state.rightMap.removeLayer(layer);
    });
    state.overlayLayerObjects[key] = [];
    (state.genericOverlayLayerObjects[key] || []).forEach(layer => {
      if (key === 'main' && state.map) state.map.removeLayer(layer);
      if (key === 'left' && state.leftMap) state.leftMap.removeLayer(layer);
      if (key === 'right' && state.rightMap) state.rightMap.removeLayer(layer);
    });
    state.genericOverlayLayerObjects[key] = [];
  });
  state.digiroadOverlayLayers.forEach(layerName => {
    const layer = createWMSOverlayLayer(layerName);
    state.overlayLayerObjects.main.push(layer);
    if (state.map) state.map.addLayer(layer);
    if (state.isSplit) {
      const leftLayer = createWMSOverlayLayer(layerName);
      state.overlayLayerObjects.left.push(leftLayer);
      if (state.leftMap) state.leftMap.addLayer(leftLayer);
      const rightLayer = createWMSOverlayLayer(layerName);
      state.overlayLayerObjects.right.push(rightLayer);
      if (state.rightMap) state.rightMap.addLayer(rightLayer);
    }
  });
  state.genericOverlayLayers.forEach(layerName => {
    const layer = createWMSOverlayLayer(layerName);
    state.genericOverlayLayerObjects.main.push(layer);
    if (state.map) state.map.addLayer(layer);
    if (state.isSplit) {
      const leftLayer = createWMSOverlayLayer(layerName);
      state.genericOverlayLayerObjects.left.push(leftLayer);
      if (state.leftMap) state.leftMap.addLayer(leftLayer);
      const rightLayer = createWMSOverlayLayer(layerName);
      state.genericOverlayLayerObjects.right.push(rightLayer);
      if (state.rightMap) state.rightMap.addLayer(rightLayer);
    }
  });
}


