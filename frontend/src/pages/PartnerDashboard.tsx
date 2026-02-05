import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ArrowRightOnRectangleIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ChartBarIcon,
  QrCodeIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api';

interface PartnerStats {
  totalBookings: number;
  totalBookingValue: number;
  totalCommissionEarned: number;
  paidCommissions: number;
  pendingCommissions: number;
  currency: string;
}

interface PartnerPromoCode {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  referralUrl: string;
  isActive: boolean;
}

interface RecentBooking {
  id: string;
  bookingValue: number;
  customerDiscount: number;
  commission: number;
  isPaid: boolean;
  paidAt: string | null;
  createdAt: string;
  booking: {
    touristName: string;
    hotel: { name: string };
    totalPrice: number;
    status: string;
  } | null;
}

export const PartnerDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const history = useHistory();

  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [promoCode, setPromoCode] = useState<PartnerPromoCode | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check if user is a partner
    if (user && user.role !== 'partner') {
      history.push('/');
      return;
    }

    fetchPartnerData();
  }, [user, history]);

  const fetchPartnerData = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Fetch partner info and stats in parallel
      const [meResponse, statsResponse] = await Promise.all([
        api.get('/partners/me'),
        api.get('/partners/stats')
      ]);

      if (meResponse.data?.data?.promoCode) {
        setPromoCode(meResponse.data.data.promoCode);
      }

      if (statsResponse.data?.data) {
        setStats(statsResponse.data.data.stats);
        setRecentBookings(statsResponse.data.data.recentBookings || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load partner data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (promoCode?.referralUrl) {
      navigator.clipboard.writeText(promoCode.referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadQR = () => {
    const canvas = document.getElementById('partner-qr-code') as HTMLCanvasElement;
    if (canvas) {
      const svg = document.getElementById('partner-qr-code');
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          const a = document.createElement('a');
          a.download = `${promoCode?.code || 'partner'}-qrcode.png`;
          a.href = canvas.toDataURL('image/png');
          a.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      }
    }
  };

  const handleLogout = () => {
    logout();
    history.push('/partner/login');
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
          <span className="text-gray-600">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50/30">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <img src="/Group.svg" alt="Logo" className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Partner Dashboard</h1>
                <p className="text-sm text-gray-500">Welcome back, {user?.name}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700"
          >
            {error}
          </motion.div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Earnings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <CurrencyDollarIcon className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats?.totalCommissionEarned || 0, stats?.currency)}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Pending Commission */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <ClockIcon className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats?.pendingCommissions || 0, stats?.currency)}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Paid Commission */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <BanknotesIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Paid Out</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats?.paidCommissions || 0, stats?.currency)}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Total Referrals */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <UsersIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Referrals</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalBookings || 0}</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* QR Code Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <QrCodeIcon className="h-5 w-5 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Your QR Code</h2>
            </div>

            {promoCode ? (
              <div className="text-center">
                {/* QR Code */}
                <div className="inline-block p-4 bg-white rounded-2xl border-2 border-dashed border-gray-200 mb-4">
                  <QRCodeSVG
                    id="partner-qr-code"
                    value={promoCode.referralUrl}
                    size={180}
                    level="H"
                    includeMargin={true}
                    bgColor="#ffffff"
                    fgColor="#059669"
                  />
                </div>

                {/* Promo Code Badge */}
                <div className="mb-4">
                  <span className="inline-block px-4 py-2 bg-emerald-100 text-emerald-700 font-mono font-bold text-lg rounded-lg">
                    {promoCode.code}
                  </span>
                </div>

                {/* Discount Info */}
                <p className="text-sm text-gray-500 mb-4">
                  {promoCode.discountType === 'percentage'
                    ? `${promoCode.discountValue}% discount for customers`
                    : `${formatCurrency(promoCode.discountValue)} discount for customers`}
                </p>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="h-4 w-4 text-emerald-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <ClipboardDocumentIcon className="h-4 w-4" />
                        Copy Link
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownloadQR}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    Download
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <QrCodeIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No QR code available</p>
              </div>
            )}
          </motion.div>

          {/* Recent Referrals */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Recent Referrals</h2>
            </div>

            {recentBookings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Date</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Hotel</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">Booking Value</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">Commission</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map((booking) => (
                      <tr key={booking.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-3 px-2 text-sm text-gray-600">
                          {formatDate(booking.createdAt)}
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-900 font-medium">
                          {booking.booking?.hotel?.name || 'N/A'}
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-600 text-right">
                          {formatCurrency(booking.bookingValue, stats?.currency)}
                        </td>
                        <td className="py-3 px-2 text-sm text-emerald-600 font-medium text-right">
                          +{formatCurrency(booking.commission, stats?.currency)}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {booking.isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              <CheckIcon className="h-3 w-3" />
                              Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                              <ClockIcon className="h-3 w-3" />
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <UsersIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium mb-1">No referrals yet</p>
                <p className="text-sm">Share your QR code to start earning commissions!</p>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default PartnerDashboard;
