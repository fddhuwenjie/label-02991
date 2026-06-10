import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { useAuthStore } from './store/authStore';

import LoginPage from './views/Login';
import RegisterPage from './views/Register';
import AgreementPage from './views/Agreement';
import HomePage from './views/Home';
import AddressSearchPage from './views/AddressSearch';
import RoutePreviewPage from './views/RoutePreview';
import VehicleSelectPage from './views/VehicleSelect';
import WaitingDriverPage from './views/WaitingDriver';
import TripInProgressPage from './views/TripInProgress';
import TripCompletePage from './views/TripComplete';
import TripTrackingPage from './views/TripTracking';
import OrderListPage from './views/OrderList';
import OrderDetailPage from './views/OrderDetail';
import PaymentCenterPage from './views/PaymentCenter';
import CouponCenterPage from './views/CouponCenter';
import ProfilePage from './views/Profile';
import PersonalInfoPage from './views/PersonalInfo';
import AccountSettingsPage from './views/AccountSettings';
import CustomerServicePage from './views/CustomerService';
import FeedbackPage from './views/Feedback';
import FAQPage from './views/FAQ';
import DeviceVerifyPage from './views/DeviceVerify';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuthStore();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { init } = useAuthStore();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/agreement/:type" element={<AgreementPage />} />
      <Route path="/device-verify" element={<DeviceVerifyPage />} />

      <Route path="/" element={<AuthGuard><HomePage /></AuthGuard>} />
      <Route path="/address-search" element={<AuthGuard><AddressSearchPage /></AuthGuard>} />
      <Route path="/route-preview" element={<AuthGuard><RoutePreviewPage /></AuthGuard>} />
      <Route path="/vehicle-select" element={<AuthGuard><VehicleSelectPage /></AuthGuard>} />
      <Route path="/vehicle-detail" element={<Navigate to="/vehicle-select" replace />} />
      <Route path="/waiting/:orderId" element={<AuthGuard><WaitingDriverPage /></AuthGuard>} />
      <Route path="/trip/:orderId" element={<AuthGuard><TripInProgressPage /></AuthGuard>} />
      <Route path="/trip-tracking/:orderId" element={<AuthGuard><TripTrackingPage /></AuthGuard>} />
      <Route path="/trip-complete/:orderId" element={<AuthGuard><TripCompletePage /></AuthGuard>} />

      <Route path="/orders" element={<AuthGuard><OrderListPage /></AuthGuard>} />
      <Route path="/order/:orderId" element={<AuthGuard><OrderDetailPage /></AuthGuard>} />
      <Route path="/payment-center" element={<AuthGuard><PaymentCenterPage /></AuthGuard>} />

      <Route path="/coupons" element={<AuthGuard><CouponCenterPage /></AuthGuard>} />

      <Route path="/profile" element={<AuthGuard><ProfilePage /></AuthGuard>} />
      <Route path="/personal-info" element={<AuthGuard><PersonalInfoPage /></AuthGuard>} />
      <Route path="/account-settings" element={<AuthGuard><AccountSettingsPage /></AuthGuard>} />
      <Route path="/customer-service" element={<AuthGuard><CustomerServicePage /></AuthGuard>} />
      <Route path="/feedback" element={<AuthGuard><FeedbackPage /></AuthGuard>} />
      <Route path="/faq" element={<AuthGuard><FAQPage /></AuthGuard>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="app-container">
          <AppRoutes />
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}
