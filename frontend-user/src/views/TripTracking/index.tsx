import { useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrderStore } from '../../store/orderStore';
import { useToast } from '../../components/Toast';
import { Loading } from '../../components/Loading';
import { useAMap } from '../../hooks/useAMap';
import { saveTripPath } from '../../api/order';
import { formatDistance, formatDuration } from '../../utils/format';
import { totalPathDistance, type LatLng } from '../../utils/geo';
import './index.css';

const COLOR_TRAVELED = '#52C41A';
const COLOR_REMAINING = '#9AA0A6';

export default function TripTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const {
    currentOrder,
    refreshCurrentOrder,
    startTripSimulation,
    stopTripSimulation,
    resetTripSimulation,
    completeTrip,
    tripSimulation,
  } = useOrderStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const completionHandledRef = useRef(false);

  const map = useAMap({
    containerRef,
    center: currentOrder
      ? { lat: currentOrder.origin.lat, lng: currentOrder.origin.lng }
      : undefined,
    zoom: 13,
  });

  // 加载订单 & 启动模拟
  useEffect(() => {
    if (!orderId) return;
    refreshCurrentOrder(orderId);
    startTripSimulation(orderId);
    return () => {
      stopTripSimulation();
      resetTripSimulation();
    };
  }, [orderId, refreshCurrentOrder, startTripSimulation, stopTripSimulation, resetTripSimulation]);

  // 同步起终点标记
  useEffect(() => {
    if (!currentOrder) return;
    map.setMarker('origin', {
      position: { lat: currentOrder.origin.lat, lng: currentOrder.origin.lng },
      label: currentOrder.origin.name,
      zIndex: 10,
    });
    map.setMarker('destination', {
      position: {
        lat: currentOrder.destination.lat,
        lng: currentOrder.destination.lng,
      },
      label: currentOrder.destination.name,
      zIndex: 10,
    });
    return () => {
      // 组件卸载时由 clearAll 处理
    };
  }, [currentOrder, map]);

  // 同步司机当前位置 + 路径
  useEffect(() => {
    if (!tripSimulation.pathPoints.length) return;

    if (tripSimulation.currentLocation) {
      map.setMarker('driver', {
        position: tripSimulation.currentLocation,
        label: '司机',
        zIndex: 100,
      });
    }

    if (tripSimulation.traveledPath.length >= 2) {
      map.setPolyline('traveled', {
        path: tripSimulation.traveledPath,
        strokeColor: COLOR_TRAVELED,
        strokeWeight: 5,
        strokeStyle: 'solid',
        strokeOpacity: 0.9,
      });
    }

    const remainingPath = tripSimulation.pathPoints.slice(tripSimulation.currentIndex);
    if (remainingPath.length >= 2) {
      map.setPolyline('remaining', {
        path: remainingPath,
        strokeColor: COLOR_REMAINING,
        strokeWeight: 4,
        strokeStyle: 'dashed',
        strokeOpacity: 0.85,
      });
    } else {
      map.removePolyline('remaining');
    }
  }, [tripSimulation, map]);

  // 行程结束后自动结束订单并跳转评价页
  useEffect(() => {
    if (!orderId || !tripSimulation.finished) return;
    if (completionHandledRef.current) return;
    completionHandledRef.current = true;

    saveTripPath(orderId, tripSimulation.traveledPath);
    completeTrip(orderId).finally(() => {
      toast.success('行程已结束');
      navigate(`/trip-complete/${orderId}`);
    });
  }, [tripSimulation.finished, tripSimulation.traveledPath, orderId, completeTrip, navigate, toast]);

  if (!currentOrder) {
    return <Loading fullscreen text="加载行程信息..." />;
  }

  const remainingMinutes =
    tripSimulation.estimatedArrivalAt && !tripSimulation.finished
      ? Math.max(0, Math.round((tripSimulation.estimatedArrivalAt - Date.now()) / 1000))
      : 0;

  return (
    <div className="tracking-page">
      <div className="tracking-map-wrap">
        <div ref={containerRef} className="tracking-map-container" />
        {!map.ready && (
          <FallbackMap
            origin={{ lat: currentOrder.origin.lat, lng: currentOrder.origin.lng }}
            destination={{
              lat: currentOrder.destination.lat,
              lng: currentOrder.destination.lng,
            }}
            traveled={tripSimulation.traveledPath}
            remaining={tripSimulation.pathPoints.slice(tripSimulation.currentIndex)}
            driver={tripSimulation.currentLocation}
          />
        )}
      </div>

      <div className="tracking-panel">
        <div className="tracking-row">
          <span className="tracking-badge">行程进行中</span>
          {tripSimulation.finished ? (
            <span className="tracking-eta done">已抵达</span>
          ) : (
            <span className="tracking-eta">
              预计 {formatDuration(remainingMinutes)} 后到达
            </span>
          )}
        </div>

        <div className="tracking-stats">
          <div className="ts-item">
            <span className="ts-label">已行驶</span>
            <span className="ts-value">
              {formatDistance(
                Math.max(0, getTraveledDistance(tripSimulation.traveledPath)),
              )}
            </span>
          </div>
          <div className="ts-item">
            <span className="ts-label">剩余距离</span>
            <span className="ts-value">{formatDistance(tripSimulation.remainingDistanceM)}</span>
          </div>
          <div className="ts-item">
            <span className="ts-label">轨迹点</span>
            <span className="ts-value">
              {tripSimulation.currentIndex + 1}/{tripSimulation.pathPoints.length || 1}
            </span>
          </div>
        </div>

        <div className="tracking-route">
          <div className="tr-item">
            <span className="tr-dot origin" />
            <span>{currentOrder.origin.name}</span>
          </div>
          <div className="tr-line" />
          <div className="tr-item">
            <span className="tr-dot dest" />
            <span>{currentOrder.destination.name}</span>
          </div>
        </div>

        <div className="tracking-legend">
          <span className="legend-item">
            <span className="legend-line traveled" /> 已行驶路线
          </span>
          <span className="legend-item">
            <span className="legend-line remaining" /> 剩余路线
          </span>
        </div>
      </div>
    </div>
  );
}

function getTraveledDistance(points: LatLng[]): number {
  if (points.length < 2) return 0;
  return totalPathDistance(points);
}

interface FallbackMapProps {
  origin: LatLng;
  destination: LatLng;
  traveled: LatLng[];
  remaining: LatLng[];
  driver: LatLng | null;
}

function FallbackMap({ origin, destination, traveled, remaining, driver }: FallbackMapProps) {
  const bounds = useMemo(() => {
    const latRange = Math.max(0.001, Math.abs(destination.lat - origin.lat));
    const lngRange = Math.max(0.001, Math.abs(destination.lng - origin.lng));
    return {
      minLat: Math.min(origin.lat, destination.lat) - latRange * 0.3,
      maxLat: Math.max(origin.lat, destination.lat) + latRange * 0.3,
      minLng: Math.min(origin.lng, destination.lng) - lngRange * 0.3,
      maxLng: Math.max(origin.lng, destination.lng) + lngRange * 0.3,
    };
  }, [origin, destination]);

  const project = (p: LatLng) => {
    const x = ((p.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
    const y = ((bounds.maxLat - p.lat) / (bounds.maxLat - bounds.minLat)) * 100;
    return { x, y };
  };

  const traveledD = traveled
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${project(p).x.toFixed(2)} ${project(p).y.toFixed(2)}`)
    .join(' ');
  const remainingD = remaining
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${project(p).x.toFixed(2)} ${project(p).y.toFixed(2)}`)
    .join(' ');

  const oPos = project(origin);
  const dPos = project(destination);
  const drPos = driver ? project(driver) : null;

  return (
    <div className="tracking-fallback">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="tracking-fallback-svg">
        {remainingD && (
          <path
            d={remainingD}
            fill="none"
            stroke={COLOR_REMAINING}
            strokeWidth="0.6"
            strokeDasharray="1.2 0.8"
          />
        )}
        {traveledD && (
          <path
            d={traveledD}
            fill="none"
            stroke={COLOR_TRAVELED}
            strokeWidth="0.9"
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="tf-marker tf-origin" style={{ left: `${oPos.x}%`, top: `${oPos.y}%` }}>
        <span className="tf-dot origin" />
      </div>
      <div className="tf-marker tf-dest" style={{ left: `${dPos.x}%`, top: `${dPos.y}%` }}>
        <span className="tf-dot dest" />
      </div>
      {drPos && (
        <div className="tf-driver" style={{ left: `${drPos.x}%`, top: `${drPos.y}%` }}>
          🚗
        </div>
      )}
    </div>
  );
}
