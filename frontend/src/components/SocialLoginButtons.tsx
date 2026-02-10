import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface SocialLoginButtonsProps {
  onGoogleSuccess: (credential: string, userInfo: any) => Promise<void>;
  isLoading?: boolean;
  mode?: 'login' | 'register';
}

// Check if Google OAuth is configured
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
const isGoogleConfigured = !!GOOGLE_CLIENT_ID;

// Separate component for Google button that uses the hook
const GoogleLoginButton: React.FC<{
  onSuccess: (credential: string, userInfo: any) => Promise<void>;
  isLoading: boolean;
  mode: 'login' | 'register';
  disabled: boolean;
}> = ({ onSuccess, isLoading, mode, disabled }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  // Dynamic import of useGoogleLogin to avoid hook errors when not in provider
  const { useGoogleLogin } = require('@react-oauth/google');

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse: any) => {
      setLoading(true);
      try {
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        });
        const userInfo = await userInfoResponse.json();
        await onSuccess(tokenResponse.access_token, userInfo);
      } catch (error) {
        console.error('Google login error:', error);
      } finally {
        setLoading(false);
      }
    },
    onError: (error: any) => {
      console.error('Google OAuth Error:', error);
      setLoading(false);
    }
  });

  const buttonBaseClass = `
    group relative w-full flex items-center justify-center gap-3 px-6 py-4
    rounded-2xl font-semibold text-base transition-all duration-300
    transform hover:scale-[1.02] hover:shadow-xl disabled:opacity-50
    disabled:cursor-not-allowed disabled:transform-none
  `;

  return (
    <motion.button
      type="button"
      onClick={() => googleLogin()}
      disabled={isLoading || loading || disabled}
      whileHover={{ scale: isLoading ? 1 : 1.02 }}
      whileTap={{ scale: isLoading ? 1 : 0.98 }}
      className={`${buttonBaseClass} bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50`}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700" />
      ) : (
        <>
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>{mode === 'login' ? t('auth.social.continueWithGoogle', 'Continue with Google') : t('auth.social.signUpWithGoogle', 'Sign up with Google')}</span>
        </>
      )}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </motion.button>
  );
};

// Disabled Google button for when OAuth is not configured
const GoogleLoginButtonDisabled: React.FC<{ mode: 'login' | 'register' }> = ({ mode }) => {
  const { t } = useTranslation();

  const buttonBaseClass = `
    group relative w-full flex items-center justify-center gap-3 px-6 py-4
    rounded-2xl font-semibold text-base transition-all duration-300
    opacity-50 cursor-not-allowed
  `;

  return (
    <button
      type="button"
      disabled
      className={`${buttonBaseClass} bg-white border-2 border-gray-200 text-gray-700`}
      title="Google login not configured"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
      <span>{mode === 'login' ? t('auth.social.continueWithGoogle', 'Continue with Google') : t('auth.social.signUpWithGoogle', 'Sign up with Google')}</span>
    </button>
  );
};

export const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({
  onGoogleSuccess,
  isLoading = false,
  mode = 'login'
}) => {
  return (
    <div className="space-y-4">
      {/* Google Button - conditionally render based on configuration */}
      {isGoogleConfigured ? (
        <GoogleLoginButton
          onSuccess={onGoogleSuccess}
          isLoading={isLoading}
          mode={mode}
          disabled={false}
        />
      ) : (
        <GoogleLoginButtonDisabled mode={mode} />
      )}
    </div>
  );
};

export default SocialLoginButtons;
