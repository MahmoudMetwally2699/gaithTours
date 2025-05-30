import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Hotels } from './pages/Hotels';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Profile } from './pages/Profile';
import { ProtectedRoute } from './components/ProtectedRoute';
import './i18n';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Navbar />
          <main className="flex-grow">
            <Switch>
              <Route exact path="/" component={Home} />
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
              <Route
                path="/profile"
                render={() => (
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                )}
              />
            </Switch>
          </main>
          <Footer />
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
      </Router>
    </AuthProvider>
  );
}

export default App;
