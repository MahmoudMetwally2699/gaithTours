import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  BellIcon,
  TrashIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  MapPinIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import {
  getPriceAlerts,
  deletePriceAlert,
  PriceAlert
} from '../services/priceAlertService';

interface MyPriceAlertsProps {
  onClose?: () => void;
}

export const MyPriceAlerts: React.FC<MyPriceAlertsProps> = ({ onClose }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getPriceAlerts();
      setAlerts(data);
    } catch (err: any) {
      console.error('Failed to fetch alerts:', err);
      setError(t('priceWatch.fetchError', 'Failed to load price alerts'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await deletePriceAlert(id);
      setAlerts(alerts.filter(a => a._id !== id));
    } catch (err) {
      console.error('Failed to delete alert:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(i18n.language, {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const calculatePriceChange = (alert: PriceAlert) => {
    if (alert.priceHistory.length < 2) return null;
    const initial = alert.priceHistory[0].price;
    const current = alert.currentPrice;
    const change = ((current - initial) / initial) * 100;
    return change;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={fetchAlerts}
          className="text-orange-500 hover:text-orange-600 font-medium"
        >
          {t('common.retry', 'Try again')}
        </button>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-12">
        <BellIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">
          {t('priceWatch.noAlerts', 'No price alerts yet')}
        </h3>
        <p className="text-gray-500 mb-6">
          {t('priceWatch.noAlertsDesc', 'Start watching hotels to get notified when prices drop')}
        </p>
        <Link
          to="/hotels"
          className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-full font-medium hover:bg-orange-600 transition-colors"
        >
          {t('priceWatch.browseHotels', 'Browse Hotels')}
        </Link>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <BellIcon className="w-6 h-6 text-orange-500" />
          {t('priceWatch.myAlerts', 'My Price Alerts')}
          <span className="text-sm font-normal text-gray-500">({alerts.length})</span>
        </h2>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => {
          const priceChange = calculatePriceChange(alert);
          const isPriceDown = priceChange !== null && priceChange < 0;

          return (
            <div
              key={alert._id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="flex">
                {/* Hotel Image */}
                <Link
                  to={`/hotel/${alert.hotelId}?checkIn=${alert.checkIn.split('T')[0]}&checkOut=${alert.checkOut.split('T')[0]}`}
                  className="flex-shrink-0 w-32 h-32 sm:w-40"
                >
                  {alert.hotelImage ? (
                    <img
                      src={alert.hotelImage}
                      alt={alert.hotelName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <MapPinIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </Link>

                {/* Content */}
                <div className="flex-1 p-4 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        to={`/hotel/${alert.hotelId}?checkIn=${alert.checkIn.split('T')[0]}&checkOut=${alert.checkOut.split('T')[0]}`}
                        className="block"
                      >
                        <h3 className="font-semibold text-gray-800 truncate hover:text-orange-500 transition-colors">
                          {alert.hotelName}
                        </h3>
                      </Link>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <MapPinIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{alert.destination}</span>
                      </p>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(alert._id)}
                      disabled={deletingId === alert._id}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title={t('priceWatch.delete', 'Remove alert')}
                    >
                      {deletingId === alert._id ? (
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <TrashIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" />
                      {formatDate(alert.checkIn)} - {formatDate(alert.checkOut)}
                    </span>
                  </div>

                  {/* Price Info */}
                  <div className="flex items-center gap-4 mt-3">
                    <div>
                      <span className="text-lg font-bold text-gray-800">
                        {formatCurrency(alert.currentPrice, alert.currency)}
                      </span>
                      {priceChange !== null && (
                        <span className={`ml-2 text-sm font-medium ${isPriceDown ? 'text-emerald-600' : 'text-red-500'}`}>
                          {isPriceDown ? (
                            <span className="flex items-center gap-0.5">
                              <ArrowTrendingDownIcon className="w-4 h-4" />
                              {Math.abs(priceChange).toFixed(0)}%
                            </span>
                          ) : (
                            `+${priceChange.toFixed(0)}%`
                          )}
                        </span>
                      )}
                    </div>

                    {alert.lowestPrice < alert.currentPrice && (
                      <div className="text-xs text-gray-500">
                        {t('priceWatch.lowest', 'Lowest')}: {formatCurrency(alert.lowestPrice, alert.currency)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyPriceAlerts;
