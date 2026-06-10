export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS = 6371000;

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function haversineDistance(from: LatLng, to: LatLng): number {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS * c;
}

export function interpolatePath(from: LatLng, to: LatLng, steps: number): LatLng[] {
  const points: LatLng[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({
      lat: from.lat + (to.lat - from.lat) * t,
      lng: from.lng + (to.lng - from.lng) * t,
    });
  }
  return points;
}

export function calculateETA(distanceMeters: number, speedKmh: number = 30): number {
  const speedMs = speedKmh * 1000 / 3600;
  return Math.round(distanceMeters / speedMs);
}

export function formatDistanceMeters(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}米`;
  return `${(meters / 1000).toFixed(1)}公里`;
}
