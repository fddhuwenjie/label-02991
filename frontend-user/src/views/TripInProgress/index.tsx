import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrderStore } from '../../store/orderStore';
import { useToast } from '../../components/Toast';
import { Modal } from '../../components/Modal';
import { MapView } from '../../components/MapView';
import { Loading } from '../../components/Loading';
import { formatPrice, formatDuration, formatDistance, generateId } from '../../utils/format';
import { MOCK_HOT_ADDRESSES } from '../../api/mock/data';
import type { Address } from '../../types';
import './index.css';

export default function TripInProgressPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentOrder, startTrip, completeTrip, modifyDestination, refreshCurrentOrder, loading } = useOrderStore();

  const [nowTs, setNowTs] = useState(Date.now());
  const [showModify, setShowModify] = useState(false);
  const [newDestSearch, setNewDestSearch] = useState('');
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [negotiationTarget, setNegotiationTarget] = useState<Address | null>(null);

  useEffect(() => {
    if (orderId) {
      refreshCurrentOrder(orderId);
      if (currentOrder?.status === 'accepted') {
        startTrip(orderId);
      }
    }
  }, [orderId, refreshCurrentOrder, startTrip, currentOrder?.status]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleComplete = useCallback(async () => {
    if (!orderId) return;
    const order = await completeTrip(orderId);
    if (order) {
      navigate(`/trip-complete/${orderId}`);
    }
  }, [orderId, completeTrip, navigate]);

  const handleModifyDest = useCallback((addr: Address) => {
    setNegotiationTarget(addr);
    setIsNegotiating(true);
    toast.info('已向司机发起改终点协商请求，等待司机确认...');
  }, [toast]);

  useEffect(() => {
    if (!isNegotiating || !negotiationTarget || !orderId) return;

    const timer = setTimeout(async () => {
      const approved = Math.random() > 0.15;
      if (!approved) {
        setIsNegotiating(false);
        toast.error('司机暂未同意修改目的地，请稍后重试');
        return;
      }

      const order = await modifyDestination(orderId, negotiationTarget);
      setIsNegotiating(false);
      if (order) {
        setShowModify(false);
        toast.success(`司机已同意，目的地已修改，新预估价格 ${formatPrice(order.estimatedPrice)}`);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [isNegotiating, negotiationTarget, orderId, modifyDestination, toast]);

  if (!currentOrder) {
    return <Loading fullscreen text="加载行程信息..." />;
  }

  const order = currentOrder;
  const startedAt = order.startedAt || nowTs;
  const elapsed = Math.max(0, Math.floor((nowTs - startedAt) / 1000));
  const estimatedArrival = Math.max(0, Math.floor((order.route?.duration || 0) - elapsed));
  const buildCustomAddress = (keyword: string): Address => {
    let hash = 0;
    for (let i = 0; i < keyword.length; i++) {
      hash = (hash * 31 + keyword.charCodeAt(i)) >>> 0;
    }
    const latOffset = ((hash % 1000) / 1000) * 0.05 - 0.025;
    const lngOffset = (((hash >> 10) % 1000) / 1000) * 0.05 - 0.025;
    return {
      id: generateId(),
      name: keyword,
      address: keyword,
      lat: order.destination.lat + latOffset,
      lng: order.destination.lng + lngOffset,
    };
  };

  const addressPool = [...MOCK_HOT_ADDRESSES];
  const searchResults = newDestSearch.trim()
    ? addressPool.filter((a) =>
        a.name.includes(newDestSearch) || a.address.includes(newDestSearch)
      )
    : addressPool.slice(0, 4);

  const canUseCustomInput = newDestSearch.trim().length > 0;

  return (
    <div className="trip-page">
      <MapView
        origin={{ ...order.origin }}
        destination={{ ...order.destination }}
        driverLocation={order.currentDriverLocation || { lat: order.origin.lat + 0.003, lng: order.origin.lng + 0.002 }}
        route={order.route?.polyline}
        height="45vh"
      />

      <div className="trip-panel">
        <div className="trip-status-bar">
          <div className="tsb-left">
            <span className="tsb-badge">行程中</span>
            <span className="tsb-eta">
              预计 {formatDuration(estimatedArrival)} 后到达
            </span>
          </div>
          <div className="tsb-elapsed">{formatDuration(elapsed)}</div>
        </div>

        <div className="trip-route-info">
          <div className="tri-item">
            <span className="tri-dot origin" />
            <span>{order.origin.name}</span>
          </div>
          <div className="tri-line" />
          <div className="tri-item">
            <span className="tri-dot dest" />
            <span>{order.destination.name}</span>
            <button className="tri-modify" onClick={() => setShowModify(true)}>修改</button>
          </div>
        </div>

        {order.driver && (
          <div className="trip-driver">
            <div className="td-left">
              <div className="td-avatar">{order.driver.name[0]}</div>
              <div>
                <div className="td-name">{order.driver.name}</div>
                <div className="td-vehicle">{order.driver.plateNumber} · {order.driver.vehicleModel}</div>
              </div>
            </div>
            <div className="td-actions">
              <button className="td-action" onClick={() => toast.info('正在通过加密号码呼叫司机...')}>📞</button>
              <button className="td-action" onClick={() => toast.info('消息功能：可在此与司机沟通')}>💬</button>
            </div>
          </div>
        )}

        <div className="trip-progress">
          <div className="tp-bar">
            <div
              className="tp-fill"
              style={{ width: `${Math.min(95, (elapsed / (order.route?.duration || 600)) * 100)}%` }}
            />
          </div>
          <div className="tp-stats">
            <span>{order.route ? formatDistance(order.route.distance) : '--'}</span>
            <span>预估 {formatPrice(order.estimatedPrice)}</span>
          </div>
        </div>

        <button className="btn btn-primary btn-block btn-lg" onClick={handleComplete} disabled={loading}>
          {loading ? '处理中...' : '模拟到达目的地'}
        </button>
      </div>

      <Modal
        visible={showModify}
        title="修改目的地"
        onClose={() => setShowModify(false)}
        showCancel={false}
      >
        <div className="modify-dest-body">
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
            修改目的地后，价格 = 已行驶路段费用 + 新路线费用
          </p>
          <input
            type="text"
            className="input-field"
            placeholder="搜索新目的地"
            value={newDestSearch}
            onChange={(e) => setNewDestSearch(e.target.value)}
          />
          <div className="modify-results">
            {isNegotiating && (
              <div className="modify-result-item" style={{ cursor: 'default' }}>
                <span>💬 正在与司机协商...</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  {negotiationTarget ? `目标：${negotiationTarget.name}` : '请稍候'}
                </span>
              </div>
            )}
            {canUseCustomInput && (
              <div
                className="modify-result-item modify-result-item-custom"
                onClick={() => !isNegotiating && handleModifyDest(buildCustomAddress(newDestSearch.trim()))}
              >
                <span>📌 使用输入地址</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{newDestSearch.trim()}</span>
              </div>
            )}
            {searchResults.map((addr) => (
              <div
                key={addr.id}
                className="modify-result-item"
                onClick={() => !isNegotiating && handleModifyDest({ ...addr, id: generateId() })}
              >
                <span>📍 {addr.name}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{addr.address}</span>
              </div>
            ))}
            {canUseCustomInput && searchResults.length === 0 && (
              <div className="modify-empty-tip">未匹配到推荐地点，你可以直接使用上方输入地址</div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
