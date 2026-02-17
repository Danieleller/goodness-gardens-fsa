import { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download } from 'lucide-react';
import { reportsAPI } from '@/api';
import { useAuthStore } from '@/store';

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await reportsAPI.dashboard();
        setDashboard(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const COLORS = ['#15803d', '#86efac', '#f87171', '#fbbf24'];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.first_name}!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium mb-1">Water Tests</div>
          <div className="text-3xl font-bold text-green-800">{dashboard?.kpis.waterTests || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium mb-1">Chemical Applications</div>
          <div className="text-3xl font-bold text-green-800">{dashboard?.kpis.chemicalApplications || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium mb-1">Open Issues</div>
          <div className="text-3xl font-bold text-red-600">{dashboard?.kpis.openNonconformances || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium mb-1">Closed CAPAs</div>
          <div className="text-3xl font-bold text-green-800">{dashboard?.kpis.closedCapas || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium mb-1">Compliance Rate</div>
          <div className="text-3xl font-bold text-green-800">{dashboard?.kpis.chemicalCompliancePercentage || 0}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Nonconformances by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dashboard?.nonconformanceByCategory || []}
                dataKey="count"
                nameKey="finding_category"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {(dashboard?.nonconformanceByCategory || []).map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Recent Audits</h2>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {(dashboard?.recentAudits || []).map((audit: any) => (
              <div key={audit.id} className="border border-gray-200 rounded-lg p-3">
                <div className="font-medium text-gray-900">{audit.audit_name}</div>
                <div className="text-sm text-gray-600">Date: {audit.audit_date}</div>
                <div className="text-sm text-gray-600">Status: <span className={`font-medium ${
                  audit.overall_status === 'completed' ? 'text-green-600' : 'text-yellow-600'
                }`}>{audit.overall_status}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Export Data</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { type: 'pre-harvest', label: 'Pre-Harvest Logs', icon: '📋' },
            { type: 'chemicals', label: 'Chemical Records', icon: '⚗️' },
            { type: 'corrective-actions', label: 'Corrective Actions', icon: '✓' },
          ].map((item) => (
            <button
              key={item.type}
              onClick={() => {
                window.location.href = `/api/reports/export?type=${item.type}`;
              }}
              className="flex items-center justify-center gap-2 p-4 border border-gray-300 rounded-lg hover:bg-green-50 transition"
            >
              <span className="text-2xl">{item.icon}</span>
              <div className="text-left">
                <div className="font-medium text-gray-900">{item.label}</div>
                <div className="text-xs text-gray-600">Download CSV</div>
              </div>
              <Download className="ml-auto" size={18} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
