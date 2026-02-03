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
    if (isAuthenticated && user && user.role && (user.role === 'admin' || user.role === 'superadmin' || user.role === 'super_admin')) {
      const token = localStorage.getItem('token');

      if (!token) {
        return;
      }

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      // Extract just the origin (protocol + host) for Socket.io connection
      // This handles URLs like https://api.gaithtours.com/api correctly
      const url = new URL(apiUrl);
      const socketUrl = url.origin;

      // Close existing socket if any
      if (socket) {
        socket.close();
      }      const newSocket = io(socketUrl, {
        auth: {
          token: token
        },
        withCredentials: true,
        // Use polling for Vercel serverless compatibility
        transports: ['polling'],
        timeout: 30000, // Longer timeout for serverless
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 10, // More attempts for serverless
        reconnectionDelay: 2000, // Longer delay
        reconnectionDelayMax: 10000,
        // Additional options for serverless compatibility
        upgrade: false, // Disable upgrade for serverless
        rememberUpgrade: false,
        // Longer polling intervals for serverless
        autoConnect: true,
        query: {
          EIO: '4' // Ensure Engine.IO v4
        }
      });
      newSocket.on('connect', () => {
        setIsConnected(true);
        setConnectionAttempts(0);

        // The backend automatically joins the whatsapp-admins room
      });

      newSocket.on('disconnect', (reason) => {
        setIsConnected(false);

        // Try to reconnect if the disconnection was unexpected
        if (reason === 'io server disconnect') {
        } else if (reason === 'transport close' || reason === 'transport error') {
        }
      });

      newSocket.on('reconnect', (attemptNumber) => {
        setIsConnected(true);
        setConnectionAttempts(0);
      });

      newSocket.on('reconnect_attempt', (attemptNumber) => {
        setConnectionAttempts(attemptNumber);
      });

      newSocket.on('reconnect_error', (error) => {
      });

      newSocket.on('reconnect_failed', () => {
        setConnectionAttempts(0);
      });

      newSocket.on('connect_error', (error) => {
        setIsConnected(false);

        if (error.message.includes('Authentication')) {
          // Could trigger a logout here if needed
        }
      });

      newSocket.on('error', (error) => {
      });

      // WhatsApp specific events for debugging
      newSocket.on('new_whatsapp_message', (data) => {
      });

      newSocket.on('whatsapp_reply_sent', (data) => {
      });

      setSocket(newSocket);      return () => {
        newSocket.close();
      };
    } else {
      // Close existing socket if user is not authenticated or not admin
      setSocket(prevSocket => {
        if (prevSocket) {
          prevSocket.close();
          setIsConnected(false);
          setConnectionAttempts(0);
        }
        return null;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

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
