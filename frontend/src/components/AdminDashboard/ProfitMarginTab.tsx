import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  CurrencyDollarIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
  FunnelIcon,
  PlayIcon,
  XMarkIcon,
  CheckIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { adminAPI } from '../../services/adminAPI';

// Types
interface MarginConditions {
  countries: string[];
  cities: string[];
  starRating: { min: number | null; max: number | null };
  bookingValue: { min: number | null; max: number | null };
  dateRange: { start: string | null; end: string | null };
  mealTypes: string[];
  customerType: 'all' | 'b2c' | 'b2b';
}

interface MarginRule {
  _id: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed' | 'hybrid';
  value: number;
  fixedAmount: number;
  currency: string;
  priority: number;
  status: 'active' | 'inactive';
  conditions: MarginConditions;
  appliedCount: number;
  totalRevenueGenerated: number;
  createdBy?: { name: string; email: string };
  createdAt: string;
}

interface MarginStats {
  summary: {
    totalRules: number;
    totalApplied: number;
    totalRevenue: number;
    avgMargin: number;
  };
  byType: Array<{ _id: string; count: number; avgValue: number }>;
}

interface ProfitMarginTabProps {
  isRTL: boolean;
}

const initialConditions: MarginConditions = {
  countries: [],
  cities: [],
  starRating: { min: null, max: null },
  bookingValue: { min: null, max: null },
  dateRange: { start: null, end: null },
  mealTypes: [],
  customerType: 'all',
};

export const ProfitMarginTab: React.FC<ProfitMarginTabProps> = ({ isRTL }) => {
  const { t } = useTranslation();
  const [rules, setRules] = useState<MarginRule[]>([]);
  const [stats, setStats] = useState<MarginStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<MarginRule | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Available locations from database
  const [availableCountries, setAvailableCountries] = useState<{code: string; name: string}[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'percentage' as 'percentage' | 'fixed' | 'hybrid',
    value: 15,
    fixedAmount: 0,
    currency: 'SAR',
    priority: 0,
    conditions: { ...initialConditions },
  });

  // Simulator state
  const [simulatorData, setSimulatorData] = useState({
    basePrice: 500,
    country: '',
    city: '',
    starRating: 4,
    checkInDate: '',
    mealType: 'room_only',
    customerType: 'b2c',
  });
  const [simulationResult, setSimulationResult] = useState<any>(null);

  // Fetch rules and stats
  const fetchData = async () => {
    setLoading(true);
    try {
      const [rulesRes, statsRes] = await Promise.all([
        adminAPI.getMarginRules({ status: statusFilter, type: typeFilter }),
        adminAPI.getMarginStats(),
      ]);
      setRules(rulesRes.data.data.rules || []);
      setStats(statsRes.data.data || null);
    } catch (error) {
      console.error('Error fetching margin data:', error);
      toast.error('Failed to load margin rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, typeFilter]);

  // Fetch available countries on mount
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await adminAPI.getMarginLocations();
        setAvailableCountries(res.data.data.countries || []);
        setAvailableCities(res.data.data.cities || []);
      } catch (error) {
        console.error('Error fetching countries:', error);
      }
    };
    fetchCountries();
  }, []);

  // Fetch cities filtered by selected countries
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const countriesParam = formData.conditions.countries.length > 0
          ? formData.conditions.countries.join(',')
          : '';
        const res = await adminAPI.getMarginLocations({ countries: countriesParam });
        setAvailableCities(res.data.data.cities || []);
      } catch (error) {
        console.error('Error fetching cities:', error);
      }
    };
    fetchCities();
  }, [formData.conditions.countries]);

  // Open create/edit modal
  const openModal = (rule?: MarginRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        name: rule.name,
        description: rule.description || '',
        type: rule.type,
        value: rule.value,
        fixedAmount: rule.fixedAmount,
        currency: rule.currency,
        priority: rule.priority,
        conditions: { ...initialConditions, ...rule.conditions },
      });
    } else {
      setEditingRule(null);
      setFormData({
        name: '',
        description: '',
        type: 'percentage',
        value: 15,
        fixedAmount: 0,
        currency: 'SAR',
        priority: rules.length,
        conditions: { ...initialConditions },
      });
    }
    setShowModal(true);
  };

  // Save rule
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Rule name is required');
      return;
    }

    try {
      if (editingRule) {
        await adminAPI.updateMarginRule(editingRule._id, formData);
        toast.success('Rule updated successfully');
      } else {
        await adminAPI.createMarginRule(formData);
        toast.success('Rule created successfully');
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save rule');
    }
  };

  // Delete rule
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;

    try {
      await adminAPI.deleteMarginRule(id);
      toast.success('Rule deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete rule');
    }
  };

  // Toggle rule status
  const handleToggle = async (id: string) => {
    try {
      await adminAPI.toggleMarginRule(id);
      toast.success('Rule status updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to toggle rule');
    }
  };

  // Run simulation
  const runSimulation = async () => {
    try {
      const res = await adminAPI.simulateMargin(simulatorData);
      setSimulationResult(res.data.data);
    } catch (error) {
      toast.error('Simulation failed');
    }
  };

  // Add condition
  const addCountry = (country: string) => {
    if (country && !formData.conditions.countries.includes(country)) {
      setFormData({
        ...formData,
        conditions: {
          ...formData.conditions,
          countries: [...formData.conditions.countries, country],
        },
      });
    }
  };

  const removeCountry = (country: string) => {
    setFormData({
      ...formData,
      conditions: {
        ...formData.conditions,
        countries: formData.conditions.countries.filter((c) => c !== country),
      },
    });
  };

  const addCity = (city: string) => {
    if (city && !formData.conditions.cities.includes(city)) {
      setFormData({
        ...formData,
        conditions: {
          ...formData.conditions,
          cities: [...formData.conditions.cities, city],
        },
      });
    }
  };

  const removeCity = (city: string) => {
    setFormData({
      ...formData,
      conditions: {
        ...formData.conditions,
        cities: formData.conditions.cities.filter((c) => c !== city),
      },
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-3xl blur-3xl"></div>
        <div className="relative bg-white/80 backdrop-blur-xl border border-white/30 rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
                <CurrencyDollarIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Profit Margins
                </h2>
                <p className="text-gray-600 mt-1">Manage pricing rules and markups</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Status Filter */}
              <div className="relative bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-1 shadow-lg">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center ml-2">
                    <FunnelIcon className="w-5 h-5 text-white" />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="min-w-[120px] px-4 py-3 bg-transparent border-0 focus:outline-none focus:ring-0 text-gray-700 font-medium"
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Simulator Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSimulator(true)}
                className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-5 py-3 rounded-xl font-medium shadow-lg"
              >
                <PlayIcon className="w-5 h-5" />
                <span>Simulator</span>
              </motion.button>

              {/* Add Rule Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => openModal()}
                className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-5 py-3 rounded-xl font-medium shadow-lg"
              >
                <PlusIcon className="w-5 h-5" />
                <span>Add Rule</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Active Rules</p>
                <p className="text-3xl font-bold text-gray-900">{stats.summary.totalRules}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <ChartBarIcon className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Times Applied</p>
                <p className="text-3xl font-bold text-gray-900">{stats.summary.totalApplied.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <ArrowPathIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Revenue Generated</p>
                <p className="text-3xl font-bold text-gray-900">SAR {stats.summary.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Average Margin</p>
                <p className="text-3xl font-bold text-gray-900">{(stats.summary.avgMargin || 0).toFixed(1)}%</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <ChartBarIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Rules Table */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-emerald-200 rounded-full animate-spin border-t-emerald-500"></div>
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-20">
            <CurrencyDollarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No margin rules yet</p>
            <p className="text-gray-400 text-sm mt-1">Create your first rule to start managing profits</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gradient-to-r from-emerald-50/50 to-teal-50/50 backdrop-blur-sm">
                  <th className={`px-6 py-5 ${isRTL ? 'text-right' : 'text-left'} text-xs font-bold text-gray-700 uppercase tracking-wider`}>
                    Rule Name
                  </th>
                  <th className={`px-6 py-5 ${isRTL ? 'text-right' : 'text-left'} text-xs font-bold text-gray-700 uppercase tracking-wider`}>
                    Type / Value
                  </th>
                  <th className={`px-6 py-5 ${isRTL ? 'text-right' : 'text-left'} text-xs font-bold text-gray-700 uppercase tracking-wider`}>
                    Conditions
                  </th>
                  <th className={`px-6 py-5 ${isRTL ? 'text-right' : 'text-left'} text-xs font-bold text-gray-700 uppercase tracking-wider`}>
                    Priority
                  </th>
                  <th className={`px-6 py-5 ${isRTL ? 'text-right' : 'text-left'} text-xs font-bold text-gray-700 uppercase tracking-wider`}>
                    Status
                  </th>
                  <th className={`px-6 py-5 ${isRTL ? 'text-right' : 'text-left'} text-xs font-bold text-gray-700 uppercase tracking-wider`}>
                    Applied
                  </th>
                  <th className={`px-6 py-5 ${isRTL ? 'text-right' : 'text-left'} text-xs font-bold text-gray-700 uppercase tracking-wider`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50">
                {rules.map((rule, index) => (
                  <motion.tr
                    key={rule._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className="hover:bg-gradient-to-r hover:from-emerald-50/30 hover:to-teal-50/30 transition-all duration-300"
                  >
                    <td className="px-6 py-5">
                      <div>
                        <p className="font-semibold text-gray-900">{rule.name}</p>
                        {rule.description && (
                          <p className="text-sm text-gray-500 truncate max-w-[200px]">{rule.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          rule.type === 'percentage' ? 'bg-blue-100 text-blue-700' :
                          rule.type === 'fixed' ? 'bg-green-100 text-green-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {rule.type}
                        </span>
                        <span className="font-bold text-gray-900">
                          {rule.type === 'fixed' ? `${rule.currency} ${rule.fixedAmount}` : `${rule.value}%`}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-1">
                        {rule.conditions.countries.length > 0 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            {rule.conditions.countries.length} countries
                          </span>
                        )}
                        {rule.conditions.cities.length > 0 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            {rule.conditions.cities.length} cities
                          </span>
                        )}
                        {rule.conditions.starRating.min && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                            ≥{rule.conditions.starRating.min}★
                          </span>
                        )}
                        {(rule.conditions.dateRange?.start || rule.conditions.dateRange?.end) && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            📅 Date Range
                          </span>
                        )}
                        {(rule.conditions.bookingValue?.min || rule.conditions.bookingValue?.max) && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                            💰 Value Filter
                          </span>
                        )}
                        {rule.conditions.mealTypes?.length > 0 && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                            🍽️ {rule.conditions.mealTypes.length} meal types
                          </span>
                        )}
                        {rule.conditions.countries.length === 0 &&
                         rule.conditions.cities.length === 0 &&
                         !rule.conditions.starRating?.min &&
                         !rule.conditions.dateRange?.start &&
                         !rule.conditions.dateRange?.end &&
                         !rule.conditions.bookingValue?.min &&
                         !rule.conditions.bookingValue?.max &&
                         (!rule.conditions.mealTypes || rule.conditions.mealTypes.length === 0) && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">
                            Global
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
                        {rule.priority}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <button
                        onClick={() => handleToggle(rule._id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          rule.status === 'active'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {rule.status}
                      </button>
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-600">
                      {rule.appliedCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => openModal(rule)}
                          className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDelete(rule._id)}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {editingRule ? 'Edit Rule' : 'Create New Rule'}
                  </h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <XMarkIcon className="w-6 h-6 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rule Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="e.g., Saudi Arabia Premium"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      rows={2}
                      placeholder="Optional description"
                    />
                  </div>
                </div>

                {/* Margin Settings */}
                <div className="bg-gray-50 rounded-2xl p-4 space-y-4">
                  <h4 className="font-semibold text-gray-900">Margin Settings</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="percentage">Percentage</option>
                        <option value="fixed">Fixed Amount</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {formData.type === 'fixed' ? 'Amount' : 'Percentage'}
                      </label>
                      <input
                        type="number"
                        value={formData.value}
                        onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                        min="0"
                        max="100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                      <input
                        type="number"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>
                </div>

                {/* Conditions */}
                <div className="bg-gray-50 rounded-2xl p-4 space-y-4">
                  <h4 className="font-semibold text-gray-900">Conditions (Optional)</h4>
                  <p className="text-sm text-gray-500">Leave empty for a global rule that applies to all bookings</p>

                  {/* Countries */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Countries</label>
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {formData.conditions.countries.map((country) => (
                        <span key={country} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm flex items-center gap-1">
                          {country}
                          <button onClick={() => removeCountry(country)}>
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          addCountry(e.target.value);
                        }
                      }}
                    >
                      <option value="">Select country to add...</option>
                      {availableCountries
                        .filter(c => !formData.conditions.countries.includes(c.name))
                        .map((country) => (
                          <option key={country.code} value={country.name}>{country.name}</option>
                        ))}
                    </select>
                  </div>

                  {/* Cities */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cities</label>
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {formData.conditions.cities.map((city) => (
                        <span key={city} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1">
                          {city}
                          <button onClick={() => removeCity(city)}>
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          addCity(e.target.value);
                        }
                      }}
                    >
                      <option value="">Select city to add...</option>
                      {availableCities
                        .filter(c => !formData.conditions.cities.includes(c))
                        .map((city) => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                    </select>
                  </div>

                  {/* Star Rating */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Min Star Rating</label>
                      <select
                        value={formData.conditions.starRating.min || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          conditions: {
                            ...formData.conditions,
                            starRating: { ...formData.conditions.starRating, min: e.target.value ? Number(e.target.value) : null }
                          }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">Any</option>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>{n} Star</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max Star Rating</label>
                      <select
                        value={formData.conditions.starRating.max || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          conditions: {
                            ...formData.conditions,
                            starRating: { ...formData.conditions.starRating, max: e.target.value ? Number(e.target.value) : null }
                          }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">Any</option>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>{n} Star</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={formData.conditions.dateRange.start || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          conditions: {
                            ...formData.conditions,
                            dateRange: { ...formData.conditions.dateRange, start: e.target.value || null }
                          }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={formData.conditions.dateRange.end || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          conditions: {
                            ...formData.conditions,
                            dateRange: { ...formData.conditions.dateRange, end: e.target.value || null }
                          }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Booking Value */}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Min Booking Value ($)</label>
                      <input
                        type="number"
                        value={formData.conditions.bookingValue.min || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          conditions: {
                            ...formData.conditions,
                            bookingValue: { ...formData.conditions.bookingValue, min: e.target.value ? Number(e.target.value) : null }
                          }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                        placeholder="e.g., 1000"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max Booking Value ($)</label>
                      <input
                        type="number"
                        value={formData.conditions.bookingValue.max || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          conditions: {
                            ...formData.conditions,
                            bookingValue: { ...formData.conditions.bookingValue, max: e.target.value ? Number(e.target.value) : null }
                          }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                        placeholder="e.g., 10000"
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Meal Types */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Meal Types</label>
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {formData.conditions.mealTypes.map((meal) => {
                        const mealLabels: { [key: string]: string } = {
                          'all_inclusive': 'All-Inclusive',
                          'breakfast': 'Breakfast',
                          'half_board': 'Half-Board',
                          'full_board': 'Full-Board',
                          'room_only': 'Room Only'
                        };
                        return (
                          <span key={meal} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm flex items-center gap-1">
                            {mealLabels[meal] || meal}
                            <button onClick={() => setFormData({
                              ...formData,
                              conditions: {
                                ...formData.conditions,
                                mealTypes: formData.conditions.mealTypes.filter((m) => m !== meal)
                              }
                            })}>
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      value=""
                      onChange={(e) => {
                        if (e.target.value && !formData.conditions.mealTypes.includes(e.target.value)) {
                          setFormData({
                            ...formData,
                            conditions: {
                              ...formData.conditions,
                              mealTypes: [...formData.conditions.mealTypes, e.target.value]
                            }
                          });
                        }
                      }}
                    >
                      <option value="">Select meal type to add...</option>
                      {[
                        { value: 'all_inclusive', label: 'All-Inclusive' },
                        { value: 'breakfast', label: 'Breakfast' },
                        { value: 'half_board', label: 'Half-Board' },
                        { value: 'full_board', label: 'Full-Board' },
                        { value: 'room_only', label: 'Room Only' }
                      ]
                        .filter(m => !formData.conditions.mealTypes.includes(m.value))
                        .map((meal) => (
                          <option key={meal.value} value={meal.value}>{meal.label}</option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-colors font-medium flex items-center space-x-2"
                >
                  <CheckIcon className="w-5 h-5" />
                  <span>{editingRule ? 'Update Rule' : 'Create Rule'}</span>
                </button>
              </div>
          </motion.div>
        </motion.div>
      )}

      {/* Simulator Modal */}
      {showSimulator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSimulator(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900">Margin Simulator</h3>
                  <button
                    onClick={() => setShowSimulator(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <XMarkIcon className="w-6 h-6 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Base Price</label>
                  <input
                    type="number"
                    value={simulatorData.basePrice}
                    onChange={(e) => setSimulatorData({ ...simulatorData, basePrice: Number(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                    <input
                      type="text"
                      value={simulatorData.country}
                      onChange={(e) => setSimulatorData({ ...simulatorData, country: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                      placeholder="Saudi Arabia"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      value={simulatorData.city}
                      onChange={(e) => setSimulatorData({ ...simulatorData, city: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                      placeholder="Makkah"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Star Rating</label>
                  <select
                    value={simulatorData.starRating}
                    onChange={(e) => setSimulatorData({ ...simulatorData, starRating: Number(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n} Star</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={runSimulation}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-colors"
                >
                  Run Simulation
                </button>

                {simulationResult && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base Price:</span>
                      <span className="font-medium">SAR {simulationResult.calculation.basePrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Margin Applied:</span>
                      <span className="font-medium text-emerald-600">+SAR {simulationResult.calculation.marginAmount}</span>
                    </div>
                    <div className="flex justify-between border-t pt-3">
                      <span className="font-semibold">Final Price:</span>
                      <span className="text-xl font-bold text-gray-900">SAR {simulationResult.calculation.finalPrice}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Rule: {simulationResult.appliedRule?.name || 'Default (15%)'}
                    </div>
                  </div>
                )}
              </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default ProfitMarginTab;
