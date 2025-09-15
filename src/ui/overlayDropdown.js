import { updateAllOverlays } from '../map/overlays.js';
import { state } from '../state/store.js';

function getOverlaySummary(selected, overlayList) {
  if (!selected || selected.length === 0) return 'No overlays';
  if (selected.length === 1) {
    const found = overlayList.find(l => l.name === selected[0]);
    return found ? found.title : selected[0];
  }
  if (selected.length <= 2) {
    return selected.map(n => {
      const found = overlayList.find(l => l.name === n);
      return found ? found.title : n;
    }).join(', ');
  }
  return `${selected.length} selected`;
}

export function createOverlayDropdown(mapKey, selected, onChange, overlayList, labelText) {
  let dropdownButton = document.createElement('button');
  dropdownButton.type = 'button';
  dropdownButton.className = 'overlay-dropdown-btn';
  dropdownButton.style.width = '100%';
  dropdownButton.style.textAlign = 'left';
  dropdownButton.style.padding = '8px';
  dropdownButton.style.borderRadius = '6px';
  dropdownButton.style.border = '1px solid #ccc';
  dropdownButton.style.background = 'white';
  dropdownButton.style.cursor = 'pointer';
  dropdownButton.style.fontSize = '1em';
  dropdownButton.style.margin = '0';
  dropdownButton.style.boxSizing = 'border-box';
  dropdownButton.style.outline = 'none';
  dropdownButton.style.position = 'relative';
  dropdownButton.textContent = getOverlaySummary(selected, overlayList);
  let dropdownPanel = document.createElement('div');
  dropdownPanel.className = 'overlay-dropdown-panel';
  dropdownPanel.style.display = 'none';
  dropdownPanel.style.position = 'absolute';
  dropdownPanel.style.left = '0';
  dropdownPanel.style.top = '110%';
  dropdownPanel.style.width = '100%';
  dropdownPanel.style.background = 'rgba(255,255,255,0.97)';
  dropdownPanel.style.padding = '10px 12px';
  dropdownPanel.style.borderRadius = '10px';
  dropdownPanel.style.boxShadow = '0 2px 12px rgba(0,0,0,0.13)';
  dropdownPanel.style.maxWidth = '320px';
  dropdownPanel.style.minWidth = '180px';
  dropdownPanel.style.boxSizing = 'border-box';
  dropdownPanel.style.overflow = 'auto';
  dropdownPanel.style.maxHeight = '350px';
  dropdownPanel.style.zIndex = '100';
  // Label
  const label = document.createElement('div');
  label.textContent = labelText;
  label.style.fontWeight = 'bold';
  label.style.marginBottom = '8px';
  dropdownPanel.appendChild(label);
  // Options
  overlayList.forEach(layer => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.marginBottom = '6px';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = layer.name;
    checkbox.checked = selected.includes(layer.name);
    checkbox.style.marginRight = '8px';
    checkbox.addEventListener('change', function(e) {
      const newSelected = Array.from(dropdownPanel.querySelectorAll('input[type=checkbox]:checked')).map(cb => cb.value);
      onChange(newSelected);
      dropdownButton.textContent = getOverlaySummary(newSelected, overlayList);
    });
    row.appendChild(checkbox);
    const title = document.createElement('span');
    title.textContent = layer.title;
    title.style.flex = '1';
    row.appendChild(title);
    if (layer.type === 'wms' && state.wmsOverlayLegends[layer.name]) {
      const legend = document.createElement('img');
      legend.src = state.wmsOverlayLegends[layer.name];
      legend.style.height = '20px';
      legend.style.marginLeft = '8px';
      legend.style.background = '#fff';
      legend.style.border = '1px solid #ccc';
      legend.style.borderRadius = '3px';
      row.appendChild(legend);
    }
    dropdownPanel.appendChild(row);
  });
  // Dropdown open/close logic
  let open = false;
  function closeDropdown() { dropdownPanel.style.display = 'none'; open = false; }
  function openDropdown() { dropdownPanel.style.display = 'block'; open = true; }
  dropdownButton.addEventListener('click', function(e) {
    e.stopPropagation();
    if (open) closeDropdown(); else openDropdown();
  });
  document.addEventListener('click', function(e) {
    if (!dropdownPanel.contains(e.target) && e.target !== dropdownButton) closeDropdown();
  });
  const container = document.createElement('div');
  container.style.position = 'relative';
  container.style.width = '100%';
  container.appendChild(dropdownButton);
  container.appendChild(dropdownPanel);
  return { container, dropdownButton, dropdownPanel };
}

export function mountOverlaySelectors(mainMapDiv, updatePermalinkWithFeatures) {
  if (state.overlayDropdownButton && state.overlayDropdownButton.parentElement) state.overlayDropdownButton.parentElement.remove();
  if (state.overlayDropdownPanel && state.overlayDropdownPanel.parentElement) state.overlayDropdownPanel.parentElement.remove();
  if (state.overlaySelectorDiv) state.overlaySelectorDiv.remove();
  if (window.genericOverlaySelectorDiv) window.genericOverlaySelectorDiv.remove();
  if (window.osmOverlaySelectorDiv) window.osmOverlaySelectorDiv.remove();

  // Create a single absolute-positioned column container to stack all dropdowns
  const column = document.createElement('div');
  column.style.position = 'absolute';
  column.style.top = '60px';
  column.style.right = '10px';
  column.style.zIndex = 10;
  column.style.maxWidth = '320px';
  column.style.minWidth = '180px';
  column.style.boxSizing = 'border-box';

  const digiroad = createOverlayDropdown('main', state.digiroadOverlayLayers, function(newSelected) {
    state.digiroadOverlayLayers = newSelected;
    updateAllOverlays();
    updatePermalinkWithFeatures();
  }, state.digiroadOverlayList, 'Digiroad overlays:');
  state.overlaySelectorDiv = column;
  state.overlayDropdownButton = digiroad.dropdownButton;
  state.overlayDropdownPanel = digiroad.dropdownPanel;
  column.appendChild(digiroad.container);

  const generic = createOverlayDropdown('main', state.genericOverlayLayers, function(newSelected) {
    state.genericOverlayLayers = newSelected;
    updateAllOverlays();
    updatePermalinkWithFeatures();
  }, state.genericOverlayList, 'Other overlays:');
  window.genericOverlaySelectorDiv = generic.container;
  generic.container.style.marginTop = '12px';
  column.appendChild(generic.container);

  // OSM Data dropdown (beneath generic)
  const osmSelected = state.osmSelectedIds;
  const osmList = state.osmItems.map(i => ({ name: i.id, title: i.title, type: 'geojson' }));
  const osm = createOverlayDropdown('main', osmSelected, function(newSelected) {
    state.osmSelectedIds = newSelected;
    updateAllOverlays();
    updatePermalinkWithFeatures();
  }, osmList, 'OSM Data:');
  window.osmOverlaySelectorDiv = osm.container;
  osm.container.style.marginTop = '12px';
  column.appendChild(osm.container);

  mainMapDiv.appendChild(column);
}


