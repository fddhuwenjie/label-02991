import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrderStore } from '../../store/orderStore';
import { useToast } from '../../components/Toast';
import { PageHeader } from '../../components/Layout';
import { StarRating } from '../../components/StarRating';
import { Loading } from '../../components/Loading';
import { formatPrice, formatTime, formatDuration, formatDistance } from '../../utils/format';
import './index.css';

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentOrder, refreshCurrentOrder, setCurrentOrder } = useOrderStore();

  useEffect(() => {
    if (orderId) refreshCurrentOrder(orderId);
    return () => setCurrentOrder(null);
  }, [orderId, refreshCurrentOrder, setCurrentOrder]);

  if (!currentOrder) {
    return <Loading fullscreen text="加载订单详情..." />;
  }

  const order = currentOrder;
  const duration = order.startedAt && order.completedAt ? (order.completedAt - order.startedAt) / 1000 : 0;
  const canContactDriver = order.driver && order.completedAt && (Date.now() - order.completedAt) < 48 * 3600 * 1000;

  return (
    <div className="detail-page page-with-header">
      <PageHeader title="订单详情" />

      <div className="detail-content">
        <div className="detail-status-card card">
          <div className="dsc-status">
            {order.status === 'completed' && <span className="dsc-badge badge-success">已完成</span>}
            {order.status === 'cancelled' && <span className="dsc-badge badge-error">已取消</span>}
            {order.status === 'pending_payment' && <span className="dsc-badge badge-warning">待支付</span>}
          </div>
          <div className="dsc-orderid">订单号：{order.id}</div>
          <div className="dsc-time">下单时间：{formatTime(order.createdAt)}</div>
        </div>

        <div className="detail-route card">
          <h4>行程信息</h4>
          <div className="dr-item">
            <span className="dr-dot origin" />
            <div>
              <span className="dr-name">{order.origin.name}</span>
              <span className="dr-addr">{order.origin.address}</span>
            </div>
          </div>
          <div className="dr-item">
            <span className="dr-dot dest" />
            <div>
              <span className="dr-name">{order.destination.name}</span>
              <span className="dr-addr">{order.destination.address}</span>
            </div>
          </div>
          <div className="dr-meta">
            <span>{order.vehicleType.icon} {order.vehicleType.name}</span>
            {order.route && <span>{formatDistance(order.route.distance)}</span>}
            {duration > 0 && <span>{formatDuration(duration)}</span>}
          </div>
        </div>

        {(order.status === 'completed' || order.status === 'pending_payment') && (
          <div className="detail-fee card">
            <h4>费用明细</h4>
            <div className="df-item">
              <span>一口价金额</span>
              <span>{formatPrice(order.actualPrice || order.estimatedPrice)}</span>
            </div>
            {(order.surcharge ?? 0) > 0 && (
              <div className="df-item">
                <span>附加费</span>
                <span>{formatPrice(order.surcharge!)}</span>
              </div>
            )}
            {(order.couponDiscount ?? 0) > 0 && (
              <div className="df-item discount">
                <span>优惠券抵扣</span>
                <span>-{formatPrice(order.couponDiscount!)}</span>
              </div>
            )}
            {(order.prepaidDeduction ?? 0) > 0 && (
              <div className="df-item discount">
                <span>预付抵扣金额</span>
                <span>-{formatPrice(order.prepaidDeduction!)}</span>
              </div>
            )}
            <div className="df-total">
              <span>实付金额</span>
              <span>{formatPrice(order.finalPrice || order.estimatedPrice)}</span>
            </div>
          </div>
        )}

        {order.status === 'cancelled' && (
          <div className="detail-cancel card">
            <h4>取消信息</h4>
            {order.cancelReason && (
              <div className="df-item">
                <span>取消原因</span>
                <span>{order.cancelReason}</span>
              </div>
            )}
            {order.cancelledAt && (
              <div className="df-item">
                <span>取消时间</span>
                <span>{formatTime(order.cancelledAt)}</span>
              </div>
            )}
            {(order.cancelFee ?? 0) > 0 && (
              <div className="df-item">
                <span>取消费</span>
                <span style={{ color: 'var(--color-error)' }}>{formatPrice(order.cancelFee!)}</span>
              </div>
            )}
          </div>
        )}

        {order.driver && (
          <div className="detail-driver card">
            <h4>司机信息</h4>
            <div className="dd-info">
              <div className="dd-avatar">{order.driver.name[0]}</div>
              <div className="dd-text">
                <span className="dd-name">{order.driver.name}</span>
                <span className="dd-meta">⭐ {order.driver.rating} · {order.driver.totalTrips}单</span>
              </div>
              <div className="dd-vehicle">
                <span>{order.driver.plateNumber}</span>
                <span>{order.driver.vehicleColor} {order.driver.vehicleModel}</span>
              </div>
            </div>
          </div>
        )}

        {order.rating && (
          <div className="detail-rating card">
            <h4>我的评价</h4>
            <div className="drt-items">
              <StarRating label="服务态度" value={order.rating.attitude} readonly size={18} />
              <StarRating label="驾驶技术" value={order.rating.driving} readonly size={18} />
              <StarRating label="车辆整洁" value={order.rating.cleanliness} readonly size={18} />
            </div>
            {order.rating.comment && <p className="drt-comment">{order.rating.comment}</p>}
          </div>
        )}

        {order.paidAt && (
          <div className="detail-payment card">
            <h4>支付信息</h4>
            <div className="df-item">
              <span>支付方式</span>
              <span>{order.paymentMethod === 'wechat' ? '微信支付' : '支付宝'}</span>
            </div>
            <div className="df-item">
              <span>支付时间</span>
              <span>{formatTime(order.paidAt)}</span>
            </div>
            <div className="df-item">
              <span>交易单号</span>
              <span style={{ fontSize: 11 }}>{order.transactionId}</span>
            </div>
          </div>
        )}

        <div className="detail-actions">
          {order.status === 'pending_payment' && (
            <button className="btn btn-primary btn-block" onClick={() => navigate(`/trip-complete/${order.id}`)}>
              去支付
            </button>
          )}
          <button className="btn btn-outline btn-block" onClick={() => toast.info('正在连接客服...')}>
            联系客服
          </button>
          {canContactDriver && (
            <button className="btn btn-outline btn-block" onClick={() => toast.info('正在联系司机查找遗失物品...')}>
              查找遗失物品
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
