import React, { useEffect, useState } from 'react';
import { Users, UserPlus, X, CheckCircle2 } from 'lucide-react';
import apiClient from '../../services/apiClient';
import PasswordStrength from '../../components/ui/PasswordStrength';
import {
  EMAIL_REGEX,
  USERNAME_HINT,
  USERNAME_REGEX,
  firstApiError,
  isStrongPassword,
} from '../../utils/securityRules';

interface ManagedUser {
  id: string;
  name: string;
  username: string | null;
  email: string;
  department: string | null;
  role: string | null;
  role_name: string | null;
  is_active: boolean;
}

interface RoleOption {
  id: string;
  name: string;
  slug: string;
}

const inputCls =
  'w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500';

const emptyForm = { name: '', username: '', email: '', password: '', password_confirmation: '', role: '', department: '' };

export const UserManagementCard: React.FC = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([apiClient.get('/users'), apiClient.get('/users/roles')]);
      setUsers(u.data.data);
      setRoles(r.data.data);
    } catch (err: any) {
      setError(firstApiError(err?.response?.data, 'Unable to load users.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const set = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const usernameInvalid = form.username.length > 0 && !USERNAME_REGEX.test(form.username);
  const emailInvalid = form.email.length > 0 && !EMAIL_REGEX.test(form.email);
  const mismatch = form.password_confirmation.length > 0 && form.password !== form.password_confirmation;
  const canSubmit =
    form.name.trim() &&
    USERNAME_REGEX.test(form.username) &&
    EMAIL_REGEX.test(form.email) &&
    isStrongPassword(form.password) &&
    form.password === form.password_confirmation &&
    form.role &&
    !saving;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const { data } = await apiClient.post('/users', form);
      setNotice(data.message || 'User created.');
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(firstApiError(err?.response?.data, 'Unable to create user.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u: ManagedUser) => {
    setError(null);
    try {
      await apiClient.post(`/users/${u.id}/toggle-active`);
      load();
    } catch (err: any) {
      setError(firstApiError(err?.response?.data, 'Unable to update user.'));
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-teal-500" />
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">User Management</h2>
        </div>
        <button
          id="um-add-user"
          onClick={() => { setShowForm((s) => !s); setError(null); setNotice(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
        >
          {showForm ? <X size={14} /> : <UserPlus size={14} />} {showForm ? 'Cancel' : 'Add User'}
        </button>
      </div>

      <div className="p-5 space-y-4">
        {error && <div role="alert" className="p-3 text-sm rounded-lg bg-red-50 text-red-700 border border-red-200">{error}</div>}
        {notice && (
          <div className="p-3 text-sm rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 size={16} /> {notice}
          </div>
        )}

        {showForm && (
          <form onSubmit={submit} noValidate className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="um-name" className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Full Name</label>
                <input id="um-name" value={form.name} onChange={set('name')} className={inputCls} placeholder="Juan Dela Cruz" />
              </div>
              <div>
                <label htmlFor="um-username" className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Username</label>
                <input id="um-username" value={form.username} onChange={set('username')} className={`${inputCls} ${usernameInvalid ? 'border-red-400' : ''}`} placeholder="juan01" autoComplete="off" />
                <p className={`mt-1 text-[11px] ${usernameInvalid ? 'text-red-600' : 'text-slate-400'}`}>{USERNAME_HINT}</p>
              </div>
              <div>
                <label htmlFor="um-email" className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Email</label>
                <input id="um-email" type="email" value={form.email} onChange={set('email')} className={`${inputCls} ${emailInvalid ? 'border-red-400' : ''}`} placeholder="juan@hw.com" autoComplete="off" />
                {emailInvalid && <p className="mt-1 text-[11px] text-red-600">Enter a valid email address.</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="um-role" className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Role</label>
                  <select id="um-role" value={form.role} onChange={set('role')} className={inputCls}>
                    <option value="">Select…</option>
                    {roles.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="um-dept" className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Department</label>
                  <input id="um-dept" value={form.department} onChange={set('department')} className={inputCls} placeholder="Finance" />
                </div>
              </div>
              <div>
                <label htmlFor="um-password" className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Password</label>
                <input id="um-password" type="password" value={form.password} onChange={set('password')} className={inputCls} autoComplete="new-password" />
              </div>
              <div>
                <label htmlFor="um-password-confirm" className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Confirm Password</label>
                <input id="um-password-confirm" type="password" value={form.password_confirmation} onChange={set('password_confirmation')} className={`${inputCls} ${mismatch ? 'border-red-400' : ''}`} autoComplete="new-password" />
                {mismatch && <p className="mt-1 text-[11px] text-red-600">Passwords do not match.</p>}
              </div>
            </div>
            <PasswordStrength password={form.password} />
            <div className="flex justify-end">
              <button id="um-submit" type="submit" disabled={!canSubmit} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Username</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-6 text-center text-slate-400">Loading users…</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 dark:border-slate-700/50">
                  <td className="py-2.5 pr-3 font-medium text-slate-900 dark:text-white">{u.name}</td>
                  <td className="py-2.5 pr-3 font-mono text-xs text-slate-600 dark:text-slate-300">{u.username || '—'}</td>
                  <td className="py-2.5 pr-3 text-slate-600 dark:text-slate-300">{u.email}</td>
                  <td className="py-2.5 pr-3 text-slate-600 dark:text-slate-300">{u.role_name}</td>
                  <td className="py-2.5 pr-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {u.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <button id={`um-toggle-${u.id}`} onClick={() => toggleActive(u)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagementCard;
