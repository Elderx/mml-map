import { fromLonLat } from 'ol/proj';

export function fromLonLatArr(coord) {
  return fromLonLat([parseFloat(coord[0]), parseFloat(coord[1])]);
}


