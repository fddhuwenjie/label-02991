import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/Toast';
import { PageHeader } from '../../components/Layout';
import { maskPhone } from '../../utils/format';
import { storage } from '../../utils/storage';
import { getDeviceFingerprint } from '../../utils/device';
import './index.css';

export default function AccountSettingsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, logout, updateUser } = useAuthStore();

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleLoginProtection = async () => {
    const next = !(user.loginProtection ?? false);
    if (next) {
      const key = 'trusted_devices_' + user.id;
      const trusted = storage.get<string[]>(key, []);
      const fp = getDeviceFingerprint();
      if (!trusted.includes(fp)) {
        storage.set(key, [...trusted, fp]);
      }
    }
    const res = await updateUser({ loginProtection: next });
    if (res.success) {
      toast.success(next ? '已开启陌生设备登录验证' : '已关闭陌生设备登录验证');
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="settings-page page-with-header">
      <PageHeader title="账户设置" />

      <div className="settings-content">
        <div className="settings-section card">
          <h4>账号安全</h4>
          <div className="setting-item">
            <div className="si-left">
              <span className="si-icon">📱</span>
              <div>
                <span className="si-label">绑定手机号</span>
                <span className="si-desc">{maskPhone(user.phone)}</span>
              </div>
            </div>
            <span className="si-status bound">已绑定</span>
          </div>

          <div className="setting-item" onClick={toggleLoginProtection}>
            <div className="si-left">
              <span className="si-icon">🛡️</span>
              <div>
                <span className="si-label">登录保护</span>
                <span className="si-desc">陌生设备登录需要验证</span>
              </div>
            </div>
            <div className={`si-toggle ${user.loginProtection ? 'active' : ''}`}>
              <div className="si-toggle-dot" />
            </div>
          </div>
        </div>

        <div className="settings-section card">
          <h4>隐私设置</h4>
          <div className="setting-item" onClick={() => navigate('/agreement/privacy')}>
            <div className="si-left">
              <span className="si-icon">📄</span>
              <span className="si-label">隐私政策</span>
            </div>
            <span className="si-value">查看</span>
          </div>
          <div className="setting-item" onClick={() => navigate('/agreement/service')}>
            <div className="si-left">
              <span className="si-icon">📋</span>
              <span className="si-label">用户服务协议</span>
            </div>
            <span className="si-value">查看</span>
          </div>
        </div>

        <div className="settings-section card">
          <h4>其他</h4>
          <div className="setting-item">
            <div className="si-left">
              <span className="si-icon">📦</span>
              <span className="si-label">当前版本</span>
            </div>
            <span className="si-value">v1.0.0</span>
          </div>
          <div className="setting-item" onClick={() => toast.success('缓存已清除')}>
            <div className="si-left">
              <span className="si-icon">🗑️</span>
              <span className="si-label">清除缓存</span>
            </div>
            <span className="si-value">执行</span>
          </div>
        </div>

        <button
          className="btn btn-block logout-btn"
          onClick={handleLogout}
        >
          退出登录
        </button>
      </div>
    </div>
  );
}
