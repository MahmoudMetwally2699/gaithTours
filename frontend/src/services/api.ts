import axios, { AxiosResponse, AxiosError } from 'axios';
import { toast } from 'react-hot-toast';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  nationality: string;
  preferredLanguage: 'en' | 'ar';
  role: 'user' | 'admin';
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Hotel {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  rating?: number;
  image?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  description?: string;
}

export interface Reservation {
  _id: string;
  user: string;
  touristName: string;
  phone: string;
  nationality: string;
  email: string;
  hotel: {
    name: string;
    address: string;
    city: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    rating?: number;
    image?: string;
    hotelId?: string;
  };
  checkInDate?: string;
  checkOutDate?: string;
  numberOfGuests: number;
  status: 'pending' | 'approved' | 'denied' | 'invoiced' | 'paid' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Auth API
export const authAPI = {  login: async (credentials: { email: string; password: string }): Promise<ApiResponse<{ user: User; token: string }>> => {
    try {
      const response = await api.post('/auth/login', credentials);
      const { user, token } = response.data.data;

      // Store token and user in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      return response.data;
    } catch (error: any) {
      // Extract specific error message if available
      const errorData = error.response?.data;
      let message = 'Login failed';

      if (errorData?.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
        message = errorData.errors[0].msg || errorData.errors[0].message || message;
      } else if (errorData?.message) {
        message = errorData.message;
      }

      toast.error(message);

      // Create a new error with the specific message for the component to use
      const customError = new Error(message);
      throw customError;
    }
  },register: async (userData: {
    name: string;
    email: string;
    password: string;
    phone: string;
    nationality: string;
    preferredLanguage?: string;
  }): Promise<ApiResponse<{ user: User; token: string }>> => {
    try {
      const response = await api.post('/auth/register', userData);
      const { user, token } = response.data.data;

      // Store token and user in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      return response.data;
    } catch (error: any) {
      // Extract specific validation errors if available
      const errorData = error.response?.data;
      let message = 'Registration failed';

      if (errorData?.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
        // Get the first validation error message for better user experience
        message = errorData.errors[0].msg || errorData.errors[0].message || message;
      } else if (errorData?.message) {
        message = errorData.message;
      }

      toast.error(message);

      // Create a new error with the specific message for the component to use
      const customError = new Error(message);
      throw customError;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  },

  getCurrentUser: async (): Promise<ApiResponse<{ user: User }>> => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  changePassword: async (passwordData: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse> => {
    try {
      const response = await api.put('/auth/change-password', passwordData);
      toast.success('Password changed successfully');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to change password';
      toast.error(message);
      throw error;
    }
  },

  forgotPassword: async (email: string): Promise<ApiResponse> => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send reset email';
      throw new Error(message);
    }
  },

  resetPassword: async (token: string, password: string): Promise<ApiResponse> => {
    try {
      const response = await api.post('/auth/reset-password', { token, password });
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to reset password';
      throw new Error(message);
    }
  },
};

// Hotels API
export const hotelsAPI = {
  search: async (params: {
    destination: string;
  }): Promise<ApiResponse<{ hotels: Hotel[] }>> => {
    try {
      const response = await api.get('/hotels/search', { params });
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to search hotels';
      toast.error(message);
      throw error;
    }
  },

  getDetails: async (hotelId: string): Promise<ApiResponse<{ hotel: Hotel }>> => {
    try {
      const response = await api.get(`/hotels/details/${hotelId}`);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to get hotel details';
      toast.error(message);
      throw error;
    }
  },

  getLocations: async (query: string): Promise<ApiResponse<{ locations: any[] }>> => {
    try {
      const response = await api.get('/hotels/locations', { params: { query } });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  getPopular: async (): Promise<ApiResponse<{ destinations: any[] }>> => {
    try {
      const response = await api.get('/hotels/popular');
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },
};

// Users API
export const usersAPI = {
  getProfile: async (): Promise<ApiResponse<{ user: User }>> => {
    try {
      const response = await api.get('/users/profile');
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  updateProfile: async (userData: Partial<User>): Promise<ApiResponse<{ user: User }>> => {
    try {
      const response = await api.put('/users/profile', userData);

      // Update stored user data
      const updatedUser = response.data.data.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));

      toast.success('Profile updated successfully');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update profile';
      toast.error(message);
      throw error;
    }
  },

  getReservations: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{
    reservations: Reservation[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalReservations: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }>> => {
    try {
      const response = await api.get('/users/reservations', { params });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  deleteAccount: async (): Promise<ApiResponse> => {
    try {
      const response = await api.delete('/users/account');
      toast.success('Account deleted successfully');

      // Clear stored data
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete account';
      toast.error(message);
      throw error;
    }
  },
};

// Reservations API
export const reservationsAPI = {  create: async (reservationData: {
    touristName: string;
    phone: string;
    nationality: string;
    email: string;
    hotel: {
      name: string;
      address: string;
      city: string;
      country: string;
      coordinates?: { latitude: number; longitude: number };
      rating?: number;
      image?: string;
      hotelId?: string;
    };
    checkInDate?: string;
    checkOutDate?: string;
    numberOfGuests?: number;
    notes?: string;  }): Promise<ApiResponse<{ reservation: Reservation }>> => {    try {      // Create a separate axios instance with longer timeout for reservation creation
      const reservationApi = axios.create({
        baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api',
        timeout: 120000, // 2 minutes timeout for reservation creation
        headers: {
          'Content-Type': 'application/json',
        },
      });
      // Add request interceptor to debug the actual request
      reservationApi.interceptors.request.use(
        (config) => {
          return config;
        },
        (error) => {
          console.error('📤 Request interceptor error:', error);
          return Promise.reject(error);
        }
      );

      // Add response interceptor to debug the response
      reservationApi.interceptors.response.use(
        (response) => {
          return response;
        },
        (error) => {
          console.error('📥 Response interceptor - Error:', {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
          });
          return Promise.reject(error);
        }
      );

      // Add auth token to the request
      const token = localStorage.getItem('token');
      if (token) {
        reservationApi.defaults.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn('⚠️ No auth token found');
      }


      const response = await reservationApi.post('/reservations', reservationData);

      // Note: Custom toast is handled in HotelBookingModal component
      // toast.success('Reservation created successfully!');
      return response.data;    } catch (error: any) {
      console.error('❌ Reservation creation failed');
      console.error('🔍 Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        stack: error.stack
      });

      // Handle specific timeout errors
      if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
        console.error('⏰ Timeout error detected - request exceeded 120 seconds');
        toast.error('Reservation is taking longer than expected. Please check your reservations in your profile to see if it was created successfully.');
        throw new Error('Request timeout - please check your reservations');
      }

      // Handle network errors
      if (error.code === 'ERR_NETWORK') {
        console.error('🌐 Network error detected');
        toast.error('Network error - please check your internet connection');
        throw new Error('Network error - please check your connection');
      }

      const message = error.response?.data?.message || 'Failed to create reservation';
      console.error('📝 Error message:', message);
      toast.error(message);
      throw error;
    }
  },

  getAll: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{
    reservations: Reservation[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalReservations: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }>> => {
    try {
      const response = await api.get('/reservations', { params });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },
  getById: async (id: string): Promise<ApiResponse<{ reservation: Reservation }>> => {
    try {
      const response = await api.get(`/reservations/${id}`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },
  getByUser: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{
    reservations: Reservation[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalReservations: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }>> => {
    try {
      const response = await api.get('/reservations', { params });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  updateStatus: async (id: string, status: string): Promise<ApiResponse<{ reservation: Reservation }>> => {
    try {
      const response = await api.put(`/reservations/${id}/status`, { status });
      toast.success('Reservation status updated');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update reservation';
      toast.error(message);
      throw error;
    }
  },

  cancel: async (id: string): Promise<ApiResponse<{ reservation: Reservation }>> => {
    try {
      const response = await api.delete(`/reservations/${id}`);
      toast.success('Reservation cancelled successfully');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to cancel reservation';
      toast.error(message);
      throw error;
    }
  },
};

// Individual export functions for convenience
export const login = authAPI.login;
export const register = authAPI.register;
export const logout = authAPI.logout;
export const getCurrentUser = authAPI.getCurrentUser;
export const changePassword = authAPI.changePassword;
export const forgotPassword = authAPI.forgotPassword;
export const resetPassword = authAPI.resetPassword;

export const searchHotels = hotelsAPI.search;

export default api;
