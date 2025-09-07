export function syncViews(mapA, mapB) {
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


