import React from 'react';
import { XMarkIcon, DocumentTextIcon, CalendarIcon, CurrencyDollarIcon, UserIcon, BuildingOfficeIcon, PhoneIcon, EnvelopeIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { Invoice } from '../services/paymentsAPI';

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onDownloadReceipt?: (invoiceId: string) => void;
}

const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onDownloadReceipt
}) => {
  const { t } = useTranslation();

  if (!isOpen || !invoice) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <DocumentTextIcon className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {t('profile.invoiceDetails')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Invoice Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {t('profile.invoiceInformation')}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <DocumentTextIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{t('profile.invoiceNumber')}:</span>
                  <span className="text-sm font-medium">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{t('profile.issueDate')}:</span>
                  <span className="text-sm">{formatDate(invoice.issueDate || invoice.createdAt)}</span>
                </div>
                {invoice.dueDate && (
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{t('profile.dueDate')}:</span>
                    <span className="text-sm">{formatDate(invoice.dueDate)}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{t('profile.status')}:</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(invoice.paymentStatus)}`}>
                    {invoice.paymentStatus.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {t('profile.amountDetails')}
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">
                  {invoice.amount.toFixed(2)} {invoice.currency.toUpperCase()}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {t('profile.totalAmount')}
                </div>
              </div>
            </div>
          </div>

          {/* Hotel Information */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
              <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
              <span>{t('profile.hotelInformation')}</span>
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">{t('profile.hotelName')}</div>
                  <div className="font-medium">{invoice.hotelName}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">{t('profile.address')}</div>
                  <div className="font-medium">{invoice.hotelAddress}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Guest Information */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
              <UserIcon className="h-5 w-5 text-gray-400" />
              <span>{t('profile.guestInformation')}</span>
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <UserIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{t('profile.guestName')}:</span>
                    <span className="font-medium">{invoice.clientName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{t('profile.email')}:</span>
                    <span className="font-medium">{invoice.clientEmail}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <PhoneIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{t('profile.phone')}:</span>
                    <span className="font-medium">{invoice.clientPhone}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <GlobeAltIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{t('profile.nationality')}:</span>
                    <span className="font-medium">{invoice.clientNationality}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          {invoice.payment && (
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
                <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
                <span>{t('profile.paymentInformation')}</span>
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-600">{t('profile.paymentMethod')}:</span>
                      <span className="ml-2 font-medium">
                        {invoice.payment.paymentMethod?.toUpperCase() || 'CARD'}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">{t('profile.transactionId')}:</span>
                      <span className="ml-2 font-medium text-xs">
                        {invoice.payment.stripePaymentIntentId || invoice.payment.transactionId || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-600">{t('profile.paymentDate')}:</span>
                      <span className="ml-2 font-medium">
                        {invoice.payment.processedAt
                          ? formatDate(invoice.payment.processedAt)
                          : formatDate(invoice.payment.createdAt)
                        }
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">{t('profile.paymentStatus')}:</span>
                      <span className={`ml-2 text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(invoice.payment.status)}`}>
                        {invoice.payment.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          {invoice.description && (
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {t('profile.description')}
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">{invoice.description}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            {t('common.close')}
          </button>
          {invoice.paymentStatus === 'paid' && onDownloadReceipt && (
            <button
              onClick={() => onDownloadReceipt(invoice._id)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
            >
              <DocumentTextIcon className="h-4 w-4" />
              <span>{t('profile.downloadReceipt')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailModal;
