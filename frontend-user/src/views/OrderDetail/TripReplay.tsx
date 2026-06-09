import { useEffect, useRef, useState } from 'react';
import { useAMap } from '../../hooks/useAMap';
import type { LatLng } from '../../utils/geo';
import './replay.css';

interface TripReplayProps {
  path: LatLng[];
  origin: LatLng;
  destination: LatLng;
}

const REPLAY_INTERVAL_MS = 600;

/**
 * 轨迹回放：将已保存的行驶轨迹按顺序在地图上动画展示。
 */
export function TripReplay({ path, origin, destination }: TripReplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const map = useAMap({ containerRef, center: origin, zoom: 13 });

  // 起终点 + 完整路径（灰色）
  useEffect(() => {
    map.setMarker('origin', { position: origin, label: '起点', zIndex: 10 });
    map.setMarker('destination', { position: destination, label: '终点', zIndex: 10 });
    if (path.length >= 2) {
      map.setPolyline('full', {
        path,
        strokeColor: '#9AA0A6',
        strokeWeight: 3,
        strokeStyle: 'dashed',
        strokeOpacity: 0.6,
      });
    }
  }, [map, origin, destination, path]);

  // 回放进度
  useEffect(() => {
    const replayed = path.slice(0, Math.max(2, index + 1));
    if (replayed.length >= 2) {
      map.setPolyline('replay', {
        path: replayed,
        strokeColor: '#52C41A',
        strokeWeight: 5,
        strokeStyle: 'solid',
        strokeOpacity: 0.9,
      });
    }
    if (path[index]) {
      map.setMarker('replay-driver', {
        position: path[index],
        label: '🚗',
        zIndex: 100,
      });
    }
  }, [index, path, map]);

  useEffect(() => {
    if (!playing) return;
    if (index >= path.length - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setIndex((i) => Math.min(path.length - 1, i + 1)), REPLAY_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [playing, index, path.length]);

  const handlePlay = () => {
    if (index >= path.length - 1) setIndex(0);
    setPlaying(true);
  };

  const handlePause = () => setPlaying(false);
  const handleReset = () => {
    setPlaying(false);
    setIndex(0);
  };

  return (
    <div className="trip-replay">
      <div ref={containerRef} className="trip-replay-map" />
      {!map.ready && (
        <ReplayFallback path={path} origin={origin} destination={destination} index={index} />
      )}
      <div className="trip-replay-controls">
        <span className="trc-progress">
          {index + 1} / {path.length}
        </span>
        <div className="trc-actions">
          {playing ? (
            <button className="trc-btn" onClick={handlePause}>暂停</button>
          ) : (
            <button className="trc-btn primary" onClick={handlePlay}>
              {index >= path.length - 1 ? '重新播放' : '播放'}
            </button>
          )}
          <button className="trc-btn" onClick={handleReset}>重置</button>
        </div>
      </div>
    </div>
  );
}

interface ReplayFallbackProps {
  path: LatLng[];
  origin: LatLng;
  destination: LatLng;
  index: number;
}

function ReplayFallback({ path, origin, destination, index }: ReplayFallbackProps) {
  const minLat = Math.min(origin.lat, destination.lat);
  const maxLat = Math.max(origin.lat, destination.lat);
  const minLng = Math.min(origin.lng, destination.lng);
  const maxLng = Math.max(origin.lng, destination.lng);
  const latPad = Math.max(0.001, (maxLat - minLat) * 0.3);
  const lngPad = Math.max(0.001, (maxLng - minLng) * 0.3);
  const project = (p: LatLng) => ({
    x: ((p.lng - (minLng - lngPad)) / (maxLng - minLng + 2 * lngPad)) * 100,
    y: ((maxLat + latPad - p.lat) / (maxLat - minLat + 2 * latPad)) * 100,
  });

  const buildD = (pts: LatLng[]) =>
    pts
      .map((p, i) => {
        const { x, y } = project(p);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');

  const fullD = buildD(path);
  const replayedD = buildD(path.slice(0, index + 1));
  const driver = path[index];

  return (
    <div className="trip-replay-fallback">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="trip-replay-fallback-svg">
        <path d={fullD} fill="none" stroke="#9AA0A6" strokeWidth="0.6" strokeDasharray="1.2 0.8" />
        <path d={replayedD} fill="none" stroke="#52C41A" strokeWidth="0.9" strokeLinecap="round" />
      </svg>
      {driver && (
        <div
          className="trip-replay-driver"
          style={{ left: `${project(driver).x}%`, top: `${project(driver).y}%` }}
        >
          🚗
        </div>
      )}
    </div>
  );
}
