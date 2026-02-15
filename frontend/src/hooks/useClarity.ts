import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { User } from '../services/api';

// Declare the global clarity function
declare global {
  interface Window {
    clarity: (...args: any[]) => void;
  }
}

/**
 * Hook to integrate Microsoft Clarity with React SPA.
 * - Tracks SPA route changes as virtual pageviews
 * - Identifies logged-in users so sessions are tied to accounts
 */
export function useClarity(user: User | null) {
  const location = useLocation();
  const prevPath = useRef(location.pathname);

  // SPA route tracking — notify Clarity on each route change
  useEffect(() => {
    if (typeof window.clarity === 'function' && location.pathname !== prevPath.current) {
      // Set custom page tag so you can filter by page in Clarity dashboard
      window.clarity('set', 'page', location.pathname);
      prevPath.current = location.pathname;
    }
  }, [location.pathname]);

  // Identify logged-in users
  useEffect(() => {
    if (typeof window.clarity === 'function' && user) {
      // clarity("identify", customUserId, customSessionId, customPageId, friendlyName)
      window.clarity('identify', user._id, undefined, undefined, user.name || user.email);

      // Set custom tags for filtering in Clarity dashboard
      window.clarity('set', 'user_email', user.email);
      window.clarity('set', 'user_role', user.role);
      if (user.nationality) {
        window.clarity('set', 'user_nationality', user.nationality);
      }
    }
  }, [user]);
}
