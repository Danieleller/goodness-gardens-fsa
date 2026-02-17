import { useEffect, useState } from 'react';
import { Plus, Trash2, CheckCircle } from 'lucide-react';
import { correctiveActionAPI } from '@/api';

interface Nonconformance {
  id: number;
  finding_category: string;
  finding_description: string;
  severity: string;
  finding_date: string;
  created_at: string;
}

interface CorrectiveAction {
  id: number;
  nonconformance_id: number;
  action_description: string;
  status: string;
  target_completion_date: string;
  actual_completion_date?: string;
  created_at: string;
}

export function CorrectiveActionsPage() {
  const [tab, setTab] = useState<'nonconformances' | 'capas'>('nonconformances');
  const [nonconformances, setNonconformances] = useState<Nonconformance[]>([]);
  const [capas, setCapas] = useState<CorrectiveAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    finding_date: '',
    finding_category: 'observation',
    finding_description: '',
    severity: 'minor',
    affected_area: '',
    root_cause: '',
  });

  useEffect(() => {
    fetchData();
  }, [tab]);

  const fetchData = async () => {
    try {
      if (tab === 'nonconformances') {
        const response = await correctiveActionAPI.nonconformances.getAll();
        setNonconformances(response.data);
      } else {
        const response = await correctiveActionAPI.capas.getAll();
        setCapas(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await correctiveActionAPI.nonconformances.create(formData);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this record?')) {
      try {
        if (tab === 'nonconformances') {
          await correctiveActionAPI.nonconformances.delete(id);
        } else {
          await correctiveActionAPI.capas.delete(id);
        }
        fetchData();
      } catch (error) {
        console.error('Failed to delete:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      finding_date: '',
      finding_category: 'observation',
      finding_description: '',
      severity: 'minor',
      affected_area: '',
      root_cause: '',
    });
    setShowForm(false);
  };

  if (loading) {
    return <div className="p-6"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <CheckCircle size={32} className="text-green-800" />
          Corrective Actions
        </h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-green-800 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
        >
          <Plus size={20} />
          New Finding
        </button>
      </div>

      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setTab('nonconformances')}
          className={`px-4 py-2 font-medium transition ${
            tab === 'nonconformances'
              ? 'text-green-800 border-b-2 border-green-800'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Nonconformances
        </button>
        <button
          onClick={() => setTab('capas')}
          className={`px-4 py-2 font-medium transition ${
            tab === 'capas'
              ? 'text-green-800 border-b-2 border-green-800'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Corrective Actions
        </button>
      </div>

      {showForm && tab === 'nonconformances' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">New Nonconformance</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Finding Date</label>
              <input
                type="date"
                value={formData.finding_date}
                onChange={(e) => setFormData({ ...formData, finding_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.finding_category}
                onChange={(e) => setFormData({ ...formData, finding_category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="observation">Observation</option>
                <option value="minor">Minor</option>
                <option value="major">Major</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="minor">Minor</option>
                <option value="major">Major</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Affected Area</label>
              <input
                type="text"
                value={formData.affected_area}
                onChange={(e) => setFormData({ ...formData, affected_area: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.finding_description}
                onChange={(e) => setFormData({ ...formData, finding_description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows={3}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Root Cause</label>
              <textarea
                value={formData.root_cause}
                onChange={(e) => setFormData({ ...formData, root_cause: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows={2}
              />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="flex-1 bg-green-800 text-white py-2 rounded-lg hover:bg-green-700 transition">
                Save Finding
              </button>
              <button type="button" onClick={resetForm} className="flex-1 bg-gray-300 text-gray-900 py-2 rounded-lg hover:bg-gray-400 transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-green-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Category</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Description</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Severity</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tab === 'nonconformances' ? (
              nonconformances.map((nc) => (
                <tr key={nc.id} className="hover:bg-green-50">
                  <td className="px-6 py-4 text-sm text-gray-600">{nc.finding_date}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{nc.finding_category}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{nc.finding_description.substring(0, 50)}...</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      nc.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      nc.severity === 'major' ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {nc.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm flex gap-3">
                    <button onClick={() => handleDelete(nc.id)} className="text-red-600 hover:text-red-700">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              capas.map((capa) => (
                <tr key={capa.id} className="hover:bg-green-50">
                  <td className="px-6 py-4 text-sm text-gray-600">{capa.target_completion_date}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">CAPA #{capa.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{capa.action_description.substring(0, 50)}...</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      capa.status === 'closed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {capa.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm flex gap-3">
                    <button onClick={() => handleDelete(capa.id)} className="text-red-600 hover:text-red-700">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
