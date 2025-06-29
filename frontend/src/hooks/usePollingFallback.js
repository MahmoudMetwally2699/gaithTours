import { useState, useEffect, useCallback } from 'react';
import { whatsappService } from '../services/whatsappService';

// Fallback polling hook for when Socket.io is not available (like on Vercel)
export const usePollingFallback = (isSocketConnected, pollingInterval = 5000) => {
  const [lastPollingTime, setLastPollingTime] = useState(Date.now());
  const [pollingData, setPollingData] = useState(null);
  const [isPolling, setIsPolling] = useState(false);

  const pollForUpdates = useCallback(async () => {
    if (isSocketConnected || isPolling) return;

    try {
      setIsPolling(true);
      
      // Poll for new messages since last check
      const params = {
        since: new Date(lastPollingTime).toISOString(),
        limit: 20
      };

      const response = await whatsappService.getRecentUpdates(params);
      
      if (response.success && response.updates?.length > 0) {
        console.log('📊 Polling found updates:', response.updates.length);
        setPollingData({
          timestamp: Date.now(),
          updates: response.updates
        });
        setLastPollingTime(Date.now());
      }
    } catch (error) {
      console.error('❌ Polling error:', error);
    } finally {
      setIsPolling(false);
    }
  }, [isSocketConnected, isPolling, lastPollingTime]);

  useEffect(() => {
    if (isSocketConnected) {
      console.log('✅ Socket connected - stopping polling');
      return;
    }

    console.log('🔄 Socket not available - starting polling fallback');
    
    // Start polling immediately
    pollForUpdates();
    
    // Set up polling interval
    const intervalId = setInterval(pollForUpdates, pollingInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [isSocketConnected, pollForUpdates, pollingInterval]);

  return {
    pollingData,
    isPolling,
    lastPollingTime
  };
};
