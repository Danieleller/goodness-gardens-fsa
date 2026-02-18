import { useState, useEffect } from 'react';
import { FileSearch, ChevronDown, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { setupAPI } from '@/api';

interface AuditEntry {
  id: number;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: number | null;
  before_value: string | null;
  after_value: string | null;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

const actionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  login: 'bg-purple-100 text-purple-800',
  toggle: 'bg-yellow-100 text-yellow-800',
};

const entityLabels: Record<string, string> = {
  user: 'User',
  facility: 'Facility',
  supplier: 'Supplier',
  sop: 'SOP Document',
  checklist: 'Checklist',
  corrective_action: 'Corrective Action',
  audit_simulation: 'Audit Simulation',
  module_config: 'Module Config',
  transaction_config: 'Transaction Config',
  role: 'Role',
  permission: 'Permission',
};

export function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filterAction, setFilterAction] = useState('all');
  const pageSize = 50;

  const fetchLogs = async (offset: number) => {
    setLoading(true);
    try {
      const res = await setupAPI.auditLog.getAll({ limit: pageSize, offset });
      setEntries(res.data?.logs || []);
      setTotal(res.data?.total || 0);
    } catch (_e) {
      setEntries([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page * pageSize);
  }, [page]);

  const filtered = entries.filter((e) => {
    if (filterAction !== 'all' && e.action !== filterAction) return false;
    return true;
  });

  const userName = (entry: AuditEntry) => {
    if (entry.first_name && entry.last_name) return `${entry.first_name} ${entry.last_name}`;
    if (entry.email) return entry.email;
    return `User #${entry.user_id}`;
  };

  const formatDetails = (entry: AuditEntry) => {
    const parts: string[] = [];
    const entityLabel = entityLabels[entry.entity_type] || entry.entity_type;
    parts.push(`${entry.action} ${entityLabel}`);
    if (entry.entity_id) parts[0] += ` #${entry.entity_id}`;

    // Show key changes from before/after if available
    if (entry.after_value) {
      try {
        const after = JSON.parse(entry.after_value);
        const keys = Object.keys(after).slice(0, 3);
        if (keys.length > 0) {
          const summary = keys.map((k) => `${k}: ${after[k]}`).join(', ');
          parts.push(summary);
        }
      } catch {
        // not JSON, use as-is
      }
    }
    return parts;
  };

  const actionBadge = (action: string) => {
    const color = actionColors[action] || 'bg-gray-100 text-gray-800';
    return `inline-block px-2 py-0.5 rounded text-xs font-medium ${color}`;
  };

  // Count by action type from current page
  const actionCounts = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.action] = (acc[e.action] || 0) + 1;
    return acc;
  }, {});

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <div className="bg-white border-b border-green-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileSearch className="w-7 h-7 sm:w-8 sm:h-8 text-green-700" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-green-900">Audit Log</h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  System events, user actions, and data changes &middot; {total} total entries
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchLogs(page * pageSize)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
              <div className="relative">
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="appearance-none px-4 py-2 pr-10 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
                >
                  <option value="all">All Actions</option>
                  <option value="create">Create</option>
                  <option value="update">Update</option>
                  <option value="delete">Delete</option>
                  <option value="login">Login</option>
                  <option value="toggle">Toggle</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {Object.entries(actionCounts).slice(0, 4).map(([action, count]) => (
            <div key={action} className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
              <div className="text-xs text-gray-500 font-medium mb-1 capitalize">{action}</div>
              <div className="text-2xl font-bold text-gray-800">{count}</div>
            </div>
          ))}
          {Object.keys(actionCounts).length === 0 && !loading && (
            <div className="col-span-4 bg-white rounded-xl shadow-md p-4 border border-gray-100 text-center text-gray-400 text-sm">
              No audit log entries yet
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-md border border-green-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Timestamp</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">User</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Action</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden sm:table-cell">Entity</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-gray-400">
                          {entries.length === 0
                            ? 'No audit log entries recorded yet. Actions like creating users, updating records, and logins will appear here.'
                            : 'No entries match the current filter'}
                        </td>
                      </tr>
                    ) : (
                      filtered.map((entry) => {
                        const details = formatDetails(entry);
                        return (
                          <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                            <td className="py-3 px-4 text-gray-500 whitespace-nowrap text-xs">
                              {entry.created_at
                                ? new Date(entry.created_at).toLocaleString()
                                : '—'}
                            </td>
                            <td className="py-3 px-4 font-medium text-gray-800 whitespace-nowrap">
                              {userName(entry)}
                            </td>
                            <td className="py-3 px-4">
                              <span className={actionBadge(entry.action)}>{entry.action}</span>
                            </td>
                            <td className="py-3 px-4 hidden sm:table-cell text-gray-600">
                              {entityLabels[entry.entity_type] || entry.entity_type}
                              {entry.entity_id ? ` #${entry.entity_id}` : ''}
                            </td>
                            <td className="py-3 px-4 text-gray-700 text-xs max-w-xs truncate">
                              {details.length > 1 ? details[1] : details[0]}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                  Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
