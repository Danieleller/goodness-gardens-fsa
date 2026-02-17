import { useState, useEffect } from 'react';
import { UserPlus, RotateCcw, UserX, UserCheck, Shield, ShieldOff, AlertCircle, X, Check } from 'lucide-react';
import { adminAPI } from '@/api';

interface ManagedUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  organization_name: string;
  role: string;
  is_active: number;
  created_at: string;
}

export function AdminPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteData, setInviteData] = useState({
    first_name: '', last_name: '', email: '', temp_password: '', organization_name: '',
  });
  const [inviteLoading, setInviteLoading] = useState(false);

  // Reset password
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

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

  useEffect(() => { fetchUsers(); }, []);

  const showMessage = (msg: string, isError = false) => {
    if (isError) { setError(msg); setSuccess(''); }
    else { setSuccess(msg); setError(''); }
    setTimeout(() => { setError(''); setSuccess(''); }, 4000);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    try {
      await adminAPI.users.create(inviteData);
      showMessage(`User ${inviteData.email} invited successfully!`);
      setShowInvite(false);
      setInviteData({ first_name: '', last_name: '', email: '', temp_password: '', organization_name: '' });
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

  const handleToggleRole = async (user: ManagedUser) => {
    try {
      const newRole = user.role === 'admin' ? 'farmer' : 'admin';
      await adminAPI.users.update(user.id, { role: newRole });
      showMessage(`${user.first_name} is now ${newRole}`);
      fetchUsers();
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Failed to update role', true);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Invite, manage, and control access for your team</p>
        </div>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="flex items-center gap-2 bg-green-800 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
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
          <p className="text-green-800 text-sm flex-1">{success}</p>
          <button onClick={() => setSuccess('')}><X size={16} className="text-green-400" /></button>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text" required
                value={inviteData.last_name}
                onChange={(e) => setInviteData({ ...inviteData, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email" required
                value={inviteData.email}
                onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
              <input
                type="text" required minLength={6}
                value={inviteData.temp_password}
                onChange={(e) => setInviteData({ ...inviteData, temp_password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Min 6 characters"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization (Optional)</label>
              <input
                type="text"
                value={inviteData.organization_name}
                onChange={(e) => setInviteData({ ...inviteData, organization_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={inviteLoading}
                className="bg-green-800 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {inviteLoading ? 'Inviting...' : 'Send Invite'}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent mb-4"
              minLength={6}
            />
            <div className="flex gap-3">
              <button
                onClick={handleResetPassword}
                disabled={resetPassword.length < 6 || resetLoading}
                className="bg-green-800 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
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
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 hidden md:table-cell">Organization</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Role</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr key={u.id} className={!u.is_active ? 'bg-gray-50 opacity-60' : ''}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{u.first_name} {u.last_name}</div>
                      <div className="text-xs text-gray-500 md:hidden">{u.organization_name}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{u.organization_name || '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleRole(u)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                            : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                        } transition`}
                        title={`Click to ${u.role === 'admin' ? 'demote to farmer' : 'promote to admin'}`}
                      >
                        {u.role === 'admin' ? <Shield size={12} /> : <ShieldOff size={12} />}
                        {u.role}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          u.is_active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
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
                ))}
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
