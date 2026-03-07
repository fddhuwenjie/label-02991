import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrderStore } from '../../store/orderStore';
import { useCouponStore } from '../../store/couponStore';
import { useToast } from '../../components/Toast';
import { PageHeader } from '../../components/Layout';
import { MapView } from '../../components/MapView';
import { formatDistance, formatDuration, formatPrice } from '../../utils/format';
import { calculatePrice } from '../../api/order';
import { generateMockRoute } from '../../api/mock/data';
import './index.css';

export default function RoutePreviewPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const {
    origin,
    destination,
    vehicleTypes,
    selectedVehicle,
    setSelectedVehicle,
    createOrder,
    loading,
  } = useOrderStore();
  const { availableCoupons, loadAvailable } = useCouponStore();
  const [showDetail, setShowDetail] = useState(false);
  const [showCouponPicker, setShowCouponPicker] = useState(false);
  const [selectedCouponId, setSelectedCouponId] = useState('');
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);

  const routeInfo = useMemo(() => {
    if (!origin || !destination) return null;
    const seed = `${origin.id}-${destination.id}-${origin.lat}-${origin.lng}-${destination.lat}-${destination.lng}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    const distance = 3000 + (hash % 12000);
    const duration = (distance / 500) * 60;
    const route = generateMockRoute();
    return { distance, duration, route };
  }, [origin, destination]);

  const isReady = !!origin && !!destination && !!routeInfo;

  const alternativeRoutes = useMemo(() => {
    if (!routeInfo) return [];
    const base = routeInfo;
    return [
      { id: 'recommended', name: '推荐', distance: base.distance, duration: base.duration, route: base.route },
      { id: 'fastest', name: '最快', distance: base.distance * 1.08, duration: base.duration * 0.88, route: generateMockRoute() },
      { id: 'shortest', name: '最短', distance: base.distance * 0.9, duration: base.duration * 1.12, route: generateMockRoute() },
    ];
  }, [routeInfo]);

  const activeRoute = alternativeRoutes[selectedRouteIdx] || (routeInfo ? {
    id: 'recommended',
    name: '推荐',
    distance: routeInfo.distance,
    duration: routeInfo.duration,
    route: routeInfo.route,
  } : null);

  const currentPrice = selectedVehicle && activeRoute
    ? calculatePrice(selectedVehicle, activeRoute.distance, activeRoute.duration)
    : 0;

  useEffect(() => {
    if (!isReady) navigate('/');
  }, [isReady, navigate]);

  useEffect(() => {
    loadAvailable(currentPrice);
  }, [currentPrice, loadAvailable]);

  const bestCoupon = useMemo(() => {
    if (availableCoupons.length === 0) return null;
    const sorted = [...availableCoupons].sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount;
      if (b.minSpend !== a.minSpend) return b.minSpend - a.minSpend;
      return a.expireAt - b.expireAt;
    });
    return sorted[0];
  }, [availableCoupons]);

  useEffect(() => {
    if (availableCoupons.length === 0) {
      if (selectedCouponId) setSelectedCouponId('');
      return;
    }
    const stillAvailable = availableCoupons.some((c) => c.id === selectedCouponId);
    if (!stillAvailable) {
      setSelectedCouponId(bestCoupon?.id || '');
    }
  }, [availableCoupons, selectedCouponId, bestCoupon]);

  const selectedCoupon = availableCoupons.find((c) => c.id === selectedCouponId);
  const payablePrice = Math.max(0, currentPrice - (selectedCoupon?.amount || 0));

  const handleCallRide = async () => {
    if (!isReady) return;
    try {
      const order = await createOrder(selectedCouponId || undefined);
      toast.success('叫车成功，正在为您匹配司机');
      navigate(`/waiting/${order.id}`);
    } catch (e) {
      toast.error((e as Error).message || '叫车失败');
    }
  };

  if (!isReady) return null;

  return (
    <div className="route-page page-with-header">
      <PageHeader title="路线预览" />

      <MapView
        origin={{ ...origin }}
        destination={{ ...destination }}
        route={activeRoute?.route}
        height="40vh"
      />

      <div className="route-info-bar">
        <div className="route-stat">
          <span className="route-stat-value">{formatDistance(activeRoute?.distance || 0)}</span>
          <span className="route-stat-label">预估里程</span>
        </div>
        <div className="route-stat-divider" />
        <div className="route-stat">
          <span className="route-stat-value">{formatDuration(activeRoute?.duration || 0)}</span>
          <span className="route-stat-label">预估时长</span>
        </div>
      </div>

      <div className="route-addresses">
        <div className="route-addr-item">
          <span className="route-addr-dot origin" />
          <div>
            <span className="route-addr-name">{origin.name}</span>
            <span className="route-addr-detail">{origin.address}</span>
          </div>
        </div>
        <div className="route-addr-item">
          <span className="route-addr-dot dest" />
          <div>
            <span className="route-addr-name">{destination.name}</span>
            <span className="route-addr-detail">{destination.address}</span>
          </div>
        </div>
      </div>

      <div className="route-vehicles">
        <h3 className="section-title">选择车型</h3>
        <div className="route-alternatives">
          {alternativeRoutes.map((r, idx) => (
            <button
              key={r.id}
              className={`route-alt-btn ${selectedRouteIdx === idx ? 'active' : ''}`}
              onClick={() => setSelectedRouteIdx(idx)}
            >
              {r.name}
            </button>
          ))}
        </div>
        {vehicleTypes.map((v) => {
          const price = calculatePrice(v, activeRoute?.distance || 0, activeRoute?.duration || 0);
          const isSelected = selectedVehicle?.id === v.id;
          return (
            <div
              key={v.id}
              className={`vehicle-card ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedVehicle(v)}
            >
              <div className="vehicle-icon">{v.icon}</div>
              <div className="vehicle-info">
                <div className="vehicle-name-row">
                  <span className="vehicle-name">{v.name}</span>
                  <span className="vehicle-arrival">约{v.estimatedArrival}分钟到达</span>
                </div>
                <span className="vehicle-desc">{v.description}</span>
              </div>
              <div className="vehicle-price">{formatPrice(price)}</div>
            </div>
          );
        })}
      </div>

      {selectedVehicle && (
        <div
          className={`route-detail-link ${showDetail ? 'expanded' : ''}`}
          onClick={() => setShowDetail((v) => !v)}
        >
          {showDetail
            ? `收起 ${selectedVehicle.name} 计费规则与服务标准`
            : `查看 ${selectedVehicle.name} 计费规则与服务标准`}
        </div>
      )}

      {showDetail && selectedVehicle && (
        <div className="route-detail-panel animate-slideUp">
          <div className="rd-section">
            <h4>计费规则</h4>
            <p>{selectedVehicle.billingRules}</p>
          </div>
          <div className="rd-section">
            <h4>附加费说明</h4>
            <p>{selectedVehicle.surchargeRules}</p>
          </div>
          <div className="rd-section">
            <h4>服务标准</h4>
            <p>{selectedVehicle.serviceStandard}</p>
          </div>
        </div>
      )}

      {showCouponPicker && (
        <div className="coupon-picker-overlay" onClick={() => setShowCouponPicker(false)}>
          <div className="coupon-picker animate-slideUp" onClick={(e) => e.stopPropagation()}>
            <div className="coupon-picker-header">
              <h3>选择优惠券</h3>
              <button onClick={() => setShowCouponPicker(false)}>✕</button>
            </div>
            <div className="coupon-picker-list">
              <div
                className={`coupon-picker-item ${!selectedCouponId ? 'active' : ''}`}
                onClick={() => {
                  setSelectedCouponId('');
                  setShowCouponPicker(false);
                }}
              >
                <span>不使用优惠券</span>
              </div>
              {availableCoupons.map((c) => (
                <div
                  key={c.id}
                  className={`coupon-picker-item ${selectedCouponId === c.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedCouponId(c.id);
                    setShowCouponPicker(false);
                  }}
                >
                  <div className="cpi-info">
                    <span className="cpi-amount">{formatPrice(c.amount)}</span>
                    <span className="cpi-name">{c.typeName}</span>
                  </div>
                  <span className="cpi-condition">满{formatPrice(c.minSpend)}可用</span>
                </div>
              ))}
              {availableCoupons.length === 0 && (
                <div className="coupon-picker-empty">暂无可用优惠券</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="route-bottom">
        <div className="route-bottom-coupon" onClick={() => setShowCouponPicker(true)}>
          <span className="rcb-label">🎫 优惠券</span>
          <span className="rcb-value">
            {selectedCoupon ? `已默认最优：-${formatPrice(selectedCoupon.amount)}` : '暂无可用优惠券'}
          </span>
          <span className="rcb-more-icon" />
        </div>

        <div className="route-bottom-main">
          <div className="route-bottom-price">
            <span className="route-bottom-label">实付预估</span>
            <span className="route-bottom-value">{selectedVehicle ? formatPrice(payablePrice) : '--'}</span>
            {selectedCoupon && (
              <span className="route-bottom-origin">原价 {formatPrice(currentPrice)}</span>
            )}
          </div>
          <button className="btn btn-primary btn-lg route-call-btn" onClick={handleCallRide} disabled={loading}>
            {loading ? '叫车中...' : '立即叫车'}
          </button>
        </div>
      </div>

    </div>
  );
}
