import { useState, useEffect, useRef } from 'react';
import { whatsappService } from '../services/whatsappService';

// Fallback polling hook for when Socket.io is not available (like on Vercel)
export const usePollingFallback = (isSocketConnected, pollingInterval = 10000) => {
  const [pollingData, setPollingData] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const lastPollRef = useRef(0);
  const lastPollingTimeRef = useRef(Date.now());
  const mountedRef = useRef(true);
  const isPollingRef = useRef(false);

  // Ensure minimum polling interval of 5 seconds
  const safePollingInterval = Math.max(pollingInterval, 5000);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Keep refs in sync with state
  useEffect(() => {
    isPollingRef.current = isPolling;
  }, [isPolling]);

  useEffect(() => {
    // Don't poll if socket is connected
    if (isSocketConnected) {
      // Clear any existing intervals/timeouts
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }


    const pollForUpdates = async () => {
      const now = Date.now();

      // Prevent multiple simultaneous polls and ensure minimum interval
      if (!mountedRef.current || isSocketConnected || isPollingRef.current || (now - lastPollRef.current) < (safePollingInterval - 500)) {
        return;
      }

      lastPollRef.current = now;

      try {
        setIsPolling(true);

        // Poll for new messages since last check
        const params = {
          since: new Date(lastPollingTimeRef.current).toISOString(),
          limit: 20
        };

        const response = await whatsappService.getRecentUpdates(params);

        if (!mountedRef.current) return; // Component unmounted

        if (response.success && response.updates?.length > 0) {
          setPollingData({
            timestamp: Date.now(),
            updates: response.updates
          });
        } else {
          console.log('📊 Found 0 updates since', new Date(lastPollingTimeRef.current).toISOString());
        }

        lastPollingTimeRef.current = Date.now();
      } catch (error) {
        console.error('❌ Polling error:', error);
      } finally {
        if (mountedRef.current) {
          setIsPolling(false);
        }
      }
    };

    // Start polling after a delay to avoid immediate spam
    timeoutRef.current = setTimeout(() => {
      if (!isSocketConnected && mountedRef.current) {
        pollForUpdates();
      }
    }, 3000); // 3 second initial delay

    // Set up polling interval
    intervalRef.current = setInterval(() => {
      if (!isSocketConnected && !isPollingRef.current && mountedRef.current) {
        pollForUpdates();
      }
    }, safePollingInterval);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isSocketConnected, safePollingInterval]); // Only depend on stable values

  return {
    pollingData,
    isPolling,
    lastPollingTime: lastPollingTimeRef.current
  };
};
