import { useState, useEffect } from 'react';
import { PageHeader } from '../../components/Layout';
import { Empty } from '../../components/Empty';
import { storage } from '../../utils/storage';
import { getCurrentUser } from '../../api/auth';
import { formatPrice, formatTime } from '../../utils/format';
import type { PaymentRecord } from '../../types';
import './index.css';

export default function PaymentCenterPage() {
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [prepaidBalance, setPrepaidBalance] = useState(0);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setRecords(storage.get<PaymentRecord[]>('payments_' + user.id, []));
      setPrepaidBalance(storage.get<number>('prepaid_balance_' + user.id, 0));
    }
  }, []);

  return (
    <div className="payment-center-page page-with-header">
      <PageHeader title="支付中心" />

      <div className="pc-content">
        <div className="pc-methods card">
          <h4>支付方式</h4>
          <div className="pc-prepaid">
            <span>预付抵扣余额</span>
            <strong>{formatPrice(prepaidBalance)}</strong>
          </div>
          <div className="pc-method-list">
            <div className="pc-method-item">
              <span className="pcm-icon">💬</span>
              <span className="pcm-name">微信支付</span>
              <span className="pcm-status bound">已绑定</span>
            </div>
            <div className="pc-method-item">
              <span className="pcm-icon">🔵</span>
              <span className="pcm-name">支付宝</span>
              <span className="pcm-status bound">已绑定</span>
            </div>
          </div>
          <div className="pc-deduct-info">
            <span className="pdi-icon">ℹ</span>
            <span>扣款顺序：优先使用优惠券，其次预付抵扣，最后绑定支付渠道</span>
          </div>
        </div>

        <div className="pc-records card">
          <h4>支付记录</h4>
          {records.length === 0 ? (
            <Empty text="暂无支付记录" icon="💳" />
          ) : (
            <div className="pc-record-list">
              {records.map((r) => (
                <div key={r.id} className="pc-record-item">
                  <div className="pcr-left">
                    <span className="pcr-order">订单 {r.orderId}</span>
                    <span className="pcr-time">{formatTime(r.paidAt)}</span>
                  </div>
                  <div className="pcr-right">
                    <span className="pcr-amount">{formatPrice(r.amount)}</span>
                    <span className="pcr-method">{r.method === 'wechat' ? '微信支付' : '支付宝'}</span>
                    {(r.prepaidDeduction ?? 0) > 0 && (
                      <span className="pcr-sub">预付抵扣 -{formatPrice(r.prepaidDeduction || 0)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
