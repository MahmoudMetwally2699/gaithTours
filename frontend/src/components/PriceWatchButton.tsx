import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { BellIcon, BellAlertIcon } from '@heroicons/react/24/outline';
import { BellAlertIcon as BellAlertSolidIcon } from '@heroicons/react/24/solid';
import {
  checkPriceAlert,
  createPriceAlert,
  deletePriceAlert,
  PriceAlert
} from '../services/priceAlertService';

interface PriceWatchButtonProps {
  hotelId: string;
  hotelName: string;
  hotelImage?: string;
  destination: string;
  checkIn: string;
  checkOut: string;
  adults?: number;
  children?: number;
  currentPrice: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const PriceWatchButton: React.FC<PriceWatchButtonProps> = ({
  hotelId,
  hotelName,
  hotelImage,
  destination,
  checkIn,
  checkOut,
  adults = 2,
  children = 0,
  currentPrice,
  currency = 'USD',
  size = 'md',
  showLabel = true,
  className = ''
}) => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [isWatching, setIsWatching] = useState(false);
  const [alertData, setAlertData] = useState<PriceAlert | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Check if user is already watching this hotel
  useEffect(() => {
    const checkWatchStatus = async () => {
      if (!isAuthenticated || !hotelId) return;

      try {
        const result = await checkPriceAlert(hotelId, checkIn, checkOut);
        setIsWatching(result.isWatching);
        setAlertData(result.data || null);
      } catch (error) {
        console.error('Failed to check watch status:', error);
      }
    };

    checkWatchStatus();
  }, [isAuthenticated, hotelId, checkIn, checkOut]);

  const handleToggleWatch = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      // Show tooltip prompting login
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 3000);
      return;
    }

    setIsLoading(true);

    try {
      if (isWatching && alertData) {
        // Remove watch
        await deletePriceAlert(alertData._id);
        setIsWatching(false);
        setAlertData(null);
      } else {
        // Add watch
        const newAlert = await createPriceAlert({
          hotelId,
          hotelName,
          hotelImage,
          destination,
          checkIn,
          checkOut,
          adults,
          children,
          currentPrice,
          currency
        });
        setIsWatching(true);
        setAlertData(newAlert);
      }
    } catch (error: any) {
      console.error('Failed to toggle watch:', error);
      // Show error message if needed
      if (error.response?.status === 409) {
        // Already watching - update state
        setIsWatching(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Size configurations
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const labelSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        onClick={handleToggleWatch}
        disabled={isLoading}
        className={`
          relative flex items-center gap-2 rounded-full transition-all duration-200
          ${sizeClasses[size]}
          ${isWatching
            ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title={isWatching ? t('priceWatch.stopWatching', 'Stop watching price') : t('priceWatch.watchPrice', 'Watch price')}
      >
        {isLoading ? (
          <svg className={`animate-spin ${iconSizes[size]}`} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : isWatching ? (
          <BellAlertSolidIcon className={iconSizes[size]} />
        ) : (
          <BellIcon className={iconSizes[size]} />
        )}

        {showLabel && (
          <span className={`${labelSizes[size]} font-medium whitespace-nowrap`}>
            {isWatching
              ? t('priceWatch.watching', 'Watching')
              : t('priceWatch.watchPrice', 'Watch Price')
            }
          </span>
        )}
      </button>

      {/* Login tooltip */}
      {showTooltip && !isAuthenticated && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg whitespace-nowrap z-50">
          {t('priceWatch.loginRequired', 'Please log in to watch prices')}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}

      {/* Price drop indicator */}
      {isWatching && alertData && alertData.currentPrice < alertData.priceHistory[0]?.price && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
        </span>
      )}
    </div>
  );
};

export default PriceWatchButton;
