import { useMemo } from 'react';
import './index.css';

interface MapViewProps {
  origin?: { lat: number; lng: number; name?: string } | null;
  destination?: { lat: number; lng: number; name?: string } | null;
  driverLocation?: { lat: number; lng: number } | null;
  route?: Array<{ lat: number; lng: number }>;
  height?: string;
  showNearbyDrivers?: number;
}

export function MapView({
  origin,
  destination,
  driverLocation,
  route,
  height = '300px',
  showNearbyDrivers = 0,
}: MapViewProps) {
  type Pos = { x: number; y: number };

  const nearbyDriverPositions = useMemo(() => {
    if (showNearbyDrivers <= 0 || !origin) return [];
    return Array.from({ length: Math.min(showNearbyDrivers, 8) }, (_, i) => ({
      id: i,
      left: 15 + Math.random() * 70,
      top: 15 + Math.random() * 70,
    }));
  }, [showNearbyDrivers, origin]);

  const mapBounds = useMemo(() => {
    const points = [origin, destination, driverLocation].filter(Boolean) as Array<{
      lat: number;
      lng: number;
    }>;

    if (points.length === 0) {
      return {
        minLat: 30.5,
        maxLat: 30.7,
        minLng: 104.0,
        maxLng: 104.12,
      };
    }

    // Keep projection stable across pages by anchoring bounds to O/D first.
    const anchorPoints =
      origin && destination
        ? [origin, destination]
        : points;

    let minLat = Math.min(...anchorPoints.map((p) => p.lat));
    let maxLat = Math.max(...anchorPoints.map((p) => p.lat));
    let minLng = Math.min(...anchorPoints.map((p) => p.lng));
    let maxLng = Math.max(...anchorPoints.map((p) => p.lng));

    const latRange = Math.max(0.01, maxLat - minLat);
    const lngRange = Math.max(0.01, maxLng - minLng);
    minLat -= latRange * 0.25;
    maxLat += latRange * 0.25;
    minLng -= lngRange * 0.25;
    maxLng += lngRange * 0.25;

    return { minLat, maxLat, minLng, maxLng };
  }, [origin, destination, driverLocation]);

  const toPercentPos = useMemo(() => {
    const { minLat, maxLat, minLng, maxLng } = mapBounds;
    const latSpan = Math.max(0.0001, maxLat - minLat);
    const lngSpan = Math.max(0.0001, maxLng - minLng);
    return (p: { lat: number; lng: number }): Pos => {
      const x = 10 + ((p.lng - minLng) / lngSpan) * 80;
      const y = 12 + ((maxLat - p.lat) / latSpan) * 76;
      return {
        x: Math.max(6, Math.min(94, x)),
        y: Math.max(8, Math.min(92, y)),
      };
    };
  }, [mapBounds]);

  const originPos = useMemo(() => (origin ? toPercentPos(origin) : null), [origin, toPercentPos]);
  const destinationPos = useMemo(
    () => (destination ? toPercentPos(destination) : null),
    [destination, toPercentPos]
  );
  const driverPos = useMemo(
    () => (driverLocation ? toPercentPos(driverLocation) : null),
    [driverLocation, toPercentPos]
  );

  const routePath = useMemo(() => {
    if (!originPos || !destinationPos) return '';
    // Directly connect the center points of origin-dot and dest-dot.
    return `M ${originPos.x} ${originPos.y} L ${destinationPos.x} ${destinationPos.y}`;
  }, [originPos, destinationPos]);

  return (
    <div className="map-view" style={{ height }}>
      <div className="map-bg">
        <svg className="map-grid" viewBox="0 0 400 400" preserveAspectRatio="none">
          {Array.from({ length: 20 }, (_, i) => (
            <g key={i}>
              <line x1={i * 20} y1="0" x2={i * 20} y2="400" stroke="#e8e8e8" strokeWidth="0.5" />
              <line x1="0" y1={i * 20} x2="400" y2={i * 20} stroke="#e8e8e8" strokeWidth="0.5" />
            </g>
          ))}
          {[80, 200, 320].map((x) => (
            <line key={`h${x}`} x1="0" y1={x} x2="400" y2={x} stroke="#d9d9d9" strokeWidth="2" />
          ))}
          {[100, 250, 350].map((y) => (
            <line key={`v${y}`} x1={y} y1="0" x2={y} y2="400" stroke="#d9d9d9" strokeWidth="2" />
          ))}
          <rect x="60" y="60" width="80" height="50" rx="4" fill="#f0f0f0" stroke="#d9d9d9" />
          <rect x="220" y="140" width="60" height="80" rx="4" fill="#e8f5e9" stroke="#c8e6c9" />
          <rect x="300" y="60" width="50" height="40" rx="4" fill="#f0f0f0" stroke="#d9d9d9" />
          <rect x="100" y="250" width="100" height="60" rx="4" fill="#f0f0f0" stroke="#d9d9d9" />
        </svg>

        {routePath && (
          <svg className="map-route-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path
              d={routePath}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="1.05"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {origin && originPos && (
          <div
            className="map-marker map-marker-origin"
            style={{ left: `${originPos.x}%`, top: `${originPos.y}%` }}
          >
            <div className="map-marker-dot origin-dot" />
            {origin.name && <span className="map-marker-label">{origin.name}</span>}
          </div>
        )}

        {destination && destinationPos && (
          <div
            className="map-marker map-marker-dest"
            style={{ left: `${destinationPos.x}%`, top: `${destinationPos.y}%` }}
          >
            <div className="map-marker-dot dest-dot" />
            {destination.name && <span className="map-marker-label">{destination.name}</span>}
          </div>
        )}

        {driverLocation && driverPos && (
          <div className="map-driver" style={{ left: `${driverPos.x}%`, top: `${driverPos.y}%` }}>
            <span className="map-driver-icon">🚗</span>
          </div>
        )}

        {nearbyDriverPositions.map((d) => (
          <div key={d.id} className="map-nearby-driver" style={{ left: `${d.left}%`, top: `${d.top}%` }}>
            <span style={{ fontSize: 14, opacity: 0.6 }}>🚗</span>
          </div>
        ))}

        {!origin && !destination && (
          <div className="map-center-marker">
            <div className="map-center-pin" />
            <span className="map-center-label">当前位置</span>
          </div>
        )}
      </div>
    </div>
  );
}
