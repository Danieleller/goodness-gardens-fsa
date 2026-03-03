import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Beaker } from 'lucide-react';
import { chemicalAPI } from '@/api';

interface ChemicalApp {
  id: number;
  product_name: string;
  application_date: string;
  mrl_ppm?: number;
  expected_residue_level_ppm?: number;
  created_at: string;
}

interface ChemicalStorage {
  id: number;
  product_name: string;
  storage_location: string;
  expiration_date?: string;
  created_at: string;
}

export function ChemicalsPage() {
  const [tab, setTab] = useState<'applications' | 'storage'>('applications');
  const [applications, setApplications] = useState<ChemicalApp[]>([]);
  const [storage, setStorage] = useState<ChemicalStorage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    product_name: '',
    active_ingredient: '',
    epa_registration_number: '',
    application_date: '',
    application_location: '',
    quantity_applied: '',
    quantity_unit: '',
    applicator_name: '',
    pre_harvest_interval_days: '',
    mrl_ppm: '',
    expected_residue_level_ppm: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, [tab]);

  const fetchData = async () => {
    try {
      if (tab === 'applications') {
        const response = await chemicalAPI.applications.getAll();
        setApplications(response.data);
      } else {
        const response = await chemicalAPI.storage.getAll();
        setStorage(response.data);
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
      await chemicalAPI.applications.create(formData);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this record?')) {
      try {
        if (tab === 'applications') {
          await chemicalAPI.applications.delete(id);
        } else {
          await chemicalAPI.storage.delete(id);
        }
        fetchData();
      } catch (error) {
        console.error('Failed to delete:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      product_name: '',
      active_ingredient: '',
      epa_registration_number: '',
      application_date: '',
      application_location: '',
      quantity_applied: '',
      quantity_unit: '',
      applicator_name: '',
      pre_harvest_interval_days: '',
      mrl_ppm: '',
      expected_residue_level_ppm: '',
      notes: '',
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
          <Beaker size={32} className="text-green-800" />
          Chemical Management
        </h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-green-800 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
        >
          <Plus size={20} />
          New Record
        </button>
      </div>

      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setTab('applications')}
          className={`px-4 py-2 font-medium transition ${
            tab === 'applications'
              ? 'text-green-800 border-b-2 border-green-800'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Applications
        </button>
        <button
          onClick={() => setTab('storage')}
          className={`px-4 py-2 font-medium transition ${
            tab === 'storage'
              ? 'text-green-800 border-b-2 border-green-800'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Storage
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">New Chemical Application</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <input
                type="text"
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Active Ingredient</label>
              <input
                type="text"
                value={formData.active_ingredient}
                onChange={(e) => setFormData({ ...formData, active_ingredient: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Application Date</label>
              <input
                type="date"
                value={formData.application_date}
                onChange={(e) => setFormData({ ...formData, application_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MRL (ppm)</label>
              <input
                type="number"
                step="0.01"
                value={formData.mrl_ppm}
                onChange={(e) => setFormData({ ...formData, mrl_ppm: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows={2}
              />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="flex-1 bg-green-800 text-white py-2 rounded-lg hover:bg-green-700 transition">
                Save
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
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Product</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Details</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tab === 'applications' ? (
              applications.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Beaker size={40} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 text-sm">No chemical applications found</p>
                    <p className="text-gray-400 text-xs mt-1">Click "+ New Record" to log a chemical application</p>
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-green-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{app.product_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{app.application_date}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {app.expected_residue_level_ppm && app.mrl_ppm ? (
                        <span className={app.expected_residue_level_ppm <= app.mrl_ppm ? 'text-green-600' : 'text-red-600'}>
                          {app.expected_residue_level_ppm <= app.mrl_ppm ? 'Compliant' : 'Non-Compliant'}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm flex gap-3">
                      <button onClick={() => handleDelete(app.id)} className="text-red-600 hover:text-red-700">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )
            ) : (
              storage.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Beaker size={40} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 text-sm">No chemical storage records found</p>
                    <p className="text-gray-400 text-xs mt-1">Click "+ New Record" to add a storage entry</p>
                  </td>
                </tr>
              ) : (
                storage.map((item) => (
                  <tr key={item.id} className="hover:bg-green-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.product_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.storage_location}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.expiration_date || '-'}</td>
                    <td className="px-6 py-4 text-sm flex gap-3">
                      <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-700">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
