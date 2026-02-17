import { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Filter,
  Search,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react';
import { sopsAPI } from '@/api';
import { useAuthStore } from '@/store';

interface SOP {
  id: string;
  code: string;
  title: string;
  category: 'FSMS' | 'GAP' | 'GMP' | 'Organic' | 'Social';
  description: string;
  owner_id: string;
  status: 'Draft' | 'In Review' | 'Approved' | 'Archived';
  current_version: number;
  language: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  primus_ref?: string;
  nop_ref?: string;
  review_date?: string;
  next_review_date?: string;
  created_at: string;
}

interface FilterState {
  category?: string;
  status?: string;
  priority?: string;
  search?: string;
}

const CATEGORIES = ['FSMS', 'GAP', 'GMP', 'Organic', 'Social'];
const STATUSES = ['Draft', 'In Review', 'Approved', 'Archived'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

const categoryColors: Record<string, string> = {
  FSMS: 'bg-blue-100 text-blue-800 border-blue-300',
  GAP: 'bg-green-100 text-green-800 border-green-300',
  GMP: 'bg-purple-100 text-purple-800 border-purple-300',
  Organic: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  Social: 'bg-orange-100 text-orange-800 border-orange-300',
};

const statusColors: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-800 border-gray-300',
  'In Review': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Approved: 'bg-green-100 text-green-800 border-green-300',
  Archived: 'bg-red-100 text-red-800 border-red-300',
};

const priorityColors: Record<string, string> = {
  Critical: 'text-red-600 bg-red-50',
  High: 'text-orange-600 bg-orange-50',
  Medium: 'text-yellow-600 bg-yellow-50',
  Low: 'text-gray-600 bg-gray-50',
};

const statusWorkflow: Record<string, string[]> = {
  Draft: ['In Review'],
  'In Review': ['Approved', 'Draft'],
  Approved: ['Archived'],
  Archived: [],
};

export function SOPHubPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';

  const [sops, setSops] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({});
  const [selectedSOP, setSelectedSOP] = useState<SOP | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    category: 'FSMS' as const,
    description: '',
    priority: 'Medium' as const,
    language: 'English',
    primus_ref: '',
    nop_ref: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  // Fetch SOPs
  useEffect(() => {
    const fetchSOPs = async () => {
      try {
        setLoading(true);
        const params = {
          category: filters.category,
          status: filters.status,
          priority: filters.priority,
        };
        const result = await sopsAPI.getAll(params);
        setSops(result.sops);
      } catch (error) {
        console.error('Failed to fetch SOPs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSOPs();
  }, [filters]);

  // Filter SOPs by search
  const filteredSOPs = filters.search
    ? sops.filter(
        (sop) =>
          sop.code.toLowerCase().includes(filters.search!.toLowerCase()) ||
          sop.title.toLowerCase().includes(filters.search!.toLowerCase())
      )
    : sops;

  const handleAddSOP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      setSubmitting(true);
      await sopsAPI.create(formData);
      setShowAddForm(false);
      setFormData({
        code: '',
        title: '',
        category: 'FSMS',
        description: '',
        priority: 'Medium',
        language: 'English',
        primus_ref: '',
        nop_ref: '',
      });
      // Refresh SOPs
      const result = await sopsAPI.getAll(filters);
      setSops(result.sops);
    } catch (error) {
      console.error('Failed to create SOP:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (sopId: string, newStatus: string) => {
    if (!isAdmin) return;

    try {
      setStatusUpdating(sopId);
      await sopsAPI.updateStatus(sopId, newStatus);
      // Refresh SOPs
      const result = await sopsAPI.getAll(filters);
      setSops(result.sops);
      if (selectedSOP?.id === sopId) {
        const updated = result.sops.find((s) => s.id === sopId);
        if (updated) setSelectedSOP(updated);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleViewDetail = async (sop: SOP) => {
    try {
      const result = await sopsAPI.getById(sop.id);
      setSelectedSOP(result.sop);
      setShowDetail(true);
    } catch (error) {
      console.error('Failed to fetch SOP details:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-800 text-white py-8 px-6 shadow-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText size={32} />
              <div>
                <h1 className="text-3xl font-bold">SOP Hub</h1>
                <p className="text-green-100 text-sm">Manage food safety procedures</p>
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 bg-white text-green-800 px-4 py-2 rounded-lg font-semibold hover:bg-green-50 transition-colors"
              >
                <Plus size={20} />
                Add SOP
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-green-700" />
            <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search size={18} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search code or title"
                value={filters.search || ''}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={filters.category || ''}
                onChange={(e) =>
                  setFilters({ ...filters, category: e.target.value || undefined })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filters.status || ''}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value || undefined })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              >
                <option value="">All Statuses</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <select
                value={filters.priority || ''}
                onChange={(e) =>
                  setFilters({ ...filters, priority: e.target.value || undefined })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              >
                <option value="">All Priorities</option>
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            {Object.values(filters).some((v) => v) && (
              <button
                onClick={() => setFilters({})}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={48} className="text-green-600 animate-spin" />
              <p className="text-gray-600 font-medium">Loading SOPs...</p>
            </div>
          </div>
        ) : filteredSOPs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg font-medium">No SOPs found</p>
            <p className="text-gray-500 text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredSOPs.map((sop) => (
              <div
                key={sop.id}
                onClick={() => handleViewDetail(sop)}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 cursor-pointer border border-gray-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {sop.code}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          categoryColors[sop.category]
                        }`}
                      >
                        {sop.category}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          statusColors[sop.status]
                        }`}
                      >
                        {sop.status}
                      </span>
                    </div>

                    <p className="text-gray-600 font-medium mb-3">{sop.title}</p>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>v{sop.current_version}</span>
                      {sop.next_review_date && (
                        <span>
                          Next review:{' '}
                          {new Date(sop.next_review_date).toLocaleDateString()}
                        </span>
                      )}
                      <div
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          priorityColors[sop.priority]
                        }`}
                      >
                        {sop.priority}
                      </div>
                    </div>
                  </div>

                  <ChevronRight size={24} className="text-gray-400 ml-4" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetail && selectedSOP && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Detail Header */}
            <div className="bg-green-800 text-white p-6 flex items-start justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">SOP Code</p>
                <h2 className="text-3xl font-bold mb-2">{selectedSOP.code}</h2>
                <p className="text-green-100">{selectedSOP.title}</p>
              </div>
              <button
                onClick={() => {
                  setShowDetail(false);
                  setSelectedSOP(null);
                }}
                className="text-white hover:bg-green-700 p-2 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Detail Content */}
            <div className="p-6 space-y-6">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                    Category
                  </p>
                  <p
                    className={`px-3 py-1 rounded-full text-xs font-semibold border inline-block ${
                      categoryColors[selectedSOP.category]
                    }`}
                  >
                    {selectedSOP.category}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                    Status
                  </p>
                  <p
                    className={`px-3 py-1 rounded-full text-xs font-semibold border inline-block ${
                      statusColors[selectedSOP.status]
                    }`}
                  >
                    {selectedSOP.status}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                    Priority
                  </p>
                  <p
                    className={`px-2 py-1 rounded text-xs font-semibold inline-block ${
                      priorityColors[selectedSOP.priority]
                    }`}
                  >
                    {selectedSOP.priority}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                    Version
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    v{selectedSOP.current_version}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                    Language
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {selectedSOP.language}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                    Created
                  </p>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedSOP.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">
                  Description
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {selectedSOP.description}
                </p>
              </div>

              {/* References */}
              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">
                  References
                </h3>
                <div className="space-y-2">
                  {selectedSOP.primus_ref && (
                    <div>
                      <p className="text-xs text-gray-500">PRIMUS Reference</p>
                      <p className="text-gray-900 font-medium">
                        {selectedSOP.primus_ref}
                      </p>
                    </div>
                  )}
                  {selectedSOP.nop_ref && (
                    <div>
                      <p className="text-xs text-gray-500">NOP Reference</p>
                      <p className="text-gray-900 font-medium">
                        {selectedSOP.nop_ref}
                      </p>
                    </div>
                  )}
                  {selectedSOP.next_review_date && (
                    <div>
                      <p className="text-xs text-gray-500">Next Review Date</p>
                      <p className="text-gray-900 font-medium">
                        {new Date(selectedSOP.next_review_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Workflow Buttons */}
              {isAdmin && statusWorkflow[selectedSOP.status].length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">
                    Update Status
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    {statusWorkflow[selectedSOP.status].map((nextStatus) => (
                      <button
                        key={nextStatus}
                        onClick={() =>
                          handleStatusUpdate(selectedSOP.id, nextStatus)
                        }
                        disabled={statusUpdating === selectedSOP.id}
                        className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                          nextStatus === 'In Review'
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 disabled:opacity-50'
                            : nextStatus === 'Approved'
                            ? 'bg-green-100 text-green-800 hover:bg-green-200 disabled:opacity-50'
                            : nextStatus === 'Draft'
                            ? 'bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-50'
                            : 'bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-50'
                        }`}
                      >
                        {statusUpdating === selectedSOP.id && (
                          <Loader2 size={16} className="animate-spin" />
                        )}
                        Move to {nextStatus}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <div className="border-t pt-6">
                <button
                  onClick={() => {
                    setShowDetail(false);
                    setSelectedSOP(null);
                  }}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-800 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add SOP Form Modal */}
      {showAddForm && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Form Header */}
            <div className="bg-green-800 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Plus size={28} />
                <h2 className="text-2xl font-bold">Create New SOP</h2>
              </div>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-white hover:bg-green-700 p-2 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleAddSOP} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Code */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    SOP Code
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    placeholder="e.g., SOP-001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="SOP Title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    required
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  >
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Language
                  </label>
                  <input
                    type="text"
                    value={formData.language}
                    onChange={(e) =>
                      setFormData({ ...formData, language: e.target.value })
                    }
                    placeholder="e.g., English"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* PRIMUS Ref */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    PRIMUS Reference
                  </label>
                  <input
                    type="text"
                    value={formData.primus_ref}
                    onChange={(e) =>
                      setFormData({ ...formData, primus_ref: e.target.value })
                    }
                    placeholder="Optional"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* NOP Ref */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    NOP Reference
                  </label>
                  <input
                    type="text"
                    value={formData.nop_ref}
                    onChange={(e) =>
                      setFormData({ ...formData, nop_ref: e.target.value })
                    }
                    placeholder="Optional"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Enter SOP description"
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-800 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-green-700 text-white rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {submitting && (
                    <Loader2 size={18} className="animate-spin" />
                  )}
                  Create SOP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
