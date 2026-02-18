import { useState, useEffect } from 'react';
import { FileSearch, ChevronDown, Filter, Calendar, User, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface AuditEntry {
  id: number;
  timestamp: string;
  user: string;
  category: string;
  event: string;
  severity: 'info' | 'warning' | 'critical';
  ip_address: string;
}

export function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('all');

  useEffect(() => {
    setLoading(true);
    // Generate sample audit log entries
    const sampleEntries: AuditEntry[] = [
      { id: 1, timestamp: new Date().toISOString(), user: 'Daniel Eller', category: 'Authentication', event: 'Successful login', severity: 'info', ip_address: '192.168.1.1' },
      { id: 2, timestamp: new Date(Date.now() - 120000).toISOString(), user: 'Daniel Eller', category: 'Compliance', event: 'Rules evaluation triggered for Allentown facility', severity: 'info', ip_address: '192.168.1.1' },
      { id: 3, timestamp: new Date(Date.now() - 300000).toISOString(), user: 'System', category: 'Notifications', event: 'Auto-generated 0 notifications for overdue items', severity: 'info', ip_address: 'System' },
      { id: 4, timestamp: new Date(Date.now() - 600000).toISOString(), user: 'Daniel Eller', category: 'Reports', event: 'Compliance PDF report exported', severity: 'info', ip_address: '192.168.1.1' },
      { id: 5, timestamp: new Date(Date.now() - 3600000).toISOString(), user: 'System', category: 'Security', event: 'Failed login attempt for unknown user', severity: 'warning', ip_address: '10.0.0.52' },
      { id: 6, timestamp: new Date(Date.now() - 7200000).toISOString(), user: 'Daniel Eller', category: 'Admin', event: 'User role updated: worker → supervisor', severity: 'warning', ip_address: '192.168.1.1' },
      { id: 7, timestamp: new Date(Date.now() - 86400000).toISOString(), user: 'System', category: 'Security', event: 'Multiple failed login attempts from same IP', severity: 'critical', ip_address: '10.0.0.99' },
      { id: 8, timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), user: 'System', category: 'Database', event: 'Database migration completed successfully', severity: 'info', ip_address: 'System' },
      { id: 9, timestamp: new Date(Date.now() - 86400000 * 3).toISOString(), user: 'Daniel Eller', category: 'Admin', event: 'New user invited: worker@goodnessgardens.net', severity: 'info', ip_address: '192.168.1.1' },
      { id: 10, timestamp: new Date(Date.now() - 86400000 * 5).toISOString(), user: 'System', category: 'Compliance', event: '4 compliance rules failed during scheduled evaluation', severity: 'critical', ip_address: 'System' },
    ];
    setEntries(sampleEntries);
    setLoading(false);
  }, []);

  const filtered = entries.filter(e => {
    if (filterSeverity !== 'all' && e.severity !== filterSeverity) return false;
    return true;
  });

  const getSeverityIcon = (severity: string) => {
    if (severity === 'critical') return <AlertTriangle className="w-4 h-4 text-red-500" />;
    if (severity === 'warning') return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return <Info className="w-4 h-4 text-blue-500" />;
  };

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
      info: 'bg-blue-100 text-blue-800',
    };
    return `inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[severity] || 'bg-gray-100 text-gray-800'}`;
  };

  const criticalCount = entries.filter(e => e.severity === 'critical').length;
  const warningCount = entries.filter(e => e.severity === 'warning').length;
  const infoCount = entries.filter(e => e.severity === 'info').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <div className="bg-white border-b border-green-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileSearch className="w-7 h-7 sm:w-8 sm:h-8 text-green-700" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-green-900">Audit Log</h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Security events, user actions, and system changes</p>
              </div>
            </div>
            <div className="relative">
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="appearance-none px-4 py-2 pr-10 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
              >
                <option value="all">All Severity</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-4 border border-red-100">
            <div className="text-xs text-gray-500 font-medium mb-1">Critical</div>
            <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border border-yellow-100">
            <div className="text-xs text-gray-500 font-medium mb-1">Warnings</div>
            <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border border-blue-100">
            <div className="text-xs text-gray-500 font-medium mb-1">Info</div>
            <div className="text-2xl font-bold text-blue-600">{infoCount}</div>
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
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 w-8"></th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Timestamp</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">User</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden sm:table-cell">Category</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Event</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden md:table-cell">Severity</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden lg:table-cell">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-gray-400">No audit entries found</td></tr>
                  ) : filtered.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="py-3 px-4">{getSeverityIcon(entry.severity)}</td>
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap text-xs">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-800">{entry.user}</td>
                      <td className="py-3 px-4 hidden sm:table-cell text-gray-600">{entry.category}</td>
                      <td className="py-3 px-4 text-gray-700">{entry.event}</td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <span className={getSeverityBadge(entry.severity)}>{entry.severity}</span>
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell text-gray-400 text-xs font-mono">{entry.ip_address}</td>
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
