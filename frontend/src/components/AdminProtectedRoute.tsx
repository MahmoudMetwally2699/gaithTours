import React from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const history = useHistory();

  React.useEffect(() => {
    if (!isLoading) {
      if (!user) {
        toast.error('Please log in with admin credentials to access this page.');
        history.push('/admin/login');
        return;
      }

      if (user.role !== 'admin') {
        toast.error('Access denied. Admin privileges required.');
        history.push('/');
        return;
      }
    }
  }, [user, isLoading, history]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render anything while redirecting
  if (!user || user.role !== 'admin') {
    return null;
  }

  return <>{children}</>;
};
