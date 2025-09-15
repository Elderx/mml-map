import { state } from '../state/store.js';

export function createOSMLegend() {
  if (state.osmLegendDiv) state.osmLegendDiv.remove();

  const legend = document.createElement('div');
  legend.className = 'osm-legend';
  legend.style.position = 'absolute';
  legend.style.bottom = '20px';
  legend.style.right = '20px';
  legend.style.background = 'rgba(255,255,255,0.95)';
  legend.style.border = '1px solid #ccc';
  legend.style.borderRadius = '8px';
  legend.style.padding = '12px 16px';
  legend.style.boxShadow = '0 2px 12px rgba(0,0,0,0.1)';
  legend.style.zIndex = 1000;
  legend.style.fontSize = '0.9em';
  legend.style.minWidth = '200px';
  legend.style.maxWidth = '300px';
  legend.style.display = 'none';

  const title = document.createElement('div');
  title.textContent = 'OSM Data Layers';
  title.style.fontWeight = 'bold';
  title.style.marginBottom = '8px';
  title.style.color = '#333';
  title.style.borderBottom = '1px solid #eee';
  title.style.paddingBottom = '6px';
  legend.appendChild(title);

  const itemsContainer = document.createElement('div');
  itemsContainer.className = 'osm-legend-items';
  legend.appendChild(itemsContainer);

  document.body.appendChild(legend);
  state.osmLegendDiv = legend;
  return legend;
}

export function updateOSMLegend() {
  if (!state.osmLegendDiv) return;

  const itemsContainer = state.osmLegendDiv.querySelector('.osm-legend-items');
  if (!itemsContainer) return;

  itemsContainer.innerHTML = '';

  if (state.osmSelectedIds.length === 0) {
    state.osmLegendDiv.style.display = 'none';
    return;
  }

  state.osmSelectedIds.forEach((osmId) => {
    const item = state.osmItems.find(i => i.id === osmId);
    if (!item) return;

    const color = state.osmAssignedColors[osmId] || '#666666';
    
    const itemDiv = document.createElement('div');
    itemDiv.style.display = 'flex';
    itemDiv.style.alignItems = 'center';
    itemDiv.style.marginBottom = '6px';
    itemDiv.style.fontSize = '0.85em';

    const colorDot = document.createElement('div');
    colorDot.style.width = '12px';
    colorDot.style.height = '12px';
    colorDot.style.background = color;
    colorDot.style.borderRadius = '50%';
    colorDot.style.marginRight = '8px';
    colorDot.style.flexShrink = '0';

    const label = document.createElement('span');
    label.textContent = item.title;
    label.style.color = '#555';
    label.style.flex = '1';

    itemDiv.appendChild(colorDot);
    itemDiv.appendChild(label);
    itemsContainer.appendChild(itemDiv);
  });

  state.osmLegendDiv.style.display = 'block';
}
