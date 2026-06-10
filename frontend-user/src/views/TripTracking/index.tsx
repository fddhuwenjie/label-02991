import { useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrderStore } from '../../store/orderStore';
import { useAMap, AMapSimulatorView } from '../../hooks/useAMap';
import { Loading } from '../../components/Loading';
import { formatDuration, formatDistance } from '../../utils/format';
import './index.css';

export default function TripTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  const {
    currentOrder,
    tripSimulation,
    completeTrip,
    refreshCurrentOrder,
    loading,
  } = useOrderStore();

  const {
    isReady,
    isRealMap,
    setOriginMarker,
    setDestinationMarker,
    setDriverMarker,
    setTraveledPolyline,
    setRemainingPolyline,
    fitView,
    simulateMapData,
  } = useAMap({
    containerRef: mapContainerRef,
    initialCenter: currentOrder
      ? { lat: currentOrder.origin.lat, lng: currentOrder.origin.lng }
      : undefined,
  });

  useEffect(() => {
    if (orderId) {
      refreshCurrentOrder(orderId);
    }
  }, [orderId, refreshCurrentOrder]);

  useEffect(() => {
    if (!isReady || !currentOrder) return;

    const origin = { lat: currentOrder.origin.lat, lng: currentOrder.origin.lng };
    const destination = { lat: currentOrder.destination.lat, lng: currentOrder.destination.lng };

    setOriginMarker(origin);
    setDestinationMarker(destination);
    fitView([origin, destination]);
  }, [isReady, currentOrder, setOriginMarker, setDestinationMarker, fitView]);

  useEffect(() => {
    if (!isReady || !tripSimulation.isActive) return;

    if (tripSimulation.currentPosition) {
      setDriverMarker(tripSimulation.currentPosition);
    }
    setTraveledPolyline(tripSimulation.traveledPath);
    setRemainingPolyline(tripSimulation.remainingPath);
  }, [
    isReady,
    tripSimulation.isActive,
    tripSimulation.currentPosition,
    tripSimulation.traveledPath,
    tripSimulation.remainingPath,
    setDriverMarker,
    setTraveledPolyline,
    setRemainingPolyline,
  ]);

  useEffect(() => {
    if (tripSimulation.isCompleted && orderId) {
      const timer = setTimeout(async () => {
        const order = await completeTrip(orderId);
        if (order) {
          navigate(`/trip-complete/${orderId}`);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [tripSimulation.isCompleted, orderId, completeTrip, navigate]);

  const handleManualComplete = useCallback(async () => {
    if (!orderId) return;
    const order = await completeTrip(orderId);
    if (order) {
      navigate(`/trip-complete/${orderId}`);
    }
  }, [orderId, completeTrip, navigate]);

  if (!currentOrder) {
    return <Loading fullscreen text="加载行程信息..." />;
  }

  const order = currentOrder;
  const progress = tripSimulation.totalPoints > 0
    ? (tripSimulation.currentIndex / (tripSimulation.totalPoints - 1)) * 100
    : 0;

  return (
    <div className="trip-tracking-page">
      <div className="tt-map-container" ref={mapContainerRef}>
        {!isRealMap && simulateMapData && <AMapSimulatorView data={simulateMapData} />}
      </div>

      <div className="tt-info-panel">
        <div className="tt-status-header">
          <div className="tt-status-badge">
            {tripSimulation.isCompleted ? '已到达' : '行程中'}
          </div>
          <div className="tt-eta-info">
            {tripSimulation.isCompleted ? (
              <span className="tt-eta-text">已到达目的地</span>
            ) : (
              <>
                <span className="tt-eta-text">预计 {formatDuration(tripSimulation.etaSeconds)} 后到达</span>
                <span className="tt-distance">剩余 {formatDistance(tripSimulation.remainingDistance)}</span>
              </>
            )}
          </div>
        </div>

        <div className="tt-progress-section">
          <div className="tt-progress-bar">
            <div className="tt-progress-fill" style={{ width: `${progress}%` }} />
            <div
              className="tt-progress-marker"
              style={{ left: `${progress}%` }}
            >
              🚕
            </div>
          </div>
          <div className="tt-progress-labels">
            <span>出发</span>
            <span>已行驶 {formatDuration(tripSimulation.elapsedSeconds)}</span>
            <span>到达</span>
          </div>
        </div>

        <div className="tt-route-card">
          <div className="tt-route-item">
            <span className="tt-route-dot origin" />
            <div className="tt-route-content">
              <div className="tt-route-name">{order.origin.name}</div>
              <div className="tt-route-addr">{order.origin.address}</div>
            </div>
          </div>
          <div className="tt-route-line" />
          <div className="tt-route-item">
            <span className="tt-route-dot dest" />
            <div className="tt-route-content">
              <div className="tt-route-name">{order.destination.name}</div>
              <div className="tt-route-addr">{order.destination.address}</div>
            </div>
          </div>
        </div>

        {order.driver && (
          <div className="tt-driver-card">
            <div className="tt-driver-left">
              <div className="tt-driver-avatar">{order.driver.name[0]}</div>
              <div className="tt-driver-info">
                <div className="tt-driver-name">{order.driver.name}</div>
                <div className="tt-driver-car">
                  {order.driver.plateNumber} · {order.driver.vehicleColor} {order.driver.vehicleModel}
                </div>
              </div>
            </div>
            <div className="tt-driver-rating">
              ⭐ {order.driver.rating}
            </div>
          </div>
        )}

        <div className="tt-stats-row">
          <div className="tt-stat-item">
            <div className="tt-stat-value">{formatDistance(order.route?.distance || 0)}</div>
            <div className="tt-stat-label">总里程</div>
          </div>
          <div className="tt-stat-item">
            <div className="tt-stat-value">{Math.round(progress)}%</div>
            <div className="tt-stat-label">行程进度</div>
          </div>
          <div className="tt-stat-item">
            <div className="tt-stat-value">{Math.round((order.route?.distance || 0) * progress / 100)}</div>
            <div className="tt-stat-label">已行驶(米)</div>
          </div>
        </div>

        <button
          className="tt-complete-btn"
          onClick={handleManualComplete}
          disabled={loading || tripSimulation.isCompleted}
        >
          {tripSimulation.isCompleted ? '正在跳转...' : '模拟到达目的地'}
        </button>
      </div>
    </div>
  );
}
