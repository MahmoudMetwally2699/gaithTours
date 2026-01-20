import React, { useEffect, useState } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/solid';
import { paymentsAPI } from '../services/api';

interface PaymentCallbackState {
  status: 'loading' | 'success' | 'failed' | 'pending';
  reservation?: {
    id: string;
    hotelName: string;
    checkIn: string;
    checkOut: string;
    totalPrice: number;
    currency: string;
    ratehawkOrderId?: string;
  };
  error?: string;
}

export const PaymentCallbackPage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const history = useHistory();
  const [state, setState] = useState<PaymentCallbackState>({ status: 'loading' });
  const [pollCount, setPollCount] = useState(0);
  const maxPolls = 30; // Poll for max 60 seconds (30 * 2s)

  // Extract orderId from URL query params
  const searchParams = new URLSearchParams(location.search);
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    if (!orderId) {
      setState({
        status: 'failed',
        error: 'No order ID provided'
      });
      return;
    }

    checkPaymentStatus();
  }, [orderId]);

  const checkPaymentStatus = async () => {
    if (!orderId) return;

    try {
      const response = await paymentsAPI.getKashierOrderStatus(orderId);

      if (response.success && response.data) {
        const { reservation, payment } = response.data;

        // Check reservation status
        if (reservation.status === 'confirmed' || reservation.ratehawkStatus === 'sandbox') {
          setState({
            status: 'success',
            reservation: {
              id: reservation.id,
              hotelName: reservation.hotelName,
              checkIn: reservation.checkIn,
              checkOut: reservation.checkOut,
              totalPrice: reservation.totalPrice,
              currency: reservation.currency,
              ratehawkOrderId: reservation.ratehawkOrderId
            }
          });
        } else if (reservation.status === 'payment_failed' || reservation.status === 'cancelled') {
          setState({
            status: 'failed',
            error: 'Payment was not successful'
          });
        } else if (pollCount < maxPolls) {
          // Still pending, poll again
          setState({ status: 'pending' });
          setPollCount(prev => prev + 1);
          setTimeout(checkPaymentStatus, 2000);
        } else {
          // Max polls reached, show pending message
          setState({
            status: 'pending',
            reservation: {
              id: reservation.id,
              hotelName: reservation.hotelName,
              checkIn: reservation.checkIn,
              checkOut: reservation.checkOut,
              totalPrice: reservation.totalPrice,
              currency: reservation.currency
            }
          });
        }
      } else {
        throw new Error('Invalid response');
      }
    } catch (error: any) {
      console.error('Payment status check error:', error);
      if (pollCount < maxPolls) {
        setPollCount(prev => prev + 1);
        setTimeout(checkPaymentStatus, 2000);
      } else {
        setState({
          status: 'failed',
          error: error.message || 'Failed to verify payment status'
        });
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderContent = () => {
    switch (state.status) {
      case 'loading':
      case 'pending':
        return (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
              <ClockIcon className="h-8 w-8 text-yellow-600 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {t('payment.processing', 'Processing Your Payment')}
            </h1>
            <p className="text-gray-600 mb-6">
              {t('payment.pleaseWait', 'Please wait while we confirm your payment and create your booking...')}
            </p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
            {pollCount > 5 && (
              <p className="text-sm text-gray-500 mt-4">
                {t('payment.takingLonger', 'This is taking longer than expected. Please do not close this page.')}
              </p>
            )}
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircleIcon className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {t('payment.success.title', 'Booking Confirmed!')}
            </h1>
            <p className="text-gray-600 mb-8">
              {t('payment.successMessage', 'Your payment was successful and your booking has been confirmed.')}
            </p>

            {state.reservation && (
              <div className="bg-gray-50 rounded-lg p-6 text-left mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {t('payment.bookingDetails', 'Booking Details')}
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('payment.hotel', 'Hotel')}</span>
                    <span className="font-medium">{state.reservation.hotelName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('payment.checkIn', 'Check-in')}</span>
                    <span className="font-medium">{formatDate(state.reservation.checkIn)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('payment.checkOut', 'Check-out')}</span>
                    <span className="font-medium">{formatDate(state.reservation.checkOut)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-3 mt-3">
                    <span className="text-gray-600">{t('payment.totalPaid', 'Total Paid')}</span>
                    <span className="font-bold text-lg text-green-600">
                      {state.reservation.currency} {(state.reservation.totalPrice || 0).toFixed(2)}
                    </span>
                  </div>
                  {state.reservation.ratehawkOrderId && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('payment.confirmationNumber', 'Confirmation #')}</span>
                      <span className="font-mono text-gray-700">{state.reservation.ratehawkOrderId}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => history.push('/')}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
              >
                {t('payment.backToHome', 'Back to Home')}
              </button>
              <button
                onClick={() => history.push('/profile/reservations')}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                {t('payment.viewReservations', 'View My Reservations')}
              </button>
            </div>
          </div>
        );

      case 'failed':
        return (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <XCircleIcon className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {t('payment.failed', 'Payment Failed')}
            </h1>
            <p className="text-gray-600 mb-8">
              {state.error || t('payment.failedMessage', 'We were unable to process your payment. Please try again.')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => history.goBack()}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
              >
                {t('payment.tryAgain', 'Try Again')}
              </button>
              <button
                onClick={() => history.push('/')}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                {t('payment.backToHome', 'Back to Home')}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default PaymentCallbackPage;
