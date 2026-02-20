import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, ChevronLeft, ChevronRight, CheckCircle, Clock, AlertTriangle,
  Loader, Building2
} from 'lucide-react';
import { opsAPI, facilitiesAPI } from '@/api';

interface TaskRow {
  id: number;
  transaction_id: string;
  template_name: string;
  facility_name: string;
  status: string;
  due_date: string;
}

interface Facility {
  id: number;
  name: string;
}

export function OpsCalendarPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [filterFacility, setFilterFacility] = useState('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    facilitiesAPI.getAll().then((r) => setFacilities(r.data.facilities || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchMonth = async () => {
      setLoading(true);
      try {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        // Fetch all tasks for the month with a wide date range
        const startDate = new Date(year, month, 1).toISOString().split('T')[0];
        const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
        const params: Record<string, any> = { limit: 1000 };
        if (filterFacility) params.facility_id = Number(filterFacility);
        // We'll fetch all and filter client-side by date range
        const res = await opsAPI.tasks.getAll(params);
        const all = (res.data.tasks || []) as TaskRow[];
        const filtered = all.filter((t) => t.due_date >= startDate && t.due_date <= endDate);
        setTasks(filtered);
      } catch (e) {
        console.error('Failed to fetch calendar data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchMonth();
  }, [currentMonth, filterFacility]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const map: Record<string, TaskRow[]> = {};
    tasks.forEach((t) => {
      const d = t.due_date;
      if (!map[d]) map[d] = [];
      map[d].push(t);
    });
    return map;
  }, [tasks]);

  // Calendar grid
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const dayTasks = selectedDay ? (tasksByDate[selectedDay] || []) : [];

  const pctForDate = (date: string) => {
    const dt = tasksByDate[date];
    if (!dt || dt.length === 0) return -1;
    const done = dt.filter((t) => t.status === 'submitted' || t.status === 'approved').length;
    return Math.round((done / dt.length) * 100);
  };

  const pctColor = (pct: number) => {
    if (pct === 100) return 'bg-green-500';
    if (pct >= 70) return 'bg-yellow-500';
    if (pct >= 0) return 'bg-red-500';
    return '';
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar size={28} className="text-green-800" />
              Task Calendar
            </h1>
            <p className="text-sm text-gray-500 mt-1">Monthly task completion history</p>
          </div>
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
        </div>

        {/* Month Navigation */}
        <div className="bg-white rounded-lg shadow-sm border mb-4">
          <div className="flex items-center justify-between p-4">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ChevronRight size={20} />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader className="animate-spin text-green-800" size={32} />
            </div>
          ) : (
            <>
              {/* Day headers */}
              <div className="grid grid-cols-7 border-t">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-gray-500 py-2 border-b">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, i) => {
                  if (day === null) {
                    return <div key={`empty-${i}`} className="border-b border-r p-2 min-h-[64px] bg-gray-50" />;
                  }
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const pct = pctForDate(dateStr);
                  const isToday = dateStr === today;
                  const isSelected = dateStr === selectedDay;
                  const hasTasks = pct >= 0;

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(dateStr === selectedDay ? null : dateStr)}
                      className={`border-b border-r p-2 min-h-[64px] text-left transition hover:bg-gray-50 ${
                        isSelected ? 'bg-green-50 ring-2 ring-green-500 ring-inset' : ''
                      }`}
                    >
                      <span className={`text-sm ${isToday ? 'bg-green-800 text-white rounded-full w-6 h-6 inline-flex items-center justify-center' : 'text-gray-700'}`}>
                        {day}
                      </span>
                      {hasTasks && (
                        <div className="mt-1">
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${pctColor(pct)}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-400 mt-0.5 block">{pct}%</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Selected Day Detail */}
        {selectedDay && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-900">
                {new Date(selectedDay + 'T12:00:00').toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </h3>
              <p className="text-sm text-gray-500">{dayTasks.length} tasks</p>
            </div>
            {dayTasks.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">No tasks for this date</div>
            ) : (
              <div className="divide-y">
                {dayTasks.map((t) => {
                  const isDone = t.status === 'submitted' || t.status === 'approved';
                  return (
                    <Link key={t.id} to={`/ops/tasks/${t.id}`} className="flex items-center gap-3 p-3 hover:bg-gray-50 transition group">
                      {isDone
                        ? <CheckCircle size={16} className="text-green-500" />
                        : t.status === 'overdue'
                          ? <AlertTriangle size={16} className="text-red-500" />
                          : <Clock size={16} className="text-gray-400" />
                      }
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-400">{t.transaction_id}</span>
                          <span className="text-sm font-medium text-gray-900">{t.template_name}</span>
                        </div>
                        <span className="text-xs text-gray-500">{t.facility_name}</span>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-green-800" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
