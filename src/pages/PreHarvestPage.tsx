import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { preHarvestAPI } from '@/api';

interface PreHarvestLog {
  id: number;
  log_type: string;
  test_date?: string;
  amendment_date?: string;
  training_date?: string;
  water_source?: string;
  amendment_type?: string;
  training_topic?: string;
  created_at: string;
}

export function PreHarvestPage() {
  const [logs, setLogs] = useState<PreHarvestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    log_type: 'water_test',
    water_source: '',
    test_date: '',
    ph_level: '',
    e_coli_result: '',
    total_coliform_result: '',
    test_location: '',
    lab_name: '',
    notes: '',
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await preHarvestAPI.getAll();
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await preHarvestAPI.update(editingId, formData);
      } else {
        await preHarvestAPI.create(formData);
      }
      resetForm();
      fetchLogs();
    } catch (error) {
      console.error('Failed to save log:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this log?')) {
      try {
        await preHarvestAPI.delete(id);
        fetchLogs();
      } catch (error) {
        console.error('Failed to delete log:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      log_type: 'water_test',
      water_source: '',
      test_date: '',
      ph_level: '',
      e_coli_result: '',
      total_coliform_result: '',
      test_location: '',
      lab_name: '',
      notes: '',
    });
    setShowForm(false);
    setEditingId(null);
  };

  if (loading) {
    return <div className="p-6"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Pre-Harvest Logs</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-green-800 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
        >
          <Plus size={20} />
          New Log
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Log' : 'New Pre-Harvest Log'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Log Type</label>
              <select
                value={formData.log_type}
                onChange={(e) => setFormData({ ...formData, log_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="water_test">Water Test</option>
                <option value="soil_amendment">Soil Amendment</option>
                <option value="worker_training">Worker Training</option>
                <option value="animal_intrusion">Animal Intrusion</option>
              </select>
            </div>

            {formData.log_type === 'water_test' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Water Source</label>
                  <input
                    type="text"
                    value={formData.water_source}
                    onChange={(e) => setFormData({ ...formData, water_source: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Date</label>
                  <input
                    type="date"
                    value={formData.test_date}
                    onChange={(e) => setFormData({ ...formData, test_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">pH Level</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.ph_level}
                    onChange={(e) => setFormData({ ...formData, ph_level: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E. Coli Result</label>
                  <input
                    type="text"
                    value={formData.e_coli_result}
                    onChange={(e) => setFormData({ ...formData, e_coli_result: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows={3}
              />
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-green-800 text-white py-2 rounded-lg hover:bg-green-700 transition"
              >
                Save Log
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 bg-gray-300 text-gray-900 py-2 rounded-lg hover:bg-gray-400 transition"
              >
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
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Details</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-green-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{log.log_type.replace(/_/g, ' ')}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{log.test_date || log.amendment_date || log.training_date || log.created_at.split('T')[0]}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{log.water_source || log.amendment_type || log.training_topic || '-'}</td>
                <td className="px-6 py-4 text-sm flex gap-3">
                  <button
                    onClick={() => {
                      setEditingId(log.id);
                      setShowForm(true);
                    }}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
