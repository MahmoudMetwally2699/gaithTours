import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { AddClientModal, ClientFormData } from './AddClientModal';
import { Pagination } from './Pagination';
import toast from 'react-hot-toast';

interface Client {
  _id: string;
  name: string;
  email: string;
  phone: string;
  nationality: string;
  createdAt: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalClients: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ClientsTabProps {
  clients: Client[];
  clientSearch: string;
  setClientSearch: (search: string) => void;
  isRTL: boolean;
  onCreateClient: (clientData: ClientFormData) => Promise<void>;
  isCreatingClient: boolean;
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;
  itemsPerPage?: number;
  onItemsPerPageChange?: (items: number) => void;
  onViewClient?: (client: Client) => void;
  onEditClient?: (client: Client) => void;
  onDeleteClient?: (clientId: string) => Promise<void>;
  isDeletingClient?: boolean;
}

export const ClientsTab: React.FC<ClientsTabProps> = ({
  clients,
  clientSearch,
  setClientSearch,
  isRTL,
  onCreateClient,
  isCreatingClient,
  pagination,
  onPageChange,
  itemsPerPage = 10,
  onItemsPerPageChange,
  onViewClient,
  onEditClient,
  onDeleteClient,
  isDeletingClient = false,
}) => {
  const { t } = useTranslation(['admin']);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const handleDeleteClick = (client: Client) => {
    setClientToDelete(client);
    setShowDeleteConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (clientToDelete && onDeleteClient) {
      try {
        await onDeleteClient(clientToDelete._id);
        setShowDeleteConfirmModal(false);
        setClientToDelete(null);
      } catch (error) {
        // Error is handled by parent component
      }
    }
  };

  const handleCreateClient = async (clientData: ClientFormData) => {
    try {
      await onCreateClient(clientData);
      setShowAddClientModal(false);
      toast.success(t('admin:dashboard.clients.alerts.createSuccess'));
    } catch (error) {
      toast.error(t('admin:dashboard.clients.alerts.createError'));
    }
  };

  // Filter clients based on search
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.email.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.phone.includes(clientSearch) ||
    client.nationality.toLowerCase().includes(clientSearch.toLowerCase())
  );

  return (
    <div
      className="space-y-8"
    >
      {/* Header Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-yellow-500/10 rounded-3xl blur-3xl"></div>        <div className="relative bg-white/70 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <UserGroupIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  {t('admin:dashboard.clients.title')}
                </h2>
                <p className="text-gray-600 mt-1">{t('admin:dashboard.clients.subtitle')}</p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col md:flex-row items-center gap-4">
              {/* Add Client Button */}
              <button
                onClick={() => setShowAddClientModal(true)}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <PlusIcon className="w-5 h-5" />
                <span className="font-medium">{t('admin:dashboard.clients.addClient')}</span>
              </button>

              {/* Modern Search Bar */}
              <div className="relative group w-full md:w-auto">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                <div className="relative bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-1 shadow-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center ml-2">
                      <MagnifyingGlassIcon className="w-5 h-5 text-white" />
                    </div>
                    <input
                      type="text"
                      placeholder={t('admin:dashboard.clients.search')}
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="w-full md:w-80 px-4 py-3 bg-transparent border-0 focus:outline-none focus:ring-0 text-gray-700 placeholder-gray-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table / Mobile Cards */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gradient-to-r from-amber-50/50 to-orange-50/50 backdrop-blur-sm">
                <th className={`px-8 py-6 ${isRTL ? 'text-right' : 'text-left'} text-sm font-bold text-gray-700 uppercase tracking-wider`}>
                  <div className="flex items-center space-x-2">
                    <UserGroupIcon className="w-4 h-4 text-amber-600" />
                    <span>{t('admin:dashboard.clients.name')}</span>
                  </div>
                </th>
                <th className={`px-8 py-6 ${isRTL ? 'text-right' : 'text-left'} text-sm font-bold text-gray-700 uppercase tracking-wider`}>
                  {t('admin:dashboard.clients.email')}
                </th>
                <th className={`px-8 py-6 ${isRTL ? 'text-right' : 'text-left'} text-sm font-bold text-gray-700 uppercase tracking-wider`}>
                  {t('admin:dashboard.clients.phone')}
                </th>
                <th className={`px-8 py-6 ${isRTL ? 'text-right' : 'text-left'} text-sm font-bold text-gray-700 uppercase tracking-wider`}>
                  {t('admin:dashboard.clients.nationality')}
                </th>
                <th className={`px-8 py-6 ${isRTL ? 'text-right' : 'text-left'} text-sm font-bold text-gray-700 uppercase tracking-wider`}>
                  {t('admin:dashboard.clients.registrationDate')}
                </th>
                <th className={`px-8 py-6 ${isRTL ? 'text-right' : 'text-left'} text-sm font-bold text-gray-700 uppercase tracking-wider`}>
                  {t('admin:dashboard.clients.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50">
              {filteredClients.map((client, index) => (
                <tr
                  key={client._id}
                  className="hover:bg-gradient-to-r hover:from-amber-50/30 hover:to-orange-50/30 transition-all duration-300 group"
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-amber-400 to-orange-400 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-base font-medium text-gray-900">{client.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-sm text-gray-700">{client.email}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-sm text-gray-700 font-medium">
                    {client.phone}
                  </td>
                  <td className="px-8 py-6">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300">
                      {client.nationality}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-sm text-gray-700">
                    {new Date(client.createdAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => onViewClient?.(client)}
                        className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEditClient?.(client)}
                        className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(client)}
                        className="w-8 h-8 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg"
                        title="Delete Client"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-4 p-4">
          {filteredClients.map((client, index) => (
            <div
              key={client._id}
              className="bg-gradient-to-r from-amber-50/50 to-orange-50/50 backdrop-blur-sm rounded-2xl p-4 border border-amber-200/50 hover:border-amber-300/50 transition-all duration-300 hover:shadow-lg"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-amber-400 to-orange-400 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-base">{client.name}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <p className="text-sm text-gray-600">{client.email}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onViewClient?.(client)}
                    className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEditClient?.(client)}
                    className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(client)}
                    className="w-8 h-8 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg"
                    title="Delete Client"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 font-medium">{t('admin:dashboard.clients.phone')}</p>
                  <p className="text-gray-900 font-semibold">{client.phone}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">{t('admin:dashboard.clients.nationality')}</p>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300">
                    {client.nationality}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-amber-200/50">
                <p className="text-xs text-gray-500">
                  {t('admin:dashboard.clients.registrationDate')}: {new Date(client.createdAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
                </p>
              </div>
            </div>          ))}
        </div>

        {/* Pagination */}
        {pagination && onPageChange && (
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalClients}
            itemsPerPage={itemsPerPage}
            onPageChange={onPageChange}
            onItemsPerPageChange={onItemsPerPageChange}
            isRTL={isRTL}
            itemName="clients"
          />
        )}
      </div>

      {/* Add Client Modal */}
      <AddClientModal
        isOpen={showAddClientModal}
        onClose={() => setShowAddClientModal(false)}
        onSubmit={handleCreateClient}
        isLoading={isCreatingClient}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && clientToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-center text-gray-900 mb-2">
              {t('admin:dashboard.clients.modal.deleteTitle')}
            </h3>
            <p className="text-center text-gray-600 mb-2">
              {t('admin:dashboard.clients.modal.deleteConfirm')} <span className="font-semibold">{clientToDelete.name}</span>?
            </p>
            <p className="text-center text-sm text-red-600 mb-6">
              {t('admin:dashboard.clients.modal.deleteWarning')}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setClientToDelete(null);
                }}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-300"
                disabled={isDeletingClient}
              >
                {t('admin:dashboard.clients.modal.cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeletingClient}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeletingClient ? t('admin:dashboard.clients.modal.deleting') : t('admin:dashboard.clients.modal.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
