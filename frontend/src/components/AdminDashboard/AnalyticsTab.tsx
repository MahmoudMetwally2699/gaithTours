import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowDownTrayIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import adminAPI from '../../services/adminAPI';
import toast from 'react-hot-toast';

interface AnalyticsData {
  revenue: {
    data: Array<{ date: string; revenue: number; transactions: number }>;
    summary: {
      totalRevenue: number;
      totalTransactions: number;
      averageTransaction: number;
      growthRate: number;
    };
  } | null;
  bookings: {
    byStatus: Record<string, number>;
    overTime: Array<{ date: string; total: number; confirmed: number; cancelled: number }>;
    funnel: {
      initiated: number;
      confirmed: number;
      paid: number;
      conversionRate: string;
    };
  } | null;
  popularHotels: Array<{
    rank: number;
    name: string;
    city: string;
    bookings: number;
    revenue: number;
  }>;
  popularDestinations: Array<{
    rank: number;
    city: string;
    country: string;
    bookings: number;
    revenue: number;
  }>;
  promoStats: {
    topCodes: Array<{
      code: string;
      usageCount: number;
      periodCount: number;
      totalDiscountGiven: number;
      currency?: string;
    }>;
    recentActivity: Array<{
      code: string;
      usedAt: string;
      discountApplied: number;
      userName: string;
      userEmail: string;
    }>;
  } | null;
}

const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#ef4444', '#eab308'];

export const AnalyticsTab: React.FC = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData>({
    revenue: null,
    bookings: null,
    popularHotels: [],
    popularDestinations: [],
    promoStats: null
  });

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [revenueRes, bookingsRes, hotelsRes, destinationsRes, promoStatsRes] = await Promise.all([
        fetch(`${API_URL}/admin/analytics/revenue?period=${period}`, { headers }).then(r => r.json()),
        fetch(`${API_URL}/admin/analytics/bookings?period=${period}`, { headers }).then(r => r.json()),
        fetch(`${API_URL}/admin/analytics/popular-hotels?period=${period}&limit=5`, { headers }).then(r => r.json()),
        fetch(`${API_URL}/admin/analytics/popular-destinations?period=${period}&limit=5`, { headers }).then(r => r.json()),
        fetch(`${API_URL}/admin/analytics/promo-stats?period=${period}&limit=5`, { headers }).then(r => r.json())
      ]);

      setData({
        revenue: revenueRes.success ? revenueRes.data : null,
        bookings: bookingsRes.success ? bookingsRes.data : null,
        popularHotels: hotelsRes.success ? hotelsRes.data.hotels : [],
        popularDestinations: destinationsRes.success ? destinationsRes.data.destinations : [],
        promoStats: promoStatsRes.success ? promoStatsRes.data : null
      });
    } catch (error) {
      console.error('Analytics fetch error:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: 'bookings' | 'revenue') => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/admin/analytics/export?type=${type}&period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${period}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      toast.success(`${type} data exported successfully`);
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const bookingStatusData = data.bookings?.byStatus
    ? Object.entries(data.bookings.byStatus).map(([name, value]) => ({ name, value }))
    : [];

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
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600">Track your business performance</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>

          {/* Export Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('bookings')}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Export Bookings</span>
            </button>
            <button
              onClick={() => handleExport('revenue')}
              className="flex items-center gap-2 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Export Revenue</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                ${data.revenue?.summary.totalRevenue.toLocaleString() || 0}
              </p>
            </div>
            <div className={`flex items-center gap-1 ${(data.revenue?.summary.growthRate || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(data.revenue?.summary.growthRate || 0) >= 0 ? (
                <ArrowTrendingUpIcon className="w-5 h-5" />
              ) : (
                <ArrowTrendingDownIcon className="w-5 h-5" />
              )}
              <span className="font-medium">{data.revenue?.summary.growthRate || 0}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.bookings?.funnel.initiated || 0}
              </p>
            </div>
            <CalendarDaysIcon className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.bookings?.funnel.conversionRate || 0}%
              </p>
            </div>
            <ChartBarIcon className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg. Transaction</p>
              <p className="text-2xl font-bold text-gray-900">
                ${data.revenue?.summary.averageTransaction || 0}
              </p>
            </div>
            <CurrencyDollarIcon className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.revenue?.data || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value: string) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Revenue']}
                labelFormatter={(label: string) => new Date(label).toLocaleDateString()}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bookings by Status */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bookings by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={bookingStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} (${((percent || 0) * 100).toFixed(0)}%)`}
              >
                {bookingStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bookings Over Time */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bookings Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.bookings?.overTime || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(value: string) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip labelFormatter={(label: string) => new Date(label).toLocaleDateString()} />
            <Legend />
            <Bar dataKey="confirmed" name="Confirmed" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="cancelled" name="Cancelled" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Popular Hotels & Destinations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Hotels */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <BuildingOfficeIcon className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-900">Top Hotels</h3>
          </div>
          <div className="space-y-3">
            {data.popularHotels.length > 0 ? (
              data.popularHotels.map((hotel) => (
                <div key={hotel.rank} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {hotel.rank}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{hotel.name}</p>
                      <p className="text-xs text-gray-500">{hotel.city}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{hotel.bookings} bookings</p>
                    <p className="text-xs text-green-600">${hotel.revenue.toLocaleString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No data available</p>
            )}
          </div>
        </div>

        {/* Popular Destinations */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <MapPinIcon className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">Top Destinations</h3>
          </div>
          <div className="space-y-3">
            {data.popularDestinations.length > 0 ? (
              data.popularDestinations.map((dest) => (
                <div key={dest.rank} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {dest.rank}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{dest.city}</p>
                      <p className="text-xs text-gray-500">{dest.country}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{dest.bookings} bookings</p>
                    <p className="text-xs text-green-600">${dest.revenue.toLocaleString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Promo Code Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Promo Codes Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <TagIcon className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-900">Top Promo Codes</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.promoStats?.topCodes || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="code" type="category" width={100} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: any, name: any) => {
                  if (name === 'Usage in Period') {
                    return [`${value} uses`, name];
                  }
                  return [`$${Number(value).toFixed(2)}`, name];
                }}
              />
              <Legend />
              <Bar dataKey="periodCount" name="Usage in Period" fill="#a855f7" radius={[0, 4, 4, 0]} barSize={20} />
              <Bar dataKey="totalDiscountGiven" name="Total Discount Given" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Promo Usage Table */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <TagIcon className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-900">Recent Usage</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Discount</th>
                  <th className="px-3 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.promoStats?.recentActivity && data.promoStats.recentActivity.length > 0 ? (
                  data.promoStats.recentActivity.map((activity, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900">{activity.code}</td>
                      <td className="px-3 py-2 text-gray-500">
                        <div>{activity.userName || 'Guest'}</div>
                        <div className="text-xs text-gray-400">{activity.userEmail || '-'}</div>
                      </td>
                      <td className="px-3 py-2 text-green-600 font-medium">${activity.discountApplied}</td>
                      <td className="px-3 py-2 text-gray-500">{new Date(activity.usedAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-gray-500">No recent activity</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTab;
