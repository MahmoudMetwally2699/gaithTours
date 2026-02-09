import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrophyIcon,
  SparklesIcon,
  StarIcon,
  GiftIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface LoyaltyStatus {
  points: number;
  tier: string;
  totalSpent: number;
  benefits: {
    discountPercent: number;
    freeCancellation: boolean;
    prioritySupport: boolean;
    description: string;
  };
  nextTier: {
    name: string;
    pointsNeeded: number;
    progress: number;
  } | null;
  programName: string;
}

interface LoyaltyCardProps {
  compact?: boolean;
}

const TIER_STYLES: { [key: string]: { bg: string; text: string; icon: string; glow: string } } = {
  Bronze: {
    bg: 'from-amber-600 to-amber-800',
    text: 'text-amber-100',
    icon: 'text-amber-300',
    glow: 'shadow-amber-500/30'
  },
  Silver: {
    bg: 'from-gray-400 to-gray-600',
    text: 'text-gray-100',
    icon: 'text-gray-200',
    glow: 'shadow-gray-400/30'
  },
  Gold: {
    bg: 'from-yellow-400 to-yellow-600',
    text: 'text-yellow-900',
    icon: 'text-yellow-800',
    glow: 'shadow-yellow-500/40'
  },
  Platinum: {
    bg: 'from-purple-500 to-purple-700',
    text: 'text-purple-100',
    icon: 'text-purple-200',
    glow: 'shadow-purple-500/40'
  }
};

export const LoyaltyCard: React.FC<LoyaltyCardProps> = ({ compact = false }) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<LoyaltyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    fetchLoyaltyStatus();
  }, []);

  const fetchLoyaltyStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/loyalty/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      } else if (response.status === 404) {
        // Loyalty program not enabled or no status
        setStatus(null);
      } else {
        setError('Failed to load loyalty status');
      }
    } catch (err) {
      console.error('Error fetching loyalty status:', err);
      setError('Failed to load loyalty status');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  if (error || !status) {
    return null; // Don't show card if loyalty not available
  }

  const tierStyle = TIER_STYLES[status.tier] || TIER_STYLES.Bronze;

  if (compact) {
    return (
      <div className={`bg-gradient-to-r ${tierStyle.bg} rounded-xl p-4 shadow-lg ${tierStyle.glow}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrophyIcon className={`w-8 h-8 ${tierStyle.icon}`} />
            <div>
                          <div className={`font-bold ${tierStyle.text}`}>{t(`loyalty.tiers.${status.tier}`)} {t('loyalty.member')}</div>
              <div className={`text-sm ${tierStyle.text} opacity-80`}>
                {status.points.toLocaleString()} {t('loyalty.points')}
              </div>
            </div>
          </div>
          {status.nextTier && (
                        <div className={`text-right ${tierStyle.text}`}>
              <div className="text-xs opacity-80">{t('loyalty.next')}: {t(`loyalty.tiers.${status.nextTier.name}`)}</div>
              <div className="w-20 h-2 bg-white/20 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-white/60 rounded-full transition-all duration-500"
                  style={{ width: `${status.nextTier.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header with Tier Badge */}
      <div className={`bg-gradient-to-r ${tierStyle.bg} p-6 ${tierStyle.glow}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl">
              <TrophyIcon className={`w-8 h-8 ${tierStyle.icon}`} />
            </div>
            <div>
              <h3 className={`text-xl font-bold ${tierStyle.text}`}>
                {status.programName || 'Loyalty Rewards'}
              </h3>
                            <p className={`text-sm ${tierStyle.text} opacity-80`}>
                {t(`loyalty.tiers.${status.tier}`)} {t('loyalty.member')}
              </p>
            </div>
          </div>
          <div className={`text-right ${tierStyle.text}`}>
                        <div className="text-3xl font-bold">{status.points.toLocaleString()}</div>
            <div className="text-sm opacity-80">{t('loyalty.points')}</div>
          </div>
        </div>

        {/* Progress to Next Tier */}
        {status.nextTier && (
                    <div className={`${tierStyle.text}`}>
            <div className="flex justify-between text-sm mb-2">
              <span>{t('loyalty.progressTo')} {t(`loyalty.tiers.${status.nextTier.name}`)}</span>
              <span>{status.nextTier.pointsNeeded.toLocaleString()} {t('loyalty.pointsNeeded')}</span>
            </div>
            <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/70 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${status.nextTier.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Benefits Section */}
      <div className="p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <GiftIcon className="w-5 h-5 text-orange-500" />
          {t('loyalty.yourBenefits')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {status.benefits.discountPercent > 0 && (
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <SparklesIcon className="w-6 h-6 text-green-600" />
              <div>
                                <div className="font-medium text-green-800">
                  {status.benefits.discountPercent}% {t('loyalty.discount')}
                </div>
                <div className="text-sm text-green-600">{t('loyalty.allBookings')}</div>
              </div>
            </div>
          )}
          {status.benefits.freeCancellation && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-blue-600" />
                            <div>
                <div className="font-medium text-blue-800">{t('loyalty.freeCancellation')}</div>
                <div className="text-sm text-blue-600">{t('loyalty.onEligibleBookings')}</div>
              </div>
            </div>
          )}
          {status.benefits.prioritySupport && (
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <StarIcon className="w-6 h-6 text-purple-600" />
                            <div>
                <div className="font-medium text-purple-800">{t('loyalty.prioritySupport')}</div>
                <div className="text-sm text-purple-600">{t('loyalty.dedicatedHelp')}</div>
              </div>
            </div>
          )}
        </div>
        {status.benefits.description && (
          <p className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            {status.benefits.description}
          </p>
        )}
      </div>

      {/* Stats Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                <div className="flex justify-between text-sm">
          <span className="text-gray-500">{t('loyalty.totalSpent')}</span>
          <span className="font-semibold text-gray-700">${status.totalSpent.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
