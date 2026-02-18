import { useState, useEffect } from 'react';
import { Hash, Edit2, X, Check, RefreshCw } from 'lucide-react';
import { setupAPI } from '@/api';

interface PrefixConfig {
  id: number;
  program_type: string;
  prefix: string;
  next_number: number;
  is_active: number;
}

const PROGRAM_LABELS: Record<string, string> = {
  sanitation: 'Sanitation',
  pre_harvest: 'Pre-Harvest',
  chemical: 'Chemical',
  general: 'General',
  corrective_action: 'Corrective Action',
  audit: 'Audit',
};

export function TransactionsPage() {
  const [configs, setConfigs] = useState<PrefixConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrefix, setEditPrefix] = useState('');
  const [editNextNum, setEditNextNum] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const res = await setupAPI.transactionConfig.getAll();
      setConfigs(Array.isArray(res.data) ? res.data : res.data?.configs || []);
    } catch {
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadConfigs(); }, []);

  const startEdit = (c: PrefixConfig) => {
    setEditingId(c.id);
    setEditPrefix(c.prefix);
    setEditNextNum(String(c.next_number));
    setEditActive(c.is_active === 1);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: number) => {
    setSaving(true);
    try {
      await setupAPI.transactionConfig.update(id, {
        prefix: editPrefix,
        next_number: parseInt(editNextNum) || 100001,
        is_active: editActive ? 1 : 0,
      });
      setToast('Configuration saved!');
      setTimeout(() => setToast(''), 3000);
      setEditingId(null);
      await loadConfigs();
    } catch {
      setToast('Save failed');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <div className="bg-white border-b border-green-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Hash className="w-7 h-7 sm:w-8 sm:h-8 text-green-700" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-green-900">Transaction Configuration</h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage transaction ID prefixes and auto-numbering</p>
              </div>
            </div>
            <button
              onClick={loadConfigs}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-green-700 text-white rounded-lg hover:bg-green-800 transition"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Info card */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-800">
            Transaction IDs are automatically generated when records are created. The format is <strong>PREFIX-NUMBER</strong> (e.g. PH-100001). Edit the prefix or next number below.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md border border-green-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-5 font-semibold text-gray-700">Program Type</th>
                    <th className="text-left py-3 px-5 font-semibold text-gray-700">Prefix</th>
                    <th className="text-left py-3 px-5 font-semibold text-gray-700">Next Number</th>
                    <th className="text-left py-3 px-5 font-semibold text-gray-700">Example</th>
                    <th className="text-left py-3 px-5 font-semibold text-gray-700">Status</th>
                    <th className="text-right py-3 px-5 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {configs.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">No transaction configurations found</td></tr>
                  ) : configs.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="py-4 px-5 font-medium text-gray-800">
                        {PROGRAM_LABELS[c.program_type] || c.program_type}
                        <div className="text-xs text-gray-400 mt-0.5 font-normal">{c.program_type}</div>
                      </td>
                      <td className="py-4 px-5">
                        {editingId === c.id ? (
                          <input
                            type="text"
                            value={editPrefix}
                            onChange={(e) => setEditPrefix(e.target.value.toUpperCase())}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                            maxLength={5}
                          />
                        ) : (
                          <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded font-mono font-bold text-sm">{c.prefix}</span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        {editingId === c.id ? (
                          <input
                            type="number"
                            value={editNextNum}
                            onChange={(e) => setEditNextNum(e.target.value)}
                            className="w-28 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        ) : (
                          <span className="font-mono text-gray-700">{c.next_number}</span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-gray-500 font-mono text-xs">
                        {editingId === c.id
                          ? `${editPrefix}-${editNextNum}`
                          : `${c.prefix}-${c.next_number}`
                        }
                      </td>
                      <td className="py-4 px-5">
                        {editingId === c.id ? (
                          <button
                            onClick={() => setEditActive(!editActive)}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                              editActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {editActive ? 'Active' : 'Inactive'}
                          </button>
                        ) : (
                          <span className={`inline-block px-2.5 py-1 rounded text-xs font-medium ${
                            c.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {c.is_active ? 'Active' : 'Inactive'}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-right">
                        {editingId === c.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => saveEdit(c.id)}
                              disabled={saving}
                              className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(c)}
                            className="p-1.5 text-gray-400 hover:text-green-700 transition"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
