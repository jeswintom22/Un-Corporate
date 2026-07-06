const domMapByScan = new Map();

export function saveDomMap(scanId, map) {
  domMapByScan.set(scanId, map);
}

export function getDomMap(scanId) {
  return domMapByScan.get(scanId) || new Map();
}

export function clearDomMap(scanId) {
  domMapByScan.delete(scanId);
}

export function clearAllDomMaps() {
  domMapByScan.clear();
}
