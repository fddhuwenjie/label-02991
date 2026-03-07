import { useNavigate, useLocation } from 'react-router-dom';
import './index.css';

const TABS = [
  { key: '/', label: '首页', icon: '🏠', activeIcon: '🏠' },
  { key: '/orders', label: '订单', icon: '📋', activeIcon: '📋' },
  { key: '/coupons', label: '优惠', icon: '🎫', activeIcon: '🎫' },
  { key: '/profile', label: '我的', icon: '👤', activeIcon: '👤' },
];

interface LayoutProps {
  children: React.ReactNode;
  hideTabBar?: boolean;
}

export function Layout({ children, hideTabBar = false }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="app-container">
      <div className="app-content">{children}</div>
      {!hideTabBar && (
        <nav className="tab-bar">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`tab-item ${isActive(tab.key) ? 'tab-active' : ''}`}
              onClick={() => navigate(tab.key)}
            >
              <span className="tab-icon">{isActive(tab.key) ? tab.activeIcon : tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  rightText?: string;
  onRight?: () => void;
}

export function PageHeader({ title, onBack, rightText, onRight }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="page-header">
      {(onBack || true) && (
        <button className="page-header__back" onClick={onBack || (() => navigate(-1))}>
          <span className="page-header__back-icon" />
        </button>
      )}
      <h1 className="page-header__title">{title}</h1>
      {rightText && (
        <button className="page-header__action" onClick={onRight}>
          {rightText}
        </button>
      )}
    </header>
  );
}
