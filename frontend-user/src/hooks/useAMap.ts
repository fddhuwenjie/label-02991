import { useEffect, useRef, useState, useCallback } from 'react';
import type { LatLng } from '../utils/geo';

declare global {
  interface Window {
    AMap: any;
  }
}

interface Marker {
  setPosition: (position: [number, number]) => void;
  setMap: (map: any | null) => void;
  setIcon: (icon: string) => void;
}

interface Polyline {
  setPath: (path: Array<[number, number]>) => void;
  setMap: (map: any | null) => void;
}

export interface UseAMapReturn {
  mapRef: React.RefObject<HTMLDivElement>;
  mapReady: boolean;
  addMarker: (position: LatLng, options?: MarkerOptions) => string;
  updateMarker: (id: string, position: LatLng) => void;
  removeMarker: (id: string) => void;
  addPolyline: (path: LatLng[], options?: PolylineOptions) => string;
  updatePolyline: (id: string, path: LatLng[]) => void;
  removePolyline: (id: string) => void;
  fitView: (padding?: number[]) => void;
  setCenter: (position: LatLng) => void;
}

interface MarkerOptions {
  icon?: string;
  offset?: [number, number];
}

interface PolylineOptions {
  strokeColor?: string;
  strokeWeight?: number;
  strokeOpacity?: number;
  strokeStyle?: 'solid' | 'dashed';
}

let amapLoaded = false;
let amapLoadingPromise: Promise<void> | null = null;

function loadAMap(): Promise<void> {
  if (amapLoaded) return Promise.resolve();
  if (amapLoadingPromise) return amapLoadingPromise;

  amapLoadingPromise = new Promise((resolve, reject) => {
    if (window.AMap) {
      amapLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://webapi.amap.com/maps?v=2.0&key=demo';
    script.async = true;
    script.onload = () => {
      amapLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('AMap 加载失败'));
    document.head.appendChild(script);
  });

  return amapLoadingPromise;
}

export function useAMap(initialCenter?: LatLng, initialZoom: number = 13): UseAMapReturn {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markers = useRef<Map<string, Marker>>(new Map());
  const polylines = useRef<Map<string, Polyline>>(new Map());
  const markerIdCounter = useRef(0);
  const polylineIdCounter = useRef(0);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const initMap = async () => {
      try {
        await loadAMap();
        if (cancelled || !mapRef.current || !window.AMap) return;

        const center: [number, number] = initialCenter
          ? [initialCenter.lng, initialCenter.lat]
          : [104.066, 30.571];

        mapInstance.current = new window.AMap.Map(mapRef.current, {
          zoom: initialZoom,
          center,
          resizeEnable: true,
        });

        setMapReady(true);
      } catch (err) {
        console.error('地图初始化失败:', err);
      }
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapInstance.current) {
        mapInstance.current.destroy();
        mapInstance.current = null;
      }
      markers.current.clear();
      polylines.current.clear();
      setMapReady(false);
    };
  }, [initialCenter, initialZoom]);

  const addMarker = useCallback((position: LatLng, options?: MarkerOptions): string => {
    if (!mapInstance.current || !window.AMap) return '';

    const id = `marker_${++markerIdCounter.current}`;
    const marker = new window.AMap.Marker({
      position: [position.lng, position.lat],
      icon: options?.icon,
      offset: options?.offset ? new window.AMap.Pixel(options.offset[0], options.offset[1]) : undefined,
    });
    marker.setMap(mapInstance.current);
    markers.current.set(id, marker);
    return id;
  }, []);

  const updateMarker = useCallback((id: string, position: LatLng) => {
    const marker = markers.current.get(id);
    if (marker) {
      marker.setPosition([position.lng, position.lat]);
    }
  }, []);

  const removeMarker = useCallback((id: string) => {
    const marker = markers.current.get(id);
    if (marker) {
      marker.setMap(null);
      markers.current.delete(id);
    }
  }, []);

  const addPolyline = useCallback((path: LatLng[], options?: PolylineOptions): string => {
    if (!mapInstance.current || !window.AMap) return '';

    const id = `polyline_${++polylineIdCounter.current}`;
    const pathArr = path.map((p) => [p.lng, p.lat] as [number, number]);
    const polyline = new window.AMap.Polyline({
      path: pathArr,
      strokeColor: options?.strokeColor || '#3366FF',
      strokeWeight: options?.strokeWeight || 5,
      strokeOpacity: options?.strokeOpacity ?? 1,
      strokeStyle: options?.strokeStyle || 'solid',
    });
    polyline.setMap(mapInstance.current);
    polylines.current.set(id, polyline);
    return id;
  }, []);

  const updatePolyline = useCallback((id: string, path: LatLng[]) => {
    const polyline = polylines.current.get(id);
    if (polyline) {
      const pathArr = path.map((p) => [p.lng, p.lat] as [number, number]);
      polyline.setPath(pathArr);
    }
  }, []);

  const removePolyline = useCallback((id: string) => {
    const polyline = polylines.current.get(id);
    if (polyline) {
      polyline.setMap(null);
      polylines.current.delete(id);
    }
  }, []);

  const fitView = useCallback((padding?: number[]) => {
    if (mapInstance.current) {
      mapInstance.current.setFitView(null, false, padding || [50, 50, 50, 50]);
    }
  }, []);

  const setCenter = useCallback((position: LatLng) => {
    if (mapInstance.current) {
      mapInstance.current.setCenter([position.lng, position.lat]);
    }
  }, []);

  return {
    mapRef,
    mapReady,
    addMarker,
    updateMarker,
    removeMarker,
    addPolyline,
    updatePolyline,
    removePolyline,
    fitView,
    setCenter,
  };
}
