import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import apiClient from '../../services/apiClient';
import PasswordStrength from '../../components/ui/PasswordStrength';
import { firstApiError, isStrongPassword } from '../../utils/securityRules';

const inputCls =
  'w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500';

export const ChangePasswordCard: React.FC = () => {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = current && isStrongPassword(password) && password === confirm && !saving;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const { data } = await apiClient.post('/auth/change-password', {
        current_password: current,
        password,
        password_confirmation: confirm,
      });
      setSuccess(data.message || 'Password updated.');
      setCurrent('');
      setPassword('');
      setConfirm('');
    } catch (err: any) {
      setError(firstApiError(err?.response?.data, 'Unable to change password.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <KeyRound size={18} className="text-indigo-500" />
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">Change Password</h2>
      </div>
      <form onSubmit={submit} className="p-5 space-y-4" noValidate>
        {error && <div role="alert" className="p-3 text-sm rounded-lg bg-red-50 text-red-700 border border-red-200">{error}</div>}
        {success && (
          <div className="p-3 text-sm rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 size={16} /> {success}
          </div>
        )}

        <div>
          <label htmlFor="cp-current" className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Current Password</label>
          <input id="cp-current" type={show ? 'text' : 'password'} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputCls} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="cp-new" className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">New Password</label>
            <input id="cp-new" type={show ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="cp-confirm" className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Confirm New Password</label>
            <input id="cp-confirm" type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={`${inputCls} ${mismatch ? 'border-red-400' : ''}`} />
            {mismatch && <p className="mt-1 text-xs text-red-600">Passwords do not match.</p>}
          </div>
        </div>

        <PasswordStrength password={password} />

        <div className="flex items-center justify-between pt-2">
          <button id="cp-toggle-visibility" type="button" onClick={() => setShow((s) => !s)} className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 flex items-center gap-1">
            {show ? <EyeOff size={14} /> : <Eye size={14} />} {show ? 'Hide' : 'Show'} passwords
          </button>
          <button id="cp-submit" type="submit" disabled={!canSubmit} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {saving ? 'Saving...' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChangePasswordCard;
