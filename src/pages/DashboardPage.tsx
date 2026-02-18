import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, AlertTriangle, Clock, Shield, FileText,
  ClipboardCheck, BarChart3, Building2, Truck, Users, Leaf, Download,
  CalendarDays, CircleAlert, BadgeCheck, FlaskConical, ChevronDown, ChevronUp, Target
} from 'lucide-react';
import { reportsAPI, calendarAPI, auditFindingsAPI, correctiveActionAPI, modulesAPI } from '@/api';
import { useAuthStore } from '@/store';

// ── Calendar types ──
interface CalendarEvent {
  date: string;
  type: 'cert' | 'capa' | 'chemical';
  label: string;
  detail: string;
  daysUntil?: number;
}

// ── Calendar Widget ──
function CalendarWidget({ events }: { events: CalendarEvent[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expanded, setExpanded] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Map events to dates
  const eventsByDate: { [key: string]: CalendarEvent[] } = {};
  events.forEach(ev => {
    const d = ev.date.slice(0, 10);
    if (!eventsByDate[d]) eventsByDate[d] = [];
    eventsByDate[d].push(ev);
  });

  const getDateKey = (day: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  // Events this month
  const monthEvents = events.filter(ev => {
    const d = new Date(ev.date);
    return d.getMonth() === month && d.getFullYear() === year;
  }).sort((a, b) => a.date.localeCompare(b.date));

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 text-white rounded-t-lg" style={{ backgroundColor: '#1A3A5C' }}>
        <button onClick={prevMonth} className="p-1 hover:bg-white/10 rounded">
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <CalendarDays size={16} />
          <span className="font-semibold text-sm">{monthName}</span>
        </div>
        <button onClick={nextMonth} className="p-1 hover:bg-white/10 rounded">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 border-b px-2 py-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 text-center px-2 py-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="py-1.5" />;
          const key = getDateKey(day);
          const dayEvents = eventsByDate[key] || [];
          const hasCert = dayEvents.some(e => e.type === 'cert');
          const hasCapa = dayEvents.some(e => e.type === 'capa');
          const hasChem = dayEvents.some(e => e.type === 'chemical');

          return (
            <div
              key={day}
              className={`relative py-1.5 text-xs rounded-md cursor-default transition ${
                isToday(day) ? 'text-white font-bold' : 'text-gray-700 hover:bg-gray-50'
              }`}
              style={isToday(day) ? { backgroundColor: '#1A3A5C' } : undefined}
              title={dayEvents.map(e => e.label).join('\n')}
            >
              {day}
              {dayEvents.length > 0 && (
                <div className="flex justify-center gap-0.5 mt-0.5">
                  {hasCert && <span className="w-1 h-1 rounded-full bg-orange-500" />}
                  {hasCapa && <span className="w-1 h-1 rounded-full bg-red-500" />}
                  {hasChem && <span className="w-1 h-1 rounded-full bg-blue-500" />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-3 px-4 py-2 border-t text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Cert Expiry</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> CAPA Due</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Chemical</span>
      </div>

      {/* Upcoming events list */}
      <div className="border-t">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <span>Upcoming This Month ({monthEvents.length})</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {expanded && (
          <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
            {monthEvents.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">No events this month</div>
            ) : (
              monthEvents.map((ev, i) => (
                <div key={i} className="px-4 py-2 flex items-start gap-2">
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    ev.type === 'cert' ? 'bg-orange-500' : ev.type === 'capa' ? 'bg-red-500' : 'bg-blue-500'
                  }`} />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-gray-800 truncate">{ev.label}</div>
                    <div className="text-xs text-gray-500">{new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {ev.detail}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shortcut Card ──
function ShortcutGroup({ title, icon: Icon, items }: {
  title: string;
  icon: React.ElementType;
  items: { to: string; label: string; description: string; icon: React.ElementType; badge?: string | number }[];
}) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      <div className="flex items-center gap-2 px-4 py-3 border-b rounded-t-lg" style={{ backgroundColor: '#F0F4F8' }}>
        <Icon size={16} style={{ color: '#1A3A5C' }} />
        <h3 className="text-sm font-semibold" style={{ color: '#1A3A5C' }}>{title}</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {items.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition group"
          >
            <item.icon size={18} className="text-gray-400 group-hover:text-blue-700 transition flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-800 group-hover:text-blue-800">{item.label}</div>
              <div className="text-xs text-gray-500">{item.description}</div>
            </div>
            {item.badge !== undefined && (
              <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{item.badge}</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── KPI Card ──
function KpiCard({ label, value, color, icon: Icon }: { label: string; value: string | number; color: string; icon: React.ElementType }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-500 font-medium">{label}</div>
      </div>
    </div>
  );
}

// ── Main Dashboard ──
// Route-to-moduleKey mapping for dashboard shortcuts
const ROUTE_MODULE_MAP: Record<string, string> = {
  '/pre-harvest': 'pre_harvest',
  '/chemicals': 'chemicals',
  '/checklists': 'checklists',
  '/supply-master': 'supply_master',
  '/sops': 'sops',
  '/gap-analysis': 'gap_analysis',
  '/audit-simulator': 'audit_simulator',
  '/audit-checklist': 'audit_checklist',
  '/compliance': 'compliance_dashboard',
  '/compliance-reporting': 'compliance_reporting',
  '/corrective-actions': 'corrective_actions',
  '/suppliers': 'suppliers',
  '/facilities': 'facilities',
  '/reports': 'reports',
  '/training': 'training',
};

function filterItemsByModules(
  items: { to: string; label: string; description: string; icon: React.ElementType; badge?: string | number }[],
  enabledModules: Set<string>,
) {
  return items.filter(item => {
    const moduleKey = ROUTE_MODULE_MAP[item.to];
    return !moduleKey || enabledModules.has(moduleKey);
  });
}

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [dashboard, setDashboard] = useState<any>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [findingsSummary, setFindingsSummary] = useState<any>(null);
  const [capaSummary, setCapaSummary] = useState<any>(null);
  const [enabledModules, setEnabledModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [dashRes, calRes, modulesRes] = await Promise.all([
          reportsAPI.dashboard(),
          calendarAPI.getEvents(90),
          modulesAPI.getEnabled().catch(() => ({ data: { modules: [] } })),
        ]);
        // Set enabled modules (fallback: all modules if endpoint fails)
        const mods = modulesRes.data?.modules || [];
        setEnabledModules(mods.length > 0 ? new Set(mods) : new Set(Object.values(ROUTE_MODULE_MAP)));
        setDashboard(dashRes.data);

        // Transform calendar data into events
        const events: CalendarEvent[] = [];
        (calRes.data.certExpirations || []).forEach((c: any) => {
          events.push({
            date: c.expiry_date,
            type: 'cert',
            label: `${c.supplier_name} — ${c.cert_type || c.cert_name}`,
            detail: c.days_until < 0 ? 'EXPIRED' : `${c.days_until} days left`,
            daysUntil: c.days_until,
          });
        });
        (calRes.data.capaDueDates || []).forEach((c: any) => {
          events.push({
            date: c.target_completion_date,
            type: 'capa',
            label: c.action_description?.slice(0, 60) || 'CAPA',
            detail: `${c.severity} — ${c.responsible_party || 'Unassigned'}`,
          });
        });
        (calRes.data.chemicalExpirations || []).forEach((c: any) => {
          events.push({
            date: c.expiration_date,
            type: 'chemical',
            label: c.product_name,
            detail: c.storage_location || 'Storage',
          });
        });
        setCalendarEvents(events);

        // Fetch findings & CAPA summary for compliance roles
        const role = useAuthStore.getState().user?.role || '';
        if (['fsqa', 'management', 'admin'].includes(role)) {
          try {
            const [findingsRes, capaRes] = await Promise.all([
              auditFindingsAPI.summary(),
              correctiveActionAPI.summary(),
            ]);
            setFindingsSummary(findingsRes.data);
            setCapaSummary(capaRes.data);
          } catch (err) {
            console.error('Failed to fetch compliance summary:', err);
          }
        }
      } catch (error) {
        console.error('Failed to fetch dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const openIssues = dashboard?.kpis?.openNonconformances || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" style={{ backgroundColor: '#F5F7FA', minHeight: 'calc(100vh - 56px)' }}>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#1A3A5C' }}>Home</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back, {user?.first_name} — Goodness Gardens FSQA Portal</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <KpiCard label="Water Tests" value={dashboard?.kpis?.waterTests || 0} color="bg-blue-700" icon={Leaf} />
        <KpiCard label="Chemical Apps" value={dashboard?.kpis?.chemicalApplications || 0} color="bg-sky-600" icon={FlaskConical} />
        <KpiCard label="Open Issues" value={openIssues} color={openIssues > 0 ? 'bg-red-600' : 'bg-emerald-600'} icon={CircleAlert} />
        <KpiCard label="Closed CAPAs" value={dashboard?.kpis?.closedCapas || 0} color="bg-teal-600" icon={BadgeCheck} />
        <KpiCard label="Compliance" value={`${dashboard?.kpis?.chemicalCompliancePercentage || 0}%`} color="bg-indigo-700" icon={Shield} />
      </div>

      {/* Main grid: shortcuts left, calendar right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Navigation Shortcut Groups (2 columns) */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filterItemsByModules([
              { to: '/pre-harvest', label: 'Pre-Harvest Logs', description: 'Water tests, soil amendments, hygiene', icon: Leaf },
              { to: '/chemicals', label: 'Chemical Tracking', description: 'Applications, storage, MRL compliance', icon: FlaskConical },
              { to: '/checklists', label: 'Digital Checklists', description: 'Daily inspections & sign-offs', icon: ClipboardCheck },
              { to: '/facilities', label: 'Facilities', description: '7 locations across your network', icon: Building2 },
            ], enabledModules).length > 0 && (
            <ShortcutGroup
              title="Operations"
              icon={ClipboardCheck}
              items={filterItemsByModules([
                { to: '/pre-harvest', label: 'Pre-Harvest Logs', description: 'Water tests, soil amendments, hygiene', icon: Leaf },
                { to: '/chemicals', label: 'Chemical Tracking', description: 'Applications, storage, MRL compliance', icon: FlaskConical },
                { to: '/checklists', label: 'Digital Checklists', description: 'Daily inspections & sign-offs', icon: ClipboardCheck },
                { to: '/facilities', label: 'Facilities', description: '7 locations across your network', icon: Building2 },
              ], enabledModules)}
            />
          )}
          {filterItemsByModules([
              { to: '/sops', label: 'SOP Document Hub', description: '43 SOPs with version control', icon: FileText },
              { to: '/gap-analysis', label: 'Gap Analysis', description: 'Per-facility readiness tracker', icon: BarChart3 },
              { to: '/audit-simulator', label: 'Audit Simulator', description: 'PrimusGFS v4.0 self-scoring', icon: Shield },
            ], enabledModules).length > 0 && (
            <ShortcutGroup
              title="Compliance"
              icon={Shield}
              items={filterItemsByModules([
                { to: '/sops', label: 'SOP Document Hub', description: '43 SOPs with version control', icon: FileText },
                { to: '/gap-analysis', label: 'Gap Analysis', description: 'Per-facility readiness tracker', icon: BarChart3 },
                { to: '/audit-simulator', label: 'Audit Simulator', description: 'PrimusGFS v4.0 self-scoring', icon: Shield },
              ], enabledModules)}
            />
          )}
          {filterItemsByModules([
              { to: '/corrective-actions', label: 'Corrective Actions', description: 'CAPAs & nonconformances', icon: AlertTriangle, badge: openIssues > 0 ? openIssues : undefined },
              { to: '/suppliers', label: 'Supplier Management', description: 'Vendors & certifications', icon: Truck },
              { to: '/reports', label: 'Reports & Export', description: 'Download CSV data', icon: Download },
            ], enabledModules).length > 0 && (
            <ShortcutGroup
              title="Management"
              icon={Users}
              items={filterItemsByModules([
                { to: '/corrective-actions', label: 'Corrective Actions', description: 'CAPAs & nonconformances', icon: AlertTriangle, badge: openIssues > 0 ? openIssues : undefined },
                { to: '/suppliers', label: 'Supplier Management', description: 'Vendors & certifications', icon: Truck },
                { to: '/reports', label: 'Reports & Export', description: 'Download CSV data', icon: Download },
              ], enabledModules)}
            />
          )}
          <ShortcutGroup
            title="Administration"
            icon={Users}
            items={[
              { to: '/admin', label: 'User Management', description: 'Invite, roles & facility access', icon: Users },
              { to: '/facilities', label: 'Facility Setup', description: 'Modules & organic scope', icon: Building2 },
            ]}
          />
        </div>

        {/* Right: Calendar + Alerts */}
        <div className="space-y-4">
          <CalendarWidget events={calendarEvents} />

          {/* Alerts summary */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-b rounded-t-lg">
              <Clock size={16} className="text-red-600" />
              <h3 className="text-sm font-semibold text-red-800">Attention Required</h3>
            </div>
            <div className="p-4 space-y-3">
              {calendarEvents.filter(e => e.type === 'cert' && (e.daysUntil ?? 999) <= 30).length > 0 ? (
                <Link to="/suppliers" className="flex items-start gap-2 text-sm hover:bg-orange-50 rounded p-2 -m-2 transition">
                  <AlertTriangle size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-800">
                      {calendarEvents.filter(e => e.type === 'cert' && (e.daysUntil ?? 999) <= 30).length} vendor cert(s) expiring soon
                    </div>
                    <div className="text-xs text-gray-500">Review supplier certifications</div>
                  </div>
                </Link>
              ) : (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <BadgeCheck size={16} className="text-green-500" />
                  <span>All vendor certifications current</span>
                </div>
              )}
              {openIssues > 0 ? (
                <Link to="/corrective-actions" className="flex items-start gap-2 text-sm hover:bg-red-50 rounded p-2 -m-2 transition">
                  <CircleAlert size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-800">{openIssues} open nonconformance(s)</div>
                    <div className="text-xs text-gray-500">Corrective actions needed</div>
                  </div>
                </Link>
              ) : (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <BadgeCheck size={16} className="text-green-500" />
                  <span>No open nonconformances</span>
                </div>
              )}
            </div>
          </div>

          {/* Audit Findings Summary - compliance roles only */}
          {findingsSummary && (
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 border-b rounded-t-lg">
                <Shield size={16} className="text-orange-600" />
                <h3 className="text-sm font-semibold text-orange-800">Audit Findings</h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center p-2 bg-red-50 rounded-lg">
                    <div className="text-xl font-bold text-red-700">{findingsSummary.by_severity?.critical || 0}</div>
                    <div className="text-xs text-red-600">Critical</div>
                  </div>
                  <div className="text-center p-2 bg-orange-50 rounded-lg">
                    <div className="text-xl font-bold text-orange-700">{findingsSummary.by_severity?.major || 0}</div>
                    <div className="text-xs text-orange-600">Major</div>
                  </div>
                  <div className="text-center p-2 bg-yellow-50 rounded-lg">
                    <div className="text-xl font-bold text-yellow-700">{findingsSummary.by_severity?.minor || 0}</div>
                    <div className="text-xs text-yellow-600">Minor</div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{findingsSummary.total_open || 0} open findings</span>
                  <Link to="/audit-simulator" className="text-orange-600 hover:text-orange-800 font-medium text-xs">
                    View All →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* CAPA Status - compliance roles only */}
          {capaSummary && (
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="flex items-center gap-2 px-4 py-3 bg-teal-50 border-b rounded-t-lg">
                <Target size={16} className="text-teal-600" />
                <h3 className="text-sm font-semibold text-teal-800">CAPA Status</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Open CAPAs</span>
                  <span className="text-sm font-bold text-gray-900">{capaSummary.total_open || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Overdue</span>
                  <span className={`text-sm font-bold ${(capaSummary.total_overdue || 0) > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {capaSummary.total_overdue || 0}
                  </span>
                </div>
                {capaSummary.by_priority && (
                  <div className="border-t pt-2 mt-2">
                    <div className="text-xs text-gray-500 mb-2">By Priority</div>
                    <div className="flex gap-2">
                      {capaSummary.by_priority.critical > 0 && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs font-medium">{capaSummary.by_priority.critical} critical</span>
                      )}
                      {capaSummary.by_priority.high > 0 && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-xs font-medium">{capaSummary.by_priority.high} high</span>
                      )}
                      {capaSummary.by_priority.medium > 0 && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">{capaSummary.by_priority.medium} medium</span>
                      )}
                    </div>
                  </div>
                )}
                <Link to="/corrective-actions" className="block text-center text-teal-600 hover:text-teal-800 font-medium text-xs mt-2">
                  View All CAPAs →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
