import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/Toast';
import { isValidPhone, isValidVerifyCode } from '../../utils/validate';
import { PageHeader } from '../../components/Layout';
import { Modal } from '../../components/Modal';
import './index.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { register, sendCode, loading } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [countdown, setCountdown] = useState(0);
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

  const handleRegister = useCallback(async () => {
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
    const res = await register(phone, code);
    if (res.success) {
      toast.success('注册成功');
      navigate('/');
    } else {
      toast.error(res.message);
    }
  }, [phone, code, agreed, register, navigate, toast]);

  return (
    <div className="register-page page-with-header">
      <PageHeader title="注册账号" />

      <div className="register-content">
        <div className="register-form">
          <div className="register-field">
            <label>手机号</label>
            <div className="register-input-row">
              <span className="prefix">+86</span>
              <input
                type="tel"
                placeholder="请输入手机号"
                maxLength={11}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>

          <div className="register-field">
            <label>验证码</label>
            <div className="register-input-row">
              <input
                type="text"
                placeholder="请输入6位验证码"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
              <button
                className="code-btn"
                disabled={countdown > 0 || !isValidPhone(phone)}
                onClick={handleSendCode}
              >
                {countdown > 0 ? `${countdown}s后重新获取` : '获取验证码'}
              </button>
            </div>
          </div>

          <div className="register-agreement">
            <label className="login-checkbox" onClick={() => setAgreed(!agreed)}>
              <span className={`checkbox-icon ${agreed ? 'checked' : ''}`} />
              <span className="checkbox-text">
                我已阅读并同意
                <Link to="/agreement/service" className="agreement-link">
                  《用户服务协议》
                </Link>
                和
                <Link to="/agreement/privacy" className="agreement-link">
                  《隐私政策》
                </Link>
              </span>
            </label>
          </div>

          <button
            className="btn btn-primary btn-block btn-lg"
            disabled={loading || !isValidPhone(phone) || !isValidVerifyCode(code)}
            onClick={handleRegister}
          >
            {loading ? '注册中...' : '注册'}
          </button>
        </div>

        <div className="register-footer">
          <span>已有账号？</span>
          <Link to="/login">立即登录</Link>
        </div>
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
