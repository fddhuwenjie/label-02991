import { useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrderStore } from '../../store/orderStore';
import { useAMap } from '../../hooks/useAMap';
import { Loading } from '../../components/Loading';
import { formatDuration, formatDistance, formatPrice } from '../../utils/format';
import './index.css';

export default function TripTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const {
    currentOrder,
    tripSimulation,
    initTripSimulation,
    tickTripSimulation,
    completeTripSimulation,
    resetTripSimulation,
    completeTrip,
    refreshCurrentOrder,
    startTrip,
  } = useOrderStore();

  const initializedRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const mapContainerId = 'trip-tracking-map';

  const {
    ready: mapReady,
    updateDriverMarker,
    setTraveledPath,
    setRemainingPath,
    setOriginMarker,
    setDestMarker,
    fitBounds,
  } = useAMap({
    containerId: mapContainerId,
    center: currentOrder?.origin
      ? { lat: currentOrder.origin.lat, lng: currentOrder.origin.lng }
      : undefined,
  });

  useEffect(() => {
    if (orderId) {
      refreshCurrentOrder(orderId);
    }
    return () => {
      resetTripSimulation();
    };
  }, [orderId, refreshCurrentOrder, resetTripSimulation]);

  useEffect(() => {
    if (
      currentOrder?.status === 'accepted' &&
      orderId &&
      !initializedRef.current
    ) {
      startTrip(orderId);
    }
  }, [currentOrder?.status, orderId, startTrip]);

  useEffect(() => {
    if (
      !currentOrder ||
      currentOrder.status !== 'in_progress' ||
      initializedRef.current
    )
      return;

    const origin = { lat: currentOrder.origin.lat, lng: currentOrder.origin.lng };
    const dest = { lat: currentOrder.destination.lat, lng: currentOrder.destination.lng };
    const durationSec = currentOrder.route?.duration || 600;

    initTripSimulation(origin, dest, durationSec);
    initializedRef.current = true;
  }, [currentOrder, initTripSimulation]);

  useEffect(() => {
    if (!tripSimulation.isSimulating || tripSimulation.isCompleted) return;

    timerRef.current = window.setInterval(() => {
      tickTripSimulation();
    }, 2000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [tripSimulation.isSimulating, tripSimulation.isCompleted, tickTripSimulation]);

  useEffect(() => {
    if (!mapReady || !tripSimulation.currentPosition) return;

    updateDriverMarker(tripSimulation.currentPosition);

    const traveled = tripSimulation.waypoints.slice(0, tripSimulation.currentIndex + 1);
    const remaining = tripSimulation.waypoints.slice(tripSimulation.currentIndex);

    setTraveledPath(traveled);
    setRemainingPath(remaining);
  }, [
    mapReady,
    tripSimulation.currentPosition,
    tripSimulation.currentIndex,
    tripSimulation.waypoints,
    updateDriverMarker,
    setTraveledPath,
    setRemainingPath,
  ]);

  useEffect(() => {
    if (!mapReady || !currentOrder) return;

    setOriginMarker({ lat: currentOrder.origin.lat, lng: currentOrder.origin.lng });
    setDestMarker({ lat: currentOrder.destination.lat, lng: currentOrder.destination.lng });
    fitBounds([
      { lat: currentOrder.origin.lat, lng: currentOrder.origin.lng },
      { lat: currentOrder.destination.lat, lng: currentOrder.destination.lng },
    ]);
  }, [mapReady, currentOrder, setOriginMarker, setDestMarker, fitBounds]);

  const handleTripComplete = useCallback(async () => {
    if (!orderId) return;
    completeTripSimulation();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const order = await completeTrip(orderId);
    if (order) {
      navigate(`/trip-complete/${orderId}`);
    }
  }, [orderId, completeTripSimulation, completeTrip, navigate]);

  useEffect(() => {
    if (tripSimulation.isCompleted && !tripSimulation.isSimulating && orderId) {
      const timer = setTimeout(() => {
        completeTrip(orderId).then((order) => {
          if (order) {
            navigate(`/trip-complete/${orderId}`);
          }
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [tripSimulation.isCompleted, tripSimulation.isSimulating, orderId, completeTrip, navigate]);

  if (!currentOrder) {
    return <Loading fullscreen text="加载行程追踪..." />;
  }

  const order = currentOrder;
  const progress =
    tripSimulation.waypoints.length > 1
      ? (tripSimulation.currentIndex / (tripSimulation.waypoints.length - 1)) * 100
      : 0;

  return (
    <div className="tracking-page">
      <div id={mapContainerId} className="tracking-map" />

      <div className="tracking-panel">
        <div className="tracking-status-bar">
          <div className="tsb-left">
            <span className="tsb-badge">实时追踪</span>
            <span className="tsb-eta">
              预计 {formatDuration(tripSimulation.eta)} 到达
            </span>
          </div>
          <div className="tsb-dist">
            剩余 {formatDistance(tripSimulation.remainingDist)}
          </div>
        </div>

        <div className="tracking-route-info">
          <div className="tri-item">
            <span className="tri-dot origin" />
            <span>{order.origin.name}</span>
          </div>
          <div className="tri-line" />
          <div className="tri-item">
            <span className="tri-dot dest" />
            <span>{order.destination.name}</span>
          </div>
        </div>

        {order.driver && (
          <div className="tracking-driver">
            <div className="td-left">
              <div className="td-avatar">{order.driver.name[0]}</div>
              <div>
                <div className="td-name">{order.driver.name}</div>
                <div className="td-vehicle">
                  {order.driver.plateNumber} · {order.driver.vehicleModel}
                </div>
              </div>
            </div>
            <div className="td-actions">
              <button
                className="td-action"
                onClick={() => alert('正在通过加密号码呼叫司机...')}
              >
                📞
              </button>
              <button
                className="td-action"
                onClick={() => alert('消息功能：可在此与司机沟通')}
              >
                💬
              </button>
            </div>
          </div>
        )}

        <div className="tracking-progress">
          <div className="tp-bar">
            <div
              className="tp-fill"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <div className="tp-stats">
            <span>已行驶 {formatDistance(tripSimulation.remainingDist > 0 ? (order.route?.distance || 0) - tripSimulation.remainingDist : order.route?.distance || 0)}</span>
            <span>预估 {formatPrice(order.estimatedPrice)}</span>
          </div>
        </div>

        <button
          className="btn btn-primary btn-block btn-lg"
          onClick={handleTripComplete}
          disabled={tripSimulation.isCompleted}
        >
          {tripSimulation.isCompleted ? '行程已结束' : '模拟到达目的地'}
        </button>
      </div>
    </div>
  );
}
