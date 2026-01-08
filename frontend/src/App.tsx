import React from 'react';
import { BrowserRouter as Router, Route, Switch, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Hotels } from './pages/Hotels';
import { HotelSearchResults } from './pages/HotelSearchResults';
import { HotelDetails } from './pages/HotelDetails';
import { BookingPage } from './pages/BookingPage';
import { HotelBookingFlow } from './pages/HotelBookingFlow';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Profile } from './pages/Profile';
import { PaymentSuccess } from './pages/PaymentSuccess';
import { PaymentFailure } from './pages/PaymentFailure';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';
import './i18n';

const AppContent = () => {
  const location = useLocation();
  const isAdminDashboard = location.pathname.startsWith('/admin/dashboard');

  const isHome = location.pathname === '/';
  const isHotelSearch = location.pathname === '/hotels/search';
  const isHotelDetails = location.pathname.startsWith('/hotels/details/');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {!isAdminDashboard && !isHome && !isHotelSearch && !isHotelDetails && <Navbar />}
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
          <Route path="/payment/success" component={PaymentSuccess} />
          <Route path="/payment/failure" component={PaymentFailure} />
          <Route path="/admin/login" component={AdminLogin} />
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
        </Switch>
      </main>
      {!isAdminDashboard && <Footer />}
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
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <AppContent />
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
