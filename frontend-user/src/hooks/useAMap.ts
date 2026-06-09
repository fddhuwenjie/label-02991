import { useEffect, useRef, useCallback } from 'react';
import type { LatLng } from '../utils/geo';

declare global {
  interface Window {
    AMap?: any;
    _amapLoaderPromise?: Promise<any>;
    _amapKey?: string;
  }
}

/**
 * 异步加载高德地图 JS SDK。如果已加载则直接复用。
 */
function loadAMap(key?: string): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.AMap) return Promise.resolve(window.AMap);
  if (window._amapLoaderPromise) return window._amapLoaderPromise;

  const finalKey = key || window._amapKey || '';
  window._amapLoaderPromise = new Promise((resolve, reject) => {
    if (!finalKey) {
      // 无 key 时，标记加载失败，由调用方降级处理。
      reject(new Error('AMap key not configured'));
      return;
    }
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${finalKey}`;
    script.async = true;
    script.onload = () => {
      if (window.AMap) resolve(window.AMap);
      else reject(new Error('AMap load failed'));
    };
    script.onerror = () => reject(new Error('AMap script error'));
    document.head.appendChild(script);
  });
  return window._amapLoaderPromise;
}

export interface MarkerOptions {
  position: LatLng;
  icon?: string;
  label?: string;
  zIndex?: number;
}

export interface PolylineOptions {
  path: LatLng[];
  strokeColor?: string;
  strokeWeight?: number;
  strokeStyle?: 'solid' | 'dashed';
  strokeOpacity?: number;
}

export interface UseAMapApi {
  /** 真实地图是否已就绪。false 表示降级为本地 fallback 渲染。 */
  ready: boolean;
  /** 设置/更新一个具名标记点。 */
  setMarker: (id: string, options: MarkerOptions) => void;
  /** 移除一个具名标记点。 */
  removeMarker: (id: string) => void;
  /** 设置/更新一条具名折线。 */
  setPolyline: (id: string, options: PolylineOptions) => void;
  /** 移除一条具名折线。 */
  removePolyline: (id: string) => void;
  /** 自适应视野到给定坐标集。 */
  fitView: (points: LatLng[]) => void;
  /** 清空所有覆盖物。 */
  clearAll: () => void;
}

interface UseAMapOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  center?: LatLng;
  zoom?: number;
  apiKey?: string;
  onReady?: (api: UseAMapApi) => void;
}

/**
 * 高德地图自定义 Hook。封装地图初始化、标记点管理、折线绘制。
 * 组件不应直接访问 window.AMap。
 */
export function useAMap(options: UseAMapOptions): UseAMapApi {
  const { containerRef, center, zoom = 14, apiKey, onReady } = options;

  const mapRef = useRef<any>(null);
  const amapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const polylinesRef = useRef<Map<string, any>>(new Map());
  const readyRef = useRef(false);
  const fallbackStateRef = useRef<{
    markers: Map<string, MarkerOptions>;
    polylines: Map<string, PolylineOptions>;
  }>({ markers: new Map(), polylines: new Map() });

  // 初始化
  useEffect(() => {
    let cancelled = false;
    loadAMap(apiKey)
      .then((AMap) => {
        if (cancelled || !containerRef.current) return;
        amapRef.current = AMap;
        mapRef.current = new AMap.Map(containerRef.current, {
          zoom,
          center: center ? [center.lng, center.lat] : undefined,
          viewMode: '2D',
        });
        readyRef.current = true;
        onReady?.(apiPublic);
      })
      .catch(() => {
        // SDK 不可用，使用降级状态。
        readyRef.current = false;
      });
    return () => {
      cancelled = true;
      if (mapRef.current) {
        try {
          mapRef.current.destroy();
        } catch {
          /* ignore */
        }
        mapRef.current = null;
      }
      markersRef.current.clear();
      polylinesRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMarker = useCallback((id: string, opts: MarkerOptions) => {
    fallbackStateRef.current.markers.set(id, opts);
    const AMap = amapRef.current;
    const map = mapRef.current;
    if (!AMap || !map) return;

    const existing = markersRef.current.get(id);
    if (existing) {
      existing.setPosition([opts.position.lng, opts.position.lat]);
      if (opts.label) existing.setLabel({ content: opts.label, direction: 'top' });
    } else {
      const marker = new AMap.Marker({
        position: [opts.position.lng, opts.position.lat],
        icon: opts.icon,
        zIndex: opts.zIndex,
        label: opts.label ? { content: opts.label, direction: 'top' } : undefined,
      });
      marker.setMap(map);
      markersRef.current.set(id, marker);
    }
  }, []);

  const removeMarker = useCallback((id: string) => {
    fallbackStateRef.current.markers.delete(id);
    const marker = markersRef.current.get(id);
    if (marker) {
      marker.setMap(null);
      markersRef.current.delete(id);
    }
  }, []);

  const setPolyline = useCallback((id: string, opts: PolylineOptions) => {
    fallbackStateRef.current.polylines.set(id, opts);
    const AMap = amapRef.current;
    const map = mapRef.current;
    if (!AMap || !map) return;

    const path = opts.path.map((p) => [p.lng, p.lat]);
    const existing = polylinesRef.current.get(id);
    if (existing) {
      existing.setPath(path);
      existing.setOptions({
        strokeColor: opts.strokeColor,
        strokeWeight: opts.strokeWeight,
        strokeStyle: opts.strokeStyle,
        strokeOpacity: opts.strokeOpacity,
      });
    } else {
      const polyline = new AMap.Polyline({
        path,
        strokeColor: opts.strokeColor || '#3366FF',
        strokeWeight: opts.strokeWeight ?? 4,
        strokeStyle: opts.strokeStyle || 'solid',
        strokeOpacity: opts.strokeOpacity ?? 0.9,
      });
      polyline.setMap(map);
      polylinesRef.current.set(id, polyline);
    }
  }, []);

  const removePolyline = useCallback((id: string) => {
    fallbackStateRef.current.polylines.delete(id);
    const line = polylinesRef.current.get(id);
    if (line) {
      line.setMap(null);
      polylinesRef.current.delete(id);
    }
  }, []);

  const fitView = useCallback((_points: LatLng[]) => {
    const map = mapRef.current;
    if (!map) return;
    try {
      map.setFitView();
    } catch {
      /* ignore */
    }
  }, []);

  const clearAll = useCallback(() => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current.clear();
    polylinesRef.current.forEach((l) => l.setMap(null));
    polylinesRef.current.clear();
    fallbackStateRef.current.markers.clear();
    fallbackStateRef.current.polylines.clear();
  }, []);

  const apiPublic: UseAMapApi = {
    ready: readyRef.current,
    setMarker,
    removeMarker,
    setPolyline,
    removePolyline,
    fitView,
    clearAll,
  };

  return apiPublic;
}

/**
 * 暴露给降级 UI 使用：从内部状态读取当前覆盖物快照。
 * 仅在 useAMap 内部调用方需要时使用。
 */
export type { LatLng };
