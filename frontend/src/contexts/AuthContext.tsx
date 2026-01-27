import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, authAPI } from '../services/api';
import { toast } from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  socialLogin: (provider: 'google' | 'facebook', accessToken: string, userInfo: any) => Promise<void>;
  register: (userData: {
    name: string;
    email: string;
    password: string;
    phone: string;
    nationality: string;
    preferredLanguage?: string;
  }) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    // Check if user is logged in on app start
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {          try {
            // Verify token is still valid by fetching current user
            const response = await authAPI.getCurrentUser();
            if (response.data?.user) {
              setUser(response.data.user);
            }
          } catch (error) {
            // Token is invalid, clear storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await authAPI.login({ email, password });
      if (response.data?.user) {
        setUser(response.data.user);
        toast.success('Welcome back!');
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  const register = async (userData: {
    name: string;
    email: string;
    password: string;
    phone: string;
    nationality: string;
    preferredLanguage?: string;
  }) => {
    try {
      setIsLoading(true);
      const response = await authAPI.register(userData);
      if (response.data?.user) {
        setUser(response.data.user);
        toast.success('Account created successfully!');
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const socialLogin = async (provider: 'google' | 'facebook', accessToken: string, userInfo: any) => {
    try {
      setIsLoading(true);
      const response = await authAPI.socialLogin({ provider, accessToken, userInfo });
      if (response.data?.user) {
        setUser(response.data.user);
        toast.success(`Welcome${response.data.user.name ? `, ${response.data.user.name}` : ''}!`);
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    authAPI.logout();
    toast.success('Logged out successfully');
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    socialLogin,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
