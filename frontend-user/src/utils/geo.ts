import type { LatLng } from '../types';

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function haversineDistance(p1: LatLng, p2: LatLng): number {
  const dLat = toRadians(p2.lat - p1.lat);
  const dLng = toRadians(p2.lng - p1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(p1.lat)) * Math.cos(toRadians(p2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c * 1000;
}

export function interpolatePoints(
  start: LatLng,
  end: LatLng,
  segments: number
): LatLng[] {
  const points: LatLng[] = [];
  for (let i = 0; i <= segments; i++) {
    const ratio = i / segments;
    points.push({
      lat: start.lat + (end.lat - start.lat) * ratio,
      lng: start.lng + (end.lng - start.lng) * ratio,
    });
  }
  return points;
}

export function calculateTotalDistance(path: LatLng[]): number {
  if (path.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += haversineDistance(path[i - 1], path[i]);
  }
  return total;
}

export function estimateETA(distanceMeters: number, averageSpeedKmh = 30): number {
  const speedMs = averageSpeedKmh * 1000 / 3600;
  return Math.ceil(distanceMeters / speedMs);
}
