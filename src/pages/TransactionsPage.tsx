import { useState, useEffect } from 'react';
import { ArrowRightLeft, Filter, Search, ChevronDown, RefreshCw } from 'lucide-react';

interface Transaction {
  id: number;
  user_name: string;
  action: string;
  module: string;
  details: string;
  created_at: string;
}

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Simulate loading transaction data from audit_log or similar
    const loadTransactions = async () => {
      setLoading(true);
      try {
        // For now, generate sample transaction data from recent activity
        const sampleTransactions: Transaction[] = [
          { id: 1, user_name: 'Daniel Eller', action: 'Login', module: 'Auth', details: 'User logged in successfully', created_at: new Date().toISOString() },
          { id: 2, user_name: 'Daniel Eller', action: 'View Dashboard', module: 'Operations', details: 'Accessed main dashboard', created_at: new Date(Date.now() - 300000).toISOString() },
          { id: 3, user_name: 'Daniel Eller', action: 'Run Assessment', module: 'Compliance', details: 'Compliance assessment executed for Allentown facility', created_at: new Date(Date.now() - 600000).toISOString() },
          { id: 4, user_name: 'Daniel Eller', action: 'Evaluate Rules', module: 'Reporting', details: 'Compliance rules evaluation completed', created_at: new Date(Date.now() - 900000).toISOString() },
          { id: 5, user_name: 'Daniel Eller', action: 'Export Report', module: 'Reporting', details: 'Generated compliance report PDF', created_at: new Date(Date.now() - 1200000).toISOString() },
          { id: 6, user_name: 'System', action: 'Auto-Notification', module: 'Notifications', details: 'Generated expiry notifications', created_at: new Date(Date.now() - 1800000).toISOString() },
          { id: 7, user_name: 'Daniel Eller', action: 'View Training', module: 'Training', details: 'Accessed training dashboard', created_at: new Date(Date.now() - 2400000).toISOString() },
          { id: 8, user_name: 'System', action: 'Seed Database', module: 'System', details: 'Phase 5 training data seeded', created_at: new Date(Date.now() - 86400000).toISOString() },
        ];
        setTransactions(sampleTransactions);
      } catch {
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };
    loadTransactions();
  }, []);

  const modules = ['all', ...new Set(transactions.map(t => t.module))];
  const filtered = transactions.filter(t => {
    if (filterModule !== 'all' && t.module !== filterModule) return false;
    if (searchQuery && !t.action.toLowerCase().includes(searchQuery.toLowerCase()) && !t.details.toLowerCase().includes(searchQuery.toLowerCase()) && !t.user_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getModuleColor = (module: string) => {
    const colors: Record<string, string> = {
      Auth: 'bg-blue-100 text-blue-800',
      Operations: 'bg-green-100 text-green-800',
      Compliance: 'bg-purple-100 text-purple-800',
      Reporting: 'bg-indigo-100 text-indigo-800',
      Notifications: 'bg-yellow-100 text-yellow-800',
      Training: 'bg-teal-100 text-teal-800',
      System: 'bg-gray-100 text-gray-800',
    };
    return colors[module] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <div className="bg-white border-b border-green-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ArrowRightLeft className="w-7 h-7 sm:w-8 sm:h-8 text-green-700" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-green-900">Transactions</h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">System activity log and transaction history</p>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-green-700 text-white rounded-lg hover:bg-green-800 transition"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="relative">
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="appearance-none px-4 py-2 pr-10 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
            >
              {modules.map(m => (
                <option key={m} value={m}>{m === 'all' ? 'All Modules' : m}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
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
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Timestamp</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">User</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Action</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden sm:table-cell">Module</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden md:table-cell">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-12 text-gray-400">No transactions found</td></tr>
                  ) : filtered.map((t) => (
                    <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap text-xs">
                        {new Date(t.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-800">{t.user_name}</td>
                      <td className="py-3 px-4 text-gray-700">{t.action}</td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getModuleColor(t.module)}`}>
                          {t.module}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 hidden md:table-cell">{t.details}</td>
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
