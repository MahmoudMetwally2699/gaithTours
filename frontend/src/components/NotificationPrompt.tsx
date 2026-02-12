import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useAuth } from '../contexts/AuthContext';
import './NotificationPrompt.css';

const PROMPT_DISMISSED_KEY = 'notification_prompt_dismissed';
const PROMPT_DELAY_MS = 5000; // Show after 5 seconds

const NotificationPrompt: React.FC = () => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe
  } = usePushNotifications();
  const [visible, setVisible] = useState(false);

  // Don't show for admins — they have the bell in the sidebar
  const isAdmin = user && ['admin', 'super_admin', 'sub_admin'].includes(user.role);

  useEffect(() => {
    // Don't show if: not supported, already subscribed, already dismissed, permission denied, or admin
    if (!isSupported || isSubscribed || isAdmin || permission === 'denied') return;

    const dismissed = localStorage.getItem(PROMPT_DISMISSED_KEY);
    if (dismissed) return;

    const timer = setTimeout(() => {
      setVisible(true);
    }, PROMPT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isSupported, isSubscribed, isAdmin, permission]);

  const handleAccept = async () => {
    const success = await subscribe();
    if (success) {
      localStorage.setItem(PROMPT_DISMISSED_KEY, 'accepted');
    }
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(PROMPT_DISMISSED_KEY, 'dismissed');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      key="notification-prompt"
      className="notification-prompt-overlay"
    >
      <div className="notification-prompt-card">
        <div className="notification-prompt-icon">
          🔔
        </div>
        <div className="notification-prompt-content">
          <h3 className="notification-prompt-title">
            {t('notifications.promptTitle', 'Stay Updated!')}
          </h3>
          <p className="notification-prompt-text">
            {t('notifications.promptText', 'Get notified about support replies, booking updates, and special offers.')}
          </p>
        </div>
        <div className="notification-prompt-actions">
          <button
            className="notification-prompt-accept"
            onClick={handleAccept}
            disabled={isLoading}
          >
            {isLoading
              ? t('notifications.enabling', 'Enabling...')
              : t('notifications.enable', 'Enable')
            }
          </button>
          <button
            className="notification-prompt-dismiss"
            onClick={handleDismiss}
          >
            {t('notifications.notNow', 'Not Now')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPrompt;
