export interface CivicClusterSnapshot {
  coordinates: [number, number];
  count: number;
  abbreviatedCount: string | number;
}

export interface CivicClusterRecord {
  coordinates: [number, number];
  marker: { setLngLat(coordinates: [number, number]): unknown };
  button: { textContent: string | null; setAttribute(name: string, value: string): unknown };
}

export function refreshCivicCluster(record: CivicClusterRecord, snapshot: CivicClusterSnapshot): void {
  record.coordinates = snapshot.coordinates;
  record.marker.setLngLat(snapshot.coordinates);
  record.button.textContent = String(snapshot.abbreviatedCount);
  record.button.setAttribute('aria-label', `Zoom into ${snapshot.count} civic records`);
}
