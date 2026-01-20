import React from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

// List of valid admin roles
const ADMIN_ROLES = ['admin', 'super_admin', 'sub_admin'];

export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const history = useHistory();

  const isAdmin = user && ADMIN_ROLES.includes(user.role);

  React.useEffect(() => {
    if (!isLoading) {
      if (!user) {
        toast.error('Please log in with admin credentials to access this page.');
        history.push('/admin/login');
        return;
      }

      if (!isAdmin) {
        toast.error('Access denied. Admin privileges required.');
        history.push('/');
        return;
      }
    }
  }, [user, isLoading, history, isAdmin]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render anything while redirecting
  if (!user || !isAdmin) {
    return null;
  }

  return <>{children}</>;
};
