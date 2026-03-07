import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrderStore } from '../../store/orderStore';
import { useToast } from '../../components/Toast';
import { Modal } from '../../components/Modal';
import { MapView } from '../../components/MapView';
import { Loading } from '../../components/Loading';
import { formatPrice } from '../../utils/format';
import './index.css';

export default function WaitingDriverPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentOrder, setCurrentOrder, simulateDriverAccept, cancelOrder, loading, refreshCurrentOrder } = useOrderStore();

  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [waitTime, setWaitTime] = useState(0);
  const accepted = useRef(false);
  const accepting = useRef(false);

  useEffect(() => {
    if (orderId) refreshCurrentOrder(orderId);
  }, [orderId, refreshCurrentOrder]);

  useEffect(() => {
    // Reset acceptance guard when switching to another order page.
    accepted.current = false;
    setWaitTime(0);
  }, [orderId]);

  useEffect(() => {
    const timer = setInterval(() => setWaitTime((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!orderId || accepted.current) return;
    if (accepting.current) return;
    if (currentOrder?.status === 'waiting') {
      accepting.current = true;
      simulateDriverAccept(orderId).then((order) => {
        if (order) {
          accepted.current = true;
          toast.success('司机已接单');
        }
      }).catch(() => {
        toast.error('匹配司机失败，请稍后重试');
      }).finally(() => {
        accepting.current = false;
      });
    }
  }, [orderId, currentOrder?.status, simulateDriverAccept, toast]);

  const handleCancel = useCallback(async () => {
    if (!orderId) return;
    const order = await cancelOrder(orderId, cancelReason || '用户主动取消');
    if (order) {
      setShowCancel(false);
      if (order.cancelFee && order.cancelFee > 0) {
        toast.info(`订单已取消，取消费 ${formatPrice(order.cancelFee)}`);
      } else {
        toast.success('订单已免费取消');
      }
      navigate('/orders');
    }
  }, [orderId, cancelReason, cancelOrder, navigate, toast]);

  const handleStartTrip = useCallback(() => {
    if (orderId) navigate(`/trip/${orderId}`);
  }, [orderId, navigate]);

  if (!currentOrder) {
    return <Loading fullscreen text="加载订单信息..." />;
  }

  if (currentOrder.status === 'cancelled') {
    navigate('/orders');
    return null;
  }

  const order = currentOrder;
  const isAccepted = order.status === 'accepted';

  return (
    <div className="waiting-page">
      <MapView
        origin={{ ...order.origin }}
        destination={{ ...order.destination }}
        driverLocation={order.currentDriverLocation}
        showNearbyDrivers={isAccepted ? 0 : order.nearbyDrivers}
        height="45vh"
      />

      <div className="waiting-panel">
        {!isAccepted ? (
          <div className="waiting-status animate-fadeIn">
            <div className="waiting-spinner">
              <div className="ws-ring" />
              <span className="ws-text">匹配中</span>
            </div>
            <h3 className="waiting-title">正在为您寻找司机</h3>
            <p className="waiting-subtitle">
              附近有 <strong>{order.nearbyDrivers}</strong> 位司机 · 预估等待 <strong>{order.estimatedWait}</strong> 分钟
            </p>
            <p className="waiting-timer">已等待 {Math.floor(waitTime / 60)}:{String(waitTime % 60).padStart(2, '0')}</p>
          </div>
        ) : (
          <div className="accepted-info animate-slideUp">
            <div className="accepted-header">
              <span className="accepted-badge">司机已接单</span>
            </div>
            {order.driver && (
              <div className="driver-card">
                <div className="driver-avatar">
                  {order.driver.avatar || order.driver.name[0]}
                </div>
                <div className="driver-info">
                  <div className="driver-name">{order.driver.name}</div>
                  <div className="driver-meta">
                    <span>⭐ {order.driver.rating}</span>
                    <span>{order.driver.totalTrips}单</span>
                  </div>
                </div>
                <div className="driver-vehicle">
                  <div className="dv-plate">{order.driver.plateNumber}</div>
                  <div className="dv-model">{order.driver.vehicleColor} {order.driver.vehicleModel}</div>
                </div>
              </div>
            )}
            <div className="driver-actions">
              <button className="driver-action-btn" onClick={() => toast.info('正在通过加密号码呼叫司机...')}>
                📞 呼叫司机
              </button>
              <button className="driver-action-btn" onClick={() => toast.info('消息功能：请在此处告知司机具体上车地点')}>
                💬 发消息
              </button>
            </div>
            <button className="btn btn-primary btn-block btn-lg" onClick={handleStartTrip} style={{ marginTop: 16 }}>
              司机已到达，开始行程
            </button>
          </div>
        )}

        <div className="waiting-order-info">
          <div className="woi-item">
            <span className="woi-label">订单号</span>
            <span className="woi-value">{order.id}</span>
          </div>
          <div className="woi-item">
            <span className="woi-label">出发地</span>
            <span className="woi-value">{order.origin.name}</span>
          </div>
          <div className="woi-item">
            <span className="woi-label">目的地</span>
            <span className="woi-value">{order.destination.name}</span>
          </div>
          <div className="woi-item">
            <span className="woi-label">车型</span>
            <span className="woi-value">{order.vehicleType.name}</span>
          </div>
          <div className="woi-item">
            <span className="woi-label">预估价格</span>
            <span className="woi-value price">{formatPrice(order.estimatedPrice)}</span>
          </div>
        </div>

        <button className="btn btn-ghost btn-block cancel-btn" onClick={() => setShowCancel(true)}>
          取消订单
        </button>

        {isAccepted && order.acceptedAt && (
          <div className="cancel-fee-tip">
            {Date.now() - order.acceptedAt < 3 * 60 * 1000
              ? '3分钟内取消免费'
              : `取消需支付取消费（约${formatPrice(Math.min((Date.now() - order.acceptedAt) / 60000 - 3, 30))}）`}
          </div>
        )}
      </div>

      <Modal
        visible={showCancel}
        title="取消订单"
        onClose={() => setShowCancel(false)}
        onConfirm={handleCancel}
        confirmText={loading ? '取消中...' : '确认取消'}
      >
        <div className="cancel-modal-body">
          <p>确定要取消订单吗？</p>
          {isAccepted && order.acceptedAt && Date.now() - order.acceptedAt > 3 * 60 * 1000 && (
            <p className="cancel-fee-warning">⚠ 司机已接单超过3分钟，取消将产生取消费</p>
          )}
          <div className="cancel-reasons">
            {['等待时间太长', '行程有变', '选错地址', '其他原因'].map((r) => (
              <button
                key={r}
                className={`cancel-reason-btn ${cancelReason === r ? 'active' : ''}`}
                onClick={() => setCancelReason(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
