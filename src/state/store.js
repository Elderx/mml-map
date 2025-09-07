// Lightweight global app state shared across modules

export const state = {
  map: null,
  leftMap: null,
  rightMap: null,
  isSplit: false,
  restoringFromPermalink: false,
  permalinkInitialized: false,
  markerCoords: null,
  lineCoords: null,
  polygonCoords: null,
  measureCoords: null,
  drawingMode: null,
  lastClickCoords: null,
  lastSearchCoords: null,

  clickMarkerLayer: null,
  leftClickMarkerLayer: null,
  rightClickMarkerLayer: null,
  searchMarkerLayer: null,
  leftSearchMarkerLayer: null,
  rightSearchMarkerLayer: null,

  drawnLineLayer: { main: null, left: null, right: null },
  drawnLineFeature: { main: null, left: null, right: null },
  drawnPolygonLayer: { main: null, left: null, right: null },
  drawnPolygonFeature: { main: null, left: null, right: null },
  measureLineLayer: { main: null, left: null, right: null },
  measureLineFeature: { main: null, left: null, right: null },
  measureLabelOverlay: { main: null, left: null, right: null },

  overlayLayers: [],
  overlayLayerObjects: { main: [], left: [], right: [] },
  wmsOverlayList: [],
  wmsOverlayLegends: {},
  digiroadOverlayList: [],
  digiroadOverlayLayers: [],
  genericOverlayList: [],
  genericOverlayLayers: [],
  genericOverlayLayerObjects: { main: [], left: [], right: [] },

  overlaySelectorDiv: null,
  overlayDropdownButton: null,
  overlayDropdownPanel: null,

  overlayInfoPopup: null,
  overlayInfoPopupCloser: null,
  overlayInfoClickHandlerMain: null,
  overlayInfoClickHandlerLeft: null,
  overlayInfoClickHandlerRight: null,

  leftMapMoveendListener: null,
  rightMapMoveendListener: null,

  leftLayerId: null,
  rightLayerId: null,
  initialLayerIdx: 1,
  drawInteraction: null,
  markerClickHandlerActive: false,
  markerClickHandlerActiveLeft: false,
  markerClickHandlerActiveRight: false,
  handleMapClick: null,
};


