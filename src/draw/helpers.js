import Feature from 'ol/Feature.js';
import LineString from 'ol/geom/LineString.js';
import Polygon from 'ol/geom/Polygon.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import Style from 'ol/style/Style.js';
import Stroke from 'ol/style/Stroke.js';
import Fill from 'ol/style/Fill.js';
import Overlay from 'ol/Overlay.js';
import { getLength } from 'ol/sphere.js';

export function createLineLayer(coords) {
  const vectorSource = new VectorSource();
  const feature = new Feature({ geometry: new LineString(coords) });
  feature.setStyle(new Style({ stroke: new Stroke({ color: 'blue', width: 3 }) }));
  vectorSource.addFeature(feature);
  return { layer: new VectorLayer({ source: vectorSource, zIndex: 102 }), feature };
}

export function createPolygonLayer(coords) {
  const vectorSource = new VectorSource();
  const feature = new Feature({ geometry: new Polygon([coords]) });
  feature.setStyle(new Style({ fill: new Fill({ color: 'rgba(0,200,255,0.5)' }), stroke: new Stroke({ color: 'blue', width: 2 }) }));
  vectorSource.addFeature(feature);
  return { layer: new VectorLayer({ source: vectorSource, zIndex: 103 }), feature };
}

export function createMeasureLineLayer(coords) {
  const vectorSource = new VectorSource();
  const feature = new Feature({ geometry: new LineString(coords) });
  feature.setStyle(new Style({ stroke: new Stroke({ color: 'orange', width: 3, lineDash: [8, 8] }) }));
  vectorSource.addFeature(feature);
  return { layer: new VectorLayer({ source: vectorSource, zIndex: 104 }), feature };
}

export function createMeasureLabelOverlay(coord, text) {
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

export function formatLength(line) {
  const length = getLength(line);
  return length > 1000 ? (length / 1000).toFixed(2) + ' km' : length.toFixed(2) + ' m';
}


