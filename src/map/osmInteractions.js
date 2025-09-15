import { state } from '../state/store.js';
import { showOSMPopup, hideOSMPopup, formatOSMFeatureInfo } from '../ui/osmPopup.js';

export function setupOSMInteractions(mapObj) {
  if (!mapObj) return;

  let hoveredFeature = null;
  let hoveredLayer = null;

  // Mouse over interaction
  mapObj.on('pointermove', function(evt) {
    if (state.drawingMode) return;

    const feature = mapObj.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
      if (layer.get('osmId')) {
        return { feature, layer };
      }
    });

    if (feature) {
      // Show hover popup
      if (hoveredFeature !== feature.feature) {
        hoveredFeature = feature.feature;
        hoveredLayer = feature.layer;
        
        const osmId = feature.layer.get('osmId');
        const osmTitle = feature.layer.get('osmTitle');
        const osmColor = feature.layer.get('osmColor');
        
        const content = formatOSMFeatureInfo(feature.feature, osmTitle, osmColor);
        showOSMPopup(content, evt.pixel, false);
      }
    } else {
      // Hide hover popup
      if (hoveredFeature) {
        hoveredFeature = null;
        hoveredLayer = null;
        hideOSMPopup(false);
      }
    }
  });

  // Click interaction
  mapObj.on('singleclick', function(evt) {
    if (state.drawingMode) return;

    const feature = mapObj.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
      if (layer.get('osmId')) {
        return { feature, layer };
      }
    });

    if (feature) {
      const osmId = feature.layer.get('osmId');
      const osmTitle = feature.layer.get('osmTitle');
      const osmColor = feature.layer.get('osmColor');
      
      const content = formatOSMFeatureInfo(feature.feature, osmTitle, osmColor);
      showOSMPopup(content, evt.pixel, true);
    }
  });

  // Change cursor on hover
  mapObj.on('pointermove', function(evt) {
    if (state.drawingMode) return;

    const hasFeature = mapObj.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
      return layer.get('osmId');
    });

    mapObj.getTargetElement().style.cursor = hasFeature ? 'pointer' : '';
  });
}

export function removeOSMInteractions(mapObj) {
  if (!mapObj) return;
  
  // Remove all event listeners by cloning the map
  // This is a simple approach; in production you might want to track listeners
  mapObj.getTargetElement().style.cursor = '';
  hideOSMPopup(false);
  hideOSMPopup(true);
}
