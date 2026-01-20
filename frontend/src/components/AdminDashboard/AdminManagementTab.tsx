import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  UserPlusIcon,
  TrashIcon,
  PencilIcon,
  EnvelopeIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
  TagIcon,
  PresentationChartLineIcon
} from '@heroicons/react/24/outline';
import { adminAPI } from '../../services/adminAPI';

interface SubAdmin {
  _id: string;
  name: string;
  email: string;
  adminPermissions: string[];
  invitedBy?: {
    name: string;
    email: string;
  };
  createdAt: string;
}

interface Invitation {
  _id: string;
  email: string;
  permissions: string[];
  expiresAt: string;
  status: string;
  invitedBy?: {
    name: string;
  };
  createdAt: string;
}

interface AdminManagementTabProps {
  isRTL: boolean;
}

const AVAILABLE_PERMISSIONS = [
  { id: 'dashboard', label: 'Dashboard Overview', icon: ChartBarIcon, color: 'orange' },
  { id: 'clients', label: 'Client Management', icon: UserGroupIcon, color: 'blue' },
  { id: 'bookings', label: 'Booking Management', icon: ClipboardDocumentListIcon, color: 'purple' },
  { id: 'payments', label: 'Payment Tracking', icon: CreditCardIcon, color: 'green' },
  { id: 'analytics', label: 'Analytics', icon: PresentationChartLineIcon, color: 'indigo' },
  { id: 'margins', label: 'Profit Margins', icon: CurrencyDollarIcon, color: 'emerald' },
  { id: 'promoCodes', label: 'Promo Codes', icon: TagIcon, color: 'pink' },
  { id: 'whatsapp', label: 'WhatsApp Messages', icon: ChatBubbleLeftRightIcon, color: 'cyan' }
];

export const AdminManagementTab: React.FC<AdminManagementTabProps> = ({ isRTL }) => {
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSubAdmin, setSelectedSubAdmin] = useState<SubAdmin | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'admins' | 'invitations'>('admins');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [subAdminsRes, invitationsRes] = await Promise.all([
        adminAPI.getSubAdmins(),
        adminAPI.getInvitations()
      ]);
      setSubAdmins(subAdminsRes.data.data.subAdmins || []);
      setInvitations(invitationsRes.data.data.invitations || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInvite = async () => {
    if (!inviteEmail || selectedPermissions.length === 0) {
      toast.error('Please enter email and select at least one permission');
      return;
    }

    try {
      setLoading(true);
      await adminAPI.inviteSubAdmin({
        email: inviteEmail,
        permissions: selectedPermissions
      });
      toast.success('Invitation sent successfully!');
      setShowInviteModal(false);
      setInviteEmail('');
      setSelectedPermissions([]);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedSubAdmin || selectedPermissions.length === 0) {
      toast.error('Please select at least one permission');
      return;
    }

    try {
      setLoading(true);
      await adminAPI.updateSubAdminPermissions(selectedSubAdmin._id, selectedPermissions);
      toast.success('Permissions updated successfully!');
      setShowEditModal(false);
      setSelectedSubAdmin(null);
      setSelectedPermissions([]);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSubAdmin = async (id: string) => {
    if (!window.confirm('Are you sure you want to revoke this sub-admin\'s access?')) return;

    try {
      setLoading(true);
      await adminAPI.removeSubAdmin(id);
      toast.success('Sub-admin access revoked');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove sub-admin');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvitation = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this invitation?')) return;

    try {
      setLoading(true);
      await adminAPI.cancelInvitation(id);
      toast.success('Invitation cancelled');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel invitation');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permId)
        ? prev.filter(p => p !== permId)
        : [...prev, permId]
    );
  };

  const openEditModal = (subAdmin: SubAdmin) => {
    setSelectedSubAdmin(subAdmin);
    setSelectedPermissions(subAdmin.adminPermissions || []);
    setShowEditModal(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPermissionBadges = (permissions: string[]) => {
    return permissions.map(permId => {
      const perm = AVAILABLE_PERMISSIONS.find(p => p.id === permId);
      if (!perm) return null;
      const Icon = perm.icon;
      return (
        <span
          key={permId}
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${perm.color}-100 text-${perm.color}-800 mr-1 mb-1`}
        >
          <Icon className="w-3 h-3 mr-1" />
          {perm.label}
        </span>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Admin Management</h2>
          <p className="text-gray-600 mt-1">Manage sub-admin access and permissions</p>
        </div>
        <button
          onClick={() => {
            setSelectedPermissions([]);
            setInviteEmail('');
            setShowInviteModal(true);
          }}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-300"
        >
          <UserPlusIcon className="w-5 h-5 mr-2" />
          Invite Sub-Admin
        </button>
      </motion.div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('admins')}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === 'admins'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Sub-Admins ({subAdmins.length})
        </button>
        <button
          onClick={() => setActiveTab('invitations')}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === 'invitations'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Pending Invitations ({invitations.filter(i => i.status === 'pending').length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'admins' && (
        <motion.div
          key="admins"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="grid gap-4"
        >
          {loading && subAdmins.length === 0 ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading sub-admins...</p>
            </div>
          ) : subAdmins.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-md">
              <ShieldCheckIcon className="w-16 h-16 text-gray-300 mx-auto" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No Sub-Admins Yet</h3>
              <p className="mt-2 text-gray-500">Invite team members to help manage the dashboard</p>
            </div>
          ) : (
            subAdmins.map((admin) => (
              <motion.div
                key={admin._id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {admin.name?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{admin.name}</h3>
                      <p className="text-sm text-gray-500">{admin.email}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Joined {formatDate(admin.createdAt)}
                        {admin.invitedBy && ` • Invited by ${admin.invitedBy.name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openEditModal(admin)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Permissions"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleRemoveSubAdmin(admin._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Revoke Access"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap">
                  {getPermissionBadges(admin.adminPermissions)}
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      )}

      {activeTab === 'invitations' && (
        <motion.div
          key="invitations"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="grid gap-4"
        >
          {invitations.filter(i => i.status === 'pending').length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-md">
              <EnvelopeIcon className="w-16 h-16 text-gray-300 mx-auto" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No Pending Invitations</h3>
              <p className="mt-2 text-gray-500">All invitations have been processed</p>
            </div>
          ) : (
            invitations
              .filter(i => i.status === 'pending')
              .map((invitation) => (
                <motion.div
                  key={invitation._id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center">
                        <ClockIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{invitation.email}</h3>
                        <p className="text-sm text-gray-500">
                          Expires {formatDate(invitation.expiresAt)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Sent {formatDate(invitation.createdAt)}
                          {invitation.invitedBy && ` by ${invitation.invitedBy.name}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCancelInvitation(invitation._id)}
                      className="inline-flex items-center px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                    >
                      <XMarkIcon className="w-4 h-4 mr-1" />
                      Cancel
                    </button>
                  </div>
                  <div className="mt-4 flex flex-wrap">
                    {getPermissionBadges(invitation.permissions)}
                  </div>
                </motion.div>
              ))
          )}
        </motion.div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Invite Sub-Admin</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions
                </label>
                <div className="space-y-2">
                  {AVAILABLE_PERMISSIONS.map((perm) => {
                    const Icon = perm.icon;
                    const isSelected = selectedPermissions.includes(perm.id);
                    return (
                      <button
                        key={perm.id}
                        onClick={() => togglePermission(perm.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-orange-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className={`w-5 h-5 ${isSelected ? 'text-orange-600' : 'text-gray-400'}`} />
                          <span className={`font-medium ${isSelected ? 'text-orange-900' : 'text-gray-700'}`}>
                            {perm.label}
                          </span>
                        </div>
                        {isSelected && <CheckCircleIcon className="w-5 h-5 text-orange-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={loading || !inviteEmail || selectedPermissions.length === 0}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {showEditModal && selectedSubAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Edit Permissions</h3>
                <p className="text-sm text-gray-500">{selectedSubAdmin.email}</p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-2">
              {AVAILABLE_PERMISSIONS.map((perm) => {
                const Icon = perm.icon;
                const isSelected = selectedPermissions.includes(perm.id);
                return (
                  <button
                    key={perm.id}
                    onClick={() => togglePermission(perm.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-orange-600' : 'text-gray-400'}`} />
                      <span className={`font-medium ${isSelected ? 'text-orange-900' : 'text-gray-700'}`}>
                        {perm.label}
                      </span>
                    </div>
                    {isSelected && <CheckCircleIcon className="w-5 h-5 text-orange-600" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePermissions}
                disabled={loading || selectedPermissions.length === 0}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminManagementTab;
