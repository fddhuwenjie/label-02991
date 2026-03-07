import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCouponStore } from '../../store/couponStore';
import { useToast } from '../../components/Toast';
import { Layout, PageHeader } from '../../components/Layout';
import { Empty } from '../../components/Empty';
import { formatPrice, formatDate } from '../../utils/format';
import './index.css';

export default function CouponCenterPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { coupons, loadAll, claim, getInviteCode, getInviteQr, recordInviteScan, getInviteScanCount, loading } = useCouponStore();
  const [showInvite, setShowInvite] = useState(false);
  const [activeTab, setActiveTab] = useState<'available' | 'used'>('available');
  const [inviteCode, setInviteCode] = useState('');
  const [inviteQr, setInviteQr] = useState('');
  const [inviteScanCount, setInviteScanCount] = useState(0);

  useEffect(() => {
    loadAll();
    setInviteScanCount(getInviteScanCount());
  }, [loadAll, getInviteScanCount]);

  useEffect(() => {
    if (!showInvite) return;
    const code = getInviteCode();
    setInviteCode(code);
    setInviteQr(getInviteQr(code));
  }, [showInvite, getInviteCode, getInviteQr]);

  const now = Date.now();
  const available = coupons.filter((c) => !c.used && c.expireAt > now);
  const used = coupons.filter((c) => c.used || c.expireAt <= now);
  const displayList = activeTab === 'available' ? available : used;
  const claimedNewUser = coupons.some((c) => c.type === 'newUser');

  const handleClaim = async (type: 'newUser' | 'daily' | 'invite') => {
    const res = await claim(type);
    if (res.success) {
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  };

  return (
    <Layout>
      <div className="coupon-page page-with-header">
        <PageHeader title="优惠中心" onBack={() => navigate(-1)} />

        <div className="coupon-claim-area">
          <div
            className={`claim-card ${claimedNewUser ? 'claim-card-disabled' : ''}`}
            onClick={() => {
              if (claimedNewUser) {
                toast.info('新人专享券每个账号仅可领取一次');
                return;
              }
              handleClaim('newUser');
            }}
          >
            <span className="claim-icon">🎁</span>
            <span className="claim-name">新人专享券</span>
            <span className="claim-desc">
              {claimedNewUser ? '已领取（限1次）' : '¥8 满20可用'}
            </span>
          </div>
          <div className="claim-card" onClick={() => handleClaim('daily')}>
            <span className="claim-icon">📅</span>
            <span className="claim-name">每日签到券</span>
            <span className="claim-desc">¥2 满10可用</span>
          </div>
          <div className="claim-card" onClick={() => setShowInvite(true)}>
            <span className="claim-icon">👥</span>
            <span className="claim-name">邀请好友券</span>
            <span className="claim-desc">¥15 满30可用</span>
          </div>
        </div>

        <div className="coupon-tabs">
          <button
            className={`coupon-tab ${activeTab === 'available' ? 'active' : ''}`}
            onClick={() => setActiveTab('available')}
          >
            可使用 ({available.length})
          </button>
          <button
            className={`coupon-tab ${activeTab === 'used' ? 'active' : ''}`}
            onClick={() => setActiveTab('used')}
          >
            已使用/过期 ({used.length})
          </button>
        </div>

        <div className="coupon-list">
          {displayList.length === 0 ? (
            <Empty text={activeTab === 'available' ? '暂无可用优惠券' : '暂无已使用优惠券'} icon="🎫" />
          ) : (
            displayList.map((coupon) => {
              const expired = coupon.expireAt <= now;
              const isUsed = coupon.used;
              return (
                <div key={coupon.id} className={`coupon-card ${isUsed || expired ? 'disabled' : ''}`}>
                  <div className="cc-left">
                    <span className="cc-amount">¥{coupon.amount}</span>
                    <span className="cc-condition">满{formatPrice(coupon.minSpend)}可用</span>
                  </div>
                  <div className="cc-divider" />
                  <div className="cc-right">
                    <span className="cc-type">{coupon.typeName}</span>
                    <span className="cc-expire">
                      {isUsed ? '已使用' : expired ? '已过期' : `有效期至 ${formatDate(coupon.expireAt)}`}
                    </span>
                  </div>
                  {(isUsed || expired) && <div className="cc-stamp">{isUsed ? '已使用' : '已过期'}</div>}
                </div>
              );
            })
          )}
        </div>

        {showInvite && (
          <div className="invite-overlay" onClick={() => setShowInvite(false)}>
            <div className="invite-modal animate-slideUp" onClick={(e) => e.stopPropagation()}>
              <h3>邀请好友得优惠券</h3>
              <p>将以下邀请码分享给好友，好友注册后双方各得15元优惠券</p>
              <div className="invite-code-box">
                <img className="invite-qr-image" src={inviteQr} alt="invite-qr" />
                <div className="invite-code">{inviteCode || 'INVITE_CODE'}</div>
                <div className="invite-scan-count">已扫码记录：{inviteScanCount}</div>
              </div>
              <div className="invite-actions">
                <button
                  className="btn btn-primary btn-block"
                  onClick={() => {
                    navigator.clipboard?.writeText(inviteCode);
                    toast.success('邀请码已复制');
                  }}
                  disabled={loading}
                >
                  复制邀请码
                </button>
                <button
                  className="btn btn-outline btn-block"
                  onClick={() => {
                    const scanRes = recordInviteScan(inviteCode);
                    if (!scanRes.success) {
                      toast.error(scanRes.message);
                      return;
                    }
                    setInviteScanCount(getInviteScanCount());
                    handleClaim('invite');
                  }}
                  disabled={loading}
                >
                  模拟好友扫码并领取邀请券
                </button>
                <button className="btn btn-ghost btn-block" onClick={() => setShowInvite(false)}>
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
