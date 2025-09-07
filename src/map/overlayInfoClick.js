import { state } from '../state/store.js';
import { showOverlayInfoPopup, clearOverlayInfoPopup } from '../ui/overlayInfo.js';

export function handleOverlayInfoClick(evt, mapObj, overlays) {
  if (state.drawingMode || overlays.length === 0) return;
  clearOverlayInfoPopup();
  const view = mapObj.getView();
  const coordinate = evt.coordinate;
  const pixel = mapObj.getEventPixel(evt.originalEvent);
  const resolution = view.getResolution();
  const projection = view.getProjection();
  let promises = [];
  overlays.forEach(layerName => {
    const key = mapObj === state.map ? 'main' : mapObj === state.leftMap ? 'left' : 'right';
    const layerObj = (state.overlayLayerObjects[key] || []).find(l => l.getSource().getParams().LAYERS === layerName);
    if (!layerObj) return;
    const url = layerObj.getSource().getFeatureInfoUrl(
      coordinate,
      resolution,
      projection,
      { 'INFO_FORMAT': 'text/html', 'QUERY_LAYERS': layerName }
    );
    if (url) {
      promises.push(fetch(url).then(r => r.text()).then(html => ({ layerName, html })).catch(() => null));
    }
  });
  if (promises.length === 0) return;
  Promise.all(promises).then(results => {
    let anyContent = false;
    let html = '';
    results.forEach(res => {
      if (res && res.html && res.html.trim() && !/no features found/i.test(res.html)) {
        anyContent = true;
        const layerTitle = state.wmsOverlayList.find(l => l.name === res.layerName)?.title || res.layerName;
        html += `<div style="margin-bottom:12px;"><div style="font-weight:bold;font-size:1.08em;margin-bottom:4px;color:#0077cc;">${layerTitle}</div><div>${res.html}</div></div>`;
      }
    });
    if (anyContent) {
      showOverlayInfoPopup(html, pixel);
    }
  });
}

export function enableOverlayInfoClickHandlers() {
  if (typeof state.map !== 'undefined' && state.overlayInfoClickHandlerMain) state.map.un('singleclick', state.overlayInfoClickHandlerMain);
  if (typeof state.leftMap !== 'undefined' && state.leftMap && state.overlayInfoClickHandlerLeft) state.leftMap.un('singleclick', state.overlayInfoClickHandlerLeft);
  if (typeof state.rightMap !== 'undefined' && state.rightMap && state.overlayInfoClickHandlerRight) state.rightMap.un('singleclick', state.overlayInfoClickHandlerRight);
  state.overlayInfoClickHandlerMain = function(evt) { handleOverlayInfoClick(evt, state.map, [...state.digiroadOverlayLayers, ...state.genericOverlayLayers]); };
  state.overlayInfoClickHandlerLeft = function(evt) { handleOverlayInfoClick(evt, state.leftMap, [...state.digiroadOverlayLayers, ...state.genericOverlayLayers]); };
  state.overlayInfoClickHandlerRight = function(evt) { handleOverlayInfoClick(evt, state.rightMap, [...state.digiroadOverlayLayers, ...state.genericOverlayLayers]); };
  if (typeof state.map !== 'undefined') state.map.on('singleclick', state.overlayInfoClickHandlerMain);
  if (typeof state.leftMap !== 'undefined' && state.leftMap) state.leftMap.on('singleclick', state.overlayInfoClickHandlerLeft);
  if (typeof state.rightMap !== 'undefined' && state.rightMap) state.rightMap.on('singleclick', state.overlayInfoClickHandlerRight);
}

export function disableOverlayInfoClickHandlers() {
  if (typeof state.map !== 'undefined' && state.overlayInfoClickHandlerMain) state.map.un('singleclick', state.overlayInfoClickHandlerMain);
  if (typeof state.leftMap !== 'undefined' && state.leftMap && state.overlayInfoClickHandlerLeft) state.leftMap.un('singleclick', state.overlayInfoClickHandlerLeft);
  if (typeof state.rightMap !== 'undefined' && state.rightMap && state.overlayInfoClickHandlerRight) state.rightMap.un('singleclick', state.overlayInfoClickHandlerRight);
}


