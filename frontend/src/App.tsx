import React from 'react';
import { BrowserRouter as Router, Route, Switch, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { PollingProvider } from './contexts/PollingContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Hotels } from './pages/Hotels';
import { HotelSearchResults } from './pages/HotelSearchResults';
import { HotelDetails } from './pages/HotelDetails';
import { HotelBookingFlow } from './pages/HotelBookingFlow';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {!isAdminDashboard && <Navbar />}
      <main className="flex-grow">
        <Switch>
          <Route exact path="/" component={Home} />
          <Route
            path="/hotels/search"
            render={() => (
              <ProtectedRoute>
                <HotelSearchResults />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/hotels/details/:hotelId"
            render={() => (
              <ProtectedRoute>
                <HotelDetails />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/hotels/booking"
            render={() => (
              <ProtectedRoute>
                <HotelBookingFlow />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/hotels"
            render={() => (
              <ProtectedRoute>
                <Hotels />
              </ProtectedRoute>
            )}
          />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
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
        <PollingProvider>
          <Router>
            <AppContent />
          </Router>
        </PollingProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
