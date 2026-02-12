import React, { Suspense } from 'react';
import { BrowserRouter as Router, Route, Switch, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { Navbar } from './components/Navbar';

import { Home } from './pages/Home';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';
import { useReferralCapture } from './hooks/useReferralCapture';
import './i18n';

// Lazy-loaded components — only downloaded when needed
const ChatWidget = React.lazy(() => import('./components/ChatWidget'));
const NotificationPrompt = React.lazy(() => import('./components/NotificationPrompt'));
const Footer = React.lazy(() => import('./components/Footer').then(module => ({ default: module.Footer })));

// Lazy-loaded pages — only downloaded when the route is visited
const Hotels = React.lazy(() => import('./pages/Hotels').then(m => ({ default: m.Hotels })));
const HotelSearchResults = React.lazy(() => import('./pages/HotelSearchResults').then(m => ({ default: m.HotelSearchResults })));
const HotelDetails = React.lazy(() => import('./pages/HotelDetails').then(m => ({ default: m.HotelDetails })));
const BookingPage = React.lazy(() => import('./pages/BookingPage').then(m => ({ default: m.BookingPage })));
const PaymentCallbackPage = React.lazy(() => import('./pages/PaymentCallbackPage').then(m => ({ default: m.PaymentCallbackPage })));
const HotelBookingFlow = React.lazy(() => import('./pages/HotelBookingFlow').then(m => ({ default: m.HotelBookingFlow })));
const Login = React.lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Register = React.lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const EmailVerification = React.lazy(() => import('./pages/EmailVerification').then(m => ({ default: m.EmailVerification })));
const Profile = React.lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const PaymentSuccess = React.lazy(() => import('./pages/PaymentSuccess').then(m => ({ default: m.PaymentSuccess })));
const PaymentFailure = React.lazy(() => import('./pages/PaymentFailure').then(m => ({ default: m.PaymentFailure })));
const Blog = React.lazy(() => import('./pages/Blog').then(m => ({ default: m.Blog })));
const BlogPostPage = React.lazy(() => import('./pages/BlogPost').then(m => ({ default: m.BlogPostPage })));
const AdminLogin = React.lazy(() => import('./pages/AdminLogin').then(m => ({ default: m.AdminLogin })));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AcceptInvitation = React.lazy(() => import('./pages/AcceptInvitation').then(m => ({ default: m.AcceptInvitation })));
const PartnerLogin = React.lazy(() => import('./pages/PartnerLogin').then(m => ({ default: m.PartnerLogin })));
const PartnerDashboard = React.lazy(() => import('./pages/PartnerDashboard').then(m => ({ default: m.PartnerDashboard })));

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
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full" />
          </div>
        }>
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
          {/* Blog Routes */}
          <Route exact path="/blog" component={Blog} />
          <Route path="/blog/:slug" component={BlogPostPage} />
        </Switch>
        </Suspense>
      </main>
      <Suspense fallback={null}>
        {!isAdminDashboard && !isPartnerPage && <Footer />}
        {!isAdminDashboard && !isPartnerPage && <ChatWidget />}
        {!isAdminDashboard && !isPartnerPage && <NotificationPrompt />}
      </Suspense>
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
