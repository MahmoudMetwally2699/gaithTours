import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { whatsappService } from '../services/whatsappService';
import { useAuth } from './AuthContext';

const PollingContext = createContext();

export const usePolling = () => {
  const context = useContext(PollingContext);
  if (!context) {
    throw new Error('usePolling must be used within a PollingProvider');
  }
  return context;
};

export const PollingProvider = ({ children }) => {
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef(null);
  const { isAuthenticated, user } = useAuth();
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      console.log('⏹️ Stopping WhatsApp polling...');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsPolling(false);
    }
  }, []);

  const startPolling = useCallback(() => {
    if (intervalRef.current || !isAuthenticated || user?.role !== 'admin') return;

    console.log('🔄 Starting polling for WhatsApp updates...');
    setIsPolling(true);

    intervalRef.current = setInterval(async () => {
      try {
        // Poll for new conversations/messages
        const conversations = await whatsappService.getConversations({
          page: 1,
          limit: 20,
          sortBy: 'lastMessageTimestamp',
          sortOrder: 'desc'
        });

        // Check if there are new updates
        const latestUpdate = conversations.conversations[0]?.lastMessageTimestamp;
        if (latestUpdate && new Date(latestUpdate) > new Date(lastUpdate)) {
          console.log('📥 New WhatsApp data detected via polling');
          setLastUpdate(Date.now());

          // Dispatch custom event for components to listen to
          window.dispatchEvent(new CustomEvent('whatsappUpdate', {
            detail: { conversations: conversations.conversations }
          }));
        }
      } catch (error) {
        console.error('❌ Polling error:', error);
      }
    }, 5000); // Poll every 5 seconds
  }, [isAuthenticated, user, lastUpdate]);  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      // Start polling as fallback for real-time updates
      const timer = setTimeout(() => {
        startPolling();
      }, 2000); // Start after 2 seconds
      return () => clearTimeout(timer);
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [isAuthenticated, user, startPolling, stopPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const value = {
    isPolling,
    lastUpdate,
    startPolling,
    stopPolling
  };

  return (
    <PollingContext.Provider value={value}>
      {children}
    </PollingContext.Provider>
  );
};

export default PollingContext;
