import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/Toast';
import { Modal } from '../../components/Modal';
import { isValidPhone, isValidVerifyCode } from '../../utils/validate';
import './index.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { login, wechatLogin, sendCode, loading } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [mode, setMode] = useState<'phone' | 'wechat'>('phone');
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [latestCode, setLatestCode] = useState('');

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendCode = useCallback(async () => {
    if (!agreed) {
      toast.error('请先阅读并同意用户服务协议和隐私政策');
      return;
    }
    if (!isValidPhone(phone)) {
      toast.error('请输入正确的手机号');
      return;
    }
    const res = await sendCode(phone);
    if (res.success) {
      toast.success('验证码发送成功');
      setCountdown(60);
      setLatestCode(res.verifyCode || '');
      setShowCodeModal(true);
    } else {
      toast.error(res.message);
    }
  }, [agreed, phone, sendCode, toast]);

  const handleLogin = useCallback(async () => {
    if (!agreed) {
      toast.error('请先阅读并同意用户服务协议和隐私政策');
      return;
    }
    if (!isValidPhone(phone)) {
      toast.error('请输入正确的手机号');
      return;
    }
    if (!isValidVerifyCode(code)) {
      toast.error('请输入6位验证码');
      return;
    }
    const res = await login(phone, code);
    if (res.success) {
      toast.success('登录成功');
      navigate('/');
    } else if (res.requiresDeviceVerification && res.verificationTicket) {
      navigate('/device-verify', {
        state: {
          verificationTicket: res.verificationTicket,
          phone,
          verifyCode: res.verifyCode || '',
        },
      });
    } else {
      toast.error(res.message);
    }
  }, [phone, code, agreed, login, navigate, toast]);

  const handleWechatLogin = useCallback(async () => {
    if (!agreed) {
      toast.error('请先阅读并同意用户服务协议和隐私政策');
      return;
    }
    toast.info('正在调起微信授权...');
    const res = await wechatLogin();
    if (res.success) {
      toast.success('微信登录成功');
      navigate('/');
    } else {
      toast.error(res.message);
    }
  }, [agreed, wechatLogin, navigate, toast]);

  return (
    <div className="login-page">
      <div className="login-header">
        <div className="login-logo">🚗</div>
        <h1 className="login-brand">快达出行</h1>
        <p className="login-slogan">安全·快捷·舒适</p>
      </div>

      <div className="login-tabs">
        <button
          className={`login-tab ${mode === 'phone' ? 'active' : ''}`}
          onClick={() => setMode('phone')}
        >
          手机号登录
        </button>
        <button
          className={`login-tab ${mode === 'wechat' ? 'active' : ''}`}
          onClick={() => setMode('wechat')}
        >
          微信登录
        </button>
      </div>

      {mode === 'phone' ? (
        <div className="login-form animate-fadeIn">
          <div className="login-field">
            <span className="login-field-prefix">+86</span>
            <input
              type="tel"
              placeholder="请输入手机号"
              maxLength={11}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            />
          </div>

          <div className="login-field">
            <input
              type="text"
              placeholder="请输入验证码"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
            <button
              className="login-code-btn"
              disabled={countdown > 0 || !isValidPhone(phone)}
              onClick={handleSendCode}
            >
              {countdown > 0 ? `${countdown}s` : '获取验证码'}
            </button>
          </div>

          <button
            className="btn btn-primary btn-block btn-lg login-submit"
            disabled={loading || !isValidPhone(phone) || !isValidVerifyCode(code)}
            onClick={handleLogin}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </div>
      ) : (
        <div className="login-wechat animate-fadeIn">
          <div className="wechat-icon">💬</div>
          <p className="wechat-tip">点击下方按钮使用微信快捷登录</p>
          <button className="btn btn-block btn-lg wechat-btn" onClick={handleWechatLogin}>
            微信一键登录
          </button>
        </div>
      )}

      <div className="login-agreement">
        <label className="login-checkbox" onClick={() => setAgreed(!agreed)}>
          <span className={`checkbox-icon ${agreed ? 'checked' : ''}`} />
          <span className="checkbox-text">
            我已阅读并同意
            <Link to="/agreement/service" className="agreement-link" onClick={(e) => e.stopPropagation()}>
              《用户服务协议》
            </Link>
            和
            <Link to="/agreement/privacy" className="agreement-link" onClick={(e) => e.stopPropagation()}>
              《隐私政策》
            </Link>
          </span>
        </label>
      </div>

      <div className="login-footer">
        <span className="login-footer-text">还没有账号？</span>
        <Link to="/register" className="login-footer-link">立即注册</Link>
      </div>

      <Modal
        visible={showCodeModal}
        title="验证码已发送"
        onClose={() => setShowCodeModal(false)}
        onConfirm={() => setShowCodeModal(false)}
        confirmText="我知道了"
        showCancel={false}
      >
        <div style={{ textAlign: 'left' }}>
          <p style={{ marginBottom: 8 }}>手机号：{phone}</p>
          <p style={{ marginBottom: 8 }}>验证码（5分钟内有效）：</p>
          <div
            style={{
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 4,
              textAlign: 'center',
              color: 'var(--color-primary)',
            }}
          >
            {latestCode || '------'}
          </div>
          <button
            className="btn btn-outline btn-sm"
            style={{ width: '100%', marginTop: 10 }}
            onClick={() => {
              if (latestCode) {
                navigator.clipboard?.writeText(latestCode);
                toast.success('验证码已复制');
              }
            }}
          >
            复制验证码
          </button>
        </div>
      </Modal>
    </div>
  );
}
