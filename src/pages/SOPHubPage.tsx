import { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Filter,
  Search,
  ChevronRight,
  Loader2,
  X,
  Upload,
  Download,
  Tag,
  ShieldCheck,
  History,
  AlertTriangle,
} from 'lucide-react';
import { sopsAPI } from '@/api';
import { useAuthStore } from '@/store';

interface SOP {
  id: number;
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
  tags?: string[];
}

interface FilterState {
  category?: string;
  status?: string;
  priority?: string;
  tag?: string;
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
  const canEdit = ['fsqa', 'management', 'admin'].includes(user?.role || '');

  const [sops, setSops] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({});
  const [selectedSOP, setSelectedSOP] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '', title: '', category: 'FSMS' as const, description: '',
    priority: 'Medium' as const, language: 'English', primus_ref: '', nop_ref: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<{ tag: string; count: number }[]>([]);

  // Detail modal state
  const [detailTab, setDetailTab] = useState<'info' | 'versions' | 'audit'>('info');
  const [versions, setVersions] = useState<any[]>([]);
  const [auditCoverage, setAuditCoverage] = useState<any[]>([]);
  const [sopTags, setSopTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [versionForm, setVersionForm] = useState({ change_notes: '', file: null as File | null });
  const [uploading, setUploading] = useState(false);

  // Fetch SOPs
  useEffect(() => {
    const fetchSOPs = async () => {
      try {
        setLoading(true);
        const params: any = {};
        if (filters.category) params.category = filters.category;
        if (filters.status) params.status = filters.status;
        if (filters.priority) params.priority = filters.priority;
        if (filters.tag) params.tag = filters.tag;
        const result = await sopsAPI.getAll(params);
        setSops(result.data.sops);
      } catch (error) {
        console.error('Failed to fetch SOPs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSOPs();
  }, [filters]);

  // Fetch all tags
  useEffect(() => {
    sopsAPI.getAllTags().then(r => setAllTags(r.data.tags || [])).catch(() => {});
  }, []);

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
      setFormData({ code: '', title: '', category: 'FSMS', description: '', priority: 'Medium', language: 'English', primus_ref: '', nop_ref: '' });
      const result = await sopsAPI.getAll(filters);
      setSops(result.data.sops);
    } catch (error) {
      console.error('Failed to create SOP:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (sopId: number, newStatus: string) => {
    if (!isAdmin) return;
    try {
      setStatusUpdating(String(sopId));
      await sopsAPI.updateStatus(sopId, newStatus);
      const result = await sopsAPI.getAll(filters);
      setSops(result.data.sops);
      if (selectedSOP?.id === sopId) {
        const updated = result.data.sops.find((s: any) => s.id === sopId);
        if (updated) setSelectedSOP({ ...selectedSOP, ...updated });
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
      setSelectedSOP(result.data.sop);
      setSopTags(result.data.tags || []);
      setDetailTab('info');
      setShowDetail(true);
      // Load versions
      sopsAPI.getVersions(sop.id).then(r => setVersions(r.data.versions || [])).catch(() => {});
      // Load audit coverage
      sopsAPI.getAuditCoverage(sop.id).then(r => setAuditCoverage(r.data.questions || [])).catch(() => {});
    } catch (error) {
      console.error('Failed to fetch SOP details:', error);
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim() || !selectedSOP) return;
    try {
      await sopsAPI.addTags(selectedSOP.id, [newTag.trim()]);
      setSopTags([...sopTags, newTag.trim().toLowerCase()]);
      setNewTag('');
      sopsAPI.getAllTags().then(r => setAllTags(r.data.tags || [])).catch(() => {});
    } catch (_e) {}
  };

  const handleRemoveTag = async (tag: string) => {
    if (!selectedSOP) return;
    try {
      await sopsAPI.removeTag(selectedSOP.id, tag);
      setSopTags(sopTags.filter(t => t !== tag));
    } catch (_e) {}
  };

  const handleUploadVersion = async () => {
    if (!selectedSOP) return;
    try {
      setUploading(true);
      let fileData: any = {};
      if (versionForm.file) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.readAsDataURL(versionForm.file!);
        });
        fileData = {
          file_name: versionForm.file.name,
          file_data: base64,
          content_type: versionForm.file.type,
        };
      }
      await sopsAPI.createVersion(selectedSOP.id, {
        change_notes: versionForm.change_notes,
        ...fileData,
      });
      setVersionForm({ change_notes: '', file: null });
      // Refresh
      const vResult = await sopsAPI.getVersions(selectedSOP.id);
      setVersions(vResult.data.versions || []);
      const sopResult = await sopsAPI.getById(selectedSOP.id);
      setSelectedSOP(sopResult.data.sop);
    } catch (error) {
      console.error('Failed to upload version:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadFile = async (fileId: number, fileName: string) => {
    try {
      const result = await sopsAPI.downloadFile(fileId);
      const file = result.data.file;
      const blob = Uint8Array.from(atob(file.file_data), c => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([blob], { type: file.content_type }));
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
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
              <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 bg-white text-green-800 px-4 py-2 rounded-lg font-semibold hover:bg-green-50 transition-colors">
                <Plus size={20} /> Add SOP
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-3 text-gray-400" />
              <input type="text" placeholder="Search code or title" value={filters.search || ''} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
            </div>
            <select value={filters.category || ''} onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none">
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select value={filters.status || ''} onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none">
              <option value="">All Statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filters.priority || ''} onChange={(e) => setFilters({ ...filters, priority: e.target.value || undefined })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none">
              <option value="">All Priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={filters.tag || ''} onChange={(e) => setFilters({ ...filters, tag: e.target.value || undefined })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none">
              <option value="">All Tags</option>
              {allTags.map((t) => <option key={t.tag} value={t.tag}>{t.tag} ({t.count})</option>)}
            </select>
            {Object.values(filters).some((v) => v) && (
              <button onClick={() => setFilters({})} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors">Clear</button>
            )}
          </div>
        </div>

        {/* Loading */}
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
              <div key={sop.id} onClick={() => handleViewDetail(sop)} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 cursor-pointer border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{sop.code}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${categoryColors[sop.category]}`}>{sop.category}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[sop.status]}`}>{sop.status}</span>
                    </div>
                    <p className="text-gray-600 font-medium mb-2">{sop.title}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                      <span>v{sop.current_version}</span>
                      {sop.next_review_date && <span>Next review: {new Date(sop.next_review_date).toLocaleDateString()}</span>}
                      <div className={`px-2 py-1 rounded text-xs font-semibold ${priorityColors[sop.priority]}`}>{sop.priority}</div>
                      {sop.tags && sop.tags.length > 0 && sop.tags.map(t => (
                        <span key={t} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{t}</span>
                      ))}
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
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-green-800 text-white p-6 flex items-start justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">SOP Code</p>
                <h2 className="text-3xl font-bold mb-2">{selectedSOP.code}</h2>
                <p className="text-green-100">{selectedSOP.title}</p>
              </div>
              <button onClick={() => { setShowDetail(false); setSelectedSOP(null); }} className="text-white hover:bg-green-700 p-2 rounded-lg transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b bg-gray-50">
              {[
                { id: 'info', label: 'Details', icon: FileText },
                { id: 'versions', label: 'Versions', icon: History },
                { id: 'audit', label: 'Audit Coverage', icon: ShieldCheck },
              ].map(tab => (
                <button key={tab.id} onClick={() => setDetailTab(tab.id as any)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition border-b-2 ${detailTab === tab.id ? 'border-green-600 text-green-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  <tab.icon size={16} /> {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-6">
              {/* INFO TAB */}
              {detailTab === 'info' && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Category</p>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border inline-block ${categoryColors[selectedSOP.category]}`}>{selectedSOP.category}</span>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Status</p>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border inline-block ${statusColors[selectedSOP.status]}`}>{selectedSOP.status}</span>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Priority</p>
                      <span className={`px-2 py-1 rounded text-xs font-semibold inline-block ${priorityColors[selectedSOP.priority]}`}>{selectedSOP.priority}</span>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Version</p>
                      <p className="text-lg font-bold text-gray-900">v{selectedSOP.current_version}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Language</p>
                      <p className="text-lg font-bold text-gray-900">{selectedSOP.language}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Created</p>
                      <p className="text-sm text-gray-900">{new Date(selectedSOP.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {selectedSOP.description && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">Description</h3>
                      <p className="text-gray-600 leading-relaxed">{selectedSOP.description}</p>
                    </div>
                  )}

                  {/* Tags */}
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag size={16} className="text-gray-600" />
                      <h3 className="text-sm font-semibold text-gray-700 uppercase">Tags</h3>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {sopTags.length === 0 && <span className="text-gray-400 text-sm">No tags</span>}
                      {sopTags.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                          {tag}
                          {canEdit && (
                            <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-600 ml-1"><X size={12} /></button>
                          )}
                        </span>
                      ))}
                    </div>
                    {canEdit && (
                      <div className="flex gap-2">
                        <input type="text" value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTag()} placeholder="Add tag..." className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none flex-1" list="tag-suggestions" />
                        <datalist id="tag-suggestions">
                          {allTags.map(t => <option key={t.tag} value={t.tag} />)}
                        </datalist>
                        <button onClick={handleAddTag} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Add</button>
                      </div>
                    )}
                  </div>

                  {/* References */}
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">References</h3>
                    <div className="space-y-2">
                      {selectedSOP.primus_ref && <div><p className="text-xs text-gray-500">PRIMUS Reference</p><p className="text-gray-900 font-medium">{selectedSOP.primus_ref}</p></div>}
                      {selectedSOP.nop_ref && <div><p className="text-xs text-gray-500">NOP Reference</p><p className="text-gray-900 font-medium">{selectedSOP.nop_ref}</p></div>}
                      {selectedSOP.next_review_date && <div><p className="text-xs text-gray-500">Next Review Date</p><p className="text-gray-900 font-medium">{new Date(selectedSOP.next_review_date).toLocaleDateString()}</p></div>}
                    </div>
                  </div>

                  {/* Status Workflow */}
                  {isAdmin && (statusWorkflow[selectedSOP.status] || []).length > 0 && (
                    <div className="border-t pt-4">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">Update Status</h3>
                      <div className="flex gap-2 flex-wrap">
                        {(statusWorkflow[selectedSOP.status] || []).map((nextStatus) => (
                          <button key={nextStatus} onClick={() => handleStatusUpdate(selectedSOP.id, nextStatus)} disabled={statusUpdating === String(selectedSOP.id)}
                            className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${nextStatus === 'In Review' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : nextStatus === 'Approved' ? 'bg-green-100 text-green-800 hover:bg-green-200' : nextStatus === 'Draft' ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' : 'bg-red-100 text-red-800 hover:bg-red-200'} disabled:opacity-50`}>
                            {statusUpdating === String(selectedSOP.id) && <Loader2 size={16} className="animate-spin" />}
                            Move to {nextStatus}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* VERSIONS TAB */}
              {detailTab === 'versions' && (
                <>
                  {/* Upload New Version */}
                  {canEdit && (
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Upload size={16} /> Upload New Version</h4>
                      <div className="space-y-3">
                        <textarea value={versionForm.change_notes} onChange={e => setVersionForm({ ...versionForm, change_notes: e.target.value })} placeholder="Change notes (what changed in this version?)" rows={2} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg cursor-pointer hover:bg-gray-50 text-sm">
                            <Upload size={16} className="text-gray-500" />
                            {versionForm.file ? versionForm.file.name : 'Choose file (PDF, DOCX, XLSX)'}
                            <input type="file" accept=".pdf,.docx,.xlsx,.doc,.xls" className="hidden" onChange={e => setVersionForm({ ...versionForm, file: e.target.files?.[0] || null })} />
                          </label>
                          <button onClick={handleUploadVersion} disabled={uploading || (!versionForm.change_notes && !versionForm.file)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                            {uploading && <Loader2 size={14} className="animate-spin" />} Create Version
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Version History */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">Version History</h4>
                    {versions.length === 0 ? (
                      <p className="text-gray-400 text-sm">No versions recorded yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {versions.map((v: any) => (
                          <div key={v.id} className="flex items-start justify-between p-3 border rounded-lg bg-white">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-gray-900">v{v.version_number}</span>
                                <span className="text-xs text-gray-500">{new Date(v.created_at).toLocaleDateString()}</span>
                                {v.uploader_name && <span className="text-xs text-gray-400">by {v.uploader_name}</span>}
                              </div>
                              {v.change_notes && <p className="text-sm text-gray-600">{v.change_notes}</p>}
                              {v.file_name && <p className="text-xs text-gray-400 mt-1">{v.file_name} ({Math.round((v.file_size || 0) / 1024)} KB)</p>}
                            </div>
                            {v.file_id && (
                              <button onClick={() => handleDownloadFile(v.file_id, v.file_name)} className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition">
                                <Download size={14} /> Download
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* AUDIT COVERAGE TAB */}
              {detailTab === 'audit' && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3 flex items-center gap-2">
                    <ShieldCheck size={16} /> Audit Questions Referencing This SOP
                  </h4>
                  {auditCoverage.length === 0 ? (
                    <p className="text-gray-400 text-sm">No audit questions reference this SOP.</p>
                  ) : (
                    <div className="space-y-2">
                      {auditCoverage.map((q: any) => (
                        <div key={q.id} className="p-3 border rounded-lg bg-white">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-blue-600">{q.question_code}</span>
                                <span className="text-xs text-gray-400">{q.module_code} — {q.module_name}</span>
                                {q.is_auto_fail === 1 && (
                                  <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
                                    <AlertTriangle size={10} /> Auto-Fail
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-700">{q.question_text}</p>
                            </div>
                            <span className="text-sm font-bold text-gray-600 ml-4">{q.points} pts</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Close */}
              <div className="border-t pt-4">
                <button onClick={() => { setShowDetail(false); setSelectedSOP(null); }} className="w-full px-4 py-2 bg-gray-100 text-gray-800 rounded-lg font-semibold hover:bg-gray-200 transition-colors">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add SOP Form Modal */}
      {showAddForm && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-green-800 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3"><Plus size={28} /><h2 className="text-2xl font-bold">Create New SOP</h2></div>
              <button onClick={() => setShowAddForm(false)} className="text-white hover:bg-green-700 p-2 rounded-lg transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleAddSOP} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">SOP Code</label>
                  <input type="text" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="e.g., SOP-001" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
                  <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="SOP Title" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                  <select required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as any })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none">
                    {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                  <select required value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none">
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">PRIMUS Reference</label>
                  <input type="text" value={formData.primus_ref} onChange={(e) => setFormData({ ...formData, primus_ref: e.target.value })} placeholder="Optional" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">NOP Reference</label>
                  <input type="text" value={formData.nop_ref} onChange={(e) => setFormData({ ...formData, nop_ref: e.target.value })} placeholder="Optional" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea required value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Enter SOP description" rows={5} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none" />
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-800 rounded-lg font-semibold hover:bg-gray-200 transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-green-700 text-white rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                  {submitting && <Loader2 size={18} className="animate-spin" />} Create SOP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
