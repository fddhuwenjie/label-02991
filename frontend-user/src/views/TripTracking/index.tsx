import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrderStore } from '../../store/orderStore';
import { useAMap } from '../../hooks/useAMap';
import { Loading } from '../../components/Loading';
import { formatDuration, formatPrice } from '../../utils/format';
import { formatDistanceMeters } from '../../utils/geo';
import './index.css';

export default function TripTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const {
    currentOrder,
    refreshCurrentOrder,
    tripSimulation,
    startTripSimulation,
    stopTripSimulation,
    resetTripSimulation,
    completeTrip,
  } = useOrderStore();

  const origin = currentOrder?.origin;
  const destination = currentOrder?.destination;

  const mapCenter = useRef<{ lat: number; lng: number } | null>(null);
  if (origin) {
    mapCenter.current = { lat: origin.lat, lng: origin.lng };
  }

  const { mapRef,
    mapReady,
    addMarker,
    updateMarker,
    addPolyline,
    updatePolyline,
    fitView,
  } = useAMap(mapCenter.current || undefined, 14);

  const markersRef = useRef<{
    driver: string;
    origin: string;
    destination: string;
  }>({ driver: '', origin: '', destination: '' });

  const polylinesRef = useRef<{
    traveled: string;
    remaining: string;
  }>({ traveled: '', remaining: '' });

  const [nowTs] = useState(Date.now());

  useEffect(() => {
    if (orderId) {
      refreshCurrentOrder(orderId);
    }
    return () => {
      stopTripSimulation();
    };
  }, [orderId, refreshCurrentOrder, stopTripSimulation]);

  useEffect(() => {
    if (!origin || !destination || tripSimulation.isRunning) return;
    startTripSimulation(origin, destination);
  }, [origin, destination, startTripSimulation, tripSimulation.isRunning]);

  useEffect(() => {
    if (!mapReady || !origin || !destination) return;

    if (!markersRef.current.origin) {
      markersRef.current.origin = addMarker(
        { lat: origin.lat, lng: origin.lng }
      );
    }

    if (!markersRef.current.destination) {
      markersRef.current.destination = addMarker(
        { lat: destination.lat, lng: destination.lng }
      );
    }

    if (!markersRef.current.driver && tripSimulation.currentPosition) {
      markersRef.current.driver = addMarker(tripSimulation.currentPosition);
    }

    if (!polylinesRef.current.traveled && tripSimulation.traveledPath.length > 0) {
      polylinesRef.current.traveled = addPolyline(tripSimulation.traveledPath, {
        strokeColor: '#00B42A',
        strokeWeight: 6,
        strokeOpacity: 0.9,
      });
    }

    if (!polylinesRef.current.remaining && tripSimulation.remainingPath.length > 0) {
      polylinesRef.current.remaining = addPolyline(tripSimulation.remainingPath, {
        strokeColor: '#CCCCCC',
        strokeWeight: 5,
        strokeOpacity: 0.7,
        strokeStyle: 'dashed',
      });
    }

    fitView([60, 60, 60, 60]);
  }, [mapReady, origin, destination, addMarker, addPolyline, fitView, tripSimulation.currentPosition, tripSimulation.traveledPath.length, tripSimulation.remainingPath.length]);

  useEffect(() => {
    if (tripSimulation.currentPosition && markersRef.current.driver) {
      updateMarker(markersRef.current.driver, tripSimulation.currentPosition);
    }
  }, [tripSimulation.currentPosition, updateMarker]);

  useEffect(() => {
    if (polylinesRef.current.traveled && tripSimulation.traveledPath.length > 0) {
      updatePolyline(polylinesRef.current.traveled, tripSimulation.traveledPath);
    }
  }, [tripSimulation.traveledPath, updatePolyline]);

  useEffect(() => {
    if (polylinesRef.current.remaining && tripSimulation.remainingPath.length > 0) {
      updatePolyline(polylinesRef.current.remaining, tripSimulation.remainingPath);
    }
  }, [tripSimulation.remainingPath, updatePolyline]);

  useEffect(() => {
    if (!tripSimulation.isRunning && tripSimulation.currentIndex > 0 && orderId && tripSimulation.fullPath.length > 0) {
      const timer = setTimeout(async () => {
        const { currentOrder } = useOrderStore.getState();
        if (currentOrder) {
          const updatedOrder = {
            ...currentOrder,
            traveledPath: tripSimulation.fullPath,
          };
          useOrderStore.getState().setCurrentOrder(updatedOrder);
        }
        const order = await completeTrip(orderId);
        if (order) {
          navigate(`/trip-complete/${orderId}`);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [tripSimulation.isRunning, tripSimulation.currentIndex, tripSimulation.fullPath, orderId, completeTrip, navigate]);

  if (!currentOrder || !origin || !destination) {
    return <Loading fullscreen text="加载行程信息..." />;
  }

  const order = currentOrder;
  const startedAt = order.startedAt || nowTs;
  const elapsed = Math.max(0, Math.floor((nowTs - startedAt) / 1000));
  const progress = tripSimulation.totalDistance > 0
    ? ((tripSimulation.totalDistance - tripSimulation.remainingDistance) / tripSimulation.totalDistance) * 100
    : 0;

  return (
    <div className="trip-tracking-page">
      <div ref={mapRef} className="trip-tracking-map" />
      {!mapReady && <Loading text="地图加载中..." />}

      <div className="trip-tracking-panel">
        <div className="ttp-status-bar">
          <div className="ttp-left">
            <span className="ttp-badge">行程中</span>
            <span className="ttp-eta">
              预计 {formatDuration(tripSimulation.estimatedArrival)} 后到达
            </span>
          </div>
          <div className="ttp-remaining">
            剩余 {formatDistanceMeters(tripSimulation.remainingDistance)}
          </div>
        </div>

        <div className="ttp-route-info">
          <div className="tri-item">
            <span className="tri-dot origin" />
            <span>{origin.name}</span>
          </div>
          <div className="tri-line" />
          <div className="tri-item">
            <span className="tri-dot dest" />
            <span>{destination.name}</span>
          </div>
        </div>

        {order.driver && (
          <div className="ttp-driver">
            <div className="td-left">
              <div className="td-avatar">{order.driver.name[0]}</div>
              <div>
                <div className="td-name">{order.driver.name}</div>
                <div className="td-vehicle">{order.driver.plateNumber} · {order.driver.vehicleModel}</div>
              </div>
            </div>
            <div className="td-actions">
              <button className="td-action">📞</button>
              <button className="td-action">💬</button>
            </div>
          </div>
        )}

        <div className="ttp-progress">
          <div className="tp-bar">
            <div
              className="tp-fill"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <div className="tp-stats">
            <span>{formatDistanceMeters(tripSimulation.totalDistance)}</span>
            <span>预估 {formatPrice(order.estimatedPrice)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
