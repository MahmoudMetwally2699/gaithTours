import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircleIcon, DocumentTextIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import paymentsAPI from '../services/paymentsAPI';
import { toast } from 'react-hot-toast';

export const PaymentSuccess: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  useEffect(() => {
    const handlePaymentSuccess = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');

        if (sessionId) {
          // Use the new session status endpoint that doesn't require authentication
          const response = await paymentsAPI.getSessionStatus(sessionId);
          setPaymentDetails(response);
          toast.success(t('payment.success.message'));
        } else {
          toast.error(t('payment.error.noSession'));
        }
      } catch (error) {
        console.error('Error handling payment success:', error);
        toast.error(t('payment.error.processing'));
      } finally {
        setLoading(false);
      }
    };

    handlePaymentSuccess();
  }, [t]);

  const handleGoToProfile = () => {
    history.push('/profile?tab=invoices');
  };

  const handleGoHome = () => {
    history.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6"
        >
          <CheckCircleIcon className="h-12 w-12 text-green-600" />
        </motion.div>

        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-2xl font-bold text-gray-900 mb-4"
        >
          {t('payment.success.title')}
        </motion.h2>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-gray-600 mb-6"
        >
          {t('payment.success.description')}
        </motion.p>

        {paymentDetails && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="bg-gray-50 rounded-lg p-4 mb-6 text-left"
          >
            <h3 className="font-semibold text-gray-900 mb-2">{t('payment.details')}</h3>
            <div className="space-y-1 text-sm text-gray-600">              <div className="flex justify-between">
                <span>{t('payment.amount')}:</span>
                <span className="font-medium">
                  {paymentDetails.payment?.amount?.toFixed(2)} {paymentDetails.payment?.currency || 'SAR'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{t('payment.transactionId')}:</span>
                <span className="font-mono text-xs">{paymentDetails.transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('payment.date')}:</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="space-y-3"
        >
          <button
            onClick={handleGoToProfile}
            className="w-full bg-primary-600 text-white py-3 px-4 rounded-md hover:bg-primary-700 transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <DocumentTextIcon className="h-5 w-5" />
            <span>{t('payment.viewInvoices')}</span>
          </button>

          <button
            onClick={handleGoHome}
            className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>{t('payment.backToHome')}</span>
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
};
