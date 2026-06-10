import { useEffect, useRef, useCallback, useState } from 'react';
import type { LatLng } from '../types';

interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

interface UseAMapOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  initialCenter?: LatLng;
  initialZoom?: number;
}

interface UseAMapReturn {
  isReady: boolean;
  isRealMap: boolean;
  mapInstance: AMap.Map | null;
  setDriverMarker: (position: LatLng) => void;
  setOriginMarker: (position: LatLng) => void;
  setDestinationMarker: (position: LatLng) => void;
  setTraveledPolyline: (path: LatLng[]) => void;
  setRemainingPolyline: (path: LatLng[]) => void;
  setFullPolyline: (path: LatLng[]) => void;
  setCenter: (position: LatLng) => void;
  clearAll: () => void;
  fitView: (points?: LatLng[]) => void;
  destroy: () => void;
  simulateMapData: SimulateMapData | null;
}

interface SimulateMapData {
  bounds: MapBounds;
  driverPos: LatLng | null;
  originPos: LatLng | null;
  destPos: LatLng | null;
  traveledPath: LatLng[];
  remainingPath: LatLng[];
  fullPath: LatLng[];
  toScreen: (p: LatLng) => { x: number; y: number };
}

export function useAMap({ containerRef, initialCenter, initialZoom = 14 }: UseAMapOptions): UseAMapReturn {
  const [isReady, setIsReady] = useState(false);
  const mapInstanceRef = useRef<AMap.Map | null>(null);
  const driverMarkerRef = useRef<AMap.Marker | null>(null);
  const originMarkerRef = useRef<AMap.Marker | null>(null);
  const destMarkerRef = useRef<AMap.Marker | null>(null);
  const traveledLineRef = useRef<AMap.Polyline | null>(null);
  const remainingLineRef = useRef<AMap.Polyline | null>(null);
  const fullLineRef = useRef<AMap.Polyline | null>(null);

  const [simulateMapData, setSimulateMapData] = useState<SimulateMapData | null>(null);
  const simulateDataRef = useRef<SimulateMapData>({
    bounds: { minLat: 30.5, maxLat: 30.7, minLng: 104.0, maxLng: 104.12 },
    driverPos: null,
    originPos: null,
    destPos: null,
    traveledPath: [],
    remainingPath: [],
    fullPath: [],
    toScreen: () => ({ x: 50, y: 50 }),
  });

  const isRealMap = typeof window !== 'undefined' && !!window.AMap;

  const toAMapLngLat = useCallback((p: LatLng): [number, number] => {
    return [p.lng, p.lat];
  }, []);

  const updateSimulateBounds = useCallback(() => {
    const points: LatLng[] = [];
    const d = simulateDataRef.current;
    if (d.originPos) points.push(d.originPos);
    if (d.destPos) points.push(d.destPos);
    if (d.driverPos) points.push(d.driverPos);
    d.traveledPath.forEach((p) => points.push(p));
    d.remainingPath.forEach((p) => points.push(p));
    d.fullPath.forEach((p) => points.push(p));

    if (points.length === 0) {
      d.bounds = { minLat: 30.5, maxLat: 30.7, minLng: 104.0, maxLng: 104.12 };
    } else {
      let minLat = Math.min(...points.map((p) => p.lat));
      let maxLat = Math.max(...points.map((p) => p.lat));
      let minLng = Math.min(...points.map((p) => p.lng));
      let maxLng = Math.max(...points.map((p) => p.lng));

      const latRange = Math.max(0.01, maxLat - minLat);
      const lngRange = Math.max(0.01, maxLng - minLng);
      minLat -= latRange * 0.25;
      maxLat += latRange * 0.25;
      minLng -= lngRange * 0.25;
      maxLng += lngRange * 0.25;
      d.bounds = { minLat, maxLat, minLng, maxLng };
    }

    const { minLat, maxLat, minLng, maxLng } = d.bounds;
    const latSpan = Math.max(0.0001, maxLat - minLat);
    const lngSpan = Math.max(0.0001, maxLng - minLng);
    d.toScreen = (p: LatLng) => {
      const x = 5 + ((p.lng - minLng) / lngSpan) * 90;
      const y = 8 + ((maxLat - p.lat) / latSpan) * 84;
      return {
        x: Math.max(2, Math.min(98, x)),
        y: Math.max(4, Math.min(96, y)),
      };
    };
  }, []);

  const setDriverMarker = useCallback(
    (position: LatLng) => {
      if (isRealMap && mapInstanceRef.current) {
        if (!driverMarkerRef.current && window.AMap) {
          driverMarkerRef.current = new window.AMap.Marker({
            position: toAMapLngLat(position),
            anchor: 'center',
            zIndex: 120,
          });
          driverMarkerRef.current.setMap(mapInstanceRef.current);
        } else if (driverMarkerRef.current) {
          driverMarkerRef.current.setPosition(toAMapLngLat(position));
        }
      } else {
        simulateDataRef.current.driverPos = position;
        updateSimulateBounds();
        setSimulateMapData({ ...simulateDataRef.current });
      }
    },
    [isRealMap, toAMapLngLat, updateSimulateBounds]
  );

  const setOriginMarker = useCallback(
    (position: LatLng) => {
      if (isRealMap && mapInstanceRef.current && window.AMap) {
        if (!originMarkerRef.current) {
          originMarkerRef.current = new window.AMap.Marker({
            position: toAMapLngLat(position),
            anchor: 'bottom-center',
            zIndex: 100,
          });
          originMarkerRef.current.setMap(mapInstanceRef.current);
        } else {
          originMarkerRef.current.setPosition(toAMapLngLat(position));
        }
      } else {
        simulateDataRef.current.originPos = position;
        updateSimulateBounds();
        setSimulateMapData({ ...simulateDataRef.current });
      }
    },
    [isRealMap, toAMapLngLat, updateSimulateBounds]
  );

  const setDestinationMarker = useCallback(
    (position: LatLng) => {
      if (isRealMap && mapInstanceRef.current && window.AMap) {
        if (!destMarkerRef.current) {
          destMarkerRef.current = new window.AMap.Marker({
            position: toAMapLngLat(position),
            anchor: 'bottom-center',
            zIndex: 100,
          });
          destMarkerRef.current.setMap(mapInstanceRef.current);
        } else {
          destMarkerRef.current.setPosition(toAMapLngLat(position));
        }
      } else {
        simulateDataRef.current.destPos = position;
        updateSimulateBounds();
        setSimulateMapData({ ...simulateDataRef.current });
      }
    },
    [isRealMap, toAMapLngLat, updateSimulateBounds]
  );

  const setTraveledPolyline = useCallback(
    (path: LatLng[]) => {
      if (isRealMap && mapInstanceRef.current && window.AMap) {
        const amapPath = path.map(toAMapLngLat);
        if (!traveledLineRef.current) {
          traveledLineRef.current = new window.AMap.Polyline({
            path: amapPath,
            strokeColor: '#52c41a',
            strokeWeight: 6,
            strokeOpacity: 0.9,
            strokeStyle: 'solid',
            lineJoin: 'round',
            lineCap: 'round',
            zIndex: 50,
          });
          traveledLineRef.current.setMap(mapInstanceRef.current);
        } else {
          traveledLineRef.current.setPath(amapPath);
        }
      } else {
        simulateDataRef.current.traveledPath = [...path];
        updateSimulateBounds();
        setSimulateMapData({ ...simulateDataRef.current });
      }
    },
    [isRealMap, toAMapLngLat, updateSimulateBounds]
  );

  const setRemainingPolyline = useCallback(
    (path: LatLng[]) => {
      if (isRealMap && mapInstanceRef.current && window.AMap) {
        const amapPath = path.map(toAMapLngLat);
        if (!remainingLineRef.current) {
          remainingLineRef.current = new window.AMap.Polyline({
            path: amapPath,
            strokeColor: '#bfbfbf',
            strokeWeight: 5,
            strokeOpacity: 0.7,
            strokeStyle: 'dashed',
            strokeDasharray: [10, 8],
            lineJoin: 'round',
            lineCap: 'round',
            zIndex: 40,
          });
          remainingLineRef.current.setMap(mapInstanceRef.current);
        } else {
          remainingLineRef.current.setPath(amapPath);
        }
      } else {
        simulateDataRef.current.remainingPath = [...path];
        updateSimulateBounds();
        setSimulateMapData({ ...simulateDataRef.current });
      }
    },
    [isRealMap, toAMapLngLat, updateSimulateBounds]
  );

  const setFullPolyline = useCallback(
    (path: LatLng[]) => {
      if (isRealMap && mapInstanceRef.current && window.AMap) {
        const amapPath = path.map(toAMapLngLat);
        if (!fullLineRef.current) {
          fullLineRef.current = new window.AMap.Polyline({
            path: amapPath,
            strokeColor: '#1890ff',
            strokeWeight: 4,
            strokeOpacity: 0.6,
            strokeStyle: 'solid',
            lineJoin: 'round',
            lineCap: 'round',
            zIndex: 30,
          });
          fullLineRef.current.setMap(mapInstanceRef.current);
        } else {
          fullLineRef.current.setPath(amapPath);
        }
      } else {
        simulateDataRef.current.fullPath = [...path];
        updateSimulateBounds();
        setSimulateMapData({ ...simulateDataRef.current });
      }
    },
    [isRealMap, toAMapLngLat, updateSimulateBounds]
  );

  const setCenter = useCallback(
    (position: LatLng) => {
      if (isRealMap && mapInstanceRef.current) {
        mapInstanceRef.current.setCenter(toAMapLngLat(position));
      }
    },
    [isRealMap, toAMapLngLat]
  );

  const clearAll = useCallback(() => {
    if (isRealMap && mapInstanceRef.current) {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setMap(null);
        driverMarkerRef.current = null;
      }
      if (originMarkerRef.current) {
        originMarkerRef.current.setMap(null);
        originMarkerRef.current = null;
      }
      if (destMarkerRef.current) {
        destMarkerRef.current.setMap(null);
        destMarkerRef.current = null;
      }
      if (traveledLineRef.current) {
        traveledLineRef.current.setMap(null);
        traveledLineRef.current = null;
      }
      if (remainingLineRef.current) {
        remainingLineRef.current.setMap(null);
        remainingLineRef.current = null;
      }
      if (fullLineRef.current) {
        fullLineRef.current.setMap(null);
        fullLineRef.current = null;
      }
    } else {
      simulateDataRef.current = {
        bounds: { minLat: 30.5, maxLat: 30.7, minLng: 104.0, maxLng: 104.12 },
        driverPos: null,
        originPos: null,
        destPos: null,
        traveledPath: [],
        remainingPath: [],
        fullPath: [],
        toScreen: () => ({ x: 50, y: 50 }),
      };
      setSimulateMapData({ ...simulateDataRef.current });
    }
  }, [isRealMap]);

  const fitView = useCallback(
    (points?: LatLng[]) => {
      if (isRealMap && mapInstanceRef.current) {
        const overlays: (AMap.Marker | AMap.Polyline)[] = [];
        if (originMarkerRef.current) overlays.push(originMarkerRef.current);
        if (destMarkerRef.current) overlays.push(destMarkerRef.current);
        if (driverMarkerRef.current) overlays.push(driverMarkerRef.current);
        if (overlays.length > 0) {
          mapInstanceRef.current.setFitView(overlays);
        }
      } else {
        if (points && points.length > 0) {
          points.forEach((p) => {
            if (!simulateDataRef.current.originPos) simulateDataRef.current.originPos = p;
          });
        }
        updateSimulateBounds();
        setSimulateMapData({ ...simulateDataRef.current });
      }
    },
    [isRealMap, updateSimulateBounds]
  );

  const destroy = useCallback(() => {
    if (isRealMap && mapInstanceRef.current) {
      if (driverMarkerRef.current) driverMarkerRef.current.setMap(null);
      if (originMarkerRef.current) originMarkerRef.current.setMap(null);
      if (destMarkerRef.current) destMarkerRef.current.setMap(null);
      if (traveledLineRef.current) traveledLineRef.current.setMap(null);
      if (remainingLineRef.current) remainingLineRef.current.setMap(null);
      if (fullLineRef.current) fullLineRef.current.setMap(null);
      mapInstanceRef.current.destroy();
      mapInstanceRef.current = null;
      driverMarkerRef.current = null;
      originMarkerRef.current = null;
      destMarkerRef.current = null;
      traveledLineRef.current = null;
      remainingLineRef.current = null;
      fullLineRef.current = null;
    }
  }, [isRealMap]);

  useEffect(() => {
    if (!containerRef.current) return;

    if (isRealMap && window.AMap) {
      const center: [number, number] = initialCenter
        ? toAMapLngLat(initialCenter)
        : [104.065, 30.652];
      mapInstanceRef.current = new window.AMap.Map(containerRef.current, {
        center,
        zoom: initialZoom,
        viewMode: '2D',
      });
      setIsReady(true);
    } else {
      setTimeout(() => setIsReady(true), 50);
    }

    return () => {
      destroy();
    };
  }, [containerRef, isRealMap, initialCenter, initialZoom, toAMapLngLat, destroy]);

  return {
    isReady,
    isRealMap,
    mapInstance: mapInstanceRef.current,
    setDriverMarker,
    setOriginMarker,
    setDestinationMarker,
    setTraveledPolyline,
    setRemainingPolyline,
    setFullPolyline,
    setCenter,
    clearAll,
    fitView,
    destroy,
    simulateMapData,
  };
}

interface AMapSimulatorViewProps {
  data: SimulateMapData;
}

export function AMapSimulatorView({ data }: AMapSimulatorViewProps) {
  const buildPathD = (path: LatLng[]): string => {
    if (path.length < 2) return '';
    return path
      .map((p, i) => {
        const sp = data.toScreen(p);
        return `${i === 0 ? 'M' : 'L'} ${sp.x} ${sp.y}`;
      })
      .join(' ');
  };

  const traveledPathD = buildPathD(data.traveledPath);
  const remainingPathD = buildPathD(data.remainingPath);
  const fullPathD = buildPathD(data.fullPath);

  return (
    <div className="amap-sim-container">
      <svg className="amap-sim-grid" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <pattern id="amapGrid" width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#e8ecf1" strokeWidth="0.2" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#amapGrid)" />
        {[20, 40, 60, 80].map((y) => (
          <line key={`h${y}`} x1="0" y1={y} x2="100" y2={y} stroke="#dde3ea" strokeWidth="0.3" />
        ))}
        {[20, 40, 60, 80].map((x) => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="100" stroke="#dde3ea" strokeWidth="0.3" />
        ))}
        <rect x="10" y="15" width="25" height="15" rx="1" fill="#f0f4f8" stroke="#d9e2ec" strokeWidth="0.3" />
        <rect x="50" y="25" width="20" height="20" rx="1" fill="#e6f7ff" stroke="#bae7ff" strokeWidth="0.3" />
        <rect x="65" y="60" width="25" height="20" rx="1" fill="#f0f4f8" stroke="#d9e2ec" strokeWidth="0.3" />
        <rect x="15" y="65" width="25" height="18" rx="1" fill="#f6ffed" stroke="#d9f7be" strokeWidth="0.3" />

        {fullPathD && (
          <path
            d={fullPathD}
            fill="none"
            stroke="#1890ff"
            strokeWidth="1.0"
            strokeOpacity="0.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {remainingPathD && (
          <path
            d={remainingPathD}
            fill="none"
            stroke="#bfbfbf"
            strokeWidth="1.2"
            strokeOpacity="0.7"
            strokeDasharray="3,2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {traveledPathD && (
          <path
            d={traveledPathD}
            fill="none"
            stroke="#52c41a"
            strokeWidth="1.6"
            strokeOpacity="0.95"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {data.originPos && (
          <g transform={`translate(${data.toScreen(data.originPos).x}, ${data.toScreen(data.originPos).y})`}>
            <circle r="2.2" fill="#1890ff" stroke="#fff" strokeWidth="0.8" />
          </g>
        )}

        {data.destPos && (
          <g transform={`translate(${data.toScreen(data.destPos).x}, ${data.toScreen(data.destPos).y})`}>
            <rect x="-2" y="-4" width="4" height="4" fill="#ff4d4f" stroke="#fff" strokeWidth="0.6" />
          </g>
        )}

        {data.driverPos && (
          <g
            className="amap-driver-marker"
            transform={`translate(${data.toScreen(data.driverPos).x}, ${data.toScreen(data.driverPos).y})`}
          >
            <circle r="4.5" fill="#fa8c16" opacity="0.2">
              <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle r="2.8" fill="#fa8c16" stroke="#fff" strokeWidth="1" />
            <text textAnchor="middle" dy="1" fontSize="3" fill="#fff" fontWeight="bold">🚕</text>
          </g>
        )}
      </svg>
    </div>
  );
}
