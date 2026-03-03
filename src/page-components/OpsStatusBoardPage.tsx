import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3, Building2, CheckCircle, AlertTriangle, Clock, Loader, Users,
  ChevronRight, TrendingUp, RefreshCw
} from 'lucide-react';
import { opsAPI } from '@/api';

interface FacilityStat {
  facility_id: number;
  facility_name: string;
  total: number;
  completed: number;
  pending: number;
  in_progress: number;
  overdue: number;
  pct: number;
}

interface MissingTask {
  id: number;
  transaction_id: string;
  template_name: string;
  facility_name: string;
  status: string;
  assigned_user_name: string | null;
}

interface EmployeeRate {
  user_id: number;
  name: string;
  total: number;
  completed: number;
  rate: number;
}

export function OpsStatusBoardPage() {
  const [facilities, setFacilities] = useState<FacilityStat[]>([]);
  const [missing, setMissing] = useState<MissingTask[]>([]);
  const [employees, setEmployees] = useState<EmployeeRate[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await opsAPI.status(selectedDate);
      setFacilities(res.data.facilities || []);
      setMissing(res.data.missing || []);
      setEmployees(res.data.employees || []);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, [selectedDate]);

  const overallTotal = facilities.reduce((s, f) => s + f.total, 0);
  const overallCompleted = facilities.reduce((s, f) => s + f.completed, 0);
  const overallPct = overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0;
  const overallOverdue = facilities.reduce((s, f) => s + f.overdue, 0);

  const riskColor = (pct: number) => {
    if (pct >= 90) return 'text-green-600';
    if (pct >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };
  const riskBg = (pct: number) => {
    if (pct >= 90) return 'bg-green-500';
    if (pct >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 size={28} className="text-green-800" />
              Completion Status Board
            </h1>
            <p className="text-sm text-gray-500 mt-1">Real-time task compliance by facility</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
            />
            <button onClick={fetchStatus} className="p-2 text-gray-400 hover:text-green-800 transition">
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader className="animate-spin mb-4 text-green-800" size={40} />
            <p className="text-gray-500">Loading status...</p>
          </div>
        ) : (
          <>
            {/* Overall KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{overallTotal}</p>
                <p className="text-xs text-gray-500">Total Tasks</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
                <p className={`text-2xl font-bold ${riskColor(overallPct)}`}>{overallPct}%</p>
                <p className="text-xs text-gray-500">Completion</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{overallCompleted}</p>
                <p className="text-xs text-gray-500">Completed</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
                <p className={`text-2xl font-bold ${overallOverdue > 0 ? 'text-red-600' : 'text-gray-400'}`}>{overallOverdue}</p>
                <p className="text-xs text-gray-500">Overdue</p>
              </div>
            </div>

            {/* Per-Facility Breakdown */}
            {facilities.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">By Facility</h2>
                <div className="space-y-3">
                  {facilities.map((f) => (
                    <div key={f.facility_id} className="bg-white rounded-lg shadow-sm border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Building2 size={16} className="text-gray-400" />
                          <span className="font-medium text-gray-900">{f.facility_name}</span>
                        </div>
                        <span className={`text-sm font-bold ${riskColor(f.pct)}`}>{f.pct}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-500 ${riskBg(f.pct)}`}
                          style={{ width: `${f.pct}%` }}
                        />
                      </div>
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><CheckCircle size={12} className="text-green-500" />{f.completed} done</span>
                        <span className="flex items-center gap-1"><Clock size={12} className="text-blue-500" />{f.pending + f.in_progress} pending</span>
                        {f.overdue > 0 && (
                          <span className="flex items-center gap-1"><AlertTriangle size={12} className="text-red-500" />{f.overdue} overdue</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing / Overdue Tasks */}
            {missing.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-red-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <AlertTriangle size={14} />
                  Incomplete Tasks ({missing.length})
                </h2>
                <div className="bg-white rounded-lg shadow-sm border divide-y">
                  {missing.map((t) => (
                    <Link key={t.id} to={`/ops/tasks/${t.id}`} className="flex items-center gap-3 p-3 hover:bg-gray-50 transition group">
                      <AlertTriangle size={16} className={t.status === 'overdue' ? 'text-red-500' : 'text-yellow-500'} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-400">{t.transaction_id}</span>
                          <span className="text-sm font-medium text-gray-900">{t.template_name}</span>
                        </div>
                        <span className="text-xs text-gray-500">{t.facility_name}{t.assigned_user_name ? ` • ${t.assigned_user_name}` : ''}</span>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-green-800" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Employee Compliance Rates */}
            {employees.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Users size={14} />
                  Employee Compliance (30-day)
                </h2>
                <div className="bg-white rounded-lg shadow-sm border divide-y">
                  {employees.map((emp) => (
                    <div key={emp.user_id} className="flex items-center gap-3 p-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <Users size={14} className="text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900">{emp.name}</span>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div className={`h-1.5 rounded-full ${riskBg(emp.rate)}`} style={{ width: `${emp.rate}%` }} />
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${riskColor(emp.rate)}`}>{emp.rate}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {facilities.length === 0 && !loading && (
              <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                <BarChart3 size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">No Task Data</h3>
                <p className="text-gray-500 text-sm">No tasks have been generated for this date.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
