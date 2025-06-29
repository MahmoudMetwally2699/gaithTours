import React, { createContext, useContext, useEffect, useState } from 'react';
// import io from 'socket.io-client'; // DISABLED FOR VERCEL
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
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    // 🚫 SOCKET.IO DISABLED FOR VERCEL DEPLOYMENT
    // Vercel serverless functions don't support persistent WebSocket connections
    // Using polling fallback instead (see PollingContext.js)

    console.log('🚫 Socket.IO disabled for Vercel deployment - using polling fallback');

    // Keep socket state as null and disconnected
    setSocket(null);
    setIsConnected(false);

    /*
    // ORIGINAL SOCKET.IO CODE (DISABLED FOR VERCEL):
    if (isAuthenticated && user) {
      const token = localStorage.getItem('token');
      if (!token) return;

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const socketUrl = apiUrl.replace('/api', '');

      const newSocket = io(socketUrl, {
        auth: { token: token },
        withCredentials: true,
        transports: ['polling', 'websocket'],
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      newSocket.on('connect', () => {
        console.log('✅ Socket connected successfully');
        setIsConnected(true);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        setIsConnected(false);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
    }
    */
  }, [isAuthenticated, user]);

  const value = {
    socket,
    isConnected
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
