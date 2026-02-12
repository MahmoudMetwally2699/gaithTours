import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { XCircleIcon, ArrowLeftIcon, CreditCardIcon } from '@heroicons/react/24/outline';

export const PaymentFailure: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();

  const handleGoToProfile = () => {
    history.push('/profile?tab=invoices');
  };

  const handleGoHome = () => {
    history.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div
        className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center"
      >
        <div
          className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6"
        >
          <XCircleIcon className="h-12 w-12 text-red-600" />
        </div>

        <h2
          className="text-2xl font-bold text-gray-900 mb-4"
        >
          {t('payment.failure.title')}
        </h2>

        <p
          className="text-gray-600 mb-6"
        >
          {t('payment.failure.description')}
        </p>

        <div
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6"
        >
          <p className="text-yellow-800 text-sm">
            {t('payment.failure.note')}
          </p>
        </div>

        <div
          className="space-y-3"
        >
          <button
            onClick={handleGoToProfile}
            className="w-full bg-primary-600 text-white py-3 px-4 rounded-md hover:bg-primary-700 transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <CreditCardIcon className="h-5 w-5" />
            <span>{t('payment.tryAgain')}</span>
          </button>

          <button
            onClick={handleGoHome}
            className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>{t('payment.backToHome')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
