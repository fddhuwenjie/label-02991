import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrderStore } from '../../store/orderStore';
import { useCouponStore } from '../../store/couponStore';
import { useToast } from '../../components/Toast';
import { PageHeader } from '../../components/Layout';
import { formatPrice } from '../../utils/format';
import { calculatePrice } from '../../api/order';
import './index.css';

export default function VehicleSelectPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { origin, destination, selectedVehicle, vehicleTypes, setSelectedVehicle, createOrder, loading } = useOrderStore();
  const { availableCoupons, loadAvailable } = useCouponStore();

  const [showDetail, setShowDetail] = useState(false);
  const [selectedCouponId, setSelectedCouponId] = useState<string>('');
  const [showCouponPicker, setShowCouponPicker] = useState(false);

  if (!origin || !destination) {
    navigate('/');
    return null;
  }

  const tripProfile = useMemo(() => {
    const seed = `${origin.id}-${destination.id}-${origin.name}-${destination.name}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    const distance = 3000 + (hash % 12000);
    const duration = (distance / 500) * 60;
    return { distance, duration };
  }, [origin.id, destination.id, origin.name, destination.name]);

  const currentPrice = selectedVehicle
    ? calculatePrice(selectedVehicle, tripProfile.distance, tripProfile.duration)
    : 0;

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

  const handleCallRide = async () => {
    try {
      const order = await createOrder(selectedCouponId || undefined);
      toast.success('叫车成功，正在为您匹配司机');
      navigate(`/waiting/${order.id}`);
    } catch (e) {
      toast.error((e as Error).message || '叫车失败');
    }
  };

  const handleOpenCoupons = () => {
    loadAvailable(currentPrice);
    setShowCouponPicker(true);
  };

  const selectedCoupon = availableCoupons.find((c) => c.id === selectedCouponId);
  const payablePrice = Math.max(0, currentPrice - (selectedCoupon?.amount || 0));

  return (
    <div className="vehicle-page page-with-header">
      <PageHeader title="确认叫车" />

      <div className="vehicle-route-summary">
        <div className="vrs-item">
          <span className="vrs-dot origin" />
          <span className="vrs-text">{origin.name}</span>
        </div>
        <div className="vrs-line" />
        <div className="vrs-item">
          <span className="vrs-dot dest" />
          <span className="vrs-text">{destination.name}</span>
        </div>
      </div>

      <div className="vehicle-type-list">
        {vehicleTypes.map((v) => {
          const price = calculatePrice(v, tripProfile.distance, tripProfile.duration);
          const active = selectedVehicle?.id === v.id;
          return (
            <div
              key={v.id}
              className={`vt-card ${active ? 'active' : ''}`}
              onClick={() => setSelectedVehicle(v)}
            >
              <div className="vt-icon">{v.icon}</div>
              <div className="vt-body">
                <div className="vt-name">{v.name}</div>
                <div className="vt-tags">
                  {v.features.map((f, i) => (
                    <span key={i} className="vt-tag">{f}</span>
                  ))}
                </div>
              </div>
              <div className="vt-right">
                <div className="vt-price">{formatPrice(price)}</div>
                <div className="vt-eta">约{v.estimatedArrival}分钟</div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedVehicle && (
        <div className="vehicle-detail-toggle" onClick={() => setShowDetail(!showDetail)}>
          {showDetail ? '收起详情' : '查看计费规则与服务标准'}
        </div>
      )}

      {showDetail && selectedVehicle && (
        <div className="vehicle-detail-panel animate-slideUp">
          <div className="vd-section">
            <h4>计费规则</h4>
            <p>{selectedVehicle.billingRules}</p>
          </div>
          <div className="vd-section">
            <h4>附加费说明</h4>
            <p>{selectedVehicle.surchargeRules}</p>
          </div>
          <div className="vd-section">
            <h4>服务标准</h4>
            <p>{selectedVehicle.serviceStandard}</p>
          </div>
          <div className="vd-section">
            <h4>车型配置</h4>
            <div className="vd-features">
              {selectedVehicle.features.map((f, i) => (
                <span key={i} className="tag tag-active">{f}</span>
              ))}
            </div>
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
                onClick={() => { setSelectedCouponId(''); setShowCouponPicker(false); }}
              >
                <span>不使用优惠券</span>
              </div>
              {availableCoupons.map((c) => (
                <div
                  key={c.id}
                  className={`coupon-picker-item ${selectedCouponId === c.id ? 'active' : ''}`}
                  onClick={() => { setSelectedCouponId(c.id); setShowCouponPicker(false); }}
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

      <div className="vehicle-coupon-floating" onClick={handleOpenCoupons}>
        <span className="vcs-label">🎫 优惠券</span>
        <span className="vcs-value">
          {selectedCoupon
            ? `已默认最优：${formatPrice(selectedCoupon.amount)}`
            : '暂无可用优惠券'}
        </span>
        <span className="vcs-more">选择</span>
      </div>

      <div className="vehicle-bottom">
        <div className="vb-price-area">
          <span className="vb-label">实付预估</span>
          <span className="vb-price">{formatPrice(payablePrice)}</span>
          {selectedCoupon && (
            <span className="vb-origin-price">原价 {formatPrice(currentPrice)}</span>
          )}
          {selectedCoupon && (
            <span className="vb-discount">-{formatPrice(selectedCoupon.amount)}</span>
          )}
        </div>
        <button
          className="btn btn-primary btn-lg vb-btn"
          disabled={loading}
          onClick={handleCallRide}
        >
          {loading ? '叫车中...' : '立即叫车'}
        </button>
      </div>

      <div className="cancel-rules-tip">
        <span className="cancel-rules-icon">ℹ</span>
        取消规则：司机接单3分钟内可免费取消，超过3分钟取消需支付取消费（1元/分钟）
      </div>
    </div>
  );
}
