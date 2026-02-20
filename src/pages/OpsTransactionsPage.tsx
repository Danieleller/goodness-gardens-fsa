import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, CheckCircle, Clock, AlertTriangle, ClipboardCheck,
  Loader, ChevronRight, Search, Filter, Building2, Download
} from 'lucide-react';
import { opsAPI, facilitiesAPI } from '@/api';

interface TaskRow {
  id: number;
  transaction_id: string;
  template_name: string;
  prefix: string;
  category: string;
  facility_name: string;
  status: string;
  due_date: string;
  assigned_user_name: string | null;
  submitted_at: string | null;
}

interface Facility {
  id: number;
  name: string;
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  pending: { color: 'text-gray-600', bg: 'bg-gray-100', label: 'Pending' },
  in_progress: { color: 'text-blue-600', bg: 'bg-blue-100', label: 'In Progress' },
  submitted: { color: 'text-green-600', bg: 'bg-green-100', label: 'Submitted' },
  approved: { color: 'text-emerald-700', bg: 'bg-emerald-100', label: 'Approved' },
  overdue: { color: 'text-red-600', bg: 'bg-red-100', label: 'Overdue' },
};

export function OpsTransactionsPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  // Filters
  const [filterDate, setFilterDate] = useState('');
  const [filterFacility, setFilterFacility] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    facilitiesAPI.getAll().then((res) => setFacilities(res.data.facilities || [])).catch(() => {});
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { limit, offset };
      if (filterDate) params.date = filterDate;
      if (filterFacility) params.facility_id = Number(filterFacility);
      if (filterStatus) params.status = filterStatus;
      const res = await opsAPI.tasks.getAll(params);
      let rows = res.data.tasks || [];
      setTotal(res.data.total || rows.length);
      // Client-side search filter on transaction_id or template_name
      if (search) {
        const q = search.toLowerCase();
        rows = rows.filter((t: TaskRow) =>
          t.transaction_id.toLowerCase().includes(q) ||
          t.template_name.toLowerCase().includes(q) ||
          (t.assigned_user_name || '').toLowerCase().includes(q)
        );
      }
      setTasks(rows);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setOffset(0); }, [filterDate, filterFacility, filterStatus]);
  useEffect(() => { fetchTasks(); }, [filterDate, filterFacility, filterStatus, offset]);

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText size={28} className="text-green-800" />
              All Transactions
            </h1>
            <p className="text-sm text-gray-500 mt-1">{total} task records</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ID, task, or employee..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              />
            </div>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
            />
            <select
              value={filterFacility}
              onChange={(e) => setFilterFacility(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Facilities</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="overdue">Overdue</option>
            </select>
            <button
              onClick={() => { setFilterDate(''); setFilterFacility(''); setFilterStatus(''); setSearch(''); }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-green-800 border border-gray-300 rounded-lg transition"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader className="animate-spin mb-4 text-green-800" size={40} />
            <p className="text-gray-500">Loading transactions...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Transactions Found</h3>
            <p className="text-gray-500 text-sm">Adjust your filters or generate tasks first.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-lg shadow-sm border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Transaction ID</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Task</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Facility</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Assigned To</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Due Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tasks.map((t) => {
                    const sc = statusConfig[t.status] || statusConfig.pending;
                    return (
                      <tr key={t.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-semibold text-green-800">{t.transaction_id}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{t.template_name}</td>
                        <td className="px-4 py-3 text-gray-600">{t.facility_name}</td>
                        <td className="px-4 py-3 text-gray-600">{t.assigned_user_name || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{new Date(t.due_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${sc.bg} ${sc.color}`}>
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link to={`/ops/tasks/${t.id}`} className="text-green-700 hover:text-green-900">
                            <ChevronRight size={16} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {tasks.map((t) => {
                const sc = statusConfig[t.status] || statusConfig.pending;
                return (
                  <Link key={t.id} to={`/ops/tasks/${t.id}`} className="block bg-white rounded-lg shadow-sm border p-3 hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-semibold text-green-800">{t.transaction_id}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{t.template_name}</p>
                    <p className="text-xs text-gray-500">{t.facility_name} • {new Date(t.due_date).toLocaleDateString()}</p>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {total > limit && (
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  {offset + 1}–{Math.min(offset + limit, total)} of {total}
                </span>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                  className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
