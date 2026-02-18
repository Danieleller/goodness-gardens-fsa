import { useState, useEffect } from 'react';
import { Shield, Edit2, Plus, X, Check, Users } from 'lucide-react';
import { adminAPI } from '@/api';

interface RoleDefinition {
  value: string;
  label: string;
  description: string;
  color: string;
  permissions: string[];
  userCount: number;
}

const DEFAULT_ROLES: RoleDefinition[] = [
  {
    value: 'admin',
    label: 'Administrator',
    description: 'Full system access including user management, setup, and all modules',
    color: 'bg-red-100 text-red-800 border-red-200',
    permissions: ['All Permissions'],
    userCount: 0,
  },
  {
    value: 'management',
    label: 'Management',
    description: 'Access to compliance, reporting, analytics, and team oversight',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    permissions: ['View Reports', 'Run Assessments', 'Manage CAPAs', 'View Compliance', 'Export Data'],
    userCount: 0,
  },
  {
    value: 'fsqa',
    label: 'FSQA Manager',
    description: 'Food safety & quality assurance including audits, SOPs, gap analysis',
    color: 'bg-green-100 text-green-800 border-green-200',
    permissions: ['Manage SOPs', 'Run Audits', 'Gap Analysis', 'Compliance Dashboard', 'Manage Checklists'],
    userCount: 0,
  },
  {
    value: 'supervisor',
    label: 'Supervisor',
    description: 'Team lead access to operations, corrective actions, and training',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    permissions: ['View Reports', 'Manage CAPAs', 'View Training', 'Approve Checklists', 'Supplier Access'],
    userCount: 0,
  },
  {
    value: 'worker',
    label: 'Worker',
    description: 'Basic operational access: checklists, pre-harvest logs, chemicals',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    permissions: ['Submit Checklists', 'Log Pre-Harvest', 'View Chemicals', 'View Supply Master'],
    userCount: 0,
  },
];

export function RolesPage() {
  const [roles, setRoles] = useState<RoleDefinition[]>(DEFAULT_ROLES);
  const [loading, setLoading] = useState(true);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  useEffect(() => {
    const loadUserCounts = async () => {
      try {
        const res = await adminAPI.getUsers();
        const users = res.data?.users || [];
        setRoles(prev => prev.map(role => ({
          ...role,
          userCount: users.filter((u: any) => u.role === role.value).length,
        })));
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    };
    loadUserCounts();
  }, []);

  const totalUsers = roles.reduce((sum, r) => sum + r.userCount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <div className="bg-white border-b border-green-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-green-700" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-green-900">Roles & Permissions</h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage system roles and access control</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users size={16} />
              <span>{totalUsers} total users across {roles.length} roles</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {roles.map((role) => (
              <div key={role.value} className="bg-white rounded-xl shadow-md border border-green-100 overflow-hidden">
                <button
                  onClick={() => setExpandedRole(expandedRole === role.value ? null : role.value)}
                  className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${role.color}`}>
                      {role.label}
                    </span>
                    <span className="text-sm text-gray-600 hidden sm:inline">{role.description}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500">{role.userCount} users</span>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedRole === role.value ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </button>
                {expandedRole === role.value && (
                  <div className="px-6 pb-5 border-t border-gray-100 pt-4">
                    <p className="text-sm text-gray-600 mb-3 sm:hidden">{role.description}</p>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Permissions</h4>
                    <div className="flex flex-wrap gap-2">
                      {role.permissions.map((perm) => (
                        <span key={perm} className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded text-xs font-medium border border-green-200">
                          <Check size={12} />
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
