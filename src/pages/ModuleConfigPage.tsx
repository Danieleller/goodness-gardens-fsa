import { useState, useEffect } from 'react';
import { Blocks, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';
import { setupAPI } from '@/api';

interface ModuleConfig {
  id: number;
  module_key: string;
  module_name: string;
  module_group: string;
  is_enabled: number;
  description: string;
}

const GROUP_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  operations: { label: 'Operations', color: 'text-green-800', bg: 'bg-green-50 border-green-200' },
  compliance: { label: 'Compliance', color: 'text-purple-800', bg: 'bg-purple-50 border-purple-200' },
  management: { label: 'Management', color: 'text-blue-800', bg: 'bg-blue-50 border-blue-200' },
};

export function ModuleConfigPage() {
  const [modules, setModules] = useState<ModuleConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const loadModules = async () => {
    setLoading(true);
    try {
      const res = await setupAPI.moduleConfig.getAll();
      setModules(res.data?.modules || []);
    } catch {
      setModules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadModules(); }, []);

  const handleToggle = async (m: ModuleConfig) => {
    setToggling(m.module_key);
    try {
      const newState = m.is_enabled ? false : true;
      await setupAPI.moduleConfig.toggle(m.module_key, newState);
      setModules(prev => prev.map(mod =>
        mod.module_key === m.module_key ? { ...mod, is_enabled: newState ? 1 : 0 } : mod
      ));
      setToast(`${m.module_name} ${newState ? 'enabled' : 'disabled'}`);
      setTimeout(() => setToast(''), 3000);
    } catch {
      setToast('Toggle failed');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setToggling(null);
    }
  };

  // Group modules
  const groups = ['operations', 'compliance', 'management'];
  const grouped = groups.map(g => ({
    key: g,
    ...GROUP_LABELS[g],
    modules: modules.filter(m => m.module_group === g),
  }));

  const enabledCount = modules.filter(m => m.is_enabled).length;
  const totalCount = modules.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <div className="bg-white border-b border-green-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Blocks className="w-7 h-7 sm:w-8 sm:h-8 text-green-700" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-green-900">Module Configuration</h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Enable or disable portal modules</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">{enabledCount}/{totalCount} modules enabled</span>
              <button
                onClick={loadModules}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-green-700 text-white rounded-lg hover:bg-green-800 transition"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Info */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-yellow-800">
            Disabled modules will be hidden from the navigation menu and dashboard for all users. Data is preserved — you can re-enable modules at any time.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map((group) => (
              <div key={group.key}>
                <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${group.bg} ${group.color}`}>
                    {group.label}
                  </span>
                  <span className="text-sm font-normal text-gray-400">
                    {group.modules.filter(m => m.is_enabled).length}/{group.modules.length} active
                  </span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.modules.map((m) => (
                    <div
                      key={m.module_key}
                      className={`bg-white rounded-xl shadow-md border p-5 transition ${
                        m.is_enabled ? 'border-green-200' : 'border-gray-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-800 text-sm">{m.module_name}</h3>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{m.description}</p>
                          <div className="mt-2">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              m.is_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {m.is_enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggle(m)}
                          disabled={toggling === m.module_key}
                          className="shrink-0 mt-1 transition disabled:opacity-50"
                          title={m.is_enabled ? 'Click to disable' : 'Click to enable'}
                        >
                          {m.is_enabled ? (
                            <ToggleRight className="w-10 h-10 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-10 h-10 text-gray-300" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
