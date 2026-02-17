import { useState, useEffect } from 'react';
import { UserPlus, RotateCcw, UserX, UserCheck, Shield, ShieldOff, AlertCircle, X, Check, Mail, Copy, ChevronDown, Building2, MapPin, Briefcase } from 'lucide-react';
import { adminAPI, facilitiesAPI } from '@/api';

interface Facility {
  id: number;
  code: string;
  name: string;
  location: string;
  facility_type: string;
}

interface ManagedUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  organization_name: string;
  title: string;
  role: string;
  is_active: number;
  created_at: string;
  facility_id: number | null;
  facility_name: string | null;
  facility_code: string | null;
}

const ROLES = [
  { value: 'farmer', label: 'Worker', color: 'bg-blue-100 text-blue-800' },
  { value: 'supervisor', label: 'Supervisor', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'admin', label: 'Admin', color: 'bg-purple-100 text-purple-800' },
];

const APP_URL = 'https://goodness-gardens-fsa.vercel.app';

export function AdminPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteData, setInviteData] = useState({
    first_name: '', last_name: '', email: '', temp_password: '', organization_name: 'Goodness Gardens', title: '', role: 'farmer', facility_id: '' as string,
  });
  const [inviteLoading, setInviteLoading] = useState(false);

  // After invite — show credentials card
  const [inviteResult, setInviteResult] = useState<{ email: string; password: string; name: string } | null>(null);

  // Reset password
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Dropdowns
  const [roleDropdownId, setRoleDropdownId] = useState<number | null>(null);
  const [facilityDropdownId, setFacilityDropdownId] = useState<number | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.users.getAll();
      setUsers(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchFacilities = async () => {
    try {
      const response = await facilitiesAPI.getAll();
      setFacilities(response.data.facilities || []);
    } catch (err: any) {
      console.error('Failed to load facilities', err);
    }
  };

  useEffect(() => { fetchUsers(); fetchFacilities(); }, []);

  const showMessage = (msg: string, isError = false) => {
    if (isError) { setError(msg); setSuccess(''); }
    else { setSuccess(msg); setError(''); }
    setTimeout(() => { setError(''); setSuccess(''); }, 5000);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    try {
      const payload: any = {
        first_name: inviteData.first_name,
        last_name: inviteData.last_name,
        email: inviteData.email,
        temp_password: inviteData.temp_password,
        organization_name: inviteData.organization_name,
        title: inviteData.title,
        facility_id: inviteData.facility_id ? Number(inviteData.facility_id) : null,
      };
      await adminAPI.users.create(payload);
      // If a role other than farmer was selected, update it
      if (inviteData.role !== 'farmer') {
        const refreshed = await adminAPI.users.getAll();
        const newUser = (refreshed.data as ManagedUser[]).find((u: ManagedUser) => u.email === inviteData.email);
        if (newUser) {
          await adminAPI.users.update(newUser.id, { role: inviteData.role });
        }
      }
      setInviteResult({
        email: inviteData.email,
        password: inviteData.temp_password,
        name: `${inviteData.first_name} ${inviteData.last_name}`,
      });
      setShowInvite(false);
      setInviteData({ first_name: '', last_name: '', email: '', temp_password: '', organization_name: 'Goodness Gardens', title: '', role: 'farmer', facility_id: '' });
      fetchUsers();
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Failed to invite user', true);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleToggleActive = async (user: ManagedUser) => {
    try {
      const newStatus = user.is_active ? 0 : 1;
      await adminAPI.users.update(user.id, { is_active: newStatus });
      showMessage(`${user.first_name} ${newStatus ? 'activated' : 'deactivated'}`);
      fetchUsers();
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Failed to update user', true);
    }
  };

  const handleChangeRole = async (user: ManagedUser, newRole: string) => {
    try {
      await adminAPI.users.update(user.id, { role: newRole });
      showMessage(`${user.first_name} is now ${ROLES.find(r => r.value === newRole)?.label || newRole}`);
      setRoleDropdownId(null);
      fetchUsers();
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Failed to update role', true);
    }
  };

  const handleChangeTitle = async (user: ManagedUser, newTitle: string) => {
    try {
      await adminAPI.users.update(user.id, { title: newTitle });
      showMessage(`${user.first_name}'s title updated`);
      fetchUsers();
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Failed to update title', true);
    }
  };

  const handleChangeFacility = async (user: ManagedUser, newFacilityId: number | null) => {
    try {
      await adminAPI.users.update(user.id, { facility_id: newFacilityId });
      const facilityLabel = newFacilityId
        ? facilities.find(f => f.id === newFacilityId)?.name || 'facility'
        : 'Organization (All Facilities)';
      showMessage(`${user.first_name} assigned to ${facilityLabel}`);
      setFacilityDropdownId(null);
      fetchUsers();
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Failed to update facility', true);
    }
  };

  const handleResetPassword = async () => {
    if (!resetUserId || !resetPassword) return;
    setResetLoading(true);
    try {
      await adminAPI.users.resetPassword(resetUserId, { temp_password: resetPassword });
      showMessage('Password reset successfully!');
      setResetUserId(null);
      setResetPassword('');
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Failed to reset password', true);
    } finally {
      setResetLoading(false);
    }
  };

  const handleDelete = async (user: ManagedUser) => {
    if (!confirm(`Are you sure you want to deactivate ${user.first_name} ${user.last_name}?`)) return;
    try {
      await adminAPI.users.delete(user.id);
      showMessage(`${user.first_name} ${user.last_name} deactivated`);
      fetchUsers();
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Failed to deactivate user', true);
    }
  };

  const buildMailtoLink = (email: string, password: string, name: string) => {
    const subject = encodeURIComponent('Your Goodness Gardens FSQA Portal Account');
    const body = encodeURIComponent(
      `Hi ${name},\n\n` +
      `You've been invited to the Goodness Gardens FSQA Management Portal.\n\n` +
      `Here are your login credentials:\n\n` +
      `Login URL: ${APP_URL}/login\n` +
      `Email: ${email}\n` +
      `Temporary Password: ${password}\n\n` +
      `Please log in and change your password at your earliest convenience.\n\n` +
      `— Goodness Gardens Food Safety Team`
    );
    return `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const copyCredentials = (email: string, password: string, name: string) => {
    const text =
      `Hi ${name},\n\n` +
      `You've been invited to the Goodness Gardens FSQA Management Portal.\n\n` +
      `Login URL: ${APP_URL}/login\n` +
      `Email: ${email}\n` +
      `Temporary Password: ${password}\n\n` +
      `Please log in and change your password at your earliest convenience.`;
    navigator.clipboard.writeText(text);
    showMessage('Credentials copied to clipboard!');
  };

  const getRoleInfo = (role: string) => ROLES.find(r => r.value === role) || ROLES[0];

  const getFacilityLabel = (user: ManagedUser) => {
    if (user.facility_id && user.facility_name) {
      return { label: user.facility_name, code: user.facility_code, isOrg: false };
    }
    return { label: 'Organization', code: 'ALL', isOrg: true };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Invite, manage, and control access for your team</p>
        </div>
        <button
          onClick={() => { setShowInvite(!showInvite); setInviteResult(null); }}
          className="flex items-center gap-2 text-white px-4 py-2 rounded-lg hover:opacity-90 transition"
          style={{ backgroundColor: '#1A3A5C' }}
        >
          <UserPlus size={18} />
          Invite User
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3 items-center">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <p className="text-red-800 text-sm flex-1">{error}</p>
          <button onClick={() => setError('')}><X size={16} className="text-red-400" /></button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3 items-center">
          <Check className="text-green-600 flex-shrink-0" size={20} />
          <p className="text-blue-900 text-sm flex-1">{success}</p>
          <button onClick={() => setSuccess('')}><X size={16} className="text-green-400" /></button>
        </div>
      )}

      {/* Invite Result — credentials card */}
      {inviteResult && (
        <div className="mb-6 bg-green-50 border-2 border-green-300 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-green-900">User Created Successfully!</h2>
              <p className="text-green-700 text-sm mt-1">Send these credentials to {inviteResult.name} so they can log in.</p>
            </div>
            <button onClick={() => setInviteResult(null)} className="text-green-500 hover:text-green-700">
              <X size={20} />
            </button>
          </div>
          <div className="bg-white rounded-lg p-4 mb-4 border border-green-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-gray-500 block">Login URL</span>
                <span className="font-mono text-gray-900">{APP_URL}/login</span>
              </div>
              <div>
                <span className="text-gray-500 block">Email</span>
                <span className="font-mono text-gray-900">{inviteResult.email}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Password</span>
                <span className="font-mono text-gray-900">{inviteResult.password}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <a
              href={buildMailtoLink(inviteResult.email, inviteResult.password, inviteResult.name)}
              className="flex items-center gap-2 text-white px-5 py-2.5 rounded-lg hover:opacity-90 transition font-medium"
              style={{ backgroundColor: '#1A3A5C' }}
            >
              <Mail size={18} />
              Send Email Invite
            </a>
            <button
              onClick={() => copyCredentials(inviteResult.email, inviteResult.password, inviteResult.name)}
              className="flex items-center gap-2 bg-white text-blue-900 border-2 border-blue-800 px-5 py-2.5 rounded-lg hover:bg-green-50 transition font-medium"
            >
              <Copy size={18} />
              Copy Credentials
            </button>
          </div>
        </div>
      )}

      {/* Invite Form */}
      {showInvite && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-green-200">
          <h2 className="text-lg font-semibold mb-4">Invite New User</h2>
          <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text" required
                value={inviteData.first_name}
                onChange={(e) => setInviteData({ ...inviteData, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text" required
                value={inviteData.last_name}
                onChange={(e) => setInviteData({ ...inviteData, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email" required
                value={inviteData.email}
                onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
              <input
                type="text"
                value={inviteData.title}
                onChange={(e) => setInviteData({ ...inviteData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. Food Safety Director, Field Supervisor"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
              <input
                type="text" required minLength={6}
                value={inviteData.temp_password}
                onChange={(e) => setInviteData({ ...inviteData, temp_password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Min 6 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Facility Assignment</label>
              <select
                value={inviteData.facility_id}
                onChange={(e) => setInviteData({ ...inviteData, facility_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">Organization (All Facilities)</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>{f.name} — {f.facility_type}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                "Organization" gives access to all facilities (for directors). A specific facility limits their view.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={inviteData.role}
                onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="farmer">Worker (field worker, basic access)</option>
                <option value="supervisor">Supervisor (can sign off checklists)</option>
                <option value="admin">Admin (full access, manage users)</option>
              </select>
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={inviteLoading}
                className="text-white px-6 py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50"
                style={{ backgroundColor: '#1A3A5C' }}
              >
                {inviteLoading ? 'Creating Account...' : 'Create & Invite'}
              </button>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetUserId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Reset Password</h2>
            <p className="text-gray-600 text-sm mb-4">
              Set a new temporary password for {users.find(u => u.id === resetUserId)?.first_name}.
              Share this password with them so they can log in.
            </p>
            <input
              type="text"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="New temporary password (min 6 chars)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              minLength={6}
            />
            <div className="flex gap-3">
              <button
                onClick={handleResetPassword}
                disabled={resetPassword.length < 6 || resetLoading}
                className="text-white px-6 py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50"
                style={{ backgroundColor: '#1A3A5C' }}
              >
                {resetLoading ? 'Resetting...' : 'Reset Password'}
              </button>
              <button
                onClick={() => { setResetUserId(null); setResetPassword(''); }}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading users...</div>
      ) : (
        <div className="bg-white rounded-lg shadow-md">
          <div className="overflow-x-visible">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 hidden lg:table-cell">Title</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 hidden md:table-cell">Facility</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Role</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => {
                  const roleInfo = getRoleInfo(u.role);
                  const facilityInfo = getFacilityLabel(u);
                  return (
                    <tr key={u.id} className={!u.is_active ? 'bg-gray-50 opacity-60' : ''}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{u.first_name} {u.last_name}</div>
                        <div className="text-xs text-gray-500 lg:hidden">{u.title || '—'}</div>
                        <div className="text-xs text-gray-500 md:hidden">
                          {facilityInfo.isOrg ? 'Organization' : facilityInfo.label}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <input
                          type="text"
                          defaultValue={u.title || ''}
                          placeholder="Add title..."
                          className="text-sm text-gray-600 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 w-full max-w-[180px]"
                          onBlur={(e) => {
                            if (e.target.value !== (u.title || '')) {
                              handleChangeTitle(u, e.target.value);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="relative">
                          <button
                            onClick={() => setFacilityDropdownId(facilityDropdownId === u.id ? null : u.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition hover:opacity-80 ${
                              facilityInfo.isOrg
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                            title="Click to change facility"
                          >
                            {facilityInfo.isOrg ? <Building2 size={12} /> : <MapPin size={12} />}
                            {facilityInfo.isOrg ? 'Organization' : facilityInfo.label}
                            <ChevronDown size={10} />
                          </button>
                          {facilityDropdownId === u.id && (
                            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[220px]">
                              <button
                                onClick={() => handleChangeFacility(u, null)}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                                  !u.facility_id ? 'font-semibold bg-gray-50' : ''
                                }`}
                              >
                                <Building2 size={14} className="text-emerald-600" />
                                <div>
                                  <div>Organization (All Facilities)</div>
                                  <div className="text-xs text-gray-400">Full access — directors</div>
                                </div>
                                {!u.facility_id && <Check size={14} className="ml-auto text-green-600" />}
                              </button>
                              <div className="border-t border-gray-100 my-1" />
                              {facilities.map((f) => (
                                <button
                                  key={f.id}
                                  onClick={() => handleChangeFacility(u, f.id)}
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                                    u.facility_id === f.id ? 'font-semibold bg-gray-50' : ''
                                  }`}
                                >
                                  <MapPin size={14} className="text-gray-400" />
                                  <div>
                                    <div>{f.name}</div>
                                    <div className="text-xs text-gray-400">{f.facility_type}</div>
                                  </div>
                                  {u.facility_id === f.id && <Check size={14} className="ml-auto text-green-600" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative">
                          <button
                            onClick={() => setRoleDropdownId(roleDropdownId === u.id ? null : u.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${roleInfo.color} hover:opacity-80 transition`}
                            title="Click to change role"
                          >
                            {u.role === 'admin' ? <Shield size={12} /> : <ShieldOff size={12} />}
                            {roleInfo.label}
                            <ChevronDown size={10} />
                          </button>
                          {roleDropdownId === u.id && (
                            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[160px]">
                              {ROLES.map((r) => (
                                <button
                                  key={r.value}
                                  onClick={() => handleChangeRole(u, r.value)}
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                                    u.role === r.value ? 'font-semibold bg-gray-50' : ''
                                  }`}
                                >
                                  <span className={`w-2 h-2 rounded-full ${r.value === 'admin' ? 'bg-purple-500' : r.value === 'supervisor' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                                  {r.label}
                                  {u.role === r.value && <Check size={14} className="ml-auto text-green-600" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            u.is_active
                              ? 'bg-green-100 text-blue-900 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          } transition`}
                          title={`Click to ${u.is_active ? 'deactivate' : 'activate'}`}
                        >
                          {u.is_active ? <UserCheck size={12} /> : <UserX size={12} />}
                          {u.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setResetUserId(u.id)}
                            className="text-gray-500 hover:text-green-700 transition p-1"
                            title="Reset password"
                          >
                            <RotateCcw size={16} />
                          </button>
                          {u.is_active ? (
                            <button
                              onClick={() => handleDelete(u)}
                              className="text-gray-500 hover:text-red-600 transition p-1"
                              title="Deactivate user"
                            >
                              <UserX size={16} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleActive(u)}
                              className="text-gray-500 hover:text-green-600 transition p-1"
                              title="Reactivate user"
                            >
                              <UserCheck size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {users.length === 0 && (
            <div className="text-center py-12 text-gray-500">No users yet. Invite someone to get started!</div>
          )}
        </div>
      )}
    </div>
  );
}
