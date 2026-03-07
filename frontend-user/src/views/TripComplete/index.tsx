import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrderStore } from '../../store/orderStore';
import { useToast } from '../../components/Toast';
import { PageHeader } from '../../components/Layout';
import { StarRating } from '../../components/StarRating';
import { Loading } from '../../components/Loading';
import { formatPrice, formatDuration, formatDistance, formatTime } from '../../utils/format';
import type { OrderRating } from '../../types';
import './index.css';

export default function TripCompletePage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentOrder, payOrder, rateOrder, refreshCurrentOrder, loading } = useOrderStore();

  const [payMethod, setPayMethod] = useState('wechat');
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState<OrderRating>({
    attitude: 5,
    driving: 5,
    cleanliness: 5,
    comment: '',
    createdAt: 0,
  });

  useEffect(() => {
    if (orderId) refreshCurrentOrder(orderId);
  }, [orderId, refreshCurrentOrder]);

  const handlePay = useCallback(async () => {
    if (!orderId) return;
    const order = await payOrder(orderId, payMethod);
    if (order) {
      toast.success('支付成功');
      setShowRating(true);
    }
  }, [orderId, payMethod, payOrder, toast]);

  const handleRate = useCallback(async () => {
    if (!orderId) return;
    if (rating.comment.length > 100) {
      toast.error('评价内容不超过100字');
      return;
    }
    const updated = await rateOrder(orderId, rating);
    if (!updated) {
      toast.error('评价失败，请稍后重试');
      return;
    }
    toast.success('评价成功，感谢您的反馈');
    navigate('/orders');
  }, [orderId, rating, rateOrder, navigate, toast]);

  if (!currentOrder) {
    return <Loading fullscreen text="加载行程信息..." />;
  }

  const order = currentOrder;
  const isPaid = order.status === 'completed';
  const isPending = order.status === 'pending_payment';
  const duration = order.startedAt && order.completedAt ? (order.completedAt - order.startedAt) / 1000 : 0;

  return (
    <div className="complete-page page-with-header">
      <PageHeader title="行程结束" onBack={() => navigate('/orders')} />

      <div className="complete-content">
        <div className="complete-status">
          {isPending ? (
            <>
              <span className="cs-icon pending">💳</span>
              <h3>待支付</h3>
            </>
          ) : (
            <>
              <span className="cs-icon done">✓</span>
              <h3>行程已完成</h3>
            </>
          )}
        </div>

        <div className="complete-fee card">
          <h4>费用明细</h4>
          <div className="fee-item">
            <span>订单号</span>
            <span>{order.id}</span>
          </div>
          <div className="fee-item">
            <span>行程时长</span>
            <span>{formatDuration(duration)}</span>
          </div>
          <div className="fee-item">
            <span>行驶里程</span>
            <span>{order.route ? formatDistance(order.route.distance) : '--'}</span>
          </div>
          <div className="fee-item">
            <span>一口价金额</span>
            <span>{formatPrice(order.actualPrice || order.estimatedPrice)}</span>
          </div>
          {(order.surcharge ?? 0) > 0 && (
            <div className="fee-item">
              <span>附加费</span>
              <span>{formatPrice(order.surcharge!)}</span>
            </div>
          )}
          {(order.couponDiscount ?? 0) > 0 && (
            <div className="fee-item discount">
              <span>优惠券抵扣</span>
              <span>-{formatPrice(order.couponDiscount!)}</span>
            </div>
          )}
          {(order.prepaidDeduction ?? 0) > 0 && (
            <div className="fee-item discount">
              <span>预付抵扣金额</span>
              <span>-{formatPrice(order.prepaidDeduction!)}</span>
            </div>
          )}
          <div className="fee-total">
            <span>实付金额</span>
            <span className="fee-total-amount">{formatPrice(order.finalPrice || order.estimatedPrice)}</span>
          </div>
        </div>

        {isPending && (
          <div className="payment-section card">
            <h4>选择支付方式</h4>
            <div className="pay-methods">
              {[
                { key: 'wechat', name: '微信支付', icon: '💬' },
                { key: 'alipay', name: '支付宝', icon: '🔵' },
              ].map((m) => (
                <label key={m.key} className={`pay-method ${payMethod === m.key ? 'active' : ''}`}>
                  <span className="pm-icon">{m.icon}</span>
                  <span className="pm-name">{m.name}</span>
                  <span className={`pm-radio ${payMethod === m.key ? 'checked' : ''}`} />
                  <input
                    type="radio"
                    name="payMethod"
                    value={m.key}
                    checked={payMethod === m.key}
                    onChange={(e) => setPayMethod(e.target.value)}
                    hidden
                  />
                </label>
              ))}
            </div>
            <button className="btn btn-primary btn-block btn-lg" onClick={handlePay} disabled={loading}>
              {loading ? '支付中...' : `立即支付 ${formatPrice(order.finalPrice || order.estimatedPrice)}`}
            </button>
          </div>
        )}

        {(isPaid && !order.rating && showRating) && (
          <div className="rating-section card animate-slideUp">
            <h4>服务评价</h4>
            <div className="rating-items">
              <StarRating label="服务态度" value={rating.attitude} onChange={(v) => setRating({ ...rating, attitude: v })} />
              <StarRating label="驾驶技术" value={rating.driving} onChange={(v) => setRating({ ...rating, driving: v })} />
              <StarRating label="车辆整洁" value={rating.cleanliness} onChange={(v) => setRating({ ...rating, cleanliness: v })} />
            </div>
            <textarea
              className="textarea-field"
              placeholder="填写文字评价（最多100字）"
              maxLength={100}
              value={rating.comment}
              onChange={(e) => setRating({ ...rating, comment: e.target.value })}
            />
            <div className="rating-counter">{rating.comment.length}/100</div>
            <button className="btn btn-primary btn-block" onClick={handleRate} disabled={loading}>
              {loading ? '提交中...' : '提交评价'}
            </button>
          </div>
        )}

        {isPaid && !showRating && !order.rating && (
          <button className="btn btn-outline btn-block" onClick={() => setShowRating(true)} style={{ marginTop: 16 }}>
            评价此次行程
          </button>
        )}

        {order.rating && (
          <div className="rating-done card">
            <h4>我的评价</h4>
            <div className="rating-items">
              <StarRating label="服务态度" value={order.rating.attitude} readonly />
              <StarRating label="驾驶技术" value={order.rating.driving} readonly />
              <StarRating label="车辆整洁" value={order.rating.cleanliness} readonly />
            </div>
            {order.rating.comment && (
              <p className="rating-comment">{order.rating.comment}</p>
            )}
            <p className="rating-time">{formatTime(order.rating.createdAt)}</p>
          </div>
        )}

        {isPaid && order.paidAt && (
          <div className="payment-info card">
            <h4>支付信息</h4>
            <div className="fee-item">
              <span>支付方式</span>
              <span>{order.paymentMethod === 'wechat' ? '微信支付' : '支付宝'}</span>
            </div>
            <div className="fee-item">
              <span>支付时间</span>
              <span>{formatTime(order.paidAt)}</span>
            </div>
            <div className="fee-item">
              <span>交易单号</span>
              <span style={{ fontSize: 12 }}>{order.transactionId}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
