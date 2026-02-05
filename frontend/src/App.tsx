import React from 'react';
import { BrowserRouter as Router, Route, Switch, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Hotels } from './pages/Hotels';
import { HotelSearchResults } from './pages/HotelSearchResults';
import { HotelDetails } from './pages/HotelDetails';
import { BookingPage } from './pages/BookingPage';
import { PaymentCallbackPage } from './pages/PaymentCallbackPage';
import { HotelBookingFlow } from './pages/HotelBookingFlow';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { EmailVerification } from './pages/EmailVerification';
import { Profile } from './pages/Profile';
import { PaymentSuccess } from './pages/PaymentSuccess';
import { PaymentFailure } from './pages/PaymentFailure';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { AcceptInvitation } from './pages/AcceptInvitation';
import { PartnerLogin } from './pages/PartnerLogin';
import { PartnerDashboard } from './pages/PartnerDashboard';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';
import { useReferralCapture } from './hooks/useReferralCapture';
import './i18n';

// Google OAuth Client ID - Replace with your actual client ID from Google Cloud Console
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

const AppContent = () => {
  const location = useLocation();

  // Capture referral code from URL (?ref=CODE) and store for checkout
  useReferralCapture();

  const isAdminDashboard = location.pathname.startsWith('/admin/dashboard');
  const isPartnerPage = location.pathname.startsWith('/partner');

  const isHome = location.pathname === '/';
  const isHotelSearch = location.pathname === '/hotels/search';
  const isHotelDetails = location.pathname.startsWith('/hotels/details/');
  const isBookingPage = location.pathname.startsWith('/hotels/booking/');

  const isLogin = location.pathname === '/login';
  const isRegister = location.pathname === '/register';
  const isForgotPassword = location.pathname === '/forgot-password';
  const isResetPassword = location.pathname === '/reset-password';
  const isEmailVerification = location.pathname.startsWith('/verify-email/');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {!isAdminDashboard && !isPartnerPage && !isHome && !isHotelSearch && !isHotelDetails && !isBookingPage && !isLogin && !isRegister && !isForgotPassword && !isResetPassword && !isEmailVerification && <Navbar />}
      <main className="flex-grow">
        <Switch>
          <Route exact path="/" component={Home} />
          <Route path="/hotels/search" component={HotelSearchResults} />
          <Route path="/hotels/details/:hotelId" component={HotelDetails} />
          <Route path="/hotels/booking/:hotelId" component={BookingPage} />
          <Route path="/hotels" component={Hotels} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/verify-email/:token" component={EmailVerification} />
          <Route path="/payment/success" component={PaymentSuccess} />
          <Route path="/payment/failure" component={PaymentFailure} />
          <Route path="/booking/payment-callback" component={PaymentCallbackPage} />
          <Route path="/admin/login" component={AdminLogin} />
          <Route path="/accept-invitation/:token" component={AcceptInvitation} />
          <Route
            path="/profile"
            render={() => (
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/dashboard"
            render={() => (
              <AdminProtectedRoute>
                <AdminDashboard />
              </AdminProtectedRoute>
            )}
          />
          {/* Partner Routes */}
          <Route path="/partner/login" component={PartnerLogin} />
          <Route path="/partner/dashboard" component={PartnerDashboard} />
        </Switch>
      </main>
      {!isAdminDashboard && !isPartnerPage && <Footer />}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </div>
  );
};

function App() {
  const appContent = (
    <AuthProvider>
      <CurrencyProvider>
        <SocketProvider>
          <Router>
            <AppContent />
          </Router>
        </SocketProvider>
      </CurrencyProvider>
    </AuthProvider>
  );

  // Only wrap with GoogleOAuthProvider if client ID is configured
  if (GOOGLE_CLIENT_ID) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        {appContent}
      </GoogleOAuthProvider>
    );
  }

  return appContent;
}

export default App;
