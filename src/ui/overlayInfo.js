import { state } from '../state/store.js';

export function createOverlayInfoPopup() {
  if (state.overlayInfoPopup) state.overlayInfoPopup.remove();
  const overlayInfoPopup = document.createElement('div');
  overlayInfoPopup.className = 'overlay-info-popup';
  overlayInfoPopup.style.position = 'absolute';
  overlayInfoPopup.style.minWidth = '260px';
  overlayInfoPopup.style.maxWidth = '420px';
  overlayInfoPopup.style.maxHeight = '350px';
  overlayInfoPopup.style.overflow = 'auto';
  overlayInfoPopup.style.background = 'rgba(255,255,255,0.98)';
  overlayInfoPopup.style.border = '2px solid #0077cc';
  overlayInfoPopup.style.borderRadius = '10px';
  overlayInfoPopup.style.boxShadow = '0 2px 16px rgba(0,0,0,0.18)';
  overlayInfoPopup.style.padding = '12px 16px 8px 16px';
  overlayInfoPopup.style.zIndex = 1001;
  overlayInfoPopup.style.fontSize = '1em';
  overlayInfoPopup.style.color = '#222';
  overlayInfoPopup.style.lineHeight = '1.5';
  overlayInfoPopup.style.pointerEvents = 'auto';
  overlayInfoPopup.style.userSelect = 'text';
  overlayInfoPopup.style.top = '0';
  overlayInfoPopup.style.left = '0';
  overlayInfoPopup.innerHTML = '';
  const overlayInfoPopupCloser = document.createElement('button');
  overlayInfoPopupCloser.textContent = '×';
  overlayInfoPopupCloser.style.position = 'absolute';
  overlayInfoPopupCloser.style.top = '6px';
  overlayInfoPopupCloser.style.right = '10px';
  overlayInfoPopupCloser.style.background = 'none';
  overlayInfoPopupCloser.style.border = 'none';
  overlayInfoPopupCloser.style.fontSize = '1.5em';
  overlayInfoPopupCloser.style.cursor = 'pointer';
  overlayInfoPopupCloser.style.color = '#0077cc';
  overlayInfoPopupCloser.addEventListener('click', function() { overlayInfoPopup.style.display = 'none'; });
  overlayInfoPopup.appendChild(overlayInfoPopupCloser);
  document.body.appendChild(overlayInfoPopup);
  state.overlayInfoPopup = overlayInfoPopup;
  state.overlayInfoPopupCloser = overlayInfoPopupCloser;
}

export function showOverlayInfoPopup(html, pixel) {
  createOverlayInfoPopup();
  state.overlayInfoPopup.style.display = 'block';
  state.overlayInfoPopup.innerHTML += html;
  let x = pixel[0] + 10;
  let y = pixel[1] + 10;
  const maxX = window.innerWidth - state.overlayInfoPopup.offsetWidth - 20;
  const maxY = window.innerHeight - state.overlayInfoPopup.offsetHeight - 20;
  if (x > maxX) x = maxX;
  if (y > maxY) y = maxY;
  state.overlayInfoPopup.style.left = x + 'px';
  state.overlayInfoPopup.style.top = y + 'px';
  state.overlayInfoPopup.appendChild(state.overlayInfoPopupCloser);
}

export function clearOverlayInfoPopup() {
  if (state.overlayInfoPopup) state.overlayInfoPopup.style.display = 'none';
}


