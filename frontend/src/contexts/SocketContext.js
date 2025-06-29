import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user && user.role && (user.role === 'admin' || user.role === 'superadmin')) {
      const token = localStorage.getItem('token');

      if (!token) {
        console.warn('⚠️ No authentication token found');
        return;
      }

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      // Remove /api from the URL for Socket.io connection
      const socketUrl = apiUrl.replace('/api', '');      console.log('🔗 API URL:', apiUrl);
      console.log('🔗 Socket URL:', socketUrl);
      console.log('🔗 User Role:', user.role);
      console.log('🔗 Connecting to Socket.IO at:', socketUrl);

      // Close existing socket if any
      if (socket) {
        console.log('🧹 Closing existing socket before creating new one');
        socket.close();
      }      const newSocket = io(socketUrl, {
        auth: {
          token: token
        },
        withCredentials: true,
        // Use polling first for Vercel compatibility, then websocket as fallback
        transports: ['polling', 'websocket'],
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        // Additional options for serverless compatibility
        upgrade: true,
        rememberUpgrade: false
      });newSocket.on('connect', () => {
        console.log('✅ Socket connected successfully');
        console.log('🔗 Socket ID:', newSocket.id);
        console.log('🔗 Connected to:', socketUrl);
        setIsConnected(true);
        setConnectionAttempts(0);

        // The backend automatically joins the whatsapp-admins room
        console.log('🏠 Automatically joined whatsapp-admins room via backend');
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        setIsConnected(false);

        // Try to reconnect if the disconnection was unexpected
        if (reason === 'io server disconnect') {
          console.log('🔄 Server initiated disconnect - will attempt to reconnect...');
        } else if (reason === 'transport close' || reason === 'transport error') {
          console.log('🔄 Transport issue - will attempt to reconnect...');
        }
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
        setIsConnected(true);
        setConnectionAttempts(0);
      });

      newSocket.on('reconnect_attempt', (attemptNumber) => {
        console.log('🔄 Reconnection attempt:', attemptNumber);
        setConnectionAttempts(attemptNumber);
      });

      newSocket.on('reconnect_error', (error) => {
        console.error('❌ Reconnection error:', error.message);
      });

      newSocket.on('reconnect_failed', () => {
        console.error('❌ Reconnection failed after maximum attempts');
        setConnectionAttempts(0);
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message);
        console.error('🔧 Error details:', error);
        console.error('🔧 Attempted URL:', socketUrl);
        setIsConnected(false);

        if (error.message.includes('Authentication')) {
          console.error('🔐 Authentication failed - token may be invalid');
          // Could trigger a logout here if needed
        }
      });

      newSocket.on('error', (error) => {
        console.error('❌ Socket error:', error);
      });

      // WhatsApp specific events for debugging
      newSocket.on('new_whatsapp_message', (data) => {
        console.log('🔔 Global: Received new_whatsapp_message event', data);
      });

      newSocket.on('whatsapp_reply_sent', (data) => {
        console.log('🔔 Global: Received whatsapp_reply_sent event', data);
      });

      setSocket(newSocket);

      return () => {
        console.log('🧹 Cleaning up socket connection');
        newSocket.close();
      };
    } else {
      if (socket) {
        console.log('🧹 User not authenticated or not admin - closing socket');
        socket.close();
        setSocket(null);
        setIsConnected(false);
        setConnectionAttempts(0);
      }
    }
  }, [isAuthenticated, user]); // Removed 'socket' from dependencies to prevent infinite loop

  const value = {
    socket,
    isConnected,
    connectionAttempts
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
