import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/Toast';
import { PageHeader } from '../../components/Layout';
import { isValidNickname } from '../../utils/validate';
import { maskPhone } from '../../utils/format';
import dayjs from 'dayjs';
import './index.css';

export default function PersonalInfoPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, updateUser, loading } = useAuthStore();

  const [nickname, setNickname] = useState(user?.nickname || '');
  const [gender, setGender] = useState<'' | 'male' | 'female' | '男' | '女'>(user?.gender || '');
  const [birthday, setBirthday] = useState(user?.birthday || '');
  const [homeAddress, setHomeAddress] = useState(user?.homeAddress || '');
  const [companyAddress, setCompanyAddress] = useState(user?.companyAddress || '');
  const [emergencyContact, setEmergencyContact] = useState(user?.emergencyContact || '');
  const [emergencyPhone, setEmergencyPhone] = useState(user?.emergencyPhone || '');

  if (!user) {
    navigate('/login');
    return null;
  }

  const canChangeNickname = (() => {
    if (!user.lastNicknameChange) return true;
    const lastChange = dayjs(user.lastNicknameChange);
    const now = dayjs();
    // 同一自然月内（年份和月份相同）不允许修改
    return !(lastChange.year() === now.year() && lastChange.month() === now.month());
  })();

  const handleSave = async () => {
    if (nickname !== user.nickname) {
      if (!isValidNickname(nickname)) {
        toast.error('昵称需要2-20个字符');
        return;
      }
      if (!canChangeNickname) {
        toast.error('每月只能修改一次昵称');
        return;
      }
    }

    const res = await updateUser({
      nickname,
      gender,
      birthday,
      homeAddress,
      companyAddress,
      emergencyContact,
      emergencyPhone,
    });
    if (res.success) {
      toast.success('个人信息已更新');
      navigate(-1);
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="personal-page page-with-header">
      <PageHeader title="个人信息" />

      <div className="personal-content">
        <div className="pi-avatar-section">
          <div className="pi-avatar">
            {user.avatar ? (
              <img src={user.avatar} alt="avatar" />
            ) : (
              <span>{user.nickname[0]}</span>
            )}
          </div>
          <button className="pi-change-avatar" onClick={() => toast.info('头像上传功能：可从相册选择或拍照')}>
            更换头像
          </button>
        </div>

        <div className="pi-form">
          <div className="pi-field">
            <label>用户ID</label>
            <span className="pi-readonly">{user.id}</span>
          </div>

          <div className="pi-field">
            <label>手机号</label>
            <span className="pi-readonly">{maskPhone(user.phone)}</span>
          </div>

          <div className="pi-field">
            <label>
              昵称
              {!canChangeNickname && <span className="pi-tip">（本月已修改）</span>}
            </label>
            <input
              type="text"
              className="input-field"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              disabled={!canChangeNickname}
            />
          </div>

          <div className="pi-field">
            <label>性别</label>
            <div className="pi-gender-btns">
              {([
                { value: 'male' as const, label: '男' },
                { value: 'female' as const, label: '女' },
              ]).map((g) => (
                <button
                  key={g.value}
                  className={`pi-gender-btn ${gender === g.value ? 'active' : ''}`}
                  onClick={() => setGender(g.value)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pi-field">
            <label>生日</label>
            <input
              type="date"
              className="input-field"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
            />
          </div>

          <div className="pi-field">
            <label>家庭地址</label>
            <input
              type="text"
              className="input-field"
              placeholder="请输入家庭地址"
              value={homeAddress}
              onChange={(e) => setHomeAddress(e.target.value)}
            />
          </div>

          <div className="pi-field">
            <label>公司地址</label>
            <input
              type="text"
              className="input-field"
              placeholder="请输入公司地址"
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
            />
          </div>

          <div className="pi-field">
            <label>紧急联系人</label>
            <input
              type="text"
              className="input-field"
              placeholder="请输入紧急联系人姓名"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
            />
          </div>

          <div className="pi-field">
            <label>紧急联系人手机</label>
            <input
              type="tel"
              className="input-field"
              placeholder="请输入紧急联系人手机号"
              maxLength={11}
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value.replace(/\D/g, ''))}
            />
          </div>
        </div>

        <button
          className="btn btn-primary btn-block btn-lg"
          onClick={handleSave}
          disabled={loading}
          style={{ marginTop: 24 }}
        >
          {loading ? '保存中...' : '保存修改'}
        </button>
      </div>
    </div>
  );
}
