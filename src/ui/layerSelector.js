import { hardcodedLayers } from '../config/constants.js';

export function createLayerSelectorDropdown(initialId, onChange) {
  const div = document.createElement('div');
  div.style.position = 'absolute';
  div.style.top = '10px';
  div.style.right = '10px';
  div.style.zIndex = 10;
  div.style.background = 'rgba(255,255,255,0.97)';
  div.style.padding = '10px 12px';
  div.style.borderRadius = '10px';
  div.style.boxShadow = '0 2px 12px rgba(0,0,0,0.13)';
  div.style.maxWidth = '220px';
  div.style.minWidth = '120px';
  div.style.boxSizing = 'border-box';
  div.style.overflow = 'hidden';

  const select = document.createElement('select');
  select.style.width = '100%';
  select.style.fontSize = '1em';
  select.style.padding = '8px';
  select.style.borderRadius = '6px';
  select.style.border = '1px solid #ccc';
  select.style.margin = '0';
  select.style.background = 'white';
  select.style.cursor = 'pointer';
  select.style.outline = 'none';
  select.style.textOverflow = 'ellipsis';
  select.style.whiteSpace = 'nowrap';

  hardcodedLayers.forEach(layer => {
    const option = document.createElement('option');
    option.value = layer.id;
    option.text = layer.name;
    select.appendChild(option);
  });
  select.value = initialId;
  div.appendChild(select);

  select.addEventListener('change', function () { onChange(this.value); });

  return div;
}


