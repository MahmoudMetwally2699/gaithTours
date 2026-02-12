import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

interface CancellationPolicy {
  startAt: string;
  endAt: string;
  amountCharge: number;
  amountShow: number;
  percentCharge: number;
  currency: string;
}

interface CancellationInfo {
  cancellable: boolean;
  isFreeCancellation: boolean;
  freeCancellationBefore?: string;
  currentPenalty?: {
    amount: number;
    showAmount: number;
    currency: string;
    percentage: number;
  };
  policies: CancellationPolicy[];
  hotelName?: string;
  checkInDate?: string;
  checkOutDate?: string;
  totalPrice?: number;
  currency?: string;
}

interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservationId: string;
  hotelName: string;
  checkInDate: string;
  checkOutDate: string;
  onCancelled: () => void;
}

export const CancellationModal: React.FC<CancellationModalProps> = ({
  isOpen,
  onClose,
  reservationId,
  hotelName,
  checkInDate,
  checkOutDate,
  onCancelled
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancellationInfo, setCancellationInfo] = useState<CancellationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [step, setStep] = useState<'info' | 'confirm' | 'success'>('info');

  useEffect(() => {
    if (isOpen && reservationId) {
      fetchCancellationInfo();
    }
  }, [isOpen, reservationId]);

  const fetchCancellationInfo = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/bookings/${reservationId}/cancellation-info`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCancellationInfo(data.data);
      } else {
        setError(data.message || 'Failed to get cancellation info');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/bookings/${reservationId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStep('success');
        toast.success('Booking cancelled successfully');
        setTimeout(() => {
          onCancelled();
          onClose();
        }, 2000);
      } else {
        toast.error(data.message || 'Failed to cancel booking');
        setError(data.message || 'Failed to cancel booking');
      }
    } catch (err) {
      toast.error('Failed to connect to server');
      setError('Failed to connect to server');
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

        {/* Modal */}
        <div
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ExclamationTriangleIcon className="w-6 h-6" />
                {t('Cancel Booking')}
              </h2>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex flex-col items-center py-8">
                <div className="w-12 h-12 border-4 border-red-200 border-t-red-500 rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600">{t('Loading cancellation details...')}</p>
              </div>
            ) : error && step !== 'confirm' ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                  <XMarkIcon className="w-8 h-8 text-red-500" />
                </div>
                <p className="text-red-600 font-medium">{error}</p>
                <button
                  onClick={fetchCancellationInfo}
                  className="mt-4 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t('Try Again')}
                </button>
              </div>
            ) : step === 'success' ? (
              <div className="text-center py-8">
                <div
                  className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center"
                >
                  <CheckCircleIcon className="w-12 h-12 text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {t('Booking Cancelled')}
                </h3>
                <p className="text-gray-600">
                  {t('Your booking has been successfully cancelled.')}
                </p>
              </div>
            ) : step === 'confirm' ? (
              <>
                {/* Confirmation Step */}
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <ExclamationTriangleIcon className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-amber-800">
                          {t('Are you sure you want to cancel?')}
                        </h4>
                        <p className="text-sm text-amber-700 mt-1">
                          {t('This action cannot be undone.')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Penalty Warning */}
                  {cancellationInfo?.currentPenalty && cancellationInfo.currentPenalty.amount > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <h4 className="font-semibold text-red-800 mb-2">
                        {t('Cancellation Penalty')}
                      </h4>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(
                          cancellationInfo.currentPenalty.showAmount || cancellationInfo.currentPenalty.amount,
                          cancellationInfo.currentPenalty.currency
                        )}
                      </p>
                      <p className="text-sm text-red-700 mt-1">
                        {t('You will be charged this amount for cancelling.')}
                      </p>
                    </div>
                  )}

                  {/* Reason Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('Reason for cancellation (optional)')}
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={t('Please let us know why you are cancelling...')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setStep('info')}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                    disabled={cancelling}
                  >
                    {t('Go Back')}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {cancelling ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        {t('Cancelling...')}
                      </>
                    ) : (
                      t('Confirm Cancellation')
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Info Step */}
                <div className="space-y-4">
                  {/* Booking Details */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-800 mb-3">{hotelName}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4" />
                        <span>{formatDate(checkInDate)}</span>
                      </div>
                      <span>→</span>
                      <span>{formatDate(checkOutDate)}</span>
                    </div>
                  </div>

                  {/* Free Cancellation Notice */}
                  {cancellationInfo?.isFreeCancellation && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircleIcon className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-green-800">
                            {t('Free Cancellation')}
                          </h4>
                          <p className="text-sm text-green-700 mt-1">
                            {cancellationInfo.freeCancellationBefore
                              ? t('Free cancellation until') + ' ' + formatDate(cancellationInfo.freeCancellationBefore)
                              : t('You can cancel this booking without any charges.')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Penalty Notice */}
                  {!cancellationInfo?.isFreeCancellation && cancellationInfo?.currentPenalty && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <CurrencyDollarIcon className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-amber-800">
                            {t('Cancellation Fee Applies')}
                          </h4>
                          <p className="text-lg font-bold text-amber-700 mt-1">
                            {formatCurrency(
                              cancellationInfo.currentPenalty.showAmount || cancellationInfo.currentPenalty.amount,
                              cancellationInfo.currentPenalty.currency
                            )}
                          </p>
                          {cancellationInfo.currentPenalty.percentage > 0 && (
                            <p className="text-sm text-amber-600 mt-1">
                              ({cancellationInfo.currentPenalty.percentage}% {t('of booking total')})
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cancellation Policies Timeline */}
                  {cancellationInfo?.policies && cancellationInfo.policies.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <ClockIcon className="w-5 h-5" />
                        {t('Cancellation Policy')}
                      </h4>
                      <div className="space-y-2">
                        {cancellationInfo.policies.map((policy, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg text-sm"
                          >
                            <span className="text-gray-600">
                              {policy.startAt ? formatDate(policy.startAt) : t('Before booking')}
                              {policy.endAt && ` - ${formatDate(policy.endAt)}`}
                            </span>
                            <span className={`font-semibold ${policy.amountCharge === 0 ? 'text-green-600' : 'text-amber-600'}`}>
                              {policy.amountCharge === 0
                                ? t('Free')
                                : formatCurrency(policy.amountShow || policy.amountCharge, policy.currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    {t('Keep Booking')}
                  </button>
                  <button
                    onClick={() => setStep('confirm')}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-rose-700 transition-colors"
                  >
                    {t('Proceed to Cancel')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
    </div>
  );
};

export default CancellationModal;
