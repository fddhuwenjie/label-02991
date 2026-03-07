import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrderStore } from '../../store/orderStore';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/Toast';
import { Layout } from '../../components/Layout';
import { MapView } from '../../components/MapView';
import { generateId } from '../../utils/format';
import './index.css';

export default function HomePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isLoggedIn, user } = useAuthStore();
  const { origin, destination, setOrigin, setDestination, loadHistoryAddresses, loadFrequentAddresses } = useOrderStore();

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    if (!origin) {
      setOrigin({
        id: 'current',
        name: '当前位置',
        address: '正在获取定位...',
        lat: 30.572,
        lng: 104.066,
      });
      setTimeout(() => {
        setOrigin({
          id: 'current',
          name: '当前位置',
          address: '天府大道中段688号',
          lat: 30.572,
          lng: 104.066,
        });
      }, 1000);
    }
    loadHistoryAddresses();
    loadFrequentAddresses();
  }, [isLoggedIn, navigate, origin, setOrigin, loadHistoryAddresses, loadFrequentAddresses]);

  const getFixedCoords = (address: string, baseLat: number, baseLng: number) => {
    let hash = 0;
    for (let i = 0; i < address.length; i++) {
      hash = (hash * 31 + address.charCodeAt(i)) >>> 0;
    }
    const latOffset = ((hash % 1000) / 1000) * 0.02;
    const lngOffset = (((hash >> 10) % 1000) / 1000) * 0.02;
    return { lat: baseLat + latOffset, lng: baseLng + lngOffset };
  };

  const handleGoHome = () => {
    if (!user?.homeAddress) {
      toast.info('请先在个人信息中设置家庭地址');
      navigate('/personal-info');
      return;
    }
    const coords = getFixedCoords(user.homeAddress, 30.58, 104.06);
    setDestination({
      id: 'home-address',
      name: '家',
      address: user.homeAddress,
      ...coords,
    });
  };

  const handleGoCompany = () => {
    if (!user?.companyAddress) {
      toast.info('请先在个人信息中设置公司地址');
      navigate('/personal-info');
      return;
    }
    const coords = getFixedCoords(user.companyAddress, 30.56, 104.08);
    setDestination({
      id: 'company-address',
      name: '公司',
      address: user.companyAddress,
      ...coords,
    });
  };

  return (
    <Layout>
      <div className="home-page">
        <MapView
          origin={origin ? { ...origin } : undefined}
          destination={destination ? { ...destination } : undefined}
          height="55vh"
          showNearbyDrivers={6}
        />

        <div className="home-panel">
          <div className="home-greeting">你好，想去哪里？</div>

          <div className="home-address-card" onClick={() => navigate('/address-search')}>
            <div className="address-row">
              <span className="address-dot origin" />
              <div className="address-info">
                <span className="address-label">出发地</span>
                <span className="address-value">{origin?.address || '定位中...'}</span>
              </div>
              <button
                className="address-edit"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/address-search?type=origin');
                }}
              >
                修改
              </button>
            </div>

            <div className="address-divider" />

            <div className="address-row">
              <span className="address-dot dest" />
              <div className="address-info">
                <span className="address-label">目的地</span>
                <span className={`address-value ${!destination ? 'placeholder' : ''}`}>
                  {destination?.name || '你要去哪里？'}
                </span>
              </div>
            </div>
          </div>

          {destination && origin && (
            <button
              className="btn btn-primary btn-block btn-lg home-go-btn"
              onClick={() => navigate('/route-preview')}
            >
              查看路线
            </button>
          )}

          <div className="home-shortcuts">
            <div className="shortcut-item" onClick={handleGoHome}>
              <span className="shortcut-icon">🏠</span>
              <span className="shortcut-text">回家</span>
              {user?.homeAddress && <span className="shortcut-set">已设置</span>}
            </div>
            <div className="shortcut-item" onClick={handleGoCompany}>
              <span className="shortcut-icon">🏢</span>
              <span className="shortcut-text">上班</span>
              {user?.companyAddress && <span className="shortcut-set">已设置</span>}
            </div>
            <div className="shortcut-item" onClick={() => navigate('/orders')}>
              <span className="shortcut-icon">📋</span>
              <span className="shortcut-text">订单</span>
            </div>
            <div className="shortcut-item" onClick={() => navigate('/coupons')}>
              <span className="shortcut-icon">🎫</span>
              <span className="shortcut-text">优惠</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
