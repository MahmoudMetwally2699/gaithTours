import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  DocumentTextIcon,
  FunnelIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { Pagination } from './Pagination';

interface Invoice {
  _id: string;
  invoiceId: string;
  clientName: string;
  clientEmail: string;
  hotelName: string;
  amount: number;
  currency: string;
  status: string;
  issuedAt?: string;
  createdAt: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalInvoices: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface InvoicesTabProps {
  invoices: Invoice[];
  invoiceStatus: string;
  setInvoiceStatus: (status: string) => void;
  isRTL: boolean;
  getStatusBadge: (status: string, type: string) => React.ReactNode;
  setSelectedInvoice: (invoice: Invoice) => void;
  setShowInvoiceDetailsModal: (show: boolean) => void;
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;
  itemsPerPage?: number;
  onItemsPerPageChange?: (items: number) => void;
}

export const InvoicesTab: React.FC<InvoicesTabProps> = ({
  invoices,
  invoiceStatus,
  setInvoiceStatus,
  isRTL,
  getStatusBadge,
  setSelectedInvoice,
  setShowInvoiceDetailsModal,
  pagination,
  onPageChange,
  itemsPerPage = 10,
  onItemsPerPageChange,
}) => {
  const { t } = useTranslation(['admin']);

  // Filter invoices based on status
  const filteredInvoices = invoiceStatus
    ? invoices.filter(invoice => invoice.status === invoiceStatus)
    : invoices;

  return (
    <div className="space-y-8">
      {/* Modern Invoices Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-3xl blur-3xl"></div>
        <div className="relative bg-white/80 backdrop-blur-xl border border-white/30 rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
                <DocumentTextIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  {t('admin:dashboard.invoices.title')}
                </h2>
                <p className="text-gray-600 mt-1">{t('admin:dashboard.invoices.subtitle')}</p>
              </div>
            </div>

            {/* Modern Status Filter */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
              <div className="relative bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-1 shadow-lg">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center ml-2">
                    <FunnelIcon className="w-5 h-5 text-white" />
                  </div>
                  <select
                    value={invoiceStatus}
                    onChange={(e) => setInvoiceStatus(e.target.value)}
                    className="min-w-[160px] px-4 py-3 bg-transparent border-0 focus:outline-none focus:ring-0 text-gray-700 font-medium"
                  >
                    <option value="">{t('admin:dashboard.invoices.allStatus')}</option>
                    <option value="invoiced">{t('admin:dashboard.status.invoiced')}</option>
                    <option value="paid">{t('admin:dashboard.status.paid')}</option>
                    <option value="cancelled">{t('admin:dashboard.status.cancelled')}</option>
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
              <tr className="bg-gradient-to-r from-emerald-50/50 to-teal-50/50 backdrop-blur-sm">
                <th className={`px-4 lg:px-8 py-4 lg:py-6 ${isRTL ? 'text-right' : 'text-left'} text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider`}>
                  <div className="flex items-center space-x-2">
                    <DocumentTextIcon className="w-3 h-3 lg:w-4 lg:h-4 text-emerald-600" />
                    <span>{t('admin:dashboard.invoices.invoiceId')}</span>
                  </div>
                </th>
                <th className={`px-4 lg:px-8 py-4 lg:py-6 ${isRTL ? 'text-right' : 'text-left'} text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider`}>
                  {t('admin:dashboard.invoices.clientName')}
                </th>
                <th className={`px-4 lg:px-8 py-4 lg:py-6 ${isRTL ? 'text-right' : 'text-left'} text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider`}>
                  {t('admin:dashboard.invoices.email')}
                </th>
                <th className={`px-4 lg:px-8 py-4 lg:py-6 ${isRTL ? 'text-right' : 'text-left'} text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider`}>
                  {t('admin:dashboard.invoices.hotelName')}
                </th>
                <th className={`px-4 lg:px-8 py-4 lg:py-6 ${isRTL ? 'text-right' : 'text-left'} text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider`}>
                  {t('admin:dashboard.invoices.amount')}
                </th>
                <th className={`px-4 lg:px-8 py-4 lg:py-6 ${isRTL ? 'text-right' : 'text-left'} text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider`}>
                  {t('admin:dashboard.invoices.status')}
                </th>
                <th className={`px-4 lg:px-8 py-4 lg:py-6 ${isRTL ? 'text-right' : 'text-left'} text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider`}>
                  {t('admin:dashboard.invoices.issueDate')}
                </th>
                <th className={`px-4 lg:px-8 py-4 lg:py-6 ${isRTL ? 'text-right' : 'text-left'} text-xs lg:text-sm font-bold text-gray-700 uppercase tracking-wider`}>
                  {t('admin:dashboard.invoices.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50">
              {filteredInvoices.map((invoice, index) => (
                <motion.tr
                  key={invoice._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="hover:bg-gradient-to-r hover:from-emerald-50/30 hover:to-teal-50/30 transition-all duration-300 group"
                >
                  <td className="px-4 lg:px-8 py-4 lg:py-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-lg">
                        INV
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{invoice.invoiceId}</p>
                        <p className="text-xs text-gray-500">{t('admin:dashboard.invoices.details.invoiceLabel')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 lg:px-8 py-4 lg:py-6">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">{invoice.clientName}</span>
                    </div>
                  </td>
                  <td className="px-4 lg:px-8 py-4 lg:py-6 text-sm text-gray-600">
                    {invoice.clientEmail}
                  </td>
                  <td className="px-4 lg:px-8 py-4 lg:py-6 text-sm text-gray-700 font-medium">
                    {invoice.hotelName}
                  </td>
                  <td className="px-4 lg:px-8 py-4 lg:py-6">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-gray-900">{invoice.amount}</span>
                      <span className="text-sm text-gray-500 uppercase">{invoice.currency}</span>
                    </div>
                  </td>
                  <td className="px-4 lg:px-8 py-4 lg:py-6">
                    {getStatusBadge(invoice.status, 'invoice')}
                  </td>
                  <td className="px-4 lg:px-8 py-4 lg:py-6 text-sm text-gray-700">
                    {new Date(invoice.issuedAt || invoice.createdAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
                  </td>
                  <td className="px-4 lg:px-8 py-4 lg:py-6">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setShowInvoiceDetailsModal(true);
                      }}
                      className="group flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-4 py-2 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <EyeIcon className="w-4 h-4" />
                      <span>{t('admin:dashboard.bookings.details.view')}</span>
                    </motion.button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden">
          {filteredInvoices.map((invoice, index) => (
            <motion.div
              key={invoice._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="border-b border-gray-200/50 p-4 hover:bg-gradient-to-r hover:from-emerald-50/30 hover:to-teal-50/30 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-lg">
                    INV
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{invoice.invoiceId}</p>
                    <p className="text-xs text-gray-500">{t('admin:dashboard.invoices.details.invoiceLabel')}</p>
                  </div>
                </div>
                {getStatusBadge(invoice.status, 'invoice')}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600 font-medium">{t('admin:dashboard.invoices.clientName')}</span>
                  <span className="text-sm text-gray-900 font-medium">{invoice.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600 font-medium">{t('admin:dashboard.invoices.email')}</span>
                  <span className="text-sm text-gray-600 truncate max-w-[200px]">{invoice.clientEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600 font-medium">{t('admin:dashboard.invoices.hotelName')}</span>
                  <span className="text-sm text-gray-700 font-medium truncate max-w-[200px]">{invoice.hotelName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600 font-medium">{t('admin:dashboard.invoices.amount')}</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-lg font-bold text-gray-900">{invoice.amount}</span>
                    <span className="text-xs text-gray-500 uppercase">{invoice.currency}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600 font-medium">{t('admin:dashboard.invoices.issueDate')}</span>
                  <span className="text-sm text-gray-700">{new Date(invoice.issuedAt || invoice.createdAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}</span>
                </div>
              </div>

              <div className="flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedInvoice(invoice);
                    setShowInvoiceDetailsModal(true);
                  }}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-4 py-2 rounded-xl font-medium shadow-lg text-sm flex items-center space-x-2"
                >
                  <EyeIcon className="w-4 h-4" />
                  <span>{t('admin:dashboard.bookings.details.view')}</span>
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Pagination */}
        {pagination && onPageChange && (
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalInvoices}
            itemsPerPage={itemsPerPage}
            onPageChange={onPageChange}
            onItemsPerPageChange={onItemsPerPageChange}
            isRTL={isRTL}
            itemName="invoices"
          />
        )}
      </div>
    </div>
  );
};
