import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/Layout';
import { useToast } from '../../components/Toast';
import { useAuthStore } from '../../store/authStore';
import { maskPhone } from '../../utils/format';
import './index.css';

interface VerifyState {
  verificationTicket?: string;
  phone?: string;
  verifyCode?: string;
}

export default function DeviceVerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { verifyDeviceLogin, loading } = useAuthStore();
  const state = (location.state || {}) as VerifyState;
  const [code, setCode] = useState('');

  const maskedPhone = useMemo(() => maskPhone(state.phone || ''), [state.phone]);

  if (!state.verificationTicket) {
    navigate('/login');
    return null;
  }

  const handleVerify = async () => {
    if (!/^\d{4}$/.test(code)) {
      toast.error('请输入4位二次验证码');
      return;
    }
    const res = await verifyDeviceLogin(state.verificationTicket!, code);
    if (res.success) {
      toast.success('设备验证通过');
      navigate('/');
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="device-verify-page page-with-header">
      <PageHeader title="陌生设备验证" onBack={() => navigate('/login')} />
      <div className="device-verify-content">
        <div className="dv-card">
          <h3>检测到陌生设备登录</h3>
          <p>为了账号安全，请完成二次验证后继续登录。</p>
          <p className="dv-phone">验证手机号：{maskedPhone || '未识别'}</p>

          <div className="dv-demo-code">
            <span>测试二次验证码：</span>
            <strong>{state.verifyCode || '----'}</strong>
          </div>

          <input
            type="text"
            className="input-field"
            placeholder="请输入4位验证码"
            maxLength={4}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
          <button className="btn btn-primary btn-block btn-lg" onClick={handleVerify} disabled={loading}>
            {loading ? '验证中...' : '确认登录'}
          </button>
        </div>
      </div>
    </div>
  );
}
