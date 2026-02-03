import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GiftIcon,
  SparklesIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface RedemptionData {
  canRedeem: boolean;
  availablePoints: number;
  pointsPerDollar: number;
  maxDiscount: number;
  applicableDiscount: number;
  pointsToUse: number;
  tierDiscountPercent: number;
  tierDiscountAmount: number;
  totalPotentialSavings: number;
  tier: string;
}

interface LoyaltyRedemptionProps {
  bookingAmount: number;
  currency: string;
  exchangeRate?: number; // USD to booking currency rate (e.g., 3.77 for SAR, 50 for EGP)
  onApplyDiscount: (discount: number, pointsUsed: number) => void;
  onRemoveDiscount: () => void;
}

export const LoyaltyRedemption: React.FC<LoyaltyRedemptionProps> = ({
  bookingAmount,
  currency,
  exchangeRate = 1, // Default to 1 (USD)
  onApplyDiscount,
  onRemoveDiscount
}) => {
  const { t } = useTranslation();
  const [redemptionData, setRedemptionData] = useState<RedemptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isApplied, setIsApplied] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    fetchRedemptionData();
  }, [bookingAmount]);

  const fetchRedemptionData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${API_URL}/loyalty/calculate-redemption?bookingAmount=${bookingAmount}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setRedemptionData(data);
        setPointsToUse(data.pointsToUse || 0);
      }
    } catch (error) {
      console.error('Error fetching redemption data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPoints = () => {
    if (!redemptionData || pointsToUse <= 0) return;

    // We DON'T call the redeem API here - that would deduct points immediately!
    // Instead, we just preview the discount. The actual deduction happens
    // after successful payment in the backend.

    // Calculate discount in USD first (100 points = $1 USD)
    const discountInUSD = Math.floor(pointsToUse / (redemptionData.pointsPerDollar || 100));

    // Convert USD discount to booking currency using exchange rate
    // e.g., $4 USD × 3.77 = 15.08 SAR
    const calculatedDiscount = Math.round(discountInUSD * exchangeRate * 100) / 100;

    setIsApplied(true);
    onApplyDiscount(calculatedDiscount, pointsToUse);

    console.log('🎁 Loyalty discount previewed:', discountInUSD, 'USD =', calculatedDiscount, currency);
    console.log('   Exchange rate:', exchangeRate);
    console.log('   Points will be deducted after successful booking.');
  };

  const handleRemoveDiscount = () => {
    setIsApplied(false);
    onRemoveDiscount();
    fetchRedemptionData(); // Refresh to restore original available points
  };

  // Adjust points slider
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    // Round to nearest 100 (pointsPerDollar)
    const rounded = Math.round(value / 100) * 100;
    setPointsToUse(rounded);
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  if (!redemptionData || redemptionData.availablePoints < 100) {
    return null; // Don't show if user has no redeemable points
  }

  // Calculate discount in USD, then convert to booking currency
  const discountInUSD = Math.floor(pointsToUse / (redemptionData.pointsPerDollar || 100));
  const discountValue = Math.round(discountInUSD * exchangeRate * 100) / 100;

  return (
    <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-orange-100 rounded-lg">
          <GiftIcon className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">
            {t('loyalty.usePoints', 'Use Your Loyalty Points')}
          </h4>
          <p className="text-sm text-gray-500">
            {t('loyalty.availablePoints', 'You have {{points}} points available', {
              points: redemptionData.availablePoints.toLocaleString()
            })}
          </p>
        </div>
      </div>

      {isApplied ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">
                {t('loyalty.discountApplied', 'Discount Applied!')}
              </p>
              <p className="text-sm text-green-600">
                -{currency} {discountValue} ({pointsToUse.toLocaleString()} {t('loyalty.pointsUsed', 'points used')})
              </p>
            </div>
          </div>
          <button
            onClick={handleRemoveDiscount}
            className="text-sm text-gray-500 hover:text-red-600 underline"
          >
            {t('common.remove', 'Remove')}
          </button>
        </div>
      ) : (
        <>
          {/* Points Slider */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                {t('loyalty.useUpTo', 'Use up to {{points}} points', {
                  points: redemptionData.pointsToUse.toLocaleString()
                })}
              </span>
              <span className="font-medium text-orange-700">
                = -{currency} {discountValue}
              </span>
            </div>

            <input
              type="range"
              min="0"
              max={redemptionData.pointsToUse}
              step="100"
              value={pointsToUse}
              onChange={handleSliderChange}
              className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-[#EF620F]"
            />

            <div className="flex justify-between text-xs text-gray-500">
              <span>0</span>
              <span>{redemptionData.pointsToUse.toLocaleString()} pts</span>
            </div>

            <button
              onClick={handleApplyPoints}
              disabled={pointsToUse === 0}
              className="w-full py-2.5 bg-gradient-to-r from-[#EF620F] to-orange-600 text-white rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <SparklesIcon className="w-4 h-4" />
              {t('loyalty.applyPoints', 'Apply {{points}} Points (-{{currency}}{{amount}})', {
                points: pointsToUse.toLocaleString(),
                currency: currency,
                amount: discountValue
              })}
            </button>
          </div>

          {/* Tier Status Info - No automatic discounts, redeem points for savings */}
          {redemptionData.tier && redemptionData.tier !== 'Bronze' && (
            <div className="mt-3 pt-3 border-t border-orange-100 flex items-center gap-2 text-sm">
              <InformationCircleIcon className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <span className="text-gray-600">
                {t('loyalty.tierStatus', 'You are a {{tier}} member! Redeem your points above for discounts.', {
                  tier: redemptionData.tier
                })}
              </span>
            </div>
          )}
        </>
      )}

      {/* Conversion Rate Info */}
      <div className="mt-3 text-xs text-gray-400 text-center">
        {currency === 'USD'
          ? `${redemptionData.pointsPerDollar} ${t('loyalty.pointsEqualsUSD', 'points = $1 discount')}`
          : `${redemptionData.pointsPerDollar} ${t('loyalty.pointsEqualsConverted', 'points = $1 = {{rate}} {{currency}} discount', { rate: exchangeRate.toFixed(2), currency: currency })}`
        }
      </div>
    </div>
  );
};
