import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Redirect, useHistory } from 'react-router-dom';
import adminAPI from '../services/adminAPI';
import toast from 'react-hot-toast';
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
  ArrowRightOnRectangleIcon
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
  hotel: {
    name: string;
    address: string;
  };
  status: string;
  createdAt: string;
}

interface Invoice {
  _id: string;
  invoiceId: string;
  user: {
    name: string;
    email: string;
  };
  clientName: string;
  clientEmail: string;
  hotelName: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface Payment {
  _id: string;
  invoice: {
    invoiceId: string;
    amount: number;
  };
  user: {
    name: string;
    email: string;
  };
  amount: number;
  currency: string;
  status: string;
  processedAt: string;
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
  const [paymentPage] = useState(1); // TODO: Implement pagination
  // Selected items for actions
  const [selectedClient, setSelectedClient] = useState<Client | null>(null); // TODO: Implement client details
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showDenialModal, setShowDenialModal] = useState(false);
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
    { id: 'payments', name: 'Payments', icon: CreditCardIcon }
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
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {booking.status === 'pending' && (
                            <div className="flex space-x-2">
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
                            </div>
                          )}
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
                      </th>
                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Issue Date
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
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(invoice.createdAt).toLocaleDateString()}
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
                      </th>
                      <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        Payment Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
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
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {payment.processedAt ? new Date(payment.processedAt).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                >
                  {loading ? 'Denying...' : 'Deny & Send Notification'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
