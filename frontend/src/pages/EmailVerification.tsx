import React, { useEffect, useState } from 'react';
import { useParams, useHistory, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

type VerificationStatus = 'loading' | 'success' | 'error' | 'expired';

export const EmailVerification: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const history = useHistory();
  const { t } = useTranslation();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link');
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/verify-email/${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully!');
          setEmail(data.data?.email || '');
          toast.success('Email verified successfully!');
        } else {
          if (data.message?.includes('expired')) {
            setStatus('expired');
          } else {
            setStatus('error');
          }
          setMessage(data.message || 'Verification failed');
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage('An error occurred during verification');
      }
    };

    verifyEmail();
  }, [token]);

  const handleResendVerification = async () => {
    if (!email) {
      toast.error('Please log in to resend verification email');
      history.push('/login');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Verification email sent! Check your inbox.');
        setStatus('loading');
        setMessage('Please check your email for the new verification link.');
      } else {
        toast.error(data.message || 'Failed to resend verification email');
      }
    } catch (error) {
      toast.error('Failed to resend verification email');
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div
            className="text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-ping opacity-25"></div>
              <div className="relative w-20 h-20 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                <ArrowPathIcon className="w-10 h-10 text-white animate-spin" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              {t('Verifying your email...')}
            </h2>
            <p className="text-gray-600">
              {t('Please wait while we verify your email address.')}
            </p>
          </div>
        );

      case 'success':
        return (
          <div
            className="text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
              <CheckCircleIcon className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              {t('Email Verified!')}
            </h2>
            <p className="text-gray-600 mb-6">
              {message}
            </p>
            <div className="space-y-3">
              <Link
                to="/login"
                className="block w-full py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-indigo-500/30"
              >
                {t('Continue to Login')}
              </Link>
              <Link
                to="/"
                className="block w-full py-3 px-6 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all duration-300"
              >
                {t('Go to Homepage')}
              </Link>
            </div>
          </div>
        );

      case 'expired':
        return (
          <div
            className="text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30">
              <XCircleIcon className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              {t('Link Expired')}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('This verification link has expired. Please request a new one.')}
            </p>
            <div className="space-y-3">
              <button
                onClick={handleResendVerification}
                className="block w-full py-3 px-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-lg shadow-orange-500/30"
              >
                {t('Resend Verification Email')}
              </button>
              <Link
                to="/login"
                className="block w-full py-3 px-6 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all duration-300"
              >
                {t('Back to Login')}
              </Link>
            </div>
          </div>
        );

      case 'error':
      default:
        return (
          <div
            className="text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-red-400 to-rose-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
              <XCircleIcon className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              {t('Verification Failed')}
            </h2>
            <p className="text-gray-600 mb-6">
              {message || t('The verification link is invalid or has already been used.')}
            </p>
            <div className="space-y-3">
              <Link
                to="/login"
                className="block w-full py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-indigo-500/30"
              >
                {t('Back to Login')}
              </Link>
              <Link
                to="/register"
                className="block w-full py-3 px-6 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all duration-300"
              >
                {t('Create New Account')}
              </Link>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              ✈️ Gaith Tours
            </h1>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-indigo-500/10 p-8 border border-white/20">
          {renderContent()}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          {t('Need help?')}{' '}
          <a href="mailto:support@gaithtours.com" className="text-indigo-600 hover:text-indigo-700 font-medium">
            {t('Contact Support')}
          </a>
        </p>
      </div>
    </div>
  );
};

export default EmailVerification;
