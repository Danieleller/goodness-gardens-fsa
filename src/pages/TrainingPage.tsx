import { useEffect, useState } from 'react';
import {
  GraduationCap,
  ChevronDown,
  Plus,
  Award,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BookOpen,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';
import { trainingAPI, facilitiesAPI, adminAPI } from '@/api';

interface Facility { id: string; name: string; code: string; }
interface User { id: number; first_name: string; last_name: string; email: string; role: string; }

interface TrainingRecord {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  facility_name: string;
  training_type: string;
  training_title: string;
  description: string;
  trainer_name: string;
  training_date: string;
  expiry_date: string;
  hours: number;
  score: number;
  status: string;
  module_code: string;
  notes: string;
}

interface WorkerCert {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  cert_type: string;
  cert_name: string;
  issuing_body: string;
  cert_number: string;
  issue_date: string;
  expiry_date: string;
  status: string;
}

interface DashboardData {
  total_workers: number;
  total_requirements: number;
  recent_training_count: number;
  expiring_certifications: any[];
  expired_cert_count: number;
  training_by_type: any[];
  overdue_training: any[];
}

type TabType = 'dashboard' | 'records' | 'certifications';

export function TrainingPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [certifications, setCertifications] = useState<WorkerCert[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TrainingRecord | null>(null);
  const [editingCert, setEditingCert] = useState<WorkerCert | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  const [recordForm, setRecordForm] = useState({
    user_id: '', facility_id: '', training_type: '', training_title: '',
    description: '', trainer_name: '', training_date: '', expiry_date: '',
    hours: '', score: '', status: 'completed', module_code: '', notes: '',
  });

  const [certForm, setCertForm] = useState({
    user_id: '', cert_type: '', cert_name: '', issuing_body: '',
    cert_number: '', issue_date: '', expiry_date: '', status: 'active', notes: '',
  });

  useEffect(() => {
    const loadInit = async () => {
      try {
        const [facRes, userRes] = await Promise.all([facilitiesAPI.getAll(), adminAPI.users.getAll()]);
        setFacilities(facRes.data.facilities || []);
        setUsers(userRes.data.users || userRes.data || []);
        if (facRes.data.facilities?.length > 0) setSelectedFacilityId(facRes.data.facilities[0].id);
      } catch (error) { console.error('Init error:', error); }
    };
    loadInit();
  }, []);

  useEffect(() => { loadTabData(); }, [activeTab, selectedFacilityId]);

  const loadTabData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const fid = selectedFacilityId ? parseInt(selectedFacilityId) : undefined;
        const res = await trainingAPI.getDashboard(fid);
        setDashboardData(res.data);
      } else if (activeTab === 'records') {
        const params: any = {};
        if (selectedFacilityId) params.facility_id = parseInt(selectedFacilityId);
        const res = await trainingAPI.getRecords(params);
        setRecords(res.data.records || []);
      } else if (activeTab === 'certifications') {
        const res = await trainingAPI.getCertifications();
        setCertifications(res.data.certifications || []);
      }
    } catch (error) { console.error('Load error:', error); }
    finally { setLoading(false); }
  };

  const toast = (msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(''), 3000); };

  const handleSaveRecord = async () => {
    try {
      const data = {
        ...recordForm,
        user_id: parseInt(recordForm.user_id),
        facility_id: recordForm.facility_id ? parseInt(recordForm.facility_id) : null,
        hours: recordForm.hours ? parseFloat(recordForm.hours) : 0,
        score: recordForm.score ? parseFloat(recordForm.score) : null,
      };
      if (editingRecord) {
        await trainingAPI.updateRecord(editingRecord.id, data);
        toast('Training record updated');
      } else {
        await trainingAPI.createRecord(data);
        toast('Training record created');
      }
      setShowRecordModal(false);
      setEditingRecord(null);
      loadTabData();
    } catch (error) { toast('Error saving record'); }
  };

  const handleSaveCert = async () => {
    try {
      const data = { ...certForm, user_id: parseInt(certForm.user_id) };
      if (editingCert) {
        await trainingAPI.updateCertification(editingCert.id, data);
        toast('Certification updated');
      } else {
        await trainingAPI.createCertification(data);
        toast('Certification added');
      }
      setShowCertModal(false);
      setEditingCert(null);
      loadTabData();
    } catch (error) { toast('Error saving certification'); }
  };

  const handleDeleteRecord = async (id: number) => {
    if (!confirm('Delete this training record?')) return;
    try {
      await trainingAPI.deleteRecord(id);
      toast('Record deleted');
      loadTabData();
    } catch (error) { toast('Error deleting record'); }
  };

  const openEditRecord = (record: TrainingRecord) => {
    setEditingRecord(record);
    setRecordForm({
      user_id: String(record.user_id), facility_id: '', training_type: record.training_type,
      training_title: record.training_title, description: record.description || '',
      trainer_name: record.trainer_name || '', training_date: record.training_date || '',
      expiry_date: record.expiry_date || '', hours: String(record.hours || ''),
      score: record.score ? String(record.score) : '', status: record.status || 'completed',
      module_code: record.module_code || '', notes: record.notes || '',
    });
    setShowRecordModal(true);
  };

  const openNewRecord = () => {
    setEditingRecord(null);
    setRecordForm({
      user_id: '', facility_id: selectedFacilityId, training_type: '', training_title: '',
      description: '', trainer_name: '', training_date: new Date().toISOString().split('T')[0],
      expiry_date: '', hours: '', score: '', status: 'completed', module_code: '', notes: '',
    });
    setShowRecordModal(true);
  };

  const openNewCert = () => {
    setEditingCert(null);
    setCertForm({
      user_id: '', cert_type: '', cert_name: '', issuing_body: '',
      cert_number: '', issue_date: new Date().toISOString().split('T')[0],
      expiry_date: '', status: 'active', notes: '',
    });
    setShowCertModal(true);
  };

  const openEditCert = (cert: WorkerCert) => {
    setEditingCert(cert);
    setCertForm({
      user_id: String(cert.user_id), cert_type: cert.cert_type, cert_name: cert.cert_name,
      issuing_body: cert.issuing_body || '', cert_number: cert.cert_number || '',
      issue_date: cert.issue_date || '', expiry_date: cert.expiry_date || '',
      status: cert.status || 'active', notes: '',
    });
    setShowCertModal(true);
  };

  const trainingTypes = [
    'food_safety', 'haccp', 'sanitation', 'chemical_safety', 'allergen',
    'pest_control', 'gmp', 'emergency', 'harvest', 'supervisor_fs', 'fsqa_cert', 'auditor', 'other',
  ];

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: 'dashboard', label: 'Overview', icon: Users },
    { key: 'records', label: 'Training Records', icon: BookOpen },
    { key: 'certifications', label: 'Certifications', icon: Award },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-green-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-7 h-7 sm:w-8 sm:h-8 text-green-700" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-green-900">Training & Certifications</h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Worker training records, requirements & certification tracking</p>
              </div>
            </div>
            <div className="relative w-full sm:w-auto">
              <select
                value={selectedFacilityId}
                onChange={(e) => setSelectedFacilityId(e.target.value)}
                className="w-full sm:w-auto appearance-none px-4 py-2 pr-10 bg-white border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer text-sm"
              >
                <option value="">All facilities</option>
                {facilities.map((f) => (<option key={f.id} value={f.id}>{f.name}</option>))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">{toastMessage}</div>
      )}

      {/* Tab Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                    activeTab === tab.key ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  <Icon className="w-4 h-4" />{tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
          </div>
        )}

        {/* ====== DASHBOARD TAB ====== */}
        {!loading && activeTab === 'dashboard' && dashboardData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-blue-600" /><span className="text-xs text-gray-500">Active Workers</span></div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-800">{dashboardData.total_workers}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-1"><BookOpen className="w-4 h-4 text-green-600" /><span className="text-xs text-gray-500">Requirements</span></div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-800">{dashboardData.total_requirements}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-purple-600" /><span className="text-xs text-gray-500">Recent (90d)</span></div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-800">{dashboardData.recent_training_count}</div>
              </div>
              <div className={`rounded-lg shadow p-4 border ${dashboardData.expired_cert_count > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-red-600" /><span className="text-xs text-gray-500">Expired Certs</span></div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-800">{dashboardData.expired_cert_count}</div>
              </div>
            </div>

            {/* Overdue Training */}
            {dashboardData.overdue_training.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-orange-200 mb-6">
                <h3 className="text-lg font-bold text-orange-800 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />Overdue Training Requirements
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Requirement</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Type</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Frequency</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Compliance</th>
                    </tr></thead>
                    <tbody>
                      {dashboardData.overdue_training.map((ot: any, i: number) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-2 px-3 font-medium text-gray-800">{ot.title}</td>
                          <td className="py-2 px-3 text-gray-600">{ot.training_type}</td>
                          <td className="py-2 px-3 text-gray-600">{ot.frequency_days}d</td>
                          <td className="py-2 px-3">
                            <span className="text-red-600 font-medium">{ot.trained_workers}/{ot.total_workers}</span>
                            <span className="text-gray-400 text-xs ml-1">trained</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Training by Type + Expiring Certs side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {dashboardData.training_by_type.length > 0 && (
                <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-green-100">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">Training by Type</h3>
                  <div className="space-y-3">
                    {dashboardData.training_by_type.map((t: any, i: number) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 capitalize">{(t.training_type || '').replace(/_/g, ' ')}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-gray-800">{t.count}</span>
                          <span className="text-xs text-gray-400">last: {t.last_date ? t.last_date.split('T')[0] : '-'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dashboardData.expiring_certifications.length > 0 && (
                <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-yellow-200">
                  <h3 className="text-lg font-bold text-yellow-800 mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5" />Expiring Certifications (60 days)
                  </h3>
                  <div className="space-y-2">
                    {dashboardData.expiring_certifications.map((c: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <div className="font-medium text-gray-800 text-sm">{c.cert_name}</div>
                          <div className="text-xs text-gray-500">{c.first_name} {c.last_name}</div>
                        </div>
                        <span className="text-sm text-orange-600 font-medium">{c.expiry_date?.split('T')[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ====== RECORDS TAB ====== */}
        {!loading && activeTab === 'records' && (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
              <h2 className="text-xl font-bold text-gray-800">Training Records</h2>
              <button onClick={openNewRecord} className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition text-sm">
                <Plus className="w-4 h-4" />Add Training Record
              </button>
            </div>

            {records.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center border border-green-100">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No training records yet</p>
                <p className="text-gray-400 text-sm mt-2">Add training records to track worker education</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md border border-green-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Worker</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden sm:table-cell">Title</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden md:table-cell">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden lg:table-cell">Hours</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr></thead>
                    <tbody>
                      {records.map((r) => (
                        <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-800">{r.first_name} {r.last_name}</div>
                            <div className="text-xs text-gray-400 sm:hidden">{r.training_title}</div>
                          </td>
                          <td className="py-3 px-4 text-gray-700 hidden sm:table-cell">{r.training_title}</td>
                          <td className="py-3 px-4">
                            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-medium capitalize">{(r.training_type || '').replace(/_/g, ' ')}</span>
                          </td>
                          <td className="py-3 px-4 text-gray-600 hidden md:table-cell">{r.training_date?.split('T')[0]}</td>
                          <td className="py-3 px-4 text-gray-600 hidden lg:table-cell">{r.hours || '-'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.status === 'completed' ? 'bg-green-100 text-green-800' : r.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{r.status}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1">
                              <button onClick={() => openEditRecord(r)} className="p-1.5 text-gray-400 hover:text-blue-600 transition"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDeleteRecord(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ====== CERTIFICATIONS TAB ====== */}
        {!loading && activeTab === 'certifications' && (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
              <h2 className="text-xl font-bold text-gray-800">Worker Certifications</h2>
              <button onClick={openNewCert} className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition text-sm">
                <Plus className="w-4 h-4" />Add Certification
              </button>
            </div>

            {certifications.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center border border-green-100">
                <Award className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No certifications tracked yet</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md border border-green-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Worker</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Certification</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden md:table-cell">Issuing Body</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden sm:table-cell">Issued</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Expires</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr></thead>
                    <tbody>
                      {certifications.map((c) => {
                        const isExpired = c.expiry_date && new Date(c.expiry_date) < new Date();
                        const isExpiringSoon = c.expiry_date && !isExpired && new Date(c.expiry_date) < new Date(Date.now() + 60 * 86400000);
                        return (
                          <tr key={c.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isExpired ? 'bg-red-50' : isExpiringSoon ? 'bg-yellow-50' : ''}`}>
                            <td className="py-3 px-4 font-medium text-gray-800">{c.first_name} {c.last_name}</td>
                            <td className="py-3 px-4">
                              <div className="text-gray-800">{c.cert_name}</div>
                              <div className="text-xs text-gray-400">{c.cert_type}</div>
                            </td>
                            <td className="py-3 px-4 text-gray-600 hidden md:table-cell">{c.issuing_body || '-'}</td>
                            <td className="py-3 px-4 text-gray-600 hidden sm:table-cell">{c.issue_date?.split('T')[0]}</td>
                            <td className="py-3 px-4">
                              <span className={`font-medium ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-orange-600' : 'text-gray-600'}`}>
                                {c.expiry_date?.split('T')[0] || 'N/A'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {isExpired ? (
                                <span className="flex items-center gap-1 text-red-600 text-xs font-medium"><XCircle className="w-3.5 h-3.5" />Expired</span>
                              ) : isExpiringSoon ? (
                                <span className="flex items-center gap-1 text-orange-600 text-xs font-medium"><AlertTriangle className="w-3.5 h-3.5" />Expiring</span>
                              ) : (
                                <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle2 className="w-3.5 h-3.5" />Active</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <button onClick={() => openEditCert(c)} className="p-1.5 text-gray-400 hover:text-blue-600 transition"><Edit2 className="w-3.5 h-3.5" /></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ====== ADD/EDIT TRAINING RECORD MODAL ====== */}
      {showRecordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">{editingRecord ? 'Edit' : 'Add'} Training Record</h3>
              <button onClick={() => { setShowRecordModal(false); setEditingRecord(null); }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Worker *</label>
                <select value={recordForm.user_id} onChange={(e) => setRecordForm({ ...recordForm, user_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm">
                  <option value="">Select worker</option>
                  {users.map((u) => (<option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</option>))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Training Type *</label>
                  <select value={recordForm.training_type} onChange={(e) => setRecordForm({ ...recordForm, training_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm">
                    <option value="">Select type</option>
                    {trainingTypes.map((t) => (<option key={t} value={t}>{t.replace(/_/g, ' ')}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input type="date" value={recordForm.training_date} onChange={(e) => setRecordForm({ ...recordForm, training_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input type="text" value={recordForm.training_title} onChange={(e) => setRecordForm({ ...recordForm, training_title: e.target.value })}
                  placeholder="e.g. Annual Food Safety Refresher" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
                  <input type="number" step="0.5" value={recordForm.hours} onChange={(e) => setRecordForm({ ...recordForm, hours: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Score</label>
                  <input type="number" value={recordForm.score} onChange={(e) => setRecordForm({ ...recordForm, score: e.target.value })}
                    placeholder="%" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry</label>
                  <input type="date" value={recordForm.expiry_date} onChange={(e) => setRecordForm({ ...recordForm, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trainer</label>
                <input type="text" value={recordForm.trainer_name} onChange={(e) => setRecordForm({ ...recordForm, trainer_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={recordForm.notes} onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
              <button onClick={() => { setShowRecordModal(false); setEditingRecord(null); }} className="px-4 py-2 text-gray-600 hover:text-gray-800 transition text-sm">Cancel</button>
              <button onClick={handleSaveRecord} disabled={!recordForm.user_id || !recordForm.training_type || !recordForm.training_title || !recordForm.training_date}
                className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 transition text-sm">{editingRecord ? 'Update' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== ADD/EDIT CERTIFICATION MODAL ====== */}
      {showCertModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">{editingCert ? 'Edit' : 'Add'} Certification</h3>
              <button onClick={() => { setShowCertModal(false); setEditingCert(null); }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Worker *</label>
                <select value={certForm.user_id} onChange={(e) => setCertForm({ ...certForm, user_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm">
                  <option value="">Select worker</option>
                  {users.map((u) => (<option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cert Type *</label>
                  <select value={certForm.cert_type} onChange={(e) => setCertForm({ ...certForm, cert_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm">
                    <option value="">Select type</option>
                    <option value="pcqi">PCQI</option>
                    <option value="haccp">HACCP</option>
                    <option value="servsafe">ServSafe</option>
                    <option value="internal_auditor">Internal Auditor</option>
                    <option value="forklift">Forklift</option>
                    <option value="pesticide_applicator">Pesticide Applicator</option>
                    <option value="first_aid">First Aid/CPR</option>
                    <option value="organic_handler">Organic Handler</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cert Name *</label>
                  <input type="text" value={certForm.cert_name} onChange={(e) => setCertForm({ ...certForm, cert_name: e.target.value })}
                    placeholder="e.g. PCQI Certification" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issuing Body</label>
                  <input type="text" value={certForm.issuing_body} onChange={(e) => setCertForm({ ...certForm, issuing_body: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cert Number</label>
                  <input type="text" value={certForm.cert_number} onChange={(e) => setCertForm({ ...certForm, cert_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date *</label>
                  <input type="date" value={certForm.issue_date} onChange={(e) => setCertForm({ ...certForm, issue_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input type="date" value={certForm.expiry_date} onChange={(e) => setCertForm({ ...certForm, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
              <button onClick={() => { setShowCertModal(false); setEditingCert(null); }} className="px-4 py-2 text-gray-600 hover:text-gray-800 transition text-sm">Cancel</button>
              <button onClick={handleSaveCert} disabled={!certForm.user_id || !certForm.cert_type || !certForm.cert_name || !certForm.issue_date}
                className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 transition text-sm">{editingCert ? 'Update' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
