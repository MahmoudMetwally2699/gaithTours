import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { sendTestNotification } from '../services/pushNotificationService';
import toast from 'react-hot-toast';
import './NotificationBell.css';

interface NotificationBellProps {
  position?: 'top' | 'bottom';
  isSidebar?: boolean;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ position = 'bottom', isSidebar = false }) => {
  const { t, i18n } = useTranslation('common');
  const isRTL = i18n.language === 'ar';
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    error
  } = usePushNotifications();

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isSupported) return null;

  const handleToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        toast.success(t('notifications.unsubscribed', 'Notifications turned off'));
      }
    } else {
      const success = await subscribe();
      if (success) {
        toast.success(t('notifications.subscribed', 'Notifications enabled! 🔔'));
      } else if (error) {
        toast.error(error);
      }
    }
  };

  const handleTest = async () => {
    try {
      await sendTestNotification();
      toast.success(t('notifications.testSent', 'Test notification sent!'));
    } catch (err) {
      toast.error(t('notifications.testFailed', 'Failed to send test notification'));
    }
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        className={`notification-bell-btn ${isSubscribed ? 'active' : ''}`}
        onClick={() => setShowDropdown(!showDropdown)}
        aria-label={t('notifications.title', 'Notifications')}
        title={t('notifications.title', 'Notifications')}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="notification-bell-icon"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {isSubscribed && <span className="notification-bell-dot"></span>}
      </button>

      {showDropdown && (
        <div className={`notification-dropdown ${isRTL ? 'rtl' : 'ltr'} ${position === 'top' ? 'dropdown-top' : ''} ${isSidebar ? 'sidebar-popup' : ''}`}>
          <div className="notification-dropdown-header">
            <h4>{t('notifications.title', 'Notifications')}</h4>
          </div>

          <div className="notification-dropdown-body">
            {permission === 'denied' ? (
              <div className="notification-status blocked">
                <span className="status-icon">🚫</span>
                <p>{t('notifications.blocked', 'Notifications are blocked. Please enable them in your browser settings.')}</p>
              </div>
            ) : (
              <>
                <div className="notification-toggle-row">
                  <span>{t('notifications.pushNotifications', 'Push Notifications')}</span>
                  <button
                    className={`notification-toggle ${isSubscribed ? 'on' : 'off'}`}
                    onClick={handleToggle}
                    disabled={isLoading}
                  >
                    <span className="toggle-slider"></span>
                  </button>
                </div>

                <p className="notification-description">
                  {isSubscribed
                    ? t('notifications.enabledDesc', 'You\'ll receive alerts for price drops, bookings, and promotions.')
                    : t('notifications.disabledDesc', 'Enable to get notified about price drops, booking updates, and special offers.')
                  }
                </p>

                {isSubscribed && (
                  <button
                    className="notification-test-btn"
                    onClick={handleTest}
                    disabled={isLoading}
                  >
                    {t('notifications.sendTest', 'Send Test Notification')}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
