import { useRef, useEffect, useCallback, useState } from 'react';
import type { LatLng } from '../utils/geo';

interface UseAMapOptions {
  containerId: string;
  center?: LatLng;
  zoom?: number;
}

interface UseAMapReturn {
  ready: boolean;
  updateDriverMarker: (pos: LatLng) => void;
  setTraveledPath: (points: LatLng[]) => void;
  setRemainingPath: (points: LatLng[]) => void;
  setOriginMarker: (pos: LatLng) => void;
  setDestMarker: (pos: LatLng) => void;
  fitBounds: (points: LatLng[]) => void;
  replayPath: (points: LatLng[], intervalMs?: number) => void;
}

function loadAMapScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.AMap) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[data-amap]');
    if (existing) {
      const check = () => {
        if (window.AMap) resolve();
        else setTimeout(check, 100);
      };
      check();
      return;
    }
    const script = document.createElement('script');
    script.setAttribute('data-amap', '1');
    script.src =
      'https://webapi.amap.com/maps?v=2.0&key=YOUR_AMAP_KEY';
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

export function useAMap(options: UseAMapOptions): UseAMapReturn {
  const { containerId, center, zoom = 14 } = options;
  const mapRef = useRef<AMap.Map | null>(null);
  const driverMarkerRef = useRef<AMap.Marker | null>(null);
  const originMarkerRef = useRef<AMap.Marker | null>(null);
  const destMarkerRef = useRef<AMap.Marker | null>(null);
  const traveledLineRef = useRef<AMap.Polyline | null>(null);
  const remainingLineRef = useRef<AMap.Polyline | null>(null);
  const replayTimerRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let destroyed = false;

    async function init() {
      await loadAMapScript();
      if (destroyed || !window.AMap) return;

      const A = window.AMap;
      const map = new A.Map(containerId, {
        zoom,
        center: center ? new A.LngLat(center.lng, center.lat) : undefined,
        viewMode: '2D',
      });
      mapRef.current = map;

      driverMarkerRef.current = new A.Marker({
        map,
        position: center ? new A.LngLat(center.lng, center.lat) : undefined,
        content: '<div style="font-size:24px;line-height:1;">🚗</div>',
        offset: new A.Pixel(-12, -12),
        zIndex: 200,
      });

      originMarkerRef.current = new A.Marker({
        map,
        content: '<div style="width:14px;height:14px;border-radius:50%;background:#FF7A45;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);"></div>',
        offset: new A.Pixel(-7, -7),
        zIndex: 150,
      });

      destMarkerRef.current = new A.Marker({
        map,
        content: '<div style="width:14px;height:14px;border-radius:50%;background:#F5222D;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);"></div>',
        offset: new A.Pixel(-7, -7),
        zIndex: 150,
      });

      traveledLineRef.current = new A.Polyline({
        map,
        strokeColor: '#52C41A',
        strokeWeight: 6,
        strokeOpacity: 0.9,
        strokeStyle: 'solid',
        zIndex: 100,
        path: [],
      });

      remainingLineRef.current = new A.Polyline({
        map,
        strokeColor: '#999999',
        strokeWeight: 4,
        strokeOpacity: 0.7,
        strokeStyle: 'dashed',
        strokeDasharray: [10, 6],
        zIndex: 90,
        path: [],
      });

      if (!destroyed) setReady(true);
    }

    init();

    return () => {
      destroyed = true;
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
      driverMarkerRef.current = null;
      originMarkerRef.current = null;
      destMarkerRef.current = null;
      traveledLineRef.current = null;
      remainingLineRef.current = null;
      setReady(false);
    };
  }, [containerId]);

  const updateDriverMarker = useCallback((pos: LatLng) => {
    if (!driverMarkerRef.current || !window.AMap) return;
    driverMarkerRef.current.setPosition(new window.AMap.LngLat(pos.lng, pos.lat));
  }, []);

  const setTraveledPath = useCallback((points: LatLng[]) => {
    if (!traveledLineRef.current || !window.AMap) return;
    const A = window.AMap;
    traveledLineRef.current.setPath(points.map((p) => new A.LngLat(p.lng, p.lat)));
  }, []);

  const setRemainingPath = useCallback((points: LatLng[]) => {
    if (!remainingLineRef.current || !window.AMap) return;
    const A = window.AMap;
    remainingLineRef.current.setPath(points.map((p) => new A.LngLat(p.lng, p.lat)));
  }, []);

  const setOriginMarker = useCallback((pos: LatLng) => {
    if (!originMarkerRef.current || !window.AMap) return;
    originMarkerRef.current.setPosition(new window.AMap.LngLat(pos.lng, pos.lat));
  }, []);

  const setDestMarker = useCallback((pos: LatLng) => {
    if (!destMarkerRef.current || !window.AMap) return;
    destMarkerRef.current.setPosition(new window.AMap.LngLat(pos.lng, pos.lat));
  }, []);

  const fitBounds = useCallback((points: LatLng[]) => {
    if (!mapRef.current || !window.AMap || points.length === 0) return;
    const A = window.AMap;
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const sw = new A.LngLat(Math.min(...lngs), Math.min(...lats));
    const ne = new A.LngLat(Math.max(...lngs), Math.max(...lats));
    mapRef.current.setFitBounds(new A.Bounds(sw, ne));
  }, []);

  const replayPath = useCallback((points: LatLng[], intervalMs = 200) => {
    if (!mapRef.current || !window.AMap || points.length === 0) return;
    if (replayTimerRef.current) clearInterval(replayTimerRef.current);

    const A = window.AMap;
    let idx = 0;

    if (traveledLineRef.current) traveledLineRef.current.setPath([]);
    if (remainingLineRef.current) {
      remainingLineRef.current.setPath(points.map((p) => new A.LngLat(p.lng, p.lat)));
    }

    replayTimerRef.current = window.setInterval(() => {
      idx++;
      if (idx >= points.length) {
        if (replayTimerRef.current) clearInterval(replayTimerRef.current);
        return;
      }
      const traveled = points.slice(0, idx + 1);
      const remaining = points.slice(idx);
      if (traveledLineRef.current) {
        traveledLineRef.current.setPath(traveled.map((p) => new A.LngLat(p.lng, p.lat)));
      }
      if (remainingLineRef.current) {
        remainingLineRef.current.setPath(remaining.map((p) => new A.LngLat(p.lng, p.lat)));
      }
      if (driverMarkerRef.current) {
        const p = points[idx];
        driverMarkerRef.current.setPosition(new A.LngLat(p.lng, p.lat));
      }
    }, intervalMs);
  }, []);

  return {
    ready,
    updateDriverMarker,
    setTraveledPath,
    setRemainingPath,
    setOriginMarker,
    setDestMarker,
    fitBounds,
    replayPath,
  };
}
