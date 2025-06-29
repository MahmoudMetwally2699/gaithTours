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
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      const token = localStorage.getItem('token');

      if (!token) return;      const apiUrl = process.env.REACT_APP_API_URL || 'https://gaith-tours-backend.vercel.app/api';
      // Remove /api from the URL for Socket.io connection
      const socketUrl = apiUrl.replace('/api', '');

      console.log('🔗 API URL:', apiUrl);
      console.log('🔗 Socket URL:', socketUrl);
      console.log('🔗 Connecting to Socket.IO at:', socketUrl);

      const newSocket = io(socketUrl, {
        auth: {
          token: token
        },
        withCredentials: true,
        transports: ['websocket', 'polling']
      });      newSocket.on('connect', () => {
        console.log('✅ Socket connected successfully');
        console.log('🔗 Socket ID:', newSocket.id);
        console.log('🔗 Connected to:', socketUrl);
        setIsConnected(true);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        setIsConnected(false);

        // Try to reconnect if the disconnection was unexpected
        if (reason === 'io server disconnect') {
          console.log('🔄 Server initiated disconnect - reconnecting...');
          newSocket.connect();
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message);
        console.error('🔧 Error details:', error);
        console.error('🔧 Attempted URL:', socketUrl);
        setIsConnected(false);
      });

      newSocket.on('error', (error) => {
        console.error('❌ Socket error:', error);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };    } else {
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [isAuthenticated, user, socket]);

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
