import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Layout } from '../../components/Layout';
import { maskPhone } from '../../utils/format';
import './index.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  if (!user) {
    navigate('/login');
    return null;
  }

  const menuItems = [
    { icon: '👤', label: '个人信息', path: '/personal-info' },
    { icon: '💳', label: '支付中心', path: '/payment-center' },
    { icon: '🎫', label: '优惠券', path: '/coupons' },
    { icon: '🔒', label: '账户设置', path: '/account-settings' },
    { icon: '💬', label: '客服中心', path: '/customer-service' },
    { icon: '📝', label: '意见反馈', path: '/feedback' },
    { icon: '❓', label: '常见问题', path: '/faq' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout>
      <div className="profile-page">
        <div className="profile-header">
          <div className="ph-avatar">
            {user.avatar ? (
              <img src={user.avatar} alt="avatar" />
            ) : (
              <span>{user.nickname[0]}</span>
            )}
          </div>
          <div className="ph-info">
            <h3 className="ph-name">{user.nickname}</h3>
            <p className="ph-phone">{maskPhone(user.phone)}</p>
          </div>
          <button className="ph-edit" onClick={() => navigate('/personal-info')}>
            编辑资料
          </button>
        </div>

        <div className="profile-stats">
          <div className="ps-item" onClick={() => navigate('/orders')}>
            <span className="ps-icon">📋</span>
            <span className="ps-label">全部订单</span>
          </div>
          <div className="ps-item" onClick={() => navigate('/orders?status=pending_payment')}>
            <span className="ps-icon">💰</span>
            <span className="ps-label">待支付</span>
          </div>
          <div className="ps-item" onClick={() => navigate('/coupons')}>
            <span className="ps-icon">🎫</span>
            <span className="ps-label">优惠券</span>
          </div>
          <div className="ps-item" onClick={() => navigate('/payment-center')}>
            <span className="ps-icon">💳</span>
            <span className="ps-label">支付</span>
          </div>
        </div>

        <div className="profile-menu">
          {menuItems.map((item) => (
            <div key={item.path} className="pm-item" onClick={() => navigate(item.path)}>
              <span className="pm-icon">{item.icon}</span>
              <span className="pm-label">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="profile-logout">
          <button className="btn btn-ghost btn-block" onClick={handleLogout}>
            退出登录
          </button>
        </div>
      </div>
    </Layout>
  );
}
