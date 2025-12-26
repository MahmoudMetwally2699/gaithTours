import React from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface CancellationPolicy {
  start_date: string | null;
  end_date: string | null;
  penalty_amount: number;
  penalty_show_amount: number;
  currency: string;
}

interface CancellationPolicyCardProps {
  policies: CancellationPolicy[];
  freeCancellationBefore: string | null;
  isRefundable: boolean;
  currency: string;
}

export const CancellationPolicyCard: React.FC<CancellationPolicyCardProps> = ({
  policies,
  freeCancellationBefore,
  isRefundable,
  currency
}) => {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getDeadlineStatus = (deadline: string | null) => {
    if (!deadline) return null;

    const deadlineDate = new Date(deadline);
    const now = new Date();
    const hoursUntil = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntil < 0) return { type: 'expired', label: 'Expired', color: 'red' };
    if (hoursUntil < 24) return { type: 'urgent', label: 'Ending Soon', color: 'orange' };
    if (hoursUntil < 72) return { type: 'warning', label: 'Ending in 3 days', color: 'yellow' };
    return { type: 'active', label: 'Active', color: 'green' };
  };

  const deadlineStatus = freeCancellationBefore ? getDeadlineStatus(freeCancellationBefore) : null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4 max-h-[500px] overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Cancellation Policy</h3>
          <p className="text-sm text-gray-500 mt-1">
            Review the cancellation terms for this booking
          </p>
        </div>

        {/* Refundable Badge */}
        {isRefundable ? (
          <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full">
            <CheckCircleIcon className="h-4 w-4" />
            <span className="text-sm font-medium">Refundable</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-full">
            <XCircleIcon className="h-4 w-4" />
            <span className="text-sm font-medium">Non-refundable</span>
          </div>
        )}
      </div>

      {/* Free Cancellation Section */}
      {freeCancellationBefore && deadlineStatus && (
        <div className={`p-4 rounded-lg border-2 ${
          deadlineStatus.color === 'green' ? 'bg-green-50 border-green-200' :
          deadlineStatus.color === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
          deadlineStatus.color === 'orange' ? 'bg-orange-50 border-orange-200' :
          'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${
              deadlineStatus.color === 'green' ? 'bg-green-100' :
              deadlineStatus.color === 'yellow' ? 'bg-yellow-100' :
              deadlineStatus.color === 'orange' ? 'bg-orange-100' :
              'bg-red-100'
            }`}>
              <ClockIcon className={`h-5 w-5 ${
                deadlineStatus.color === 'green' ? 'text-green-600' :
                deadlineStatus.color === 'yellow' ? 'text-yellow-600' :
                deadlineStatus.color === 'orange' ? 'text-orange-600' :
                'text-red-600'
              }`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className={`font-semibold ${
                  deadlineStatus.color === 'green' ? 'text-green-900' :
                  deadlineStatus.color === 'yellow' ? 'text-yellow-900' :
                  deadlineStatus.color === 'orange' ? 'text-orange-900' :
                  'text-red-900'
                }`}>
                  Free Cancellation
                </h4>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  deadlineStatus.color === 'green' ? 'bg-green-200 text-green-800' :
                  deadlineStatus.color === 'yellow' ? 'bg-yellow-200 text-yellow-800' :
                  deadlineStatus.color === 'orange' ? 'bg-orange-200 text-orange-800' :
                  'bg-red-200 text-red-800'
                }`}>
                  {deadlineStatus.label}
                </span>
              </div>
              <p className={`text-sm mt-1 ${
                deadlineStatus.color === 'green' ? 'text-green-700' :
                deadlineStatus.color === 'yellow' ? 'text-yellow-700' :
                deadlineStatus.color === 'orange' ? 'text-orange-700' :
                'text-red-700'
              }`}>
                Cancel for free until <strong>{formatDate(freeCancellationBefore)}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Penalties Timeline */}
      {policies && policies.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">Cancellation Penalties</h4>

          <div className="space-y-2">
            {policies.map((policy, index) => {
              const isFree = policy.penalty_amount === 0;

              return (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    isFree
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {isFree ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <ExclamationTriangleIcon className="h-4 w-4 text-orange-600 flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium text-gray-900">
                          {policy.start_date === null && policy.end_date
                            ? `Until ${formatDate(policy.end_date)}`
                            : policy.start_date && policy.end_date === null
                            ? `From ${formatDate(policy.start_date)}`
                            : policy.start_date && policy.end_date
                            ? `${formatDate(policy.start_date)} - ${formatDate(policy.end_date)}`
                            : 'Any time'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 ml-6">
                        {isFree
                          ? 'Free cancellation - no penalty'
                          : 'Cancellation penalty applies'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${
                        isFree ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        {isFree ? 'FREE' : formatPrice(policy.penalty_show_amount)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Non-refundable Warning */}
      {!isRefundable && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <XCircleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Non-refundable Rate</p>
              <p className="text-xs text-red-700 mt-1">
                This rate cannot be cancelled or modified. Full payment will be charged.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Important Note */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
        <strong>Note:</strong> Cancellation policies are subject to the hotel's terms and conditions.
        Please review all terms before booking.
      </div>
    </div>
  );
};
