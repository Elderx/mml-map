import { wmsCapabilitiesUrl } from '../config/constants.js';
import { state } from '../state/store.js';

export async function fetchOverlayCapabilities() {
  const xmlText = await fetch(wmsCapabilitiesUrl).then(r => r.text());
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'text/xml');
  const layers = Array.from(xml.querySelectorAll('Layer > Layer'));
  state.digiroadOverlayList = layers.map(layer => {
    const name = layer.querySelector('Name')?.textContent;
    const title = layer.querySelector('Title')?.textContent;
    const legendUrl = layer.querySelector('LegendURL OnlineResource')?.getAttribute('xlink:href');
    if (name && title) {
      if (legendUrl) state.wmsOverlayLegends[name] = legendUrl;
      return { name, title, type: 'wms' };
    }
    return null;
  }).filter(Boolean);

  // Load OSM GeoJSON manifest if present
  try {
    const manifest = await fetch('/osm/manifest.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : []);
    if (Array.isArray(manifest)) {
      state.osmItems = manifest.map(item => ({ id: item.id, title: item.title, file: item.file }));
    }
  } catch (e) {
    // ignore if manifest missing; fallback to any predefined items
  }
}


