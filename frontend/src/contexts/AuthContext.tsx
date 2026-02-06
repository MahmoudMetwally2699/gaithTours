import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, authAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import PhoneNumberModal from '../components/PhoneNumberModal';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  showPhoneModal: boolean;
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
  updatePhone: (phone: string) => Promise<void>;
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
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  const isAuthenticated = !!user;

  useEffect(() => {
    // Check if user is logged in on app start
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {
          try {
            // Verify token is still valid by fetching current user
            const response = await authAPI.getCurrentUser();
            if (response.data?.user) {
              setUser(response.data.user);
              // Check if social user needs phone number or phone is not verified
              const fetchedUser = response.data.user;
              const needsPhoneVerification =
                !fetchedUser.phone ||
                fetchedUser.phone === '' ||
                fetchedUser.isPhoneVerified === false;
              if (needsPhoneVerification) {
                setShowPhoneModal(true);
              }
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

        // Check if user needs to provide phone number
        const loggedInUser = response.data.user;
        const needsPhone = !loggedInUser.phone || loggedInUser.phone === '';

        if (needsPhone) {
          // Show phone modal for new social users or existing users without phone
          setShowPhoneModal(true);
        } else {
          toast.success(`Welcome${loggedInUser.name ? `, ${loggedInUser.name}` : ''}!`);
        }
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updatePhone = async (phone: string) => {
    try {
      const response = await authAPI.updatePhone(phone);
      if (response.data?.user) {
        setUser(response.data.user);
        setShowPhoneModal(false);
        toast.success(`Welcome${response.data.user.name ? `, ${response.data.user.name}` : ''}!`);
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setShowPhoneModal(false);
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

  // Handle closing phone modal - logs out user and redirects to home
  const handleClosePhoneModal = () => {
    setUser(null);
    setShowPhoneModal(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    showPhoneModal,
    login,
    socialLogin,
    register,
    logout,
    updateUser,
    updatePhone,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* Phone Number Modal - Required for social login users */}
      <PhoneNumberModal
        isOpen={showPhoneModal}
        onSubmit={updatePhone}
        onClose={handleClosePhoneModal}
        userName={user?.name}
      />
    </AuthContext.Provider>
  );
};

export default AuthProvider;
