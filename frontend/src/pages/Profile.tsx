import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  CreditCardIcon,
  ClockIcon,
  CheckCircleIcon,
  BuildingOfficeIcon,
  HeartIcon,
  HomeIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import { reservationsAPI, Reservation as APIReservation } from '../services/api';
import paymentsAPI, { Invoice } from '../services/paymentsAPI';
import { toast } from 'react-hot-toast';
import InvoiceDetailModal from '../components/InvoiceDetailModal';
import { CancellationModal } from '../components/CancellationModal';
import { useDirection } from '../hooks/useDirection';
import { getFavoritesWithData, toggleFavoriteWithData, FavoriteHotel } from '../components/ShareSaveActions';
import { LoyaltyCard } from '../components/LoyaltyCard';

interface Reservation {
  _id: string;
  hotelName: string;
  hotelId?: string; // RateHawk hotel ID (string format like 'hotel_name_123')
  hotelHid?: number; // RateHawk numeric hotel ID (hid)
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  totalPrice: number;
  currency: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: string;
  image?: string;
  isRefundable?: boolean; // Whether booking can be cancelled for refund
  freeCancellationBefore?: string; // Date/time before which cancellation is free
}

const NATIONALITIES = [
  'Saudi Arabia', 'United Arab Emirates', 'Kuwait', 'Qatar', 'Bahrain', 'Oman',
  'Egypt', 'Jordan', 'Lebanon', 'United States', 'United Kingdom', 'France', 'Germany'
];

const getCountryCode = (nationality: string) => {
  const codes: Record<string, string> = {
    'Saudi Arabia': 'sa', 'United Arab Emirates': 'ae', 'Kuwait': 'kw', 'Qatar': 'qa',
    'Bahrain': 'bh', 'Oman': 'om', 'Egypt': 'eg', 'Jordan': 'jo', 'Lebanon': 'lb',
    'United States': 'us', 'United Kingdom': 'gb', 'France': 'fr', 'Germany': 'de'
  };
  return codes[nationality] || 'us';
};

export const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { user, updateUser, logout } = useAuth();
  const { isRTL } = useDirection();

  // Get tab from URL params or default to 'overview'
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'overview');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [favorites, setFavorites] = useState<FavoriteHotel[]>(() => getFavoritesWithData());
  const [isEditing, setIsEditing] = useState(false);
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedReservationForCancel, setSelectedReservationForCancel] = useState<Reservation | null>(null);
  const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    nationality: user?.nationality || ''
  });

  // Check for tab parameter from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab');
    if (tabFromUrl && ['overview', 'reservations', 'favorites', 'settings'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, []);

  // Auto-populate form data when user data is available
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        nationality: user.nationality || ''
      });
    }
  }, [user]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const response = await reservationsAPI.getByUser();
      if (response.data?.reservations) {
        // Transform API reservations to local reservation interface
        const transformedReservations: Reservation[] = response.data.reservations.map((apiRes: APIReservation) => {
          const mappedStatus = (apiRes.status === 'confirmed' || apiRes.status === 'paid' || apiRes.status === 'completed') ? 'confirmed' :
                 (apiRes.status === 'cancelled') ? 'cancelled' :
                 'pending' as const;
          return {
            _id: apiRes._id,
            hotelName: apiRes.hotel.name,
            hotelId: apiRes.hotel.hotelId, // RateHawk hotel ID string
            hotelHid: apiRes.hotel.hid, // RateHawk numeric hotel ID
            checkIn: apiRes.checkInDate || '',
            checkOut: apiRes.checkOutDate || '',
            guests: apiRes.numberOfGuests,
            rooms: 1, // Default value as API doesn't have rooms
            totalPrice: 0, // API doesn't have total price
            currency: 'USD', // Default currency
            status: mappedStatus,
            createdAt: apiRes.createdAt,
            image: apiRes.hotel.image,
            isRefundable: apiRes.isRefundable, // Map refundable status from API
            freeCancellationBefore: apiRes.freeCancellationBefore // Map free cancellation deadline
          };
        });
        setReservations(transformedReservations);
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reservations' || activeTab === 'overview') {
      fetchReservations();
      fetchInvoices(); // Fetch invoices to link with reservations
    }
  }, [activeTab]);

  const fetchInvoices = async () => {
    try {
      setInvoiceLoading(true);
      const response = await paymentsAPI.getInvoices();
      setInvoices(response.data.data.invoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setInvoiceLoading(false);
    }
  };
  useEffect(() => {
    if (activeTab === 'favorites' || activeTab === 'overview') {
      setFavorites(getFavoritesWithData());
    }
  }, [activeTab]);

  const handleViewInvoice = async (invoiceId: string) => {
    try {
      const response = await paymentsAPI.getInvoice(invoiceId);
      setSelectedInvoice(response.data.data.invoice);
      setIsInvoiceModalOpen(true);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      toast.error('Failed to load invoice details');
    }
  };

  const handleDownloadReceipt = async (invoiceId: string) => {
    try {
      await paymentsAPI.downloadReceipt(invoiceId);
      toast.success('Receipt downloaded successfully');
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error('Failed to download receipt');
    }
  };

  const handleCloseInvoiceModal = () => {
    setIsInvoiceModalOpen(false);
    setSelectedInvoice(null);
  };

  const handlePayNow = async (invoiceId: string) => {
    try {
      setPaymentLoading(invoiceId);
      const response = await paymentsAPI.createSession(invoiceId);

      // Redirect to Stripe Checkout
      window.location.href = response.url;
    } catch (error) {
      console.error('Error creating payment session:', error);
      toast.error('Failed to create payment session');
    } finally {
      setPaymentLoading(null);
    }
  };
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Import the usersAPI
      const { usersAPI } = await import('../services/api');

      // Call API to update profile
      const response = await usersAPI.updateProfile(formData);

      // Update the user context with the updated data
      if (response.data?.user) {
        updateUser(response.data.user);
      }

      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleCancelReservation = (reservationId: string) => {
    const reservation = reservations.find(r => r._id === reservationId);
    if (reservation) {
      setSelectedReservationForCancel(reservation);
      setIsCancellationModalOpen(true);
    }
  };

  const handleCancellationSuccess = () => {
    if (selectedReservationForCancel) {
      setReservations(prev => prev.map(r =>
        r._id === selectedReservationForCancel._id ? { ...r, status: 'cancelled' as const } : r
      ));
    }
  };

  const handleRemoveFavorite = (hotel: FavoriteHotel) => {
    toggleFavoriteWithData(hotel.id, hotel.name, hotel.image);
    setFavorites(getFavoritesWithData());
  };

  const menuItems = [
    { id: 'overview', label: t('profile.overview', 'Overview'), icon: HomeIcon },
    { id: 'reservations', label: t('profile.reservations'), icon: BuildingOfficeIcon },
    { id: 'favorites', label: t('profile.favorites'), icon: HeartIcon },
    { id: 'settings', label: t('profile.settings', 'Settings'), icon: Cog6ToothIcon },
  ];

  // Helper to find invoice for a reservation
  const getInvoiceForReservation = (reservationId: string): Invoice | undefined => {
    return invoices.find(inv => inv.reservation?._id === reservationId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Check if a reservation can be cancelled (refundable + within free cancellation window)
  const canCancelReservation = (reservation: Reservation): boolean => {
    // Already cancelled - can't cancel again
    if (reservation.status === 'cancelled') return false;

    // Explicitly non-refundable - can't cancel
    if (reservation.isRefundable === false) return false;

    // If there's a free cancellation deadline, check if we're still within it
    if (reservation.freeCancellationBefore) {
      const deadline = new Date(reservation.freeCancellationBefore);
      const now = new Date();
      if (now >= deadline) {
        // Past the free cancellation deadline
        return false;
      }
      // Within the free cancellation window
      return true;
    }

    // If isRefundable is explicitly true (with no deadline), can cancel
    if (reservation.isRefundable === true) {
      return true;
    }

    // For older bookings where isRefundable is undefined and there's no deadline data,
    // we can't reliably determine cancellation eligibility from stored data.
    // Allow cancellation attempt - the backend will validate against RateHawk API
    return true;
  };

  // Get cancellation deadline info with urgency level
  const getCancellationDeadlineInfo = (reservation: Reservation): { text: string; urgency: 'safe' | 'warning' | 'urgent' | 'expired' | 'nonRefundable' | 'refundable' } | null => {
    // Already cancelled - no need to show cancellation info
    if (reservation.status === 'cancelled') {
      return null;
    }

    // Explicitly non-refundable
    if (reservation.isRefundable === false) {
      return { text: t('profile.nonRefundable', 'Non-refundable'), urgency: 'nonRefundable' };
    }

    // Explicitly refundable with no deadline set - show free cancellation
    if (reservation.isRefundable === true && !reservation.freeCancellationBefore) {
      return { text: t('profile.freeCancellation', 'Free Cancellation'), urgency: 'refundable' };
    }

    // If isRefundable is undefined (older bookings), don't show any badge
    // The Cancel button will still work, but we don't want to mislead users
    if (reservation.isRefundable === undefined && !reservation.freeCancellationBefore) {
      return null;
    }

    // If we get here, freeCancellationBefore must be set
    if (!reservation.freeCancellationBefore) {
      return null;
    }

    const deadline = new Date(reservation.freeCancellationBefore);
    const now = new Date();
    const timeDiff = deadline.getTime() - now.getTime();

    // Already expired
    if (timeDiff <= 0) {
      return { text: t('profile.cancellationExpired', 'Cancellation period ended'), urgency: 'expired' };
    }

    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    // Format the deadline date/time
    const formattedDate = deadline.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let text: string;
    let urgency: 'safe' | 'warning' | 'urgent';

    if (hours < 24) {
      // Less than 24 hours - urgent
      text = t('profile.cancelWithinHours', 'Free cancellation for {{hours}}h', { hours });
      urgency = 'urgent';
    } else if (days <= 3) {
      // 1-3 days - warning
      text = t('profile.cancelWithinDays', 'Free cancellation for {{days}}d {{hours}}h', { days, hours: remainingHours });
      urgency = 'warning';
    } else {
      // More than 3 days - safe
      text = t('profile.cancelUntil', 'Cancel free until {{date}}', { date: formattedDate });
      urgency = 'safe';
    }

    return { text, urgency };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col w-72 bg-white/80 backdrop-blur-xl border-gray-200/50 fixed top-0 bottom-0 z-30 pt-20 ${isRTL ? 'right-0 border-l' : 'left-0 border-r'}`}>
        {/* Profile Card */}
        <div className="p-6 border-b border-gray-100/50">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 mb-4 text-white">
              <UserIcon className="h-10 w-10" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">{user?.name || t('profile.title')}</h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-orange-500'}`} />
                <span className="font-medium">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className={`absolute w-1 h-8 bg-orange-500 rounded-full ${isRTL ? 'right-0' : 'left-0'}`}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-100/50">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 rounded-xl hover:bg-red-50 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            <span className="font-medium">{t('common.logout', 'Sign Out')}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header (Tab Bar) */}
      <div className="md:hidden bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-16 z-20 overflow-x-auto scrollbar-hide">
        <div className="flex p-2 min-w-max gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 min-w-[4.5rem] ${
                  isActive
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-gray-500'
                }`}
              >
                <Icon className={`h-6 w-6 ${isActive ? 'text-orange-600' : 'text-gray-400'}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className={`flex-1 min-h-screen transition-all duration-300 ${isRTL ? 'md:mr-72' : 'md:ml-72'}`}>
        <div className="max-w-5xl mx-auto p-4 md:p-8 pt-24 md:pt-32">

          {/* Header */}
          <header className="mb-8 hidden md:block">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('profile.welcome', 'Welcome back')}, {user?.name?.split(' ')[0]}!</h1>
            <p className="text-gray-500">{t('profile.manageAccount', 'Manage your account and view your trips')}</p>
          </header>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Total Trips */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className={`absolute top-0 ${isRTL ? 'left-0' : 'right-0'} p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
                      <BuildingOfficeIcon className="h-24 w-24 text-blue-500" />
                    </div>
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4 text-blue-600">
                      <CalendarIcon className="h-6 w-6" />
                    </div>
                    <p className="text-gray-500 font-medium text-sm">{t('profile.totalTrips', 'Total Trips')}</p>
                    <h3 className="text-3xl font-bold text-gray-900">{reservations.length}</h3>
                  </div>



                  {/* Favorites */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className={`absolute top-0 ${isRTL ? 'left-0' : 'right-0'} p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
                      <HeartIcon className="h-24 w-24 text-red-500" />
                    </div>
                    <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4 text-red-600">
                      <HeartIconSolid className="h-6 w-6" />
                    </div>
                    <p className="text-gray-500 font-medium text-sm">{t('profile.favorites')}</p>
                    <h3 className="text-3xl font-bold text-gray-900">{favorites.length}</h3>
                  </div>
                </div>

                {/* Loyalty Rewards Card */}
                <LoyaltyCard />

                {/* Recent Activity / Quick Actions */}
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-8 text-white relative overflow-hidden">
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold mb-2">{t('profile.planNextTrip', 'Plan your next trip')}</h3>
                    <p className="text-orange-50 mb-6 max-w-lg">{t('profile.exploreDestinations', 'Explore our curated list of top destinations for your next adventure.')}</p>
                    <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-orange-600 rounded-xl font-bold hover:bg-gray-50 transition-colors shadow-lg shadow-orange-900/10">
                      {t('common.explore', 'Explore Hotels')}
                      <ArrowRightOnRectangleIcon className="h-5 w-5 rotate-180" />
                    </Link>
                  </div>
                  {/* Decorative circles */}
                  <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
                  <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
                </div>
              </div>
            )}

            {/* Reservations Tab */}
            {activeTab === 'reservations' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">{t('profile.reservations')}</h2>
                {reservations.filter(r => r.status === 'confirmed' || r.status === 'cancelled').length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                    <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <BuildingOfficeIcon className="h-8 w-8 text-orange-500" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{t('profile.noReservations')}</h3>
                    <p className="text-gray-500 mb-6">{t('profile.startExploring')}</p>
                    <Link to="/" className="inline-flex items-center px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors">
                      {t('common.explore')}
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reservations.filter(r => r.status === 'confirmed' || r.status === 'cancelled').map((reservation) => (
                      <div key={reservation._id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                          <div className="flex gap-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center">
                              {reservation.image ? (
                                <img src={reservation.image} alt={reservation.hotelName} className="w-full h-full object-cover" />
                              ) : (
                                <BuildingOfficeIcon className="h-8 w-8 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">{reservation.hotelName}</h3>
                              <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                <span className="flex items-center gap-1">
                                  <CalendarIcon className="h-4 w-4" />
                                  {formatDate(reservation.checkIn)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <UserIcon className="h-4 w-4" />
                                  {reservation.guests} {t('common.guests')}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  reservation.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                  reservation.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {t(`reservations.status.${reservation.status}`)}
                                </span>
                                {/* Cancellation deadline indicator */}
                                {reservation.status !== 'cancelled' && (() => {
                                  const deadlineInfo = getCancellationDeadlineInfo(reservation);
                                  if (!deadlineInfo) return null;

                                  const urgencyStyles = {
                                    safe: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                    warning: 'bg-amber-50 text-amber-700 border-amber-200',
                                    urgent: 'bg-red-50 text-red-700 border-red-200 animate-pulse',
                                    expired: 'bg-gray-100 text-gray-500 border-gray-200',
                                    nonRefundable: 'bg-gray-100 text-gray-500 border-gray-200',
                                    refundable: 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  };

                                  const urgencyIcons = {
                                    safe: '✓',
                                    warning: '⏰',
                                    urgent: '⚡',
                                    expired: '✗',
                                    nonRefundable: '✗',
                                    refundable: '✓'
                                  };

                                  return (
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${urgencyStyles[deadlineInfo.urgency]}`}>
                                      <span>{urgencyIcons[deadlineInfo.urgency]}</span>
                                      {deadlineInfo.text}
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                             {canCancelReservation(reservation) && (
                              <button
                                onClick={() => handleCancelReservation(reservation._id)}
                                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                              >
                                {t('common.cancel')}
                              </button>
                            )}
                            {(() => {
                              const invoice = getInvoiceForReservation(reservation._id);
                              return invoice ? (
                                <button
                                  onClick={() => handleViewInvoice(invoice._id)}
                                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                                >
                                  {t('profile.viewInvoice')}
                                </button>
                              ) : (
                                <span className="px-4 py-2 bg-gray-200 text-gray-500 rounded-lg text-sm font-medium">
                                  {t('profile.noInvoice', 'No invoice')}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Favorites Tab */}
            {activeTab === 'favorites' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">{t('profile.favorites')}</h2>
                {favorites.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <HeartIcon className="h-8 w-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{t('profile.noFavorites')}</h3>
                    <p className="text-gray-500 mb-6">{t('profile.addFavorites')}</p>
                    <Link to="/hotels" className="inline-flex items-center px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors">
                      {t('common.explore')}
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favorites.map((hotel) => (
                      <motion.div
                        key={hotel.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all group"
                      >
                        <div className="relative h-48 bg-gray-200">
                          {hotel.image ? (
                            <img src={hotel.image} alt={hotel.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                              <BuildingOfficeIcon className="h-12 w-12" />
                            </div>
                          )}
                          <button
                            onClick={() => handleRemoveFavorite(hotel)}
                            className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full text-red-500 hover:bg-white transition-colors shadow-sm opacity-0 group-hover:opacity-100"
                          >
                            <HeartIconSolid className="h-5 w-5" />
                          </button>
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold text-gray-900 mb-1 truncate">{hotel.name}</h3>
                          <div className="flex items-center justify-between mt-4">
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{t('profile.savedHotel')}</span>
                            <Link to={`/hotels/details/${hotel.id}`} className="text-sm font-medium text-orange-600 hover:text-orange-700">
                              {t('profile.viewHotel')} &rarr;
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="max-w-2xl space-y-6">
                 <div className="flex items-center justify-between">
                   <h2 className="text-xl font-bold text-gray-900">{t('profile.personalInfo')}</h2>
                   <button
                     onClick={() => setIsEditing(!isEditing)}
                     className="text-orange-600 font-medium text-sm flex items-center gap-1 hover:text-orange-700"
                   >
                     <PencilIcon className="h-4 w-4" />
                     {isEditing ? t('common.cancel') : t('common.edit')}
                   </button>
                 </div>

                 <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                   <form onSubmit={handleUpdateProfile} className="space-y-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.name')}</label>
                       <div className="relative">
                         <UserIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                         <input
                           type="text"
                           disabled={!isEditing}
                           value={formData.name}
                           onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                           className="pl-10 block w-full rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
                         />
                       </div>
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email')}</label>
                       <div className="relative">
                         <EnvelopeIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                         <input
                           type="email"
                           disabled
                           value={formData.email}
                           className="pl-10 block w-full rounded-xl border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                         />
                       </div>
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.phone')}</label>
                       <div className="relative">
                         <PhoneIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                         <input
                           type="tel"
                           disabled={!isEditing}
                           value={formData.phone}
                           onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                           className="pl-10 block w-full rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
                         />
                       </div>
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.nationality')}</label>
                       <div className="relative">
                         <img
                           src={`https://flagcdn.com/w20/${getCountryCode(formData.nationality)}.png`}
                           alt={formData.nationality}
                           className="absolute left-3 top-3.5 w-5 h-auto opacity-70"
                           onError={(e) => { e.currentTarget.style.display = 'none'; }}
                         />
                         <select
                           disabled={!isEditing}
                           value={formData.nationality}
                           onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                           className="pl-10 block w-full rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500 disabled:bg-gray-50 disabled:text-gray-500 appearance-none bg-none"
                         >
                           <option value="">{t('profile.selectNationality')}</option>
                           {NATIONALITIES.map((nat) => (
                             <option key={nat} value={nat}>{nat}</option>
                           ))}
                         </select>
                       </div>
                     </div>

                     {isEditing && (
                       <div className="pt-2">
                         <button type="submit" className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all">
                           {t('common.saveChanges')}
                         </button>
                       </div>
                     )}
                   </form>
                 </div>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* Modals */}
      <InvoiceDetailModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        invoice={selectedInvoice}
        onDownloadReceipt={handleDownloadReceipt}
      />

      {selectedReservationForCancel && (
        <CancellationModal
          isOpen={isCancellationModalOpen}
          onClose={() => setIsCancellationModalOpen(false)}
          reservationId={selectedReservationForCancel._id}
          hotelName={selectedReservationForCancel.hotelName}
          checkInDate={selectedReservationForCancel.checkIn}
          checkOutDate={selectedReservationForCancel.checkOut}
          onCancelled={handleCancellationSuccess}
        />
      )}
    </div>
  );
};
