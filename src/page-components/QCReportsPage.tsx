'use client';

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Download,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Calendar,
  Filter,
} from 'lucide-react';

// Constants
const LOCATIONS = [
  'All Locations',
  'Main Greenhouse',
  'North Facility',
  'South Facility',
  'East Wing',
  'West Wing',
  'Cooling Plant 1',
  'Cooling Plant 2',
  'Cooling Plant 3',
  'Packing Station A',
  'Packing Station B',
  'Warehouse 1',
  'Warehouse 2',
  'Distribution Center',
  'Retail Center 1',
  'Retail Center 2',
  'Testing Lab',
  'Secondary Processing',
];

// Mock 12-week defect trend data
const defectTrendData = [
  { week: 'Week 1', count: 145, trend: 0 },
  { week: 'Week 2', count: 132, trend: -8.9 },
  { week: 'Week 3', count: 148, trend: 12.1 },
  { week: 'Week 4', count: 126, trend: -14.9 },
  { week: 'Week 5', count: 119, trend: -5.6 },
  { week: 'Week 6', count: 134, trend: 12.6 },
  { week: 'Week 7', count: 108, trend: -19.4 },
  { week: 'Week 8', count: 98, trend: -9.3 },
  { week: 'Week 9', count: 95, trend: -3.1 },
  { week: 'Week 10', count: 87, trend: -8.4 },
  { week: 'Week 11', count: 82, trend: -5.7 },
  { week: 'Week 12', count: 76, trend: -7.3 },
];

// Mock vendor comparison data
const vendorComparisonData = [
  { name: 'Fresh Farms Co', inspections: 45, passRate: 92, defects: 24 },
  { name: 'GreenLeaf Inc', inspections: 38, passRate: 88, defects: 28 },
  { name: 'Organic Gardens', inspections: 42, passRate: 95, defects: 14 },
  { name: 'Valley Produce', inspections: 35, passRate: 85, defects: 32 },
  { name: 'Premium Herbs', inspections: 48, passRate: 90, defects: 26 },
  { name: 'Local Growers', inspections: 32, passRate: 89, defects: 20 },
];

// Mock location comparison data
const locationComparisonData = [
  { name: 'Main Greenhouse', passRate: 94, defects: 18, inspections: 45 },
  { name: 'North Facility', passRate: 91, defects: 22, inspections: 38 },
  { name: 'South Facility', passRate: 93, defects: 19, inspections: 42 },
  { name: 'East Wing', passRate: 87, defects: 28, inspections: 35 },
  { name: 'West Wing', passRate: 95, defects: 12, inspections: 28 },
  { name: 'Cooling Plant 1', passRate: 89, defects: 25, inspections: 32 },
];

// Mock vendor scorecard data
interface VendorScore {
  vendor: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
  passRate: number;
  defectRate: number;
  onTimeDelivery: number;
}

const vendorScorecardData: VendorScore[] = [
  {
    vendor: 'Organic Gardens',
    score: 94,
    trend: 'up',
    trendPercent: 2.1,
    passRate: 95,
    defectRate: 2.8,
    onTimeDelivery: 98,
  },
  {
    vendor: 'Fresh Farms Co',
    score: 89,
    trend: 'stable',
    trendPercent: 0.3,
    passRate: 92,
    defectRate: 5.4,
    onTimeDelivery: 96,
  },
  {
    vendor: 'Premium Herbs',
    score: 87,
    trend: 'down',
    trendPercent: -1.2,
    passRate: 90,
    defectRate: 6.2,
    onTimeDelivery: 94,
  },
  {
    vendor: 'GreenLeaf Inc',
    score: 84,
    trend: 'up',
    trendPercent: 1.8,
    passRate: 88,
    defectRate: 7.1,
    onTimeDelivery: 92,
  },
  {
    vendor: 'Local Growers',
    score: 82,
    trend: 'stable',
    trendPercent: 0.1,
    passRate: 89,
    defectRate: 7.8,
    onTimeDelivery: 90,
  },
  {
    vendor: 'Valley Produce',
    score: 78,
    trend: 'down',
    trendPercent: -2.4,
    passRate: 85,
    defectRate: 8.9,
    onTimeDelivery: 88,
  },
];

const getScoreBadgeColor = (score: number) => {
  if (score >= 90) return 'bg-green-100 text-green-800';
  if (score >= 80) return 'bg-blue-100 text-blue-800';
  if (score >= 70) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

export default function QCReportsPage() {
  const [location, setLocation] = useState('All Locations');
  const [dateFrom, setDateFrom] = useState('2024-01-01');
  const [dateTo, setDateTo] = useState('2024-03-06');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Quality Control Reports</h1>
        <p className="text-gray-600">Analytics and insights for quality metrics across 12 weeks</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-8 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Report Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition w-full">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 12-Week Defect Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">12-Week Defect Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={defectTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3B82F6"
                name="Defects"
                strokeWidth={2}
                dot={{ fill: '#3B82F6', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-blue-600">↓ 47.6%</span> reduction in defects
              over 12 weeks
            </p>
          </div>
        </div>

        {/* Vendor Comparison */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Vendor Pass Rate Comparison</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={vendorComparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="passRate" fill="#10B981" name="Pass Rate %" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Location Performance Comparison</h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={locationComparisonData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="passRate" fill="#3B82F6" name="Pass Rate %" radius={[8, 8, 0, 0]} />
            <Bar dataKey="defects" fill="#EF4444" name="Defects Count" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Vendor Scorecard */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Vendor Quality Scorecard</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Trend
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Pass Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Defect Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  On-Time Delivery
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {vendorScorecardData.map((vendor) => (
                <tr key={vendor.vendor} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {vendor.vendor}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreBadgeColor(vendor.score)}`}>
                      {vendor.score}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {vendor.trend === 'up' && (
                        <>
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-600">
                            +{vendor.trendPercent}%
                          </span>
                        </>
                      )}
                      {vendor.trend === 'down' && (
                        <>
                          <TrendingDown className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium text-red-600">
                            {vendor.trendPercent}%
                          </span>
                        </>
                      )}
                      {vendor.trend === 'stable' && (
                        <>
                          <ArrowRight className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-600">
                            {vendor.trendPercent}%
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${vendor.passRate}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {vendor.passRate}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {vendor.defectRate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${vendor.onTimeDelivery}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {vendor.onTimeDelivery}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg shadow p-6 border border-green-200">
          <h3 className="font-semibold text-gray-900 mb-2">Best Performer</h3>
          <p className="text-2xl font-bold text-green-600">Organic Gardens</p>
          <p className="text-sm text-gray-600 mt-2">94 overall score with 95% pass rate</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-orange-100 rounded-lg shadow p-6 border border-yellow-200">
          <h3 className="font-semibold text-gray-900 mb-2">Needs Attention</h3>
          <p className="text-2xl font-bold text-orange-600">Valley Produce</p>
          <p className="text-sm text-gray-600 mt-2">78 overall score with declining trend</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg shadow p-6 border border-blue-200">
          <h3 className="font-semibold text-gray-900 mb-2">Most Inspected</h3>
          <p className="text-2xl font-bold text-blue-600">Premium Herbs</p>
          <p className="text-sm text-gray-600 mt-2">48 inspections with 90% pass rate</p>
        </div>
      </div>
    </div>
  );
}
