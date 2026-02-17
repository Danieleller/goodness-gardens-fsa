import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Camera,
  ArrowLeft,
  Loader,
} from 'lucide-react';
import { gapsAPI } from '@/api';

interface Facility {
  facility_id: string;
  facility_name: string;
  facility_code: string;
  total_required: number;
  current_count: number;
  needs_update_count: number;
  missing_count: number;
  readiness_pct: number;
}

interface SOP {
  sop_id: string;
  code: string;
  title: string;
  category: string;
  priority: string;
  status: 'current' | 'needs_update' | 'missing';
  last_review_date: string;
  reviewer_id: string;
}

interface Snapshot {
  id: string;
  snapshot_date: string;
  total_required: number;
  exists_current: number;
  needs_update: number;
  missing: number;
  readiness_pct: number;
}

interface FacilityDetail {
  facility: {
    id: string;
    name: string;
    code: string;
  };
  sops: SOP[];
  snapshots: Snapshot[];
}

type StatusFilter = 'all' | 'current' | 'needs_update' | 'missing';

// Circular Progress Gauge Component
function CircularGauge({ percentage }: { percentage: number }) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Color logic: red <50%, yellow 50-79%, green ≥80%
  let color = '#ef4444'; // red
  if (percentage >= 80) {
    color = '#22c55e'; // green
  } else if (percentage >= 50) {
    color = '#eab308'; // yellow
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 120 120" className="transform -rotate-90">
        {/* Background circle */}
        <circle cx="60" cy="60" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
        {/* Progress circle */}
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      {/* Percentage text */}
      <div className="absolute flex items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">{Math.round(percentage)}%</span>
      </div>
    </div>
  );
}

// Facility Card Component (Summary View)
function FacilityCard({
  facility,
  onSelect,
}: {
  facility: Facility;
  onSelect: (facilityId: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(facility.facility_id)}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 text-left border border-gray-200 hover:border-green-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{facility.facility_name}</h3>
          <p className="text-sm text-gray-600">{facility.facility_code}</p>
        </div>
      </div>

      {/* Circular Gauge */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <CircularGauge percentage={facility.readiness_pct} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-green-50 rounded p-3">
          <div className="text-2xl font-bold text-green-700">{facility.current_count}</div>
          <div className="text-xs text-gray-600">Current</div>
        </div>
        <div className="bg-yellow-50 rounded p-3">
          <div className="text-2xl font-bold text-yellow-700">{facility.needs_update_count}</div>
          <div className="text-xs text-gray-600">Needs Update</div>
        </div>
        <div className="bg-red-50 rounded p-3">
          <div className="text-2xl font-bold text-red-700">{facility.missing_count}</div>
          <div className="text-xs text-gray-600">Missing</div>
        </div>
      </div>
    </button>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: 'current' | 'needs_update' | 'missing' }) {
  if (status === 'current') {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
        <CheckCircle size={16} />
        Current
      </span>
    );
  } else if (status === 'needs_update') {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
        <AlertTriangle size={16} />
        Needs Update
      </span>
    );
  } else {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
        <XCircle size={16} />
        Missing
      </span>
    );
  }
}

// Loading Spinner Component
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader size={40} className="text-green-600 animate-spin" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Summary View Component
function SummaryView({
  facilities,
  loading,
  error,
  onSelectFacility,
}: {
  facilities: Facility[];
  loading: boolean;
  error: string | null;
  onSelectFacility: (facilityId: string) => void;
}) {
  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-800">
        <p className="font-semibold">Error loading facilities</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (facilities.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <p className="text-gray-600">No facilities found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {facilities.map((facility) => (
        <FacilityCard
          key={facility.facility_id}
          facility={facility}
          onSelect={onSelectFacility}
        />
      ))}
    </div>
  );
}

// Facility Detail View Component
function FacilityDetailView({
  facility,
  sops,
  snapshots,
  loading,
  error,
  onBack,
  onTakeSnapshot,
}: {
  facility: FacilityDetail['facility'];
  sops: SOP[];
  snapshots: Snapshot[];
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onTakeSnapshot: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filteredSOPs = sops.filter((sop) => {
    if (statusFilter === 'all') return true;
    return sop.status === statusFilter;
  });

  // Calculate current readiness
  const currentReadiness =
    sops.length > 0 ? Math.round(((sops.filter((s) => s.status === 'current').length / sops.length) * 100)) : 0;

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Back to summary"
        >
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-gray-900">{facility.name}</h2>
          <p className="text-gray-600">{facility.code}</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-green-600">{currentReadiness}%</div>
          <div className="text-sm text-gray-600">Readiness</div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <p className="font-semibold">Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Filter and Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('current')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'current'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Current
          </button>
          <button
            onClick={() => setStatusFilter('needs_update')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'needs_update'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Needs Update
          </button>
          <button
            onClick={() => setStatusFilter('missing')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'missing'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Missing
          </button>
        </div>
        <button
          onClick={onTakeSnapshot}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium whitespace-nowrap"
        >
          <Camera size={18} />
          Take Snapshot
        </button>
      </div>

      {/* SOPs Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-green-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Last Review
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSOPs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-600">
                    No SOPs found for the selected filter.
                  </td>
                </tr>
              ) : (
                filteredSOPs.map((sop) => (
                  <tr key={sop.sop_id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{sop.code}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{sop.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{sop.category}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          sop.priority === 'high'
                            ? 'bg-red-100 text-red-800'
                            : sop.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {sop.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={sop.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(sop.last_review_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Snapshot History */}
      {snapshots.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Snapshot History</h3>
          <div className="space-y-3">
            {snapshots.map((snapshot) => (
              <div
                key={snapshot.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {new Date(snapshot.snapshot_date).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    {snapshot.exists_current} current, {snapshot.needs_update} need update,{' '}
                    {snapshot.missing} missing
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">{snapshot.readiness_pct}%</p>
                  <p className="text-xs text-gray-600">Readiness</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Main Component
export function GapAnalysisPage() {
  const [view, setView] = useState<'summary' | 'detail'>('summary');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);
  const [facilityDetail, setFacilityDetail] = useState<FacilityDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load summary on mount
  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await gapsAPI.summary();
      setFacilities(data.facilities);
      setView('summary');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load facilities');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFacility = async (facilityId: string) => {
    setSelectedFacility(facilityId);
    setLoading(true);
    setError(null);
    try {
      const data = await gapsAPI.getByFacility(facilityId);
      setFacilityDetail(data);
      setView('detail');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load facility details');
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setView('summary');
    setSelectedFacility(null);
    setFacilityDetail(null);
  };

  const handleTakeSnapshot = async () => {
    if (!selectedFacility) return;
    try {
      await gapsAPI.snapshot(selectedFacility);
      // Reload facility detail to show new snapshot
      if (selectedFacility) {
        const data = await gapsAPI.getByFacility(selectedFacility);
        setFacilityDetail(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to take snapshot');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <BarChart3 size={32} className="text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">Gap Analysis Dashboard</h1>
          </div>
          <p className="text-gray-600 mt-1">Food Safety Compliance & Readiness</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'summary' ? (
          <SummaryView
            facilities={facilities}
            loading={loading}
            error={error}
            onSelectFacility={handleSelectFacility}
          />
        ) : facilityDetail ? (
          <FacilityDetailView
            facility={facilityDetail.facility}
            sops={facilityDetail.sops}
            snapshots={facilityDetail.snapshots}
            loading={loading}
            error={error}
            onBack={handleBack}
            onTakeSnapshot={handleTakeSnapshot}
          />
        ) : null}
      </div>
    </div>
  );
}
