export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistance(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(h));
}

export function interpolateLine(start: LatLng, end: LatLng, segments: number): LatLng[] {
  const points: LatLng[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    points.push({
      lat: start.lat + (end.lat - start.lat) * t,
      lng: start.lng + (end.lng - start.lng) * t,
    });
  }
  return points;
}

export function totalDistance(points: LatLng[]): number {
  let dist = 0;
  for (let i = 1; i < points.length; i++) {
    dist += haversineDistance(points[i - 1], points[i]);
  }
  return dist;
}

export function remainingDistance(waypoints: LatLng[], currentIndex: number): number {
  let dist = 0;
  for (let i = currentIndex + 1; i < waypoints.length; i++) {
    dist += haversineDistance(waypoints[i - 1], waypoints[i]);
  }
  return dist;
}

export function estimateEta(remainingDist: number, avgSpeedMps: number): number {
  if (avgSpeedMps <= 0) return 0;
  return remainingDist / avgSpeedMps;
}
