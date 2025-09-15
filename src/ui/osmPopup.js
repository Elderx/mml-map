import { state } from '../state/store.js';

export function createOSMPopup() {
  if (state.osmHoverPopup) state.osmHoverPopup.remove();
  if (state.osmClickPopup) state.osmClickPopup.remove();

  // Hover popup (auto-closes on mouse leave)
  const hoverPopup = document.createElement('div');
  hoverPopup.className = 'osm-hover-popup';
  hoverPopup.style.position = 'absolute';
  hoverPopup.style.minWidth = '200px';
  hoverPopup.style.maxWidth = '300px';
  hoverPopup.style.background = 'rgba(255,255,255,0.98)';
  hoverPopup.style.border = '2px solid #0077cc';
  hoverPopup.style.borderRadius = '8px';
  hoverPopup.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
  hoverPopup.style.padding = '12px 16px';
  hoverPopup.style.zIndex = 1002;
  hoverPopup.style.fontSize = '0.9em';
  hoverPopup.style.color = '#333';
  hoverPopup.style.lineHeight = '1.4';
  hoverPopup.style.pointerEvents = 'none';
  hoverPopup.style.userSelect = 'text';
  hoverPopup.style.display = 'none';
  hoverPopup.style.top = '0';
  hoverPopup.style.left = '0';

  // Click popup (stays open until closed)
  const clickPopup = document.createElement('div');
  clickPopup.className = 'osm-click-popup';
  clickPopup.style.position = 'absolute';
  clickPopup.style.minWidth = '250px';
  clickPopup.style.maxWidth = '350px';
  clickPopup.style.background = 'rgba(255,255,255,0.98)';
  clickPopup.style.border = '2px solid #0077cc';
  clickPopup.style.borderRadius = '8px';
  clickPopup.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
  clickPopup.style.padding = '12px 16px';
  clickPopup.style.zIndex = 1003;
  clickPopup.style.fontSize = '0.9em';
  clickPopup.style.color = '#333';
  clickPopup.style.lineHeight = '1.4';
  clickPopup.style.pointerEvents = 'auto';
  clickPopup.style.userSelect = 'text';
  clickPopup.style.display = 'none';
  clickPopup.style.top = '0';
  clickPopup.style.left = '0';

  // Close button for click popup
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.style.position = 'absolute';
  closeBtn.style.top = '8px';
  closeBtn.style.right = '12px';
  closeBtn.style.background = 'none';
  closeBtn.style.border = 'none';
  closeBtn.style.fontSize = '1.2em';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.color = '#666';
  closeBtn.style.padding = '0';
  closeBtn.style.width = '20px';
  closeBtn.style.height = '20px';
  closeBtn.style.borderRadius = '50%';
  closeBtn.style.display = 'flex';
  closeBtn.style.alignItems = 'center';
  closeBtn.style.justifyContent = 'center';
  closeBtn.addEventListener('click', () => {
    clickPopup.style.display = 'none';
  });
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.background = '#f0f0f0';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.background = 'none';
  });
  clickPopup.appendChild(closeBtn);

  document.body.appendChild(hoverPopup);
  document.body.appendChild(clickPopup);

  state.osmHoverPopup = hoverPopup;
  state.osmClickPopup = clickPopup;
}

export function showOSMPopup(content, pixel, isClick = false) {
  const popup = isClick ? state.osmClickPopup : state.osmHoverPopup;
  if (!popup) return;

  popup.innerHTML = content;
  if (isClick) {
    // Re-add close button for click popup
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '8px';
    closeBtn.style.right = '12px';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.fontSize = '1.2em';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.color = '#666';
    closeBtn.style.padding = '0';
    closeBtn.style.width = '20px';
    closeBtn.style.height = '20px';
    closeBtn.style.borderRadius = '50%';
    closeBtn.style.display = 'flex';
    closeBtn.style.alignItems = 'center';
    closeBtn.style.justifyContent = 'center';
    closeBtn.addEventListener('click', () => {
      popup.style.display = 'none';
    });
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = '#f0f0f0';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'none';
    });
    popup.appendChild(closeBtn);
  }

  popup.style.display = 'block';
  
  // Position popup near click/hover point
  let x = pixel[0] + 15;
  let y = pixel[1] + 15;
  
  // Clamp to viewport
  const maxX = window.innerWidth - popup.offsetWidth - 20;
  const maxY = window.innerHeight - popup.offsetHeight - 20;
  if (x > maxX) x = maxX;
  if (y > maxY) y = maxY;
  
  popup.style.left = x + 'px';
  popup.style.top = y + 'px';
}

export function hideOSMPopup(isClick = false) {
  const popup = isClick ? state.osmClickPopup : state.osmHoverPopup;
  if (popup) popup.style.display = 'none';
}

export function formatOSMFeatureInfo(feature, layerTitle, color) {
  const props = feature.getProperties();
  const geometry = feature.getGeometry();
  const type = geometry.getType();
  
  let html = `<div style="margin-bottom: 8px;">`;
  html += `<div style="font-weight: bold; font-size: 1.1em; margin-bottom: 6px; color: ${color}; display: flex; align-items: center;">`;
  html += `<div style="width: 12px; height: 12px; background: ${color}; border-radius: 50%; margin-right: 8px;"></div>`;
  html += `${layerTitle}</div>`;
  html += `<div style="font-size: 0.85em; color: #666; margin-bottom: 8px;">${type.toUpperCase()}</div>`;
  
  // Show relevant properties
  const relevantProps = Object.entries(props)
    .filter(([key, value]) => 
      key !== 'geometry' && 
      value !== null && 
      value !== undefined && 
      value !== '' &&
      typeof value === 'string' && value.length < 100
    )
    .slice(0, 8); // Limit to 8 properties
    
  if (relevantProps.length > 0) {
    html += `<div style="border-top: 1px solid #eee; padding-top: 8px;">`;
    relevantProps.forEach(([key, value]) => {
      const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      html += `<div style="margin-bottom: 4px;"><strong>${displayKey}:</strong> ${value}</div>`;
    });
    html += `</div>`;
  }
  
  html += `</div>`;
  return html;
}
