import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardCheck, CheckCircle, Clock, AlertTriangle, Loader, ChevronRight,
  Calendar, Building2, RefreshCw
} from 'lucide-react';
import { opsAPI } from '@/api';
import { useAuthStore } from '@/store';

interface TaskInstance {
  id: number;
  template_id: number;
  facility_id: number;
  transaction_id: string;
  status: string;
  due_date: string;
  template_name: string;
  prefix: string;
  template_code: string;
  category: string;
  facility_name: string;
  field_count: number;
  assigned_user_id: number | null;
  submitted_at: string | null;
}

const statusConfig: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  pending: { color: 'text-gray-600', bg: 'bg-gray-100', icon: Clock, label: 'Pending' },
  in_progress: { color: 'text-blue-600', bg: 'bg-blue-100', icon: ClipboardCheck, label: 'In Progress' },
  submitted: { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle, label: 'Submitted' },
  approved: { color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle, label: 'Approved' },
  overdue: { color: 'text-red-600', bg: 'bg-red-100', icon: AlertTriangle, label: 'Overdue' },
};

const categoryColors: Record<string, string> = {
  inspection: 'border-l-blue-500',
  sanitation: 'border-l-teal-500',
  testing: 'border-l-purple-500',
  chemical: 'border-l-orange-500',
  drill: 'border-l-red-500',
  training: 'border-l-indigo-500',
};

export function OpsMyTasksPage() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<TaskInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const isAdmin = user?.role === 'admin';
  const isSupervisorPlus = ['supervisor', 'fsqa', 'management', 'admin'].includes(user?.role || '');

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await opsAPI.myTasks(selectedDate);
      setTasks(res.data.tasks || []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, [selectedDate]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await opsAPI.generate();
      alert(`Generated ${res.data.created} tasks (${res.data.skipped} skipped)`);
      fetchTasks();
    } catch (error) {
      console.error('Failed to generate tasks:', error);
      alert('Failed to generate tasks');
    } finally {
      setGenerating(false);
    }
  };

  const completed = tasks.filter(t => t.status === 'submitted' || t.status === 'approved');
  const pending = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress' || t.status === 'overdue');
  const completionPct = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardCheck size={28} className="text-green-800" />
              My Tasks
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {selectedDate === new Date().toISOString().split('T')[0] ? "Today's" : selectedDate} compliance tasks
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            {isAdmin && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 bg-green-800 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium disabled:opacity-50"
              >
                <RefreshCw size={16} className={generating ? 'animate-spin' : ''} />
                Generate Tasks
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {tasks.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {completed.length} of {tasks.length} tasks completed
              </span>
              <span className={`text-sm font-bold ${completionPct === 100 ? 'text-green-600' : completionPct >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                {completionPct}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${completionPct === 100 ? 'bg-green-500' : completionPct >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader className="animate-spin mb-4 text-green-800" size={40} />
            <p className="text-gray-500">Loading tasks...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && tasks.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <ClipboardCheck size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Tasks for This Date</h3>
            <p className="text-gray-500 text-sm mb-4">
              {isAdmin
                ? 'Click "Generate Tasks" to create today\'s tasks from active schedules.'
                : 'No tasks have been assigned to you for this date.'}
            </p>
            {isAdmin && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-800 text-white rounded-lg hover:bg-green-700 transition font-medium"
              >
                <RefreshCw size={18} className={generating ? 'animate-spin' : ''} />
                Generate Today's Tasks
              </button>
            )}
          </div>
        )}

        {/* All Caught Up */}
        {!loading && tasks.length > 0 && pending.length === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center mb-6">
            <CheckCircle size={40} className="mx-auto text-green-600 mb-2" />
            <h3 className="text-lg font-semibold text-green-800">All Caught Up!</h3>
            <p className="text-green-700 text-sm">All tasks for today have been completed.</p>
          </div>
        )}

        {/* Pending Tasks */}
        {!loading && pending.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Action Required ({pending.length})
            </h2>
            <div className="space-y-3">
              {pending.map((task) => {
                const sc = statusConfig[task.status] || statusConfig.pending;
                const StatusIcon = sc.icon;
                const borderColor = categoryColors[task.category] || 'border-l-gray-400';
                return (
                  <Link
                    key={task.id}
                    to={`/ops/tasks/${task.id}`}
                    className={`block bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 ${borderColor} hover:shadow-md transition group`}
                  >
                    <div className="p-4 flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${sc.bg}`}>
                        <StatusIcon size={20} className={sc.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-gray-400">{task.transaction_id}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${sc.bg} ${sc.color}`}>
                            {sc.label}
                          </span>
                        </div>
                        <h3 className="font-medium text-gray-900 group-hover:text-green-800 transition">{task.template_name}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Building2 size={12} />
                            {task.facility_name}
                          </span>
                          <span>{task.field_count} fields</span>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-gray-400 group-hover:text-green-800 transition" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed Tasks */}
        {!loading && completed.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Completed ({completed.length})
            </h2>
            <div className="space-y-2">
              {completed.map((task) => {
                const sc = statusConfig[task.status] || statusConfig.submitted;
                const StatusIcon = sc.icon;
                return (
                  <Link
                    key={task.id}
                    to={`/ops/tasks/${task.id}`}
                    className="block bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition opacity-80 group"
                  >
                    <div className="p-3 flex items-center gap-3">
                      <StatusIcon size={18} className={sc.color} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-400">{task.transaction_id}</span>
                          <span className="font-medium text-sm text-gray-700">{task.template_name}</span>
                        </div>
                        <span className="text-xs text-gray-500">{task.facility_name}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {task.submitted_at ? new Date(task.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
