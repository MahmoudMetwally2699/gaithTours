import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Redirect, useHistory } from 'react-router-dom';
import adminAPI from '../services/adminAPI';
import toast from 'react-hot-toast';
import {
  ClientsTab,
  BookingsTab,
  PaymentsTab,
  WhatsAppTab
} from '../components/AdminDashboard';
import { ProfitMarginTab } from '../components/AdminDashboard/ProfitMarginTab';
import { AdminManagementTab } from '../components/AdminDashboard/AdminManagementTab';
import { AnalyticsTab } from '../components/AdminDashboard/AnalyticsTab';
import { PromoCodesTab } from '../components/AdminDashboard/PromoCodesTab';
import { PromotionalBannersTab } from '../components/AdminDashboard/PromotionalBannersTab';
import { LoyaltyTab } from '../components/AdminDashboard/LoyaltyTab';
import { PartnersTab } from '../components/AdminDashboard/PartnersTab';
import { BlogTab } from '../components/AdminDashboard/BlogTab';
import SupportChatTab from '../components/AdminDashboard/SupportChatTab';
import { HotelContactLookup } from '../components/admin/HotelContactLookup';
import { HotelArabicNamesTab } from '../components/AdminDashboard/HotelArabicNamesTab';
import { ClientFormData } from '../components/AdminDashboard/AddClientModal';
import { ClientDetailModal } from '../components/AdminDashboard/ClientDetailModal';
import {
  UserGroupIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  ChartBarIcon,
  CheckIcon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  ChatBubbleLeftRightIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  ShieldExclamationIcon,
  TagIcon,
  PhotoIcon,
  PhoneIcon,
  TrophyIcon,
  UsersIcon,
  NewspaperIcon
} from '@heroicons/react/24/outline';
import { WhatsAppNotificationListener } from '../components/WhatsApp/WhatsAppNotificationListener';
import NotificationBell from '../components/NotificationBell';

interface DashboardStats {
  totalClients: number;
  totalBookings: number;
  pendingBookings: number;
  failedBookings: number;
  totalInvoices: number;
  paidInvoices: number;
  totalRevenue: number;
  totalWhatsAppMessages: number;
  unreadWhatsAppMessages: number;
}

interface Client {
  _id: string;
  name: string;
  email: string;
  phone: string;
  nationality: string;
  createdAt: string;
}

interface Booking {
  _id: string;
  user: {
    name: string;
    email: string;
  };
  touristName: string;
  email: string;
  phone: string;
  nationality: string;  hotel: {
    name: string;
    address: string;
    city: string;
    country: string;
    rating?: number;
    image?: string;
    url?: string;
    price?: number;
    phone?: string;
    email?: string;
  };
  checkInDate?: string;
  checkOutDate?: string;
  expectedCheckInTime?: string;
  roomType?: string;
  stayType?: string;
  paymentMethod?: string;
  numberOfGuests?: number;
  guests?: Array<{
    fullName: string;
    phoneNumber: string;
  }>;
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileType: 'pdf' | 'image';
    publicId: string;
    size: number;
    uploadedAt: string;
  }>;
  notes?: string;
  status: string;
  createdAt: string;
}

interface Invoice {
  _id: string;
  invoiceId: string;
  booking: {
    _id: string;
    touristName: string;
    hotel: {
      name: string;
      address: string;
      city: string;
      country: string;
    };
    checkInDate?: string;
    checkOutDate?: string;
    roomType?: string;
    numberOfGuests?: number;
  };
  user: {
    name: string;
    email: string;
  };
  clientName: string;
  clientEmail: string;
  hotelName: string;
  amount: number;
  currency: string;
  taxAmount?: number;
  totalAmount?: number;
  dueDate?: string;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  notes?: string;
  status: string;
  issuedAt: string;
  paidAt?: string;
  createdAt: string;
}

interface Payment {
  _id: string;
  paymentId?: string;
  invoice: {
    _id: string;
    invoiceId: string;
    amount: number;
    booking: {
      _id: string;
      touristName: string;
      hotel: {
        name: string;
        address: string;
        city: string;
        country: string;
      };
    };
  };
  user: {
    name: string;
    email: string;
  };
  amount: number;
  currency: string;
  paymentMethod?: string;
  paymentGateway?: string;
  transactionId?: string;
  gatewayResponse?: any;
  fees?: number;
  netAmount?: number;
  status: string;
  failureReason?: string;
  processedAt?: string;
  confirmedAt?: string;
  createdAt: string;
}

export const AdminDashboard: React.FC = () => {
  const { t, i18n } = useTranslation(['common', 'admin']);
  const { user, logout } = useAuth();
  const history = useHistory();
  const isRTL = i18n.language === 'ar';
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Clients state
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [clientPage, setClientPage] = useState(1);
  const [clientsPerPage, setClientsPerPage] = useState(10);
  const [clientsPagination, setClientsPagination] = useState<{ currentPage: number; totalPages: number; totalClients: number; hasNext: boolean; hasPrev: boolean } | null>(null);
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  // Bookings state
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingStatus, setBookingStatus] = useState('');
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingsPerPage, setBookingsPerPage] = useState(10);
  const [bookingsPagination, setBookingsPagination] = useState<{ currentPage: number; totalPages: number; totalBookings: number; hasNext: boolean; hasPrev: boolean } | null>(null);

  // Invoices state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceStatus, setInvoiceStatus] = useState('');
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoicesPerPage, setInvoicesPerPage] = useState(10);
  const [invoicesPagination, setInvoicesPagination] = useState<{ currentPage: number; totalPages: number; totalInvoices: number; hasNext: boolean; hasPrev: boolean } | null>(null);

  // Payments state
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentsPerPage, setPaymentsPerPage] = useState(10);
  const [paymentsPagination, setPaymentsPagination] = useState<{ currentPage: number; totalPages: number; totalPayments: number; hasNext: boolean; hasPrev: boolean } | null>(null);  // Selected items for actions
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientDetailModal, setShowClientDetailModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showDenialModal, setShowDenialModal] = useState(false);
  const [showBookingDetailsModal, setShowBookingDetailsModal] = useState(false);
  const [showInvoiceDetailsModal, setShowInvoiceDetailsModal] = useState(false);
  const [showPaymentDetailsModal, setShowPaymentDetailsModal] = useState(false);
  const [denialReason, setDenialReason] = useState('');
  const [approvalAmount, setApprovalAmount] = useState('1000');  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getStats();
      setStats(response.data.data.stats);
    } catch (error) {
      toast.error(t('admin:dashboard.messages.fetchStatsFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getClients({
        page: clientPage,
        limit: clientsPerPage,
        search: clientSearch
      });
      setClients(response.data.data.clients);
      setClientsPagination(response.data.data.pagination);
    } catch (error) {
      toast.error(t('admin:dashboard.messages.fetchClientsFailed'));
    } finally {
      setLoading(false);
    }  }, [clientPage, clientsPerPage, clientSearch, t]);

  const handleCreateClient = async (clientData: ClientFormData) => {
    try {
      setIsCreatingClient(true);
      const response = await adminAPI.createClient(clientData);
      setClients(prev => [response.data.data.client, ...prev]);
      toast.success(t('admin:dashboard.messages.clientCreated'));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || t('admin:dashboard.messages.clientCreateFailed');
      toast.error(errorMessage);
      throw error; // Re-throw to let the modal handle it
    } finally {
      setIsCreatingClient(false);
    }
  };

  const [isDeletingClient, setIsDeletingClient] = useState(false);

  const handleDeleteClient = async (clientId: string) => {
    try {
      setIsDeletingClient(true);
      await adminAPI.deleteClient(clientId);
      setClients(prev => prev.filter(client => client._id !== clientId));
      toast.success(t('admin:dashboard.messages.clientDeleted'));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || t('admin:dashboard.messages.clientDeleteFailed');
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsDeletingClient(false);
    }
  };

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getBookings({
        page: bookingPage,
        limit: bookingsPerPage,
        status: bookingStatus
      });
      setBookings(response.data.data.bookings);
      setBookingsPagination(response.data.data.pagination);
    } catch (error) {
      toast.error(t('admin:dashboard.messages.fetchBookingsFailed'));
    } finally {
      setLoading(false);
    }
  }, [bookingPage, bookingsPerPage, bookingStatus, t]);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getInvoices({
        page: invoicePage,
        limit: invoicesPerPage,
        status: invoiceStatus
      });
      setInvoices(response.data.data.invoices);
      setInvoicesPagination(response.data.data.pagination);
    } catch (error) {
      toast.error(t('admin:dashboard.messages.fetchInvoicesFailed'));
    } finally {
      setLoading(false);
    }
  }, [invoicePage, invoicesPerPage, invoiceStatus, t]);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getPayments({
        page: paymentPage,
        limit: paymentsPerPage,
        status: paymentStatus
      });
      setPayments(response.data.data.payments);
      setPaymentsPagination(response.data.data.pagination);
    } catch (error) {
      toast.error(t('admin:dashboard.messages.fetchPaymentsFailed'));
    } finally {
      setLoading(false);
    }
  }, [paymentPage, paymentsPerPage, paymentStatus, t]);
  // Wrapper functions to handle type conversion for tab components
  const handleSetSelectedBooking = (booking: any) => {
    setSelectedBooking(booking);
  };

  const handleSetSelectedInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
  };

  const handleSetSelectedPayment = (payment: any) => {
    setSelectedPayment(payment);
  };

  const handleGetStatusBadge = (status: string, type: string) => {
    return getStatusBadge(status, type as 'booking' | 'invoice' | 'payment');
  };
  // Add useEffect after all functions are defined
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchStats();
    } else if (activeTab === 'clients') {
      fetchClients();
    } else if (activeTab === 'bookings') {
      fetchBookings();
      fetchClients(); // Also fetch clients when on bookings tab for the booking modal
    } else if (activeTab === 'invoices') {
      fetchInvoices();
    } else if (activeTab === 'payments') {
      fetchPayments();
    }
  }, [activeTab, fetchStats, fetchClients, fetchBookings, fetchInvoices, fetchPayments]);
  const handleApproveBooking = async () => {
    if (!selectedBooking) return;

    try {
      setLoading(true);
      await adminAPI.approveBooking(selectedBooking._id, {
        amount: parseFloat(approvalAmount)
      });
      toast.success(t('admin:dashboard.messages.bookingApproved'));
      setShowApprovalModal(false);
      setSelectedBooking(null);
      fetchBookings();
    } catch (error) {
      toast.error(t('admin:dashboard.messages.bookingApprovalFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDenyBooking = async () => {
    if (!selectedBooking || !denialReason) return;

    try {
      setLoading(true);
      await adminAPI.denyBooking(selectedBooking._id, {
        reason: denialReason
      });
      toast.success(t('admin:dashboard.messages.bookingDenied'));
      setShowDenialModal(false);
      setSelectedBooking(null);
      setDenialReason('');
      fetchBookings();
    } catch (error) {
      toast.error(t('admin:dashboard.messages.bookingDenialFailed'));
    } finally {
      setLoading(false);
    }
  };
  const getStatusBadge = (status: string, type: 'booking' | 'invoice' | 'payment') => {
    const statusClasses = {
      booking: {
        pending: 'bg-yellow-100 text-yellow-800',
        approved: 'bg-blue-100 text-blue-800',
        denied: 'bg-red-100 text-red-800',
        invoiced: 'bg-purple-100 text-purple-800',
        paid: 'bg-green-100 text-green-800',
        confirmed: 'bg-emerald-100 text-emerald-800',
        failed: 'bg-red-100 text-red-800'
      },
      invoice: {
        invoiced: 'bg-yellow-100 text-yellow-800',
        paid: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800'
      },
      payment: {
        pending: 'bg-yellow-100 text-yellow-800',
        completed: 'bg-green-100 text-green-800',
        failed: 'bg-red-100 text-red-800',
        processing: 'bg-blue-100 text-blue-800'
      }
    };

    const statusClass = statusClasses[type][status as keyof typeof statusClasses[typeof type]] || 'bg-gray-100 text-gray-800';

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
        {t(`admin:dashboard.status.${status}`, status.charAt(0).toUpperCase() + status.slice(1))}
      </span>
    );
  };
  const handleLogout = async () => {
    try {
      await logout();
      history.push('/');
    } catch (error) {
      toast.error(t('admin:dashboard.messages.logoutFailed'));
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    document.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  // Check if user has admin role
  const isAdmin = user && ['admin', 'super_admin', 'sub_admin'].includes(user.role);
  const isSuperAdmin = user && ['admin', 'super_admin'].includes(user.role);

  if (!isAdmin) {
    return <Redirect to="/" />;
  }

  // All available tabs with their required permissions
  const allTabs = [
    { id: 'dashboard', name: t('admin:dashboard.tabs.dashboard'), icon: ChartBarIcon },
    { id: 'clients', name: t('admin:dashboard.tabs.clients'), icon: UserGroupIcon },
    { id: 'bookings', name: t('admin:dashboard.tabs.bookings'), icon: ClipboardDocumentListIcon },
    { id: 'payments', name: t('admin:dashboard.tabs.payments'), icon: CreditCardIcon },
    { id: 'hotel_lookup', name: t('admin:dashboard.tabs.hotel_lookup'), icon: PhoneIcon },
    { id: 'hotel_arabic_names', name: t('admin:dashboard.tabs.hotel_arabic_names'), icon: GlobeAltIcon },
    { id: 'analytics', name: t('admin:dashboard.tabs.analytics'), icon: ChartBarIcon },
    { id: 'margins', name: t('admin:dashboard.tabs.margins'), icon: CurrencyDollarIcon },
    { id: 'promo_codes', name: t('admin:dashboard.tabs.promo_codes'), icon: TagIcon },
    { id: 'promotional_banners', name: t('admin:dashboard.tabs.promotional_banners'), icon: PhotoIcon },
    { id: 'loyalty', name: t('admin:dashboard.tabs.loyalty'), icon: TrophyIcon },
    { id: 'partners', name: t('admin:dashboard.tabs.partners', 'Partners'), icon: UsersIcon },
    { id: 'blog', name: t('admin:dashboard.tabs.blog', 'Blog'), icon: NewspaperIcon },
    { id: 'whatsapp', name: t('admin:dashboard.tabs.whatsapp'), icon: ChatBubbleLeftRightIcon },
    { id: 'support_chat', name: t('admin:dashboard.tabs.support_chat', 'Support Chat'), icon: ChatBubbleLeftRightIcon },
    { id: 'admin_management', name: t('admin:dashboard.tabs.admin_management'), icon: ShieldExclamationIcon, superAdminOnly: true }
  ];

  // Filter tabs based on user role and permissions
  const tabs = allTabs.filter(tab => {
    // Admin Management tab is only for super admins
    if ((tab as any).superAdminOnly) {
      return isSuperAdmin;
    }
    // Super admins and legacy admins see all tabs
    if (isSuperAdmin) {
      return true;
    }
    // Sub-admins only see tabs they have permission for
    if (user?.role === 'sub_admin' && user?.adminPermissions) {
      return user.adminPermissions.includes(tab.id);
    }
    return false;
  });

  return (
    <div className={`min-h-screen bg-gradient-to-br from-white via-orange-50 to-amber-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      <WhatsAppNotificationListener />
      <div className="flex">        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`lg:hidden fixed top-4 ${isRTL ? 'right-4' : 'left-4'} z-50 p-3 bg-white/80 backdrop-blur-xl border border-white/20 rounded-xl shadow-lg`}
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}        {/* Modern Sidebar */}
        <div className={`bg-white/80 backdrop-blur-xl border-r border-white/20 shadow-2xl h-screen fixed ${isRTL ? 'right-0' : 'left-0'} w-64 z-40 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : `${isRTL ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'}`
        }`}>
          {/* Header with Mobile Close */}
          <div className="p-4 sm:p-6 border-b border-gray-200/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
                  <ChartBarIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                    {t('admin:dashboard.header.title')}
                  </h1>
                  <p className="text-xs text-gray-500">{t('admin:dashboard.header.adminPanel')}</p>
                </div>
              </div>
              {/* Mobile Close Button */}
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Language Switcher */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200/50">
            <button
              onClick={toggleLanguage}
              className={`w-full flex items-center px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium text-gray-600 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 hover:text-orange-700 transition-all duration-300 rounded-xl group ${isRTL ? 'text-right' : 'text-left'}`}
            >
              <div className="w-8 h-8 bg-gradient-to-r from-gray-100 to-gray-200 group-hover:from-orange-100 group-hover:to-amber-100 rounded-lg flex items-center justify-center transition-all duration-300">
                <GlobeAltIcon className="w-4 h-4" />
              </div>
              <span className={`${isRTL ? 'mr-3' : 'ml-3'} font-medium`}>
                {i18n.language === 'en' ? 'العربية' : 'English'}
              </span>
            </button>
          </div>

          {/* Navigation - Scrollable */}
          <nav className="mt-4 sm:mt-6 flex-1 px-2 sm:px-3 overflow-y-auto">
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              // Define gradient colors for each tab - all using orange theme
              const gradients = [
                'from-orange-500 to-amber-500',
                'from-orange-500 to-amber-500',
                'from-orange-500 to-amber-500',
                'from-orange-500 to-amber-500',
                'from-emerald-500 to-teal-500',
                'from-orange-500 to-amber-500'
              ];

              const hoverGradients = [
                'hover:from-orange-50 hover:to-amber-50',
                'hover:from-orange-50 hover:to-amber-50',
                'hover:from-orange-50 hover:to-amber-50',
                'hover:from-orange-50 hover:to-amber-50',
                'hover:from-emerald-50 hover:to-teal-50',
                'hover:from-orange-50 hover:to-amber-50'
              ];

              const textColors = [
                'text-orange-600',
                'text-orange-600',
                'text-orange-600',
                'text-orange-600',
                'text-emerald-600',
                'text-orange-600'
              ];

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center px-3 sm:px-4 py-2.5 sm:py-3 mb-1.5 sm:mb-2 text-sm font-medium transition-all duration-300 rounded-xl group ${
                    isActive
                      ? `bg-gradient-to-r ${gradients[index % gradients.length]} text-white shadow-lg`
                      : `text-gray-600 hover:bg-gradient-to-r ${hoverGradients[index % hoverGradients.length]} ${textColors[index % textColors.length]} hover:shadow-md`
                  } ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? 'bg-white/20'
                      : `bg-gray-100 group-hover:bg-white group-hover:shadow-sm`
                  }`}>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : ''}`} />
                  </div>
                  <span className={`${isRTL ? 'mr-2 sm:mr-3' : 'ml-2 sm:ml-3'} font-medium text-xs sm:text-sm truncate`}>
                    {tab.name}
                  </span>
                  {isActive && (
                    <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Notification Bell & Logout Section */}
          <div className="border-t border-gray-200/50 p-3 sm:p-4 space-y-2">

            {/* Notification Bell embedded in sidebar */}
            <div className={`w-full flex items-center px-3 sm:px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-xl ${isRTL ? 'flex-row-reverse' : ''}`}>
               <span className="flex-1 text-sm font-medium text-gray-600">
                  {t('notifications.title', 'Notifications')}
               </span>
               <div className="relative">
                  <NotificationBell position="top" isSidebar={true} />
               </div>
            </div>
            <button
              onClick={handleLogout}
              className={`w-full flex items-center px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 hover:text-red-700 transition-all duration-300 rounded-xl group ${isRTL ? 'text-right' : 'text-left'}`}
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-red-100 group-hover:bg-red-200 rounded-lg flex items-center justify-center transition-all duration-300">
                <ArrowRightOnRectangleIcon className="w-4 h-4 text-red-600" />
              </div>
              <span className={`${isRTL ? 'mr-2 sm:mr-3' : 'ml-2 sm:ml-3'} font-medium`}>
                {t('admin:dashboard.actions.logout')}
              </span>
            </button>
          </div>
        </div>        {/* Main Content */}
        <div className={`flex-1 ${isRTL ? 'lg:mr-64' : 'lg:ml-64'} ${
          activeTab === 'whatsapp'
            ? 'h-screen overflow-hidden pt-16 lg:pt-0'
            : 'p-4 lg:p-8 bg-gradient-to-br from-white via-orange-50 to-amber-50 min-h-screen pt-20 lg:pt-8'
        }`}>          {/* Dashboard Stats */}
          {activeTab === 'dashboard' && (            <div className="space-y-6">
              {/* Modern Header */}
              <div
                className="text-center py-8"
              >
                <h1
                  className="text-5xl md:text-6xl font-black mb-4"
                >                  <span className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 bg-clip-text text-transparent">
                    {t('admin:dashboard.header.title').split(' ')[0]}
                  </span>
                  <span className="text-gray-800 ml-3">{t('admin:dashboard.header.title').split(' ')[1]}</span>
                </h1>
                <p
                  className="text-xl text-gray-600 max-w-2xl mx-auto"
                >
                  {t('admin:dashboard.header.subtitle')}
                </p>
                <div
                  className="mt-6"
                >
                  <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-3 rounded-full border border-orange-200">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-gray-700 font-medium">{t('admin:dashboard.header.systemOnline')}</span>
                  </div>
                </div>
              </div>              {/* Modern Stats Grid */}
              {stats && (                <div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {/* Total Clients - Minimalist Card */}
                  <div
                    className="group cursor-pointer"
                  >
                    <div className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-orange-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-orange-50 rounded-2xl group-hover:bg-orange-100 transition-colors duration-300">
                          <UserGroupIcon className="w-6 h-6 text-orange-600" />
                        </div>                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">{stats.totalClients}</div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">{t('admin:dashboard.stats.clients')}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{t('admin:dashboard.stats.totalRegistered')}</span>
                        <div className="flex items-center text-green-600 text-sm">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                          {t('admin:dashboard.stats.active')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Failed Bookings - Error Style */}
                  <div
                    className="group cursor-pointer"
                  >
                    <div className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-red-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-red-50 rounded-2xl group-hover:bg-red-100 transition-colors duration-300">
                          <ClipboardDocumentListIcon className="w-6 h-6 text-red-600" />
                        </div>                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">{stats.failedBookings || 0}</div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">{t('admin:dashboard.stats.failed')}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{t('admin:dashboard.stats.failedBookings')}</span>
                        <div className="flex items-center text-red-600 text-sm">
                          <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                          {t('admin:dashboard.stats.error')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Revenue - Featured Card */}
                  <div
                    className="group cursor-pointer"
                  >
                    <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 text-white">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-white/20 rounded-2xl group-hover:bg-white/30 transition-colors duration-300">
                          <CreditCardIcon className="w-6 h-6 text-white" />
                        </div>                        <div className="text-right">
                          <div className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()}</div>
                          <div className="text-xs text-emerald-100 uppercase tracking-wide">{t('admin:dashboard.stats.revenue')}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-emerald-100">{t('admin:dashboard.stats.totalEarnings')}</span>
                        <div className="flex items-center text-white text-sm">
                          <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                          {t('admin:dashboard.stats.live')}
                        </div>
                      </div>
                    </div>                  </div>

                  {/* Total WhatsApp Messages */}
                  <div
                    className="group cursor-pointer"
                  >
                    <div className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-orange-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-orange-50 rounded-2xl group-hover:bg-orange-100 transition-colors duration-300">
                          <ChatBubbleLeftRightIcon className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">{stats.totalWhatsAppMessages}</div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">{t('admin:dashboard.stats.whatsappMessages')}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{t('admin:dashboard.stats.totalMessages')}</span>
                        <div className="flex items-center text-orange-600 text-sm">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                          {t('admin:dashboard.stats.allTime')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Unread WhatsApp Messages */}
                  <div
                    className="group cursor-pointer"
                  >
                    <div className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-orange-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-orange-50 rounded-2xl group-hover:bg-orange-100 transition-colors duration-300">
                          <ChatBubbleLeftRightIcon className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">{stats.unreadWhatsAppMessages}</div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">{t('admin:dashboard.stats.unreadMessages')}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{t('admin:dashboard.stats.needsAttention')}</span>
                        <div className="flex items-center text-orange-600 text-sm">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></div>
                          {t('admin:dashboard.stats.unread')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}{/* Modern Quick Actions */}              <div
                className="mt-12"
              >                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('admin:dashboard.quickActions.title')}</h2>
                  <p className="text-gray-600">{t('admin:dashboard.quickActions.subtitle')}</p>
                </div>

                <div
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >                  <button
                    onClick={() => {
                      setActiveTab('bookings');
                      setIsMobileMenuOpen(false);
                    }}
                    className="group relative bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-orange-200 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative z-10">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-200 transition-colors duration-300">
                        <ClipboardDocumentListIcon className="w-6 h-6 text-orange-600" />
                      </div>                      <h3 className="font-semibold text-gray-900 mb-2">{t('admin:dashboard.quickActions.manageBookings.title')}</h3>
                      <p className="text-sm text-gray-600">{t('admin:dashboard.quickActions.manageBookings.description')}</p>
                      <div className="mt-4 text-xs text-orange-600 font-medium">{t('admin:dashboard.quickActions.manageBookings.action')}</div>
                    </div>
                  </button>                  <button
                    onClick={() => {
                      setActiveTab('clients');
                      setIsMobileMenuOpen(false);
                    }}
                    className="group relative bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-orange-200 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative z-10">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-200 transition-colors duration-300">
                        <UserGroupIcon className="w-6 h-6 text-orange-600" />
                      </div>                      <h3 className="font-semibold text-gray-900 mb-2">{t('admin:dashboard.quickActions.clientDatabase.title')}</h3>
                      <p className="text-sm text-gray-600">{t('admin:dashboard.quickActions.clientDatabase.description')}</p>
                      <div className="mt-4 text-xs text-orange-600 font-medium">{t('admin:dashboard.quickActions.clientDatabase.action')}</div>
                    </div>
                  </button>                  <button
                    onClick={() => {
                      setActiveTab('payments');
                      setIsMobileMenuOpen(false);
                    }}
                    className="group relative bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-orange-200 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative z-10">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-200 transition-colors duration-300">
                        <CreditCardIcon className="w-6 h-6 text-orange-600" />
                      </div>                      <h3 className="font-semibold text-gray-900 mb-2">{t('admin:dashboard.quickActions.paymentTracking.title')}</h3>
                      <p className="text-sm text-gray-600">{t('admin:dashboard.quickActions.paymentTracking.description')}</p>
                      <div className="mt-4 text-xs text-orange-600 font-medium">{t('admin:dashboard.quickActions.paymentTracking.action')}</div>
                    </div>
                  </button>
                </div>

                {/* Additional Summary Info */}
                <div
                  className="mt-8 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-6"
                >                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('admin:dashboard.systemStatus.title')}</h3>
                      <p className="text-gray-600">{t('admin:dashboard.systemStatus.subtitle')}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">{t('admin:dashboard.systemStatus.database')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">{t('admin:dashboard.systemStatus.api')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">{t('admin:dashboard.systemStatus.payments')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}{/* Clients Tab */}          {activeTab === 'clients' && (
            <ClientsTab
              clients={clients}
              clientSearch={clientSearch}
              setClientSearch={(search) => { setClientSearch(search); setClientPage(1); }}
              isRTL={isRTL}
              onCreateClient={handleCreateClient}
              isCreatingClient={isCreatingClient}
              pagination={clientsPagination || undefined}
              onPageChange={setClientPage}
              itemsPerPage={clientsPerPage}
              onItemsPerPageChange={(items) => { setClientsPerPage(items); setClientPage(1); }}
              onViewClient={(client) => { setSelectedClient(client); setShowClientDetailModal(true); }}
              onEditClient={(client) => { setSelectedClient(client); setShowClientDetailModal(true); }}
              onDeleteClient={handleDeleteClient}
              isDeletingClient={isDeletingClient}
            />
          )}{/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <BookingsTab
              bookings={bookings}
              bookingStatus={bookingStatus}
              setBookingStatus={(status) => { setBookingStatus(status); setBookingPage(1); }}
              isRTL={isRTL}
              setSelectedBooking={handleSetSelectedBooking}
              setShowBookingDetailsModal={setShowBookingDetailsModal}
              setShowApprovalModal={setShowApprovalModal}
              setShowDenialModal={setShowDenialModal}
              getStatusBadge={handleGetStatusBadge}
              clients={clients}
              onRefreshBookings={fetchBookings}
              isCreatingBooking={loading}
              pagination={bookingsPagination || undefined}
              onPageChange={setBookingPage}
              itemsPerPage={bookingsPerPage}
              onItemsPerPageChange={(items) => { setBookingsPerPage(items); setBookingPage(1); }}
            />
          )}{/* Payments Tab */}
          {activeTab === 'payments' && (
            <PaymentsTab
              payments={payments}
              paymentStatus={paymentStatus}
              setPaymentStatus={(status) => { setPaymentStatus(status); setPaymentPage(1); }}
              isRTL={isRTL}
              setSelectedPayment={handleSetSelectedPayment}
              setShowPaymentDetailsModal={setShowPaymentDetailsModal}
              getStatusBadge={handleGetStatusBadge}
              pagination={paymentsPagination || undefined}
              onPageChange={setPaymentPage}
              itemsPerPage={paymentsPerPage}
              onItemsPerPageChange={(items) => { setPaymentsPerPage(items); setPaymentPage(1); }}
            />
          )}{/* Profit Margins Tab */}
          {activeTab === 'margins' && (
            <ProfitMarginTab isRTL={isRTL} />
          )}{/* Hotel Lookup Tab */}
          {activeTab === 'hotel_lookup' && (
            <HotelContactLookup />
          )}{/* Hotel Arabic Names Tab */}
          {activeTab === 'hotel_arabic_names' && (
            <HotelArabicNamesTab />
          )}{/* Promo Codes Tab */}
          {activeTab === 'promo_codes' && (
            <PromoCodesTab />
          )}{/* Promotional Banners Tab */}
          {activeTab === 'promotional_banners' && (
            <PromotionalBannersTab />
          )}{/* WhatsApp Messages Tab */}
          {activeTab === 'whatsapp' && (
            <WhatsAppTab />
          )}{/* Support Chat Tab */}
          {activeTab === 'support_chat' && (
            <SupportChatTab />
          )}{/* Admin Management Tab - Super Admin Only */}
          {activeTab === 'admin_management' && isSuperAdmin && (
            <AdminManagementTab isRTL={isRTL} />
          )}{/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <AnalyticsTab />
          )}{/* Loyalty Program Tab */}
          {activeTab === 'loyalty' && (
            <LoyaltyTab />
          )}{/* Partners Tab */}
          {activeTab === 'partners' && (
            <PartnersTab />
          )}
          {/* Blog Tab */}
          {activeTab === 'blog' && (
            <BlogTab />
          )}
        </div>
      </div>      {/* Approval Modal */}
      {showApprovalModal && selectedBooking && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
          <div className="relative top-4 lg:top-20 mx-auto p-5 border w-full max-w-md lg:max-w-lg shadow-lg rounded-md bg-white">
            <div className="mt-3">              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('admin:dashboard.bookings.approvalModal.title')}</h3>
              <p className="text-sm text-gray-600 mb-4">
                {t('admin:dashboard.bookings.approvalModal.description', {
                  touristName: selectedBooking.touristName,
                  hotelName: selectedBooking.hotel.name
                })}
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin:dashboard.bookings.approvalModal.amount')}
                </label>
                <input
                  type="number"
                  value={approvalAmount}
                  onChange={(e) => setApprovalAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={t('admin:dashboard.bookings.approvalModal.amount')}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  {t('admin:dashboard.bookings.approvalModal.cancel')}
                </button>
                <button
                  onClick={handleApproveBooking}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? t('admin:dashboard.bookings.approvalModal.approving') : t('admin:dashboard.bookings.approvalModal.approve')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}      {/* Denial Modal */}
      {showDenialModal && selectedBooking && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
          <div className="relative top-4 lg:top-20 mx-auto p-5 border w-full max-w-md lg:max-w-lg shadow-lg rounded-md bg-white">
            <div className="mt-3">              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('admin:dashboard.bookings.denialModal.title')}</h3>
              <p className="text-sm text-gray-600 mb-4">
                {t('admin:dashboard.bookings.denialModal.description', {
                  touristName: selectedBooking.touristName,
                  hotelName: selectedBooking.hotel.name
                })}
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin:dashboard.bookings.denialModal.reason')}
                </label>
                <textarea
                  value={denialReason}
                  onChange={(e) => setDenialReason(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={t('admin:dashboard.bookings.denialModal.reasonPlaceholder')}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDenialModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  {t('admin:dashboard.bookings.denialModal.cancel')}
                </button>
                <button
                  onClick={handleDenyBooking}
                  disabled={loading || !denialReason}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? t('admin:dashboard.bookings.denialModal.denying') : t('admin:dashboard.bookings.denialModal.deny')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client Details Modal */}
      <ClientDetailModal
        isOpen={showClientDetailModal}
        onClose={() => { setShowClientDetailModal(false); setSelectedClient(null); }}
        client={selectedClient}
        onUpdate={(updatedClient) => {
          setClients(prev => prev.map(c => c._id === updatedClient._id ? updatedClient : c));
        }}
        isRTL={isRTL}
      />

      {/* Booking Details Modal */}
      {showBookingDetailsModal && selectedBooking && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-2 lg:p-4">
          <div className="relative top-2 lg:top-10 mx-auto p-0 border w-full max-w-6xl shadow-lg rounded-md bg-white">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-md">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">{t('admin:dashboard.bookings.details.title')}</h3>
                <button
                  onClick={() => setShowBookingDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
              {/* Hotel Information */}
              <div className="mb-6">
                <div className="flex items-start space-x-4">
                  {selectedBooking.hotel.image && (
                    <img
                      src={selectedBooking.hotel.image}
                      alt={selectedBooking.hotel.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900">{selectedBooking.hotel.name}</h4>
                    <p className="text-gray-600">{selectedBooking.hotel.address}</p>
                    <p className="text-gray-600">{selectedBooking.hotel.city}, {selectedBooking.hotel.country}</p>                    {selectedBooking.hotel.rating && (
                      <div className="flex items-center mt-2">
                        <span className="text-yellow-400">★</span>
                        <span className="ml-1 text-sm">{selectedBooking.hotel.rating}</span>
                      </div>
                    )}
                    {selectedBooking.hotel.url && (
                      <div className="mt-2">
                        <a
                          href={selectedBooking.hotel.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm underline"
                        >
                          {t('admin:dashboard.bookings.details.visitWebsite')}
                        </a>
                      </div>
                    )}
                    {selectedBooking.hotel.price && (
                      <div className="mt-2">
                        <span className="text-green-600 font-medium text-sm">
                          {t('admin:dashboard.bookings.details.expectedPrice')} {selectedBooking.hotel.price} $
                        </span>
                      </div>
                    )}
                    {/* Hotel Contact Info */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center mb-2">
                        <span className="text-gray-600 text-sm w-20">{t('admin:dashboard.bookings.details.phone')}</span>
                        {selectedBooking.hotel.phone ? (
                          <a
                            href={`tel:${selectedBooking.hotel.phone}`}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            {selectedBooking.hotel.phone}
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm italic">{t('admin:dashboard.bookings.details.notAvailable')}</span>
                        )}
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-600 text-sm w-20">{t('admin:dashboard.bookings.details.email')}</span>
                        {selectedBooking.hotel.email ? (
                          <a
                            href={`mailto:${selectedBooking.hotel.email}`}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            {selectedBooking.hotel.email}
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm italic">{t('admin:dashboard.bookings.details.notAvailable')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking Information */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Travel Details */}
                <div className="space-y-4">
                  <h5 className="font-semibold text-gray-800 border-b pb-2">{t('admin:dashboard.bookings.details.travelDetails')}</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('admin:dashboard.bookings.details.bookingId')}</span>
                      <span className="font-medium font-mono text-sm">{selectedBooking._id}</span>
                    </div>
                    {selectedBooking.checkInDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('admin:dashboard.bookings.details.checkIn')}</span>
                        <span className="font-medium">{new Date(selectedBooking.checkInDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedBooking.checkOutDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('admin:dashboard.bookings.details.checkOut')}</span>
                        <span className="font-medium">{new Date(selectedBooking.checkOutDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('admin:dashboard.bookings.details.guests')}</span>
                      <span className="font-medium">{selectedBooking.numberOfGuests || 1}</span>
                    </div>
                    {selectedBooking.expectedCheckInTime && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('admin:dashboard.bookings.details.expectedCheckInTime')}</span>
                        <span className="font-medium">{selectedBooking.expectedCheckInTime}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Room & Stay Details */}
                <div className="space-y-4">
                  <h5 className="font-semibold text-gray-800 border-b pb-2">{t('admin:dashboard.bookings.details.roomStayDetails')}</h5>
                  <div className="space-y-3">
                    {selectedBooking.roomType && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('admin:dashboard.bookings.details.roomType')}</span>
                        <span className="font-medium capitalize">{selectedBooking.roomType.replace('_', ' ')}</span>
                      </div>
                    )}
                    {selectedBooking.stayType && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('admin:dashboard.bookings.details.stayType')}</span>
                        <span className="font-medium capitalize">{selectedBooking.stayType.replace('_', ' ')}</span>
                      </div>
                    )}
                    {selectedBooking.paymentMethod && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('admin:dashboard.bookings.details.paymentMethod')}</span>
                        <span className="font-medium">{selectedBooking.paymentMethod}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('admin:dashboard.bookings.details.status')}</span>
                      <span className="font-medium">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedBooking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          selectedBooking.status === 'approved' ? 'bg-green-100 text-green-800' :
                          selectedBooking.status === 'denied' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedBooking.status}
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('admin:dashboard.bookings.details.submissionDate')}</span>
                      <span className="font-medium">{new Date(selectedBooking.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="mb-6">
                <h5 className="font-semibold text-gray-800 border-b pb-2 mb-4">{t('admin:dashboard.bookings.details.personalInfo')}</h5>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('admin:dashboard.bookings.details.fullName')}</span>
                    <span className="font-medium">{selectedBooking.touristName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{selectedBooking.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{selectedBooking.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nationality:</span>
                    <span className="font-medium">{selectedBooking.nationality}</span>
                  </div>
                </div>
              </div>

              {/* Additional Guests */}
              {selectedBooking.guests && selectedBooking.guests.length > 0 && (
                <div className="mb-6">
                  <h5 className="font-semibold text-gray-800 border-b pb-2 mb-4">{t('admin:dashboard.bookings.details.additionalGuests')}</h5>
                  <div className="space-y-2">
                    {selectedBooking.guests.map((guest, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-md">
                        <div className="flex justify-between">
                          <span className="text-gray-600">{t('admin:dashboard.bookings.details.guestName')}</span>
                          <span className="font-medium">{guest.fullName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">{t('admin:dashboard.bookings.details.phone')}</span>
                          <span className="font-medium">{guest.phoneNumber}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {selectedBooking.attachments && selectedBooking.attachments.length > 0 && (
                <div className="mb-6">
                  <h5 className="font-semibold text-gray-800 border-b pb-2 mb-4">{t('admin:dashboard.bookings.details.attachments')} ({selectedBooking.attachments.length})</h5>
                  <div className="space-y-2">
                    {selectedBooking.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center space-x-3">
                          {attachment.fileType === 'pdf' ? (
                            <div className="text-red-500 font-medium text-sm">PDF</div>
                          ) : (
                            <div className="text-blue-500 font-medium text-sm">IMG</div>
                          )}                          <div>
                            <p className="text-sm font-medium text-gray-900 truncate pr-2">{attachment.fileName}</p>
                            <p className="text-xs text-gray-500 truncate pr-2">
                              {attachment.fileType.toUpperCase()} • {(attachment.size / 1024 / 1024).toFixed(2)} MB •
                              {t('admin:dashboard.bookings.details.uploaded')} {new Date(attachment.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => window.open(attachment.fileUrl, '_blank')}
                          className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                        >
                          {t('admin:dashboard.bookings.details.view')}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Special Requests */}
              {selectedBooking.notes && (
                <div className="mb-6">
                  <h5 className="font-semibold text-gray-800 border-b pb-2 mb-4">{t('admin:dashboard.bookings.details.specialRequests')}</h5>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-gray-700">{selectedBooking.notes}</p>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              {selectedBooking.status === 'pending' && (
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowBookingDetailsModal(false);
                      setShowApprovalModal(true);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    {t('admin:dashboard.bookings.details.approve')}
                  </button>
                  <button
                    onClick={() => {
                      setShowBookingDetailsModal(false);
                      setShowDenialModal(true);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    {t('admin:dashboard.bookings.details.deny')}
                  </button>
                </div>
              )}
            </div>          </div>
        </div>
      )}

      {/* Invoice Details Modal */}
      {showInvoiceDetailsModal && selectedInvoice && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-0 border max-w-4xl shadow-lg rounded-md bg-white">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-md">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">Invoice Details</h3>
                <button
                  onClick={() => setShowInvoiceDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
              {/* Invoice Header */}
              <div className="mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-2xl font-bold text-gray-900">
                      Invoice #{selectedInvoice.invoiceId}
                    </h4>
                    <p className="text-gray-600 mt-1">
                      Status: <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedInvoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                        selectedInvoice.status === 'invoiced' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Issue Date</p>
                    <p className="font-medium">{new Date(selectedInvoice.issuedAt || selectedInvoice.createdAt).toLocaleDateString()}</p>
                    {selectedInvoice.dueDate && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">Due Date</p>
                        <p className="font-medium">{new Date(selectedInvoice.dueDate).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Client & Hotel Information */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <h5 className="font-semibold text-gray-800 border-b pb-2">Bill To</h5>
                  <div className="space-y-2">
                    <p className="font-medium text-gray-900">{selectedInvoice.clientName}</p>
                    <p className="text-gray-600">{selectedInvoice.clientEmail}</p>
                    <p className="text-sm text-gray-500">Client ID: {selectedInvoice.user.name}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="font-semibold text-gray-800 border-b pb-2">Service Details</h5>
                  <div className="space-y-2">
                    <p className="font-medium text-gray-900">{selectedInvoice.hotelName}</p>
                    {selectedInvoice.booking && (
                      <>
                        <p className="text-gray-600">{selectedInvoice.booking.hotel.address}</p>
                        <p className="text-gray-600">{selectedInvoice.booking.hotel.city}, {selectedInvoice.booking.hotel.country}</p>
                        {selectedInvoice.booking.checkInDate && selectedInvoice.booking.checkOutDate && (
                          <p className="text-sm text-gray-500">
                            {new Date(selectedInvoice.booking.checkInDate).toLocaleDateString()} - {new Date(selectedInvoice.booking.checkOutDate).toLocaleDateString()}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Booking Details */}
              {selectedInvoice.booking && (
                <div className="mb-6">
                  <h5 className="font-semibold text-gray-800 border-b pb-2 mb-4">Booking Information</h5>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Booking ID</p>
                        <p className="font-mono text-sm">{selectedInvoice.booking._id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Guest Name</p>
                        <p className="font-medium">{selectedInvoice.booking.touristName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Number of Guests</p>
                        <p className="font-medium">{selectedInvoice.booking.numberOfGuests || 1}</p>
                      </div>
                      {selectedInvoice.booking.roomType && (
                        <div>
                          <p className="text-sm text-gray-600">Room Type</p>
                          <p className="font-medium capitalize">{selectedInvoice.booking.roomType.replace('_', ' ')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Invoice Items */}
              <div className="mb-6">
                <h5 className="font-semibold text-gray-800 border-b pb-2 mb-4">Invoice Items</h5>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                        selectedInvoice.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                            <td className="px-4 py-2 text-sm text-gray-600 text-right">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-gray-600 text-right">{item.unitPrice} {selectedInvoice.currency}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">{item.total} {selectedInvoice.currency}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-4 py-2 text-sm text-gray-900">Hotel Booking Service</td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-right">1</td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-right">{selectedInvoice.amount} {selectedInvoice.currency}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">{selectedInvoice.amount} {selectedInvoice.currency}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Invoice Summary */}
              <div className="flex justify-end mb-6">
                <div className="w-64">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">{selectedInvoice.amount} {selectedInvoice.currency}</span>
                    </div>
                    {selectedInvoice.taxAmount && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tax:</span>
                        <span className="font-medium">{selectedInvoice.taxAmount} {selectedInvoice.currency}</span>
                      </div>
                    )}
                    <div className="border-t pt-2">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span>{selectedInvoice.totalAmount || selectedInvoice.amount} {selectedInvoice.currency}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedInvoice.notes && (
                <div className="mb-6">
                  <h5 className="font-semibold text-gray-800 border-b pb-2 mb-4">Notes</h5>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-gray-700">{selectedInvoice.notes}</p>
                  </div>
                </div>
              )}

              {/* Payment Information */}
              {selectedInvoice.status === 'paid' && selectedInvoice.paidAt && (
                <div className="mb-6">
                  <h5 className="font-semibold text-gray-800 border-b pb-2 mb-4">Payment Information</h5>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckIcon className="w-5 h-5 text-green-500" />
                      <span className="text-green-800 font-medium">Payment Received</span>
                    </div>
                    <p className="text-green-700 text-sm mt-1">
                      Paid on {new Date(selectedInvoice.paidAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Details Modal */}
      {showPaymentDetailsModal && selectedPayment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-0 border max-w-4xl shadow-lg rounded-md bg-white">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-md">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">{t('admin:dashboard.payments.details.title')}</h3>
                <button
                  onClick={() => setShowPaymentDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
              {/* Payment Header */}
              <div className="mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-2xl font-bold text-gray-900">
                      {t('admin:dashboard.payments.details.paymentLabel')} {selectedPayment.paymentId ? `#${selectedPayment.paymentId}` : `#${selectedPayment._id.slice(-8)}`}
                    </h4>
                    <p className="text-gray-600 mt-1">
                      {t('admin:dashboard.payments.details.status')} <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedPayment.status === 'completed' ? 'bg-green-100 text-green-800' :
                        selectedPayment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        selectedPayment.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {selectedPayment.status.charAt(0).toUpperCase() + selectedPayment.status.slice(1)}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{t('admin:dashboard.payments.details.paymentDate')}</p>
                    <p className="font-medium">{new Date(selectedPayment.createdAt).toLocaleDateString()}</p>
                    {selectedPayment.processedAt && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">{t('admin:dashboard.payments.details.processedDate')}</p>
                        <p className="font-medium">{new Date(selectedPayment.processedAt).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment & Invoice Information */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <h5 className="font-semibold text-gray-800 border-b pb-2">{t('admin:dashboard.payments.details.paymentInfo')}</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('admin:dashboard.payments.details.amount')}</span>
                      <span className="font-medium text-lg">{selectedPayment.amount} {selectedPayment.currency}</span>
                    </div>
                    {selectedPayment.fees && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('admin:dashboard.payments.details.processingFees')}</span>
                        <span className="font-medium">{selectedPayment.fees} {selectedPayment.currency}</span>
                      </div>
                    )}
                    {selectedPayment.netAmount && (
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-600 font-medium">{t('admin:dashboard.payments.details.netAmount')}</span>
                        <span className="font-bold">{selectedPayment.netAmount} {selectedPayment.currency}</span>
                      </div>
                    )}
                    {selectedPayment.paymentMethod && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('admin:dashboard.payments.details.paymentMethod')}</span>
                        <span className="font-medium capitalize">{selectedPayment.paymentMethod}</span>
                      </div>
                    )}
                    {selectedPayment.paymentGateway && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('admin:dashboard.payments.details.gateway')}</span>
                        <span className="font-medium capitalize">{selectedPayment.paymentGateway}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="font-semibold text-gray-800 border-b pb-2">{t('admin:dashboard.payments.details.invoiceInfo')}</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('admin:dashboard.payments.details.invoiceId')}</span>
                      <span className="font-medium">{selectedPayment.invoice.invoiceId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('admin:dashboard.payments.details.invoiceAmount')}</span>
                      <span className="font-medium">{selectedPayment.invoice.amount} {selectedPayment.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('admin:dashboard.payments.details.customer')}</span>
                      <span className="font-medium">{selectedPayment.user?.name || 'Guest'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('admin:dashboard.payments.details.email')}</span>
                      <span className="font-medium">{selectedPayment.user?.email || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking Information */}
              {selectedPayment.invoice.booking && (
                <div className="mb-6">
                  <h5 className="font-semibold text-gray-800 border-b pb-2 mb-4">{t('admin:dashboard.payments.details.relatedBooking')}</h5>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">{t('admin:dashboard.payments.details.bookingId')}</p>
                        <p className="font-mono text-sm">{selectedPayment.invoice.booking._id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">{t('admin:dashboard.payments.details.guestName')}</p>
                        <p className="font-medium">{selectedPayment.invoice.booking.touristName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">{t('admin:dashboard.payments.details.hotel')}</p>
                        <p className="font-medium">{selectedPayment.invoice.booking.hotel.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">{t('admin:dashboard.payments.details.location')}</p>
                        <p className="font-medium">{selectedPayment.invoice.booking.hotel.city}, {selectedPayment.invoice.booking.hotel.country}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction Details */}
              {selectedPayment.transactionId && (
                <div className="mb-6">
                  <h5 className="font-semibold text-gray-800 border-b pb-2 mb-4">{t('admin:dashboard.payments.details.transactionDetails')}</h5>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('admin:dashboard.payments.details.transactionId')}</span>
                        <span className="font-mono text-sm">{selectedPayment.transactionId}</span>
                      </div>
                      {selectedPayment.confirmedAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">{t('admin:dashboard.payments.details.confirmedAt')}</span>
                          <span className="font-medium">{new Date(selectedPayment.confirmedAt).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Failure Information */}
              {selectedPayment.status === 'failed' && selectedPayment.failureReason && (
                <div className="mb-6">
                  <h5 className="font-semibold text-gray-800 border-b pb-2 mb-4">{t('admin:dashboard.payments.details.failureInfo')}</h5>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <XMarkIcon className="w-5 h-5 text-red-500" />
                      <span className="text-red-800 font-medium">{t('admin:dashboard.payments.details.paymentFailed')}</span>
                    </div>
                    <p className="text-red-700 text-sm mt-1">{selectedPayment.failureReason}</p>
                  </div>
                </div>
              )}

              {/* Success Information */}
              {selectedPayment.status === 'completed' && (
                <div className="mb-6">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckIcon className="w-5 h-5 text-green-500" />
                      <span className="text-green-800 font-medium">{t('admin:dashboard.payments.details.paymentCompleted')}</span>
                    </div>
                    {selectedPayment.processedAt && (
                      <p className="text-green-700 text-sm mt-1">
                        {t('admin:dashboard.payments.details.processedOn')} {new Date(selectedPayment.processedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
