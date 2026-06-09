export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6371008.8;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Haversine 公式：计算两点之间的球面距离（米）。
 */
export function haversineDistance(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * 沿起点-终点直线等分为 segments 段，返回 segments+1 个点（含起点终点）。
 */
export function interpolateLine(origin: LatLng, destination: LatLng, segments: number): LatLng[] {
  if (segments <= 0) return [origin, destination];
  const points: LatLng[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    points.push({
      lat: origin.lat + (destination.lat - origin.lat) * t,
      lng: origin.lng + (destination.lng - origin.lng) * t,
    });
  }
  return points;
}

/**
 * 计算一组路径点的总长度（米）。
 */
export function totalPathDistance(points: LatLng[]): number {
  let sum = 0;
  for (let i = 1; i < points.length; i++) {
    sum += haversineDistance(points[i - 1], points[i]);
  }
  return sum;
}

/**
 * 从给定索引开始，计算路径剩余长度（米）。
 */
export function remainingDistance(points: LatLng[], currentIndex: number): number {
  if (currentIndex >= points.length - 1) return 0;
  return totalPathDistance(points.slice(currentIndex));
}
