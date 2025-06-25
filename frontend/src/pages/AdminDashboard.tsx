import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Redirect, useHistory } from 'react-router-dom';
import adminAPI from '../services/adminAPI';
import toast from 'react-hot-toast';
import WhatsAppInbox from '../components/WhatsApp/WhatsAppInbox';
import {
  UserGroupIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  CreditCardIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  PencilIcon,
  ArrowRightOnRectangleIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

interface DashboardStats {
  totalClients: number;
  totalBookings: number;
  pendingBookings: number;
  totalInvoices: number;
  paidInvoices: number;
  totalRevenue: number;
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
  const { i18n } = useTranslation();
  const { user, logout } = useAuth();
  const history = useHistory();
  const isRTL = i18n.language === 'ar';

  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Clients state
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [clientPage] = useState(1); // TODO: Implement pagination

  // Bookings state
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingStatus, setBookingStatus] = useState('');
  const [bookingPage] = useState(1); // TODO: Implement pagination

  // Invoices state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceStatus, setInvoiceStatus] = useState('');
  const [invoicePage] = useState(1); // TODO: Implement pagination

  // Payments state
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [paymentPage] = useState(1); // TODO: Implement pagination  // Selected items for actions
  const [selectedClient, setSelectedClient] = useState<Client | null>(null); // TODO: Implement client details
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showDenialModal, setShowDenialModal] = useState(false);
  const [showBookingDetailsModal, setShowBookingDetailsModal] = useState(false);
  const [showInvoiceDetailsModal, setShowInvoiceDetailsModal] = useState(false);
  const [showPaymentDetailsModal, setShowPaymentDetailsModal] = useState(false);
  const [denialReason, setDenialReason] = useState('');
  const [approvalAmount, setApprovalAmount] = useState('1000');
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getStats();
      setStats(response.data.data.stats);
    } catch (error) {
      toast.error('Failed to fetch dashboard stats');
    } finally {
      setLoading(false);
    }
  }, []);
  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getClients({
        page: clientPage,
        search: clientSearch
      });
      setClients(response.data.data.clients);
    } catch (error) {
      toast.error('Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  }, [clientPage, clientSearch]);
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getBookings({
        page: bookingPage,
        status: bookingStatus
      });
      setBookings(response.data.data.bookings);
    } catch (error) {
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  }, [bookingPage, bookingStatus]);
  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getInvoices({
        page: invoicePage,
        status: invoiceStatus
      });
      setInvoices(response.data.data.invoices);
    } catch (error) {
      toast.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  }, [invoicePage, invoiceStatus]);
  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getPayments({
        page: paymentPage,
        status: paymentStatus
      });
      setPayments(response.data.data.payments);
    } catch (error) {
      toast.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  }, [paymentPage, paymentStatus]);

  // Add useEffect after all functions are defined
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchStats();
    } else if (activeTab === 'clients') {
      fetchClients();
    } else if (activeTab === 'bookings') {
      fetchBookings();
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
      toast.success('Booking approved and invoice generated!');
      setShowApprovalModal(false);
      setSelectedBooking(null);
      fetchBookings();
    } catch (error) {
      toast.error('Failed to approve booking');
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
      toast.success('Booking denied and notification sent');
      setShowDenialModal(false);
      setSelectedBooking(null);
      setDenialReason('');
      fetchBookings();
    } catch (error) {
      toast.error('Failed to deny booking');
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
        confirmed: 'bg-emerald-100 text-emerald-800'
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
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const handleLogout = async () => {
    try {
      await logout();
      history.push('/');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  // Check if user has admin role
  if (!user || user.role !== 'admin') {
    return <Redirect to="/" />;
  }
  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: ChartBarIcon },
    { id: 'clients', name: 'Clients', icon: UserGroupIcon },
    { id: 'bookings', name: 'Booking Requests', icon: ClipboardDocumentListIcon },
    { id: 'invoices', name: 'Invoices', icon: DocumentTextIcon },
    { id: 'payments', name: 'Payments', icon: CreditCardIcon },
    { id: 'whatsapp', name: 'WhatsApp Messages', icon: ChatBubbleLeftRightIcon }
  ];

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="flex">        {/* Sidebar */}
        <div className={`bg-white shadow-lg h-screen fixed ${isRTL ? 'right-0' : 'left-0'} w-64 z-10 flex flex-col`}>
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>
          <nav className="mt-6 flex-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <Icon className={`w-5 h-5 ${isRTL ? 'ml-3' : 'mr-3'}`} />
                  {tab.name}
                </button>
              );
            })}
          </nav>

          {/* Logout Button */}
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center px-6 py-3 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}
            >
              <ArrowRightOnRectangleIcon className={`w-5 h-5 ${isRTL ? 'ml-3' : 'mr-3'}`} />
              Logout
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className={`flex-1 ${isRTL ? 'mr-64' : 'ml-64'} p-8`}>
          {/* Dashboard Stats */}
          {activeTab === 'dashboard' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Overview</h2>
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center">
                      <UserGroupIcon className="w-8 h-8 text-blue-500" />
                      <div className={`${isRTL ? 'mr-4' : 'ml-4'}`}>
                        <p className="text-sm font-medium text-gray-600">Total Clients</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center">
                      <ClipboardDocumentListIcon className="w-8 h-8 text-yellow-500" />
                      <div className={`${isRTL ? 'mr-4' : 'ml-4'}`}>
                        <p className="text-sm font-medium text-gray-600">Pending Bookings</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.pendingBookings}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center">
                      <DocumentTextIcon className="w-8 h-8 text-purple-500" />
                      <div className={`${isRTL ? 'mr-4' : 'ml-4'}`}>
                        <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalInvoices}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center">
                      <CreditCardIcon className="w-8 h-8 text-green-500" />
                      <div className={`${isRTL ? 'mr-4' : 'ml-4'}`}>
                        <p className="text-sm font-medium text-gray-600">Paid Invoices</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.paidInvoices}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center">
                      <ChartBarIcon className="w-8 h-8 text-indigo-500" />
                      <div className={`${isRTL ? 'mr-4' : 'ml-4'}`}>
                        <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalRevenue} SAR</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center">
                      <ClipboardDocumentListIcon className="w-8 h-8 text-gray-500" />
                      <div className={`${isRTL ? 'mr-4' : 'ml-4'}`}>
                        <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Clients Tab */}
          {activeTab === 'clients' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900">Clients</h2>
                <div className="relative">
                  <MagnifyingGlassIcon className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} w-5 h-5 text-gray-400`} />
                  <input
                    type="text"
                    placeholder="Search clients..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className={`w-80 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
                  />
                </div>
              </div>

              <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Name
                      </th>
                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Email
                      </th>
                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Phone
                      </th>
                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Nationality
                      </th>
                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Registration Date
                      </th>
                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {clients.map((client) => (
                      <tr key={client._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {client.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {client.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {client.phone}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {client.nationality}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(client.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => setSelectedClient(client)}
                            className="text-primary-600 hover:text-primary-900 mr-4"
                          >
                            <EyeIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setSelectedClient(client)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900">Booking Requests</h2>
                <select
                  value={bookingStatus}
                  onChange={(e) => setBookingStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="denied">Denied</option>
                  <option value="invoiced">Invoiced</option>
                  <option value="paid">Paid</option>
                  <option value="confirmed">Confirmed</option>
                </select>
              </div>

              <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Client Name
                      </th>
                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Email
                      </th>
                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Hotel Name
                      </th>
                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Submission Date
                      </th>
                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Status
                      </th>
                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bookings.map((booking) => (
                      <tr key={booking._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {booking.touristName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {booking.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {booking.hotel.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(booking.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(booking.status, 'booking')}
                        </td>                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setSelectedBooking(booking);
                                setShowBookingDetailsModal(true);
                              }}
                              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium hover:bg-blue-200"
                            >
                              <EyeIcon className="w-4 h-4 inline mr-1" />
                              View Details
                            </button>
                            {booking.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedBooking(booking);
                                    setShowApprovalModal(true);
                                  }}
                                  className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium hover:bg-green-200"
                                >
                                  <CheckIcon className="w-4 h-4 inline mr-1" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedBooking(booking);
                                    setShowDenialModal(true);
                                  }}
                                  className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium hover:bg-red-200"
                                >
                                  <XMarkIcon className="w-4 h-4 inline mr-1" />
                                  Deny
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900">Invoices</h2>
                <select
                  value={invoiceStatus}
                  onChange={(e) => setInvoiceStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">All Status</option>
                  <option value="invoiced">Invoiced</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Invoice ID
                      </th>
                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Client Name
                      </th>
                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Email
                      </th>
                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Hotel Name
                      </th>
                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Amount
                      </th>
                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Status
                      </th>                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Issue Date
                      </th>
                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoices.map((invoice) => (
                      <tr key={invoice._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {invoice.invoiceId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {invoice.clientName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {invoice.clientEmail}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {invoice.hotelName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {invoice.amount} {invoice.currency}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(invoice.status, 'invoice')}
                        </td>                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(invoice.issuedAt || invoice.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowInvoiceDetailsModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md transition-colors duration-200 flex items-center space-x-1"
                          >
                            <EyeIcon className="w-4 h-4" />
                            <span>View Details</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900">Payments</h2>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="processing">Processing</option>
                </select>
              </div>

              <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Invoice ID
                      </th>
                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Client Name
                      </th>
                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Email
                      </th>
                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Amount
                      </th>
                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Status
                      </th>                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Payment Date
                      </th>
                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment._id} className="hover:bg-gray-50">                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {payment.invoice.invoiceId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {payment.user.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {payment.user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {payment.amount} {payment.currency}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(payment.status, 'payment')}
                        </td>                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {payment.processedAt ? new Date(payment.processedAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowPaymentDetailsModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md transition-colors duration-200 flex items-center space-x-1"
                          >
                            <EyeIcon className="w-4 h-4" />
                            <span>View Details</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>                </table>
              </div>
            </div>
          )}

          {/* WhatsApp Messages Tab */}
          {activeTab === 'whatsapp' && (
            <div className="h-full">
              <WhatsAppInbox />
            </div>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedBooking && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Approve Booking</h3>
              <p className="text-sm text-gray-600 mb-4">
                Approve booking for {selectedBooking.touristName} at {selectedBooking.hotel.name}?
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Amount (SAR)
                </label>
                <input
                  type="number"
                  value={approvalAmount}
                  onChange={(e) => setApprovalAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter amount"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApproveBooking}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Approving...' : 'Approve & Generate Invoice'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Denial Modal */}
      {showDenialModal && selectedBooking && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Deny Booking</h3>
              <p className="text-sm text-gray-600 mb-4">
                Deny booking for {selectedBooking.touristName} at {selectedBooking.hotel.name}?
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Denial *
                </label>
                <textarea
                  value={denialReason}
                  onChange={(e) => setDenialReason(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Please provide a reason for denial..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDenialModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDenyBooking}
                  disabled={loading || !denialReason}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >                  {loading ? 'Denying...' : 'Deny & Send Notification'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {showBookingDetailsModal && selectedBooking && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-0 border max-w-4xl shadow-lg rounded-md bg-white">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-md">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">Booking Details</h3>
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
                          🔗 Visit Hotel Website
                        </a>
                      </div>
                    )}
                    {selectedBooking.hotel.price && (
                      <div className="mt-2">
                        <span className="text-green-600 font-medium text-sm">
                          💰 Expected Price: {selectedBooking.hotel.price} SAR
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Booking Information */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Travel Details */}
                <div className="space-y-4">
                  <h5 className="font-semibold text-gray-800 border-b pb-2">Travel Details</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Booking ID:</span>
                      <span className="font-medium font-mono text-sm">{selectedBooking._id}</span>
                    </div>
                    {selectedBooking.checkInDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Check-in:</span>
                        <span className="font-medium">{new Date(selectedBooking.checkInDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedBooking.checkOutDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Check-out:</span>
                        <span className="font-medium">{new Date(selectedBooking.checkOutDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Guests:</span>
                      <span className="font-medium">{selectedBooking.numberOfGuests || 1}</span>
                    </div>
                    {selectedBooking.expectedCheckInTime && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Expected Check-in Time:</span>
                        <span className="font-medium">{selectedBooking.expectedCheckInTime}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Room & Stay Details */}
                <div className="space-y-4">
                  <h5 className="font-semibold text-gray-800 border-b pb-2">Room & Stay Details</h5>
                  <div className="space-y-3">
                    {selectedBooking.roomType && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Room Type:</span>
                        <span className="font-medium capitalize">{selectedBooking.roomType.replace('_', ' ')}</span>
                      </div>
                    )}
                    {selectedBooking.stayType && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Stay Type:</span>
                        <span className="font-medium capitalize">{selectedBooking.stayType.replace('_', ' ')}</span>
                      </div>
                    )}
                    {selectedBooking.paymentMethod && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payment Method:</span>
                        <span className="font-medium">{selectedBooking.paymentMethod}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
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
                      <span className="text-gray-600">Submission Date:</span>
                      <span className="font-medium">{new Date(selectedBooking.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="mb-6">
                <h5 className="font-semibold text-gray-800 border-b pb-2 mb-4">Personal Information</h5>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Full Name:</span>
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
                  <h5 className="font-semibold text-gray-800 border-b pb-2 mb-4">Additional Guests</h5>
                  <div className="space-y-2">
                    {selectedBooking.guests.map((guest, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-md">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Guest's Name:</span>
                          <span className="font-medium">{guest.fullName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Phone:</span>
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
                  <h5 className="font-semibold text-gray-800 border-b pb-2 mb-4">Attachments ({selectedBooking.attachments.length})</h5>
                  <div className="space-y-2">
                    {selectedBooking.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center space-x-3">
                          {attachment.fileType === 'pdf' ? (
                            <div className="text-red-500">📄</div>
                          ) : (
                            <div className="text-blue-500">🖼️</div>
                          )}                          <div>
                            <p className="text-sm font-medium text-gray-900 truncate pr-2">{attachment.fileName}</p>
                            <p className="text-xs text-gray-500 truncate pr-2">
                              {attachment.fileType.toUpperCase()} • {(attachment.size / 1024 / 1024).toFixed(2)} MB •
                              Uploaded {new Date(attachment.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => window.open(attachment.fileUrl, '_blank')}
                          className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                        >
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Special Requests */}
              {selectedBooking.notes && (
                <div className="mb-6">
                  <h5 className="font-semibold text-gray-800 border-b pb-2 mb-4">Special Requests</h5>
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
                    Approve Booking
                  </button>
                  <button
                    onClick={() => {
                      setShowBookingDetailsModal(false);
                      setShowDenialModal(true);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Deny Booking
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
                    <h4 className="text-2xl font-bold text-gray-900">Invoice #{selectedInvoice.invoiceId}</h4>
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
                <h3 className="text-xl font-semibold text-gray-900">Payment Details</h3>
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
                      Payment {selectedPayment.paymentId ? `#${selectedPayment.paymentId}` : `#${selectedPayment._id.slice(-8)}`}
                    </h4>
                    <p className="text-gray-600 mt-1">
                      Status: <span className={`px-2 py-1 rounded-full text-xs font-medium ${
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
                    <p className="text-sm text-gray-600">Payment Date</p>
                    <p className="font-medium">{new Date(selectedPayment.createdAt).toLocaleDateString()}</p>
                    {selectedPayment.processedAt && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">Processed Date</p>
                        <p className="font-medium">{new Date(selectedPayment.processedAt).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment & Invoice Information */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <h5 className="font-semibold text-gray-800 border-b pb-2">Payment Information</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-medium text-lg">{selectedPayment.amount} {selectedPayment.currency}</span>
                    </div>
                    {selectedPayment.fees && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Processing Fees:</span>
                        <span className="font-medium">{selectedPayment.fees} {selectedPayment.currency}</span>
                      </div>
                    )}
                    {selectedPayment.netAmount && (
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-600 font-medium">Net Amount:</span>
                        <span className="font-bold">{selectedPayment.netAmount} {selectedPayment.currency}</span>
                      </div>
                    )}
                    {selectedPayment.paymentMethod && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payment Method:</span>
                        <span className="font-medium capitalize">{selectedPayment.paymentMethod}</span>
                      </div>
                    )}
                    {selectedPayment.paymentGateway && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Gateway:</span>
                        <span className="font-medium capitalize">{selectedPayment.paymentGateway}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="font-semibold text-gray-800 border-b pb-2">Invoice Information</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Invoice ID:</span>
                      <span className="font-medium">{selectedPayment.invoice.invoiceId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Invoice Amount:</span>
                      <span className="font-medium">{selectedPayment.invoice.amount} {selectedPayment.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Customer:</span>
                      <span className="font-medium">{selectedPayment.user.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{selectedPayment.user.email}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking Information */}
              {selectedPayment.invoice.booking && (
                <div className="mb-6">
                  <h5 className="font-semibold text-gray-800 border-b pb-2 mb-4">Related Booking</h5>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Booking ID</p>
                        <p className="font-mono text-sm">{selectedPayment.invoice.booking._id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Guest Name</p>
                        <p className="font-medium">{selectedPayment.invoice.booking.touristName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Hotel</p>
                        <p className="font-medium">{selectedPayment.invoice.booking.hotel.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Location</p>
                        <p className="font-medium">{selectedPayment.invoice.booking.hotel.city}, {selectedPayment.invoice.booking.hotel.country}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction Details */}
              {selectedPayment.transactionId && (
                <div className="mb-6">
                  <h5 className="font-semibold text-gray-800 border-b pb-2 mb-4">Transaction Details</h5>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Transaction ID:</span>
                        <span className="font-mono text-sm">{selectedPayment.transactionId}</span>
                      </div>
                      {selectedPayment.confirmedAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Confirmed At:</span>
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
                  <h5 className="font-semibold text-gray-800 border-b pb-2 mb-4">Failure Information</h5>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <XMarkIcon className="w-5 h-5 text-red-500" />
                      <span className="text-red-800 font-medium">Payment Failed</span>
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
                      <span className="text-green-800 font-medium">Payment Completed Successfully</span>
                    </div>
                    {selectedPayment.processedAt && (
                      <p className="text-green-700 text-sm mt-1">
                        Processed on {new Date(selectedPayment.processedAt).toLocaleString()}
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
