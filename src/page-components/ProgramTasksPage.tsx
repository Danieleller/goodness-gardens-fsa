import { useState, useEffect } from 'react';
import {
  ListChecks,
  Filter,
  Search,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Ban,
  FileText,
} from 'lucide-react';
import { programTasksAPI } from '@/api';
import { useAuthStore } from '@/store';

interface ProgramTask {
  id: number;
  code: string;
  title: string;
  description: string;
  task_type: string;
  priority: string;
  status: string;
  phase: string;
  owner: string;
  effort_estimate: string;
  target_date: string;
  completion_date: string;
  linked_sop_code: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface FilterState {
  taskType?: string;
  status?: string;
  priority?: string;
  phase?: string;
  owner?: string;
  search?: string;
}

const TASK_TYPES = [
  { value: 'gap', label: 'Gap Analysis' },
  { value: 'open_item', label: 'Open Item' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'review', label: 'Review' },
  { value: 'addenda', label: 'Addenda' },
];
const STATUSES = ['pending', 'in_progress', 'completed', 'blocked'];
const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const PHASES = ['Phase 1', 'Phase 2', 'Phase 3'];
const OWNERS = ['Danielle', 'Dael', 'Daniel', 'Rachel', 'Connor'];

const taskTypeColors: Record<string, string> = {
  gap: 'bg-red-100 text-red-700 border-red-300',
  open_item: 'bg-orange-100 text-orange-700 border-orange-300',
  milestone: 'bg-blue-100 text-blue-700 border-blue-300',
  review: 'bg-purple-100 text-purple-700 border-purple-300',
  addenda: 'bg-teal-100 text-teal-700 border-teal-300',
};

const taskTypeLabels: Record<string, string> = {
  gap: 'Gap', open_item: 'Open Item', milestone: 'Milestone',
  review: 'Review', addenda: 'Addenda',
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock size={14} className="text-gray-500" />,
  in_progress: <Loader2 size={14} className="text-blue-500" />,
  completed: <CheckCircle2 size={14} className="text-green-600" />,
  blocked: <Ban size={14} className="text-red-500" />,
};

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700',
};

const priorityColors: Record<string, string> = {
  CRITICAL: 'text-red-600 bg-red-50 border-red-200',
  HIGH: 'text-orange-600 bg-orange-50 border-orange-200',
  MEDIUM: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  LOW: 'text-gray-500 bg-gray-50 border-gray-200',
};

const phaseColors: Record<string, string> = {
  'Phase 1': 'bg-red-100 text-red-700',
  'Phase 2': 'bg-yellow-100 text-yellow-700',
  'Phase 3': 'bg-green-100 text-green-700',
};

export function ProgramTasksPage() {
  const user = useAuthStore((state) => state.user);
  const canEdit = ['fsqa', 'management', 'admin'].includes(user?.role || '');

  const [tasks, setTasks] = useState<ProgramTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({});
  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const params: any = {};
        if (filters.taskType) params.taskType = filters.taskType;
        if (filters.status) params.status = filters.status;
        if (filters.priority) params.priority = filters.priority;
        if (filters.phase) params.phase = filters.phase;
        if (filters.owner) params.owner = filters.owner;
        const result = await programTasksAPI.getAll(params);
        setTasks(result.data || []);
      } catch (error) {
        console.error('Failed to fetch program tasks:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [filters]);

  const filteredTasks = filters.search
    ? tasks.filter(
        (t) =>
          f(t, 'code', '').toLowerCase().includes(filters.search!.toLowerCase()) ||
          f(t, 'title', '').toLowerCase().includes(filters.search!.toLowerCase()) ||
          f(t, 'description', '').toLowerCase().includes(filters.search!.toLowerCase())
      )
    : tasks;

  // Helper for snake_case / camelCase field access
  function f(task: any, ...keys: string[]): string {
    const camelMap: Record<string, string> = {
      task_type: 'taskType', target_date: 'targetDate', completion_date: 'completionDate',
      effort_estimate: 'effortEstimate', linked_sop_code: 'linkedSopCode',
      created_at: 'createdAt', updated_at: 'updatedAt',
    };
    for (const k of keys) {
      if (task[k] !== undefined && task[k] !== null) return String(task[k]);
      const camel = camelMap[k];
      if (camel && task[camel] !== undefined && task[camel] !== null) return String(task[camel]);
    }
    return '';
  }

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    if (!canEdit) return;
    try {
      setUpdatingStatus(taskId);
      await programTasksAPI.update(taskId, { status: newStatus });
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Summary stats
  const stats = {
    total: filteredTasks.length,
    pending: filteredTasks.filter(t => t.status === 'pending').length,
    inProgress: filteredTasks.filter(t => t.status === 'in_progress').length,
    completed: filteredTasks.filter(t => t.status === 'completed').length,
    blocked: filteredTasks.filter(t => t.status === 'blocked').length,
    critical: filteredTasks.filter(t => (t.priority || '').toUpperCase() === 'CRITICAL').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-800 text-white py-8 px-6 shadow-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <ListChecks size={32} />
            <div>
              <h1 className="text-3xl font-bold">Program Tasks</h1>
              <p className="text-indigo-200 text-sm">Food Safety Primus Program — Action Items & Milestones</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500 uppercase">Total</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-500">{stats.pending}</p>
            <p className="text-xs text-gray-500 uppercase">Pending</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            <p className="text-xs text-gray-500 uppercase">In Progress</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-xs text-gray-500 uppercase">Completed</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.blocked}</p>
            <p className="text-xs text-gray-500 uppercase">Blocked</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 text-center border-l-4 border-red-500">
            <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
            <p className="text-xs text-gray-500 uppercase">Critical</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-indigo-700" />
            <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-3 text-gray-400" />
              <input type="text" placeholder="Search..." value={filters.search || ''} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
            </div>
            <select value={filters.taskType || ''} onChange={(e) => setFilters({ ...filters, taskType: e.target.value || undefined })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="">All Types</option>
              {TASK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={filters.status || ''} onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="">All Statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <select value={filters.priority || ''} onChange={(e) => setFilters({ ...filters, priority: e.target.value || undefined })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="">All Priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={filters.phase || ''} onChange={(e) => setFilters({ ...filters, phase: e.target.value || undefined })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="">All Phases</option>
              {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={filters.owner || ''} onChange={(e) => setFilters({ ...filters, owner: e.target.value || undefined })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="">All Owners</option>
              {OWNERS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            {Object.values(filters).some((v) => v) && (
              <button onClick={() => setFilters({})} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors">Clear</button>
            )}
          </div>
        </div>

        {/* Tasks Table */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={48} className="text-indigo-600 animate-spin" />
              <p className="text-gray-600 font-medium">Loading tasks...</p>
            </div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <ListChecks size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg font-medium">No tasks found</p>
            <p className="text-gray-500 text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="hidden md:grid grid-cols-12 gap-2 px-6 py-3 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
              <div className="col-span-1">Code</div>
              <div className="col-span-3">Title</div>
              <div className="col-span-1">Type</div>
              <div className="col-span-1">Priority</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1">Phase</div>
              <div className="col-span-1">Owner</div>
              <div className="col-span-1">Target</div>
              <div className="col-span-1">SOP</div>
              <div className="col-span-1"></div>
            </div>

            {/* Rows */}
            {filteredTasks.map((task) => {
              const taskType = f(task, 'task_type');
              const targetDate = f(task, 'target_date');
              const linkedSop = f(task, 'linked_sop_code');
              const isExpanded = expandedTask === task.id;
              const isOverdue = targetDate && new Date(targetDate) < new Date() && task.status !== 'completed';

              return (
                <div key={task.id} className="border-b last:border-b-0">
                  {/* Main row */}
                  <div
                    className={`grid grid-cols-1 md:grid-cols-12 gap-2 px-6 py-3 items-center cursor-pointer hover:bg-gray-50 transition ${isOverdue ? 'bg-red-50/50' : ''}`}
                    onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                  >
                    <div className="col-span-1 font-mono text-sm font-bold text-gray-700">{task.code}</div>
                    <div className="col-span-3 text-sm text-gray-800 font-medium truncate">
                      {isOverdue && <AlertTriangle size={12} className="inline text-red-500 mr-1" />}
                      {task.title}
                    </div>
                    <div className="col-span-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${taskTypeColors[taskType] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                        {taskTypeLabels[taskType] || taskType}
                      </span>
                    </div>
                    <div className="col-span-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${priorityColors[task.priority] || ''}`}>
                        {task.priority}
                      </span>
                    </div>
                    <div className="col-span-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[task.status] || 'bg-gray-100 text-gray-700'}`}>
                        {statusIcons[task.status]}
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="col-span-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${phaseColors[task.phase] || ''}`}>
                        {task.phase}
                      </span>
                    </div>
                    <div className="col-span-1 text-xs text-gray-600">{task.owner}</div>
                    <div className={`col-span-1 text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                      {targetDate ? new Date(targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </div>
                    <div className="col-span-1">
                      {linkedSop && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono">
                          <FileText size={10} className="inline mr-0.5" />{linkedSop}
                        </span>
                      )}
                    </div>
                    <div className="col-span-1 text-right">
                      {isExpanded ? <ChevronUp size={16} className="text-gray-400 inline" /> : <ChevronDown size={16} className="text-gray-400 inline" />}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-6 py-4 bg-gray-50 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Description</p>
                          <p className="text-sm text-gray-700">{task.description || 'No description'}</p>
                        </div>
                        <div className="space-y-2">
                          {f(task, 'effort_estimate') && (
                            <div>
                              <p className="text-xs text-gray-500 uppercase font-semibold">Effort</p>
                              <p className="text-sm text-gray-700">{f(task, 'effort_estimate')}</p>
                            </div>
                          )}
                          {task.notes && (
                            <div>
                              <p className="text-xs text-gray-500 uppercase font-semibold">Notes</p>
                              <p className="text-sm text-gray-700">{task.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status actions */}
                      {canEdit && (
                        <div className="mt-4 pt-3 border-t flex items-center gap-2">
                          <span className="text-xs text-gray-500 font-semibold uppercase mr-2">Set status:</span>
                          {STATUSES.filter(s => s !== task.status).map(s => (
                            <button
                              key={s}
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, s); }}
                              disabled={updatingStatus === task.id}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusColors[s]} hover:opacity-80 disabled:opacity-50`}
                            >
                              {updatingStatus === task.id && <Loader2 size={12} className="animate-spin" />}
                              {statusIcons[s]} {s.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
