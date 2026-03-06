'use client';

import React, { useState } from 'react';
import {
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Eye,
  Edit,
} from 'lucide-react';

interface Claim {
  id: string;
  claimNumber: string;
  vendor: string;
  date: string;
  shipmentDate: string;
  location: string;
  commodity: string;
  cases: number;
  weight: number;
  status: 'draft' | 'submitted' | 'approved' | 'paid';
  baseDamage: number;
  laborBuffer: number;
  yieldLoss: number;
  total: number;
  notes: string;
}

const mockClaims: Claim[] = [
  {
    id: '1',
    claimNumber: 'CLM-2024-001',
    vendor: 'Fresh Farms Co',
    date: '2024-03-06',
    shipmentDate: '2024-03-04',
    location: 'Main Greenhouse',
    commodity: 'Basil',
    cases: 45,
    weight: 2250,
    status: 'approved',
    baseDamage: 156,
    laborBuffer: 50,
    yieldLoss: 94,
    total: 300,
    notes: 'Wilting detected on 15% of product',
  },
  {
    id: '2',
    claimNumber: 'CLM-2024-002',
    vendor: 'GreenLeaf Inc',
    date: '2024-03-05',
    shipmentDate: '2024-03-02',
    location: 'North Facility',
    commodity: 'Cilantro',
    cases: 32,
    weight: 1600,
    status: 'submitted',
    baseDamage: 72,
    laborBuffer: 50,
    yieldLoss: 48,
    total: 170,
    notes: 'Mold detected in 8% of cases',
  },
  {
    id: '3',
    claimNumber: 'CLM-2024-003',
    vendor: 'Organic Gardens',
    date: '2024-03-03',
    shipmentDate: '2024-02-28',
    location: 'South Facility',
    commodity: 'Parsley',
    cases: 28,
    weight: 1400,
    status: 'draft',
    baseDamage: 84,
    laborBuffer: 50,
    yieldLoss: 56,
    total: 190,
    notes: 'Temperature abuse - product arrived at 47°F',
  },
  {
    id: '4',
    claimNumber: 'CLM-2024-004',
    vendor: 'Valley Produce',
    date: '2024-03-01',
    shipmentDate: '2024-02-27',
    location: 'East Wing',
    commodity: 'Dill',
    cases: 15,
    weight: 750,
    status: 'paid',
    baseDamage: 45,
    laborBuffer: 50,
    yieldLoss: 30,
    total: 125,
    notes: 'Pest damage on 12% of product',
  },
  {
    id: '5',
    claimNumber: 'CLM-2024-005',
    vendor: 'Premium Herbs',
    date: '2024-02-28',
    shipmentDate: '2024-02-25',
    location: 'West Wing',
    commodity: 'Mint',
    cases: 52,
    weight: 2600,
    status: 'approved',
    baseDamage: 260,
    laborBuffer: 50,
    yieldLoss: 156,
    total: 466,
    notes: 'Multiple defects detected',
  },
];

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-800';
    case 'submitted':
      return 'bg-blue-100 text-blue-800';
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'paid':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function VendorClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>(mockClaims);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  // Get unique vendors and locations
  const uniqueVendors = Array.from(new Set(claims.map((c) => c.vendor)));
  const uniqueLocations = Array.from(new Set(claims.map((c) => c.location)));

  // Filter claims
  const filteredClaims = claims.filter((claim) => {
    const matchesSearch =
      searchTerm === '' ||
      claim.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.commodity.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || claim.status === statusFilter;
    const matchesVendor = vendorFilter === 'all' || claim.vendor === vendorFilter;
    const matchesLocation =
      locationFilter === 'all' || claim.location === locationFilter;

    let matchesDate = true;
    if (dateFrom) matchesDate = matchesDate && new Date(claim.date) >= new Date(dateFrom);
    if (dateTo) matchesDate = matchesDate && new Date(claim.date) <= new Date(dateTo);

    return matchesSearch && matchesStatus && matchesVendor && matchesLocation && matchesDate;
  });

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const totalAmount = filteredClaims.reduce((sum, claim) => sum + claim.total, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Vendor Claims</h1>
        <p className="text-gray-600">Manage and track vendor quality claims</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <p className="text-gray-600 text-sm font-medium">Total Claims</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{filteredClaims.length}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <p className="text-gray-600 text-sm font-medium">Total Amount</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">${totalAmount}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <p className="text-gray-600 text-sm font-medium">Pending Review</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {filteredClaims.filter((c) => c.status === 'submitted' || c.status === 'draft').length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <p className="text-gray-600 text-sm font-medium">Approved & Paid</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {filteredClaims.filter((c) => c.status === 'paid').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-8 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Claim #, vendor, commodity..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {/* Vendor Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vendor</label>
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Vendors</option>
              {uniqueVendors.map((vendor) => (
                <option key={vendor} value={vendor}>
                  {vendor}
                </option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Locations</option>
              {uniqueLocations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
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

          <div className="lg:col-span-2 flex items-end">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              <Download className="w-4 h-4" />
              Export Results
            </button>
          </div>
        </div>
      </div>

      {/* Claims List */}
      <div className="space-y-4">
        {filteredClaims.map((claim) => (
          <div
            key={claim.id}
            className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden hover:shadow-md transition"
          >
            {/* Header */}
            <div
              onClick={() => toggleExpand(claim.id)}
              className="p-6 cursor-pointer hover:bg-gray-50 transition flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{claim.claimNumber}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(claim.status)}`}>
                    {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Vendor:</span>
                    <p className="font-medium text-gray-900">{claim.vendor}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Commodity:</span>
                    <p className="font-medium text-gray-900">{claim.commodity}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Claim Date:</span>
                    <p className="font-medium text-gray-900">{claim.date}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Amount:</span>
                    <p className="font-bold text-blue-600 text-lg">${claim.total}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 ml-4">
                <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                  <Eye className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                  <Edit className="w-5 h-5" />
                </button>
                {expandedId === claim.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>

            {/* Expanded Details */}
            {expandedId === claim.id && (
              <div className="px-6 py-6 border-t border-gray-200 bg-gray-50 space-y-6">
                {/* Shipment Details */}
                <div className="bg-white rounded-lg p-4 space-y-4">
                  <h4 className="font-semibold text-gray-900">Shipment Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Location</p>
                      <p className="font-medium text-gray-900">{claim.location}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Cases</p>
                      <p className="font-medium text-gray-900">{claim.cases}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Weight</p>
                      <p className="font-medium text-gray-900">{claim.weight} lbs</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Shipment Date</p>
                      <p className="font-medium text-gray-900">{claim.shipmentDate}</p>
                    </div>
                  </div>
                </div>

                {/* Inspection Findings */}
                <div className="bg-white rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-gray-900">Inspection Findings</h4>
                  <p className="text-gray-700 text-sm">{claim.notes}</p>
                </div>

                {/* Credit Calculation */}
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 space-y-3 border border-yellow-200">
                  <h4 className="font-semibold text-gray-900">Credit Calculation</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between bg-white rounded px-3 py-2">
                      <span className="text-gray-600">Base Damage</span>
                      <span className="font-medium">${claim.baseDamage}</span>
                    </div>
                    <div className="flex justify-between bg-white rounded px-3 py-2">
                      <span className="text-gray-600">Labor Buffer</span>
                      <span className="font-medium">${claim.laborBuffer}</span>
                    </div>
                    <div className="flex justify-between bg-white rounded px-3 py-2">
                      <span className="text-gray-600">Yield Loss</span>
                      <span className="font-medium">${claim.yieldLoss}</span>
                    </div>
                    <div className="flex justify-between bg-yellow-200 rounded px-3 py-2 border-t border-yellow-300 mt-2 font-semibold text-lg">
                      <span>Total Credit</span>
                      <span>${claim.total}</span>
                    </div>
                  </div>
                </div>

                {/* Status Workflow */}
                <div className="bg-white rounded-lg p-4 space-y-4">
                  <h4 className="font-semibold text-gray-900">Status Workflow</h4>
                  <div className="flex items-center justify-between">
                    {['draft', 'submitted', 'approved', 'paid'].map((step, idx, arr) => (
                      <React.Fragment key={step}>
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white transition ${
                            ['draft', 'submitted', 'approved', 'paid'].indexOf(claim.status) >=
                            idx
                              ? 'bg-green-500'
                              : 'bg-gray-300'
                          }`}
                        >
                          {idx + 1}
                        </div>
                        {idx < arr.length - 1 && (
                          <div
                            className={`flex-1 h-0.5 mx-2 transition ${
                              ['draft', 'submitted', 'approved', 'paid'].indexOf(claim.status) >
                              idx
                                ? 'bg-green-500'
                                : 'bg-gray-300'
                            }`}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-xs text-center">
                    <span className="text-gray-600">Draft</span>
                    <span className="text-gray-600">Submitted</span>
                    <span className="text-gray-600">Approved</span>
                    <span className="text-gray-600">Paid</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition">
                    Edit
                  </button>
                  {claim.status !== 'draft' && claim.status !== 'paid' && (
                    <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition">
                      Update Status
                    </button>
                  )}
                  <button className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" />
                    Export PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredClaims.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 text-lg">No claims found matching your filters</p>
        </div>
      )}
    </div>
  );
}
