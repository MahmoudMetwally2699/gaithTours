import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  CreditCardIcon,
  FunnelIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

interface User {
  name: string;
  email: string;
}

interface PaymentInvoice {
  invoiceId: string;
}

interface Payment {
  _id: string;
  amount: number;
  currency: string;
  status: string;
  processedAt?: string;
  user: User;
  invoice: PaymentInvoice;
}

interface PaymentsTabProps {
  payments: Payment[];
  paymentStatus: string;
  setPaymentStatus: (status: string) => void;
  isRTL: boolean;
  getStatusBadge: (status: string, type: string) => React.ReactNode;
  setSelectedPayment: (payment: Payment) => void;
  setShowPaymentDetailsModal: (show: boolean) => void;
}

export const PaymentsTab: React.FC<PaymentsTabProps> = ({
  payments,
  paymentStatus,
  setPaymentStatus,
  isRTL,
  getStatusBadge,
  setSelectedPayment,
  setShowPaymentDetailsModal,
}) => {
  const { t } = useTranslation();

  // Filter payments based on status
  const filteredPayments = paymentStatus
    ? payments.filter(payment => payment.status === paymentStatus)
    : payments;

  return (
    <div className="space-y-8">
      {/* Modern Payments Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-3xl blur-3xl"></div>
        <div className="relative bg-white/80 backdrop-blur-xl border border-white/30 rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <CreditCardIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {t('dashboard.payments.title')}
                </h2>
                <p className="text-gray-600 mt-1">Monitor payment transactions and status</p>
              </div>
            </div>

            {/* Modern Status Filter */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
              <div className="relative bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-1 shadow-lg">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center ml-2">
                    <FunnelIcon className="w-5 h-5 text-white" />
                  </div>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="min-w-[160px] px-4 py-3 bg-transparent border-0 focus:outline-none focus:ring-0 text-gray-700 font-medium"
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="processing">Processing</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Table - Mobile Responsive */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gradient-to-r from-purple-50/50 to-pink-50/50 backdrop-blur-sm">
                <th className={`px-4 lg:px-8 py-4 lg:py-6 ${isRTL ? 'text-right' : 'text-left'} text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider`}>
                  <div className="flex items-center space-x-2">
                    <CreditCardIcon className="w-3 h-3 lg:w-4 lg:h-4 text-purple-600" />
                    <span>Invoice ID</span>
                  </div>
                </th>
                <th className={`px-4 lg:px-8 py-4 lg:py-6 ${isRTL ? 'text-right' : 'text-left'} text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider`}>
                  Client Name
                </th>
                <th className={`px-4 lg:px-8 py-4 lg:py-6 ${isRTL ? 'text-right' : 'text-left'} text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider`}>
                  Email
                </th>
                <th className={`px-4 lg:px-8 py-4 lg:py-6 ${isRTL ? 'text-right' : 'text-left'} text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider`}>
                  Amount
                </th>
                <th className={`px-4 lg:px-8 py-4 lg:py-6 ${isRTL ? 'text-right' : 'text-left'} text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider`}>
                  Status
                </th>
                <th className={`px-4 lg:px-8 py-4 lg:py-6 ${isRTL ? 'text-right' : 'text-left'} text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider`}>
                  Payment Date
                </th>
                <th className={`px-4 lg:px-8 py-4 lg:py-6 ${isRTL ? 'text-right' : 'text-left'} text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50">
              {filteredPayments.map((payment, index) => (
                <motion.tr
                  key={payment._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="hover:bg-gradient-to-r hover:from-purple-50/30 hover:to-pink-50/30 transition-all duration-300 group"
                >
                  <td className="px-4 lg:px-8 py-4 lg:py-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-lg">
                        PAY
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{payment.invoice.invoiceId}</p>
                        <p className="text-xs text-gray-500">Payment</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 lg:px-8 py-4 lg:py-6">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">{payment.user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 lg:px-8 py-4 lg:py-6 text-sm text-gray-600">
                    {payment.user.email}
                  </td>
                  <td className="px-4 lg:px-8 py-4 lg:py-6">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-gray-900">{payment.amount}</span>
                      <span className="text-sm text-gray-500 uppercase">{payment.currency}</span>
                    </div>
                  </td>
                  <td className="px-4 lg:px-8 py-4 lg:py-6">
                    {getStatusBadge(payment.status, 'payment')}
                  </td>
                  <td className="px-4 lg:px-8 py-4 lg:py-6 text-sm text-gray-700">
                    {payment.processedAt ? new Date(payment.processedAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 lg:px-8 py-4 lg:py-6">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedPayment(payment);
                        setShowPaymentDetailsModal(true);
                      }}
                      className="group flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <EyeIcon className="w-4 h-4" />
                      <span>View</span>
                    </motion.button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden">
          {filteredPayments.map((payment, index) => (
            <motion.div
              key={payment._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="border-b border-gray-200/50 p-4 hover:bg-gradient-to-r hover:from-purple-50/30 hover:to-pink-50/30 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-lg">
                    PAY
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{payment.invoice.invoiceId}</p>
                    <p className="text-xs text-gray-500">Payment</p>
                  </div>
                </div>
                {getStatusBadge(payment.status, 'payment')}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600 font-medium">Client</span>
                  <span className="text-sm text-gray-900 font-medium">{payment.user.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600 font-medium">Email</span>
                  <span className="text-sm text-gray-600 truncate max-w-[200px]">{payment.user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600 font-medium">Amount</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-lg font-bold text-gray-900">{payment.amount}</span>
                    <span className="text-xs text-gray-500 uppercase">{payment.currency}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600 font-medium">Payment Date</span>
                  <span className="text-sm text-gray-700">{payment.processedAt ? new Date(payment.processedAt).toLocaleDateString() : '-'}</span>
                </div>
              </div>

              <div className="flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedPayment(payment);
                    setShowPaymentDetailsModal(true);
                  }}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-xl font-medium shadow-lg text-sm flex items-center space-x-2"
                >
                  <EyeIcon className="w-4 h-4" />
                  <span>View Details</span>
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
