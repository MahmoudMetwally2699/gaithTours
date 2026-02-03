import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrophyIcon,
  Cog6ToothIcon,
  UsersIcon,
  PlusIcon,
  MinusIcon,
  ChartBarIcon,
  XMarkIcon,
  CheckIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface LoyaltySettings {
  _id: string;
  earningDollarsRequired: number;
  pointsPerDollar: number;
  pointsPerDollarRedemption: number;
  redemptionDollarValue: number;
  tierThresholds: {
    Silver: number;
    Gold: number;
    Platinum: number;
  };
  tierBenefits: {
    [key: string]: {
      discountPercent: number;
      freeCancellation: boolean;
      prioritySupport: boolean;
      description: string;
    };
  };
  isEnabled: boolean;
  programName: string;
  pointsExpiryDays: number;
}

interface LoyaltyUser {
  _id: string;
  name: string;
  email: string;
  loyaltyPoints: number;
  loyaltyTier: string;
  totalSpent: number;
  createdAt: string;
}

interface LoyaltyStats {
  totalUsers: number;
  totalPoints: number;
  totalSpent: number;
  avgPoints: number;
  tierDistribution: {
    Bronze: number;
    Silver: number;
    Gold: number;
    Platinum: number;
  };
}

const TIER_COLORS: { [key: string]: string } = {
  Bronze: 'bg-amber-100 text-amber-800 border-amber-200',
  Silver: 'bg-gray-100 text-gray-800 border-gray-300',
  Gold: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Platinum: 'bg-purple-100 text-purple-800 border-purple-300'
};

export const LoyaltyTab: React.FC = () => {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'settings' | 'users'>('overview');
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [users, setUsers] = useState<LoyaltyUser[]>([]);
  const [stats, setStats] = useState<LoyaltyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState<LoyaltyUser | null>(null);
  const [adjustPoints, setAdjustPoints] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    fetchSettings();
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'users') {
      fetchUsers();
    }
  }, [activeSubTab, currentPage, tierFilter]);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/loyalty/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching loyalty settings:', error);
      toast.error('Failed to load loyalty settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/loyalty/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching loyalty stats:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });
      if (tierFilter) params.append('tier', tierFilter);
      if (userSearch) params.append('search', userSearch);

      const response = await fetch(`${API_URL}/loyalty/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setUsers(data.users);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching loyalty users:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/loyalty/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Loyalty settings saved!');
        setSettings(data.settings);
      } else {
        toast.error(data.message || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustPoints = async () => {
    if (!showAdjustModal || adjustPoints === 0) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/loyalty/adjust/${showAdjustModal._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ points: adjustPoints, reason: adjustReason })
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(`Adjusted ${adjustPoints > 0 ? '+' : ''}${adjustPoints} points for ${showAdjustModal.name}`);
        setShowAdjustModal(null);
        setAdjustPoints(0);
        setAdjustReason('');
        fetchUsers();
        fetchStats();
      } else {
        toast.error(data.message || 'Failed to adjust points');
      }
    } catch (error) {
      console.error('Error adjusting points:', error);
      toast.error('Failed to adjust points');
    }
  };

  const handleSearchUsers = () => {
    setCurrentPage(1);
    fetchUsers();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrophyIcon className="w-7 h-7 text-orange-500" />
            {settings?.programName || 'Loyalty Program'}
          </h2>
          <p className="text-gray-600">Manage rewards, tiers, and customer loyalty</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${settings?.isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {settings?.isEnabled ? 'Active' : 'Disabled'}
          </span>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {[
            { id: 'overview', label: 'Overview', icon: ChartBarIcon },
            { id: 'settings', label: 'Settings', icon: Cog6ToothIcon },
            { id: 'users', label: 'Members', icon: UsersIcon }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as 'overview' | 'settings' | 'users')}
              className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
                activeSubTab === tab.id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeSubTab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="text-sm text-gray-500 mb-1">Total Members</div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="text-sm text-gray-500 mb-1">Total Points Issued</div>
              <div className="text-3xl font-bold text-orange-600">{stats.totalPoints.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="text-sm text-gray-500 mb-1">Total Revenue from Members</div>
              <div className="text-3xl font-bold text-green-600">${stats.totalSpent.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="text-sm text-gray-500 mb-1">Avg Points per Member</div>
              <div className="text-3xl font-bold text-purple-600">{stats.avgPoints.toLocaleString()}</div>
            </div>
          </div>

          {/* Tier Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tier Distribution</h3>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(stats.tierDistribution).map(([tier, count]) => (
                <div key={tier} className={`p-4 rounded-lg border ${TIER_COLORS[tier]}`}>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm">{tier}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Current Settings Summary */}
          {settings && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-gray-500">Points per $1</div>
                  <div className="text-xl font-semibold">{settings.pointsPerDollar}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Silver Threshold</div>
                  <div className="text-xl font-semibold">{settings.tierThresholds.Silver.toLocaleString()} pts</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Gold Threshold</div>
                  <div className="text-xl font-semibold">{settings.tierThresholds.Gold.toLocaleString()} pts</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeSubTab === 'settings' && settings && (
        <div className="space-y-6">
          {/* General Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program Name</label>
                <input
                  type="text"
                  value={settings.programName}
                  onChange={(e) => setSettings({ ...settings, programName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.isEnabled}
                    onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
                <span className="text-sm font-medium text-gray-700">Program Enabled</span>
              </div>
            </div>

            {/* Points Earning Rate - Both values editable */}
            <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-100">
              <label className="block text-sm font-medium text-gray-700 mb-3">Points Earning Rate</label>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-gray-600">For every</span>
                <div className="flex items-center">
                  <span className="text-gray-600 mr-1">$</span>
                  <input
                    type="number"
                    value={settings.earningDollarsRequired || 1}
                    onChange={(e) => setSettings({ ...settings, earningDollarsRequired: Number(e.target.value) })}
                    min="1"
                    step="1"
                    className="w-20 px-3 py-1.5 border border-orange-300 rounded-lg text-center focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white font-semibold text-orange-600"
                  />
                </div>
                <span className="text-gray-600">spent, user earns</span>
                <input
                  type="number"
                  value={settings.pointsPerDollar || 1}
                  onChange={(e) => setSettings({ ...settings, pointsPerDollar: Number(e.target.value) })}
                  min="0"
                  step="1"
                  className="w-20 px-3 py-1.5 border border-orange-300 rounded-lg text-center focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white font-semibold text-orange-600"
                />
                <span className="text-gray-600">points</span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Example: "$200 spent → 1 point" or "$100 spent → 5 points"
              </p>
            </div>

            {/* Points Redemption Rate - Both values editable */}
            <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
              <label className="block text-sm font-medium text-gray-700 mb-3">Points Redemption Rate</label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  value={settings.pointsPerDollarRedemption || 100}
                  onChange={(e) => setSettings({ ...settings, pointsPerDollarRedemption: Number(e.target.value) })}
                  min="1"
                  step="1"
                  className="w-20 px-3 py-1.5 border border-green-300 rounded-lg text-center focus:ring-2 focus:ring-green-500 focus:outline-none bg-white font-semibold text-green-600"
                />
                <span className="text-gray-600">points =</span>
                <div className="flex items-center">
                  <span className="text-gray-600 mr-1">$</span>
                  <input
                    type="number"
                    value={settings.redemptionDollarValue || 1}
                    onChange={(e) => setSettings({ ...settings, redemptionDollarValue: Number(e.target.value) })}
                    min="1"
                    step="1"
                    className="w-20 px-3 py-1.5 border border-green-300 rounded-lg text-center focus:ring-2 focus:ring-green-500 focus:outline-none bg-white font-semibold text-green-600"
                  />
                </div>
                <span className="text-gray-600">discount</span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Example: "100 points → $1 discount" or "50 points → $5 discount"
              </p>
            </div>
          </div>

          {/* Tier Thresholds */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tier Thresholds (Points Required)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Silver</label>
                <input
                  type="number"
                  value={settings.tierThresholds.Silver}
                  onChange={(e) => setSettings({
                    ...settings,
                    tierThresholds: { ...settings.tierThresholds, Silver: Number(e.target.value) }
                  })}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-yellow-600 mb-1">Gold</label>
                <input
                  type="number"
                  value={settings.tierThresholds.Gold}
                  onChange={(e) => setSettings({
                    ...settings,
                    tierThresholds: { ...settings.tierThresholds, Gold: Number(e.target.value) }
                  })}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-600 mb-1">Platinum</label>
                <input
                  type="number"
                  value={settings.tierThresholds.Platinum}
                  onChange={(e) => setSettings({
                    ...settings,
                    tierThresholds: { ...settings.tierThresholds, Platinum: Number(e.target.value) }
                  })}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Tier Benefits */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tier Benefits</h3>
            <div className="space-y-6">
              {['Bronze', 'Silver', 'Gold', 'Platinum'].map(tier => (
                <div key={tier} className={`p-4 rounded-lg border ${TIER_COLORS[tier]}`}>
                  <h4 className="font-semibold mb-3">{tier} Tier</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.tierBenefits[tier]?.freeCancellation || false}
                        onChange={(e) => setSettings({
                          ...settings,
                          tierBenefits: {
                            ...settings.tierBenefits,
                            [tier]: { ...settings.tierBenefits[tier], freeCancellation: e.target.checked }
                          }
                        })}
                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                      <label className="text-sm">Free Cancellation</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.tierBenefits[tier]?.prioritySupport || false}
                        onChange={(e) => setSettings({
                          ...settings,
                          tierBenefits: {
                            ...settings.tierBenefits,
                            [tier]: { ...settings.tierBenefits[tier], prioritySupport: e.target.checked }
                          }
                        })}
                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                      <label className="text-sm">Priority Support</label>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Description</label>
                      <input
                        type="text"
                        value={settings.tierBenefits[tier]?.description || ''}
                        onChange={(e) => setSettings({
                          ...settings,
                          tierBenefits: {
                            ...settings.tierBenefits,
                            [tier]: { ...settings.tierBenefits[tier], description: e.target.value }
                          }
                        })}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 flex items-center gap-2"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <select
              value={tierFilter}
              onChange={(e) => { setTierFilter(e.target.value); setCurrentPage(1); }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              <option value="">All Tiers</option>
              <option value="Bronze">Bronze</option>
              <option value="Silver">Silver</option>
              <option value="Gold">Gold</option>
              <option value="Platinum">Platinum</option>
            </select>
            <button
              onClick={handleSearchUsers}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              Search
            </button>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        <UsersIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No members found</p>
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${TIER_COLORS[user.loyaltyTier] || TIER_COLORS.Bronze}`}>
                            {user.loyaltyTier || 'Bronze'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-lg font-semibold text-orange-600">
                            {(user.loyaltyPoints || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          ${(user.totalSpent || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => setShowAdjustModal(user)}
                            className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg"
                            title="Adjust Points"
                          >
                            <AdjustmentsHorizontalIcon className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Adjust Points Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Adjust Points</h3>
              <button onClick={() => setShowAdjustModal(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center">
                <p className="font-medium text-gray-900">{showAdjustModal.name}</p>
                <p className="text-sm text-gray-500">{showAdjustModal.email}</p>
                <p className="text-lg font-semibold text-orange-600 mt-2">
                  Current: {(showAdjustModal.loyaltyPoints || 0).toLocaleString()} points
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Points Adjustment (+ to add, - to remove)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAdjustPoints(p => p - 100)}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <MinusIcon className="w-5 h-5" />
                  </button>
                  <input
                    type="number"
                    value={adjustPoints}
                    onChange={(e) => setAdjustPoints(Number(e.target.value))}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                  <button
                    onClick={() => setAdjustPoints(p => p + 100)}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <PlusIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g., Bonus for feedback, Correction..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="text-center text-sm text-gray-600">
                New total: <span className="font-semibold">{Math.max(0, (showAdjustModal.loyaltyPoints || 0) + adjustPoints).toLocaleString()}</span> points
              </div>
            </div>
            <div className="border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowAdjustModal(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustPoints}
                disabled={adjustPoints === 0}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300"
              >
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
