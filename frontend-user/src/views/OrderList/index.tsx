import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrderStore } from '../../store/orderStore';
import { Layout } from '../../components/Layout';
import { Empty } from '../../components/Empty';
import { formatPrice, formatShortTime } from '../../utils/format';
import type { OrderStatus } from '../../types';
import './index.css';

const STATUS_MAP: Record<OrderStatus, { label: string; className: string }> = {
  waiting: { label: '等待接单', className: 'badge-warning' },
  accepted: { label: '已接单', className: 'badge-primary' },
  in_progress: { label: '行程中', className: 'badge-primary' },
  pending_payment: { label: '待支付', className: 'badge-error' },
  completed: { label: '已完成', className: 'badge-success' },
  cancelled: { label: '已取消', className: '' },
};

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
  { key: 'pending_payment', label: '待支付' },
];

export default function OrderListPage() {
  const navigate = useNavigate();
  const { orders, loadOrders } = useOrderStore();
  const [activeTab, setActiveTab] = useState('all');
  const [vehicleType, setVehicleType] = useState('all');
  const [timeRange, setTimeRange] = useState('all');

  useEffect(() => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const startDate =
      timeRange === '7d' ? now - 7 * day : timeRange === '30d' ? now - 30 * day : undefined;
    loadOrders({ status: activeTab, startDate });
  }, [activeTab, timeRange, loadOrders]);

  const filteredOrders =
    vehicleType === 'all'
      ? orders
      : orders.filter((o) => o.vehicleType.id === vehicleType);

  return (
    <Layout>
      <div className="order-list-page">
        <div className="ol-header">
          <h2>我的订单</h2>
        </div>

        <div className="ol-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`ol-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="ol-filters">
          <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
            <option value="all">全部车型</option>
            <option value="express">快车</option>
            <option value="carpool">顺风车</option>
          </select>
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
            <option value="all">全部时间</option>
            <option value="7d">近7天</option>
            <option value="30d">近30天</option>
          </select>
        </div>

        <div className="ol-list">
          {filteredOrders.length === 0 ? (
            <Empty text="暂无订单记录" icon="📋" />
          ) : (
            filteredOrders.map((order) => {
              const statusInfo = STATUS_MAP[order.status];
              return (
                <div
                  key={order.id}
                  className="order-card"
                  onClick={() => {
                    if (order.status === 'waiting' || order.status === 'accepted') {
                      navigate(`/waiting/${order.id}`);
                    } else if (order.status === 'in_progress') {
                      navigate(`/trip/${order.id}`);
                    } else {
                      navigate(`/order/${order.id}`);
                    }
                  }}
                >
                  <div className="oc-header">
                    <span className="oc-type">{order.vehicleType.icon} {order.vehicleType.name}</span>
                    <span className={`badge ${statusInfo.className}`}>{statusInfo.label}</span>
                  </div>
                  <div className="oc-route">
                    <div className="oc-addr">
                      <span className="oc-dot origin" />
                      <span>{order.origin.name}</span>
                    </div>
                    <div className="oc-addr">
                      <span className="oc-dot dest" />
                      <span>{order.destination.name}</span>
                    </div>
                  </div>
                  <div className="oc-footer">
                    <span className="oc-time">{formatShortTime(order.createdAt)}</span>
                    <span className="oc-price">
                      {order.finalPrice ? formatPrice(order.finalPrice) : formatPrice(order.estimatedPrice)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}
