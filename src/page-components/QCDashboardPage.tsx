'use client';

import React, { useState } from 'react';
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
  ResponsiveContainer,
} from 'recharts';
import {
  CheckCircle,
  AlertCircle,
  TrendingUp,
  MapPin,
  Plus,
  Filter,
  Download,
  Eye,
} from 'lucide-react';

// Constants
const LOCATIONS = [
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

// Mock data
const mockStatsData = {
  todayInspections: 24,
  passRate: 94.5,
  pendingClaims: 3,
  activeLocations: 7,
};

const mockGradeData = [
  { name: 'Grade A', value: 65, color: '#27AE60' },
  { name: 'Grade B', value: 25, color: '#3498DB' },
  { name: 'Grade C', value: 8, color: '#F39C12' },
  { name: 'Grade D', value: 2, color: '#E74C3C' },
];

const mockDefectData = [
  { name: 'Wilting/Decay', count: 24 },
  { name: 'Discoloration', count: 18 },
  { name: 'Pest Damage', count: 15 },
  { name: 'Mold/Fungal', count: 12 },
  { name: 'Bruising', count: 11 },
  { name: 'Foreign Material', count: 8 },
  { name: 'Wrong Label', count: 6 },
  { name: 'Dehydration', count: 5 },
  { name: 'Temperature Abuse', count: 4 },
  { name: 'Contamination', count: 3 },
];

const mockInspections = [
  {
    id: 'INS-2024-001',
    date: '2024-03-06',
    location: 'Main Greenhouse',
    commodity: 'Basil',
    grade: 'A',
    vendor: 'Fresh Farms Co',
    cases: 45,
  },
  {
    id: 'INS-2024-002',
    date: '2024-03-06',
    location: 'North Facility',
    commodity: 'Cilantro',
    grade: 'B',
    vendor: 'GreenLeaf Inc',
    cases: 32,
  },
  {
    id: 'INS-2024-003',
    date: '2024-03-06',
    location: 'South Facility',
    commodity: 'Parsley',
    grade: 'A',
    vendor: 'Organic Gardens',
    cases: 28,
  },
  {
    id: 'INS-2024-004',
    date: '2024-03-05',
    location: 'East Wing',
    commodity: 'Dill',
    grade: 'C',
    vendor: 'Valley Produce',
    cases: 15,
  },
  {
    id: 'INS-2024-005',
    date: '2024-03-05',
    location: 'West Wing',
    commodity: 'Mint',
    grade: 'A',
    vendor: 'Premium Herbs',
    cases: 52,
  },
];

const getGradeBadgeColor = (grade: string) => {
  switch (grade) {
    case 'A':
      return 'bg-green-100 text-green-800';
    case 'B':
      return 'bg-blue-100 text-blue-800';
    case 'C':
      return 'bg-yellow-100 text-yellow-800';
    case 'D':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export function QCDashboardPage() {
  const [selectedLocation, setSelectedLocation] = useState<string>('All Locations');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Quality Control Dashboard</h1>
        <p className="text-gray-600">Monitor inspections, trends, and quality metrics across all locations</p>
      </div>

      {/* Location Selector and Actions */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between items-start md:items-center">
        <div className="flex gap-3 items-center">
          <Filter className="w-5 h-5 text-gray-600" />
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>All Locations</option>
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            <Plus className="w-4 h-4" />
            New Retail Check
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            <Plus className="w-4 h-4" />
            New Receiving Inspection
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Today's Inspections</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{mockStatsData.todayInspections}</p>
            </div>
            <CheckCircle className="w-12 h-12 text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Pass Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{mockStatsData.passRate}%</p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Pending Claims</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{mockStatsData.pendingClaims}</p>
            </div>
            <AlertCircle className="w-12 h-12 text-yellow-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Active Locations</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{mockStatsData.activeLocations}</p>
            </div>
            <MapPin className="w-12 h-12 text-purple-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Grade Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Grade Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={mockGradeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {mockGradeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Defect Pareto Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Defects</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockDefectData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Inspections Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Inspections</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Inspection ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Commodity
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Cases
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mockInspections.map((inspection) => (
                <tr key={inspection.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                    {inspection.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {inspection.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {inspection.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {inspection.commodity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getGradeBadgeColor(inspection.grade)}`}>
                      Grade {inspection.grade}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {inspection.vendor}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {inspection.cases}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-blue-600 hover:text-blue-800 transition">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 text-center">
          <button className="text-blue-600 hover:text-blue-800 font-medium text-sm transition">
            View All Inspections
          </button>
        </div>
      </div>
    </div>
  );
}
