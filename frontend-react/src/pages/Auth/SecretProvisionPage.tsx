import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  KeyRound, 
  UserPlus, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  RefreshCw, 
  LogIn, 
  ToggleLeft, 
  ToggleRight, 
  ArrowLeft, 
  Briefcase, 
  Layers,
  Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/apiClient';

interface LiveUser {
  id: string;
  name: string;
  username: string;
  email: string;
  is_internal: boolean;
  role_slug: string;
  role_name: string;
  department: string;
  is_active: boolean;
  otp_enabled: boolean;
  created_at: string;
}

interface RoleOption {
  id: string;
  name: string;
  slug: string;
  description: string;
}

interface SecretProvisionPageProps {
  onBack: () => void;
  onLoginSuccess: () => void;
}

export const SecretProvisionPage: React.FC<SecretProvisionPageProps> = ({ onBack, onLoginSuccess }) => {
  const { login } = useAuth();

  // Master Secret Key (prefilled for smooth demo, editable if customized)
  const [masterKey, setMasterKey] = useState('ArchonMaster2026!');
  const [isKeyValid, setIsKeyValid] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [hasEmail, setHasEmail] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Admintesting123');
  const [roleSlug, setRoleSlug] = useState('super_admin');
  const [department, setDepartment] = useState('Finance');
  const [requireOtp, setRequireOtp] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    login: string;
    email: string;
    password: string;
    role: string;
    otp: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Directory Data
  const [users, setUsers] = useState<LiveUser[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [togglingOtpUserId, setTogglingOtpUserId] = useState<string | null>(null);
  const [quickLoggingUserId, setQuickLoggingUserId] = useState<string | null>(null);

  // Auto-generate suggested username when name changes
  const handleNameChange = (val: string) => {
    setName(val);
    if (!username || username === name.toLowerCase().replace(/[^a-z0-9]/g, '')) {
      const sanitized = val.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
      if (sanitized) {
        setUsername(`${sanitized}01`);
      }
    }
  };

  // Fetch live accounts from backend
  const fetchAccounts = async (keyToUse = masterKey) => {
    setIsFetchingUsers(true);
    try {
      const res = await apiClient.post('/auth/secret-users', { master_key: keyToUse });
      if (res.data.success) {
        setUsers(res.data.users);
        setRoles(res.data.roles);
        setIsKeyValid(true);
      }
    } catch (err: any) {
      setIsKeyValid(false);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Master Key authorization failed.',
      });
    } finally {
      setIsFetchingUsers(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Handle Account Provisioning
  const handleProvision = async (shouldAutoLogin = false) => {
    setFeedback(null);
    setCreatedCredentials(null);

    if (!name.trim()) {
      setFeedback({ type: 'error', message: 'Full name is required.' });
      return;
    }
    if (!username.trim()) {
      setFeedback({ type: 'error', message: 'Username is required.' });
      return;
    }
    if (hasEmail && !email.trim()) {
      setFeedback({ type: 'error', message: 'Please provide an email address or switch to "No Email".' });
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        master_key: masterKey,
        name: name.trim(),
        username: username.trim(),
        has_email: hasEmail,
        email: hasEmail ? email.trim() : null,
        password: password.trim() || 'Admintesting123',
        role_slug: roleSlug,
        department: department.trim() || 'Finance',
        require_otp: hasEmail ? requireOtp : false,
        auto_login: shouldAutoLogin,
      };

      const res = await apiClient.post('/auth/secret-provision', payload);

      if (res.data.success) {
        const creds = {
          login: res.data.credentials.login,
          email: res.data.credentials.email,
          password: res.data.credentials.password,
          role: roleSlug,
          otp: hasEmail ? requireOtp : false,
        };
        setCreatedCredentials(creds);
        setFeedback({
          type: 'success',
          message: res.data.message || `Account ${res.data.credentials.login} successfully created!`,
        });

        // Reset form inputs for next entry
        setName('');
        setUsername('');
        setEmail('');

        // Refresh user directory
        fetchAccounts();

        // If auto-login requested, authenticate immediately
        if (shouldAutoLogin && res.data.token && res.data.auth_payload) {
          login(res.data.token, res.data.auth_payload);
          setTimeout(() => {
            onLoginSuccess();
          }, 800);
        }
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Provisioning failed. Please verify credentials.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle OTP for any user in real-time
  const handleToggleOtp = async (user: LiveUser) => {
    setTogglingOtpUserId(user.id);
    try {
      const res = await apiClient.post('/auth/secret-toggle-otp', {
        master_key: masterKey,
        user_id: user.id,
      });

      if (res.data.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, otp_enabled: res.data.otp_enabled } : u))
        );
        setFeedback({
          type: 'success',
          message: `OTP status for ${user.username} updated to ${res.data.otp_enabled ? 'ENABLED (Gmail)' : 'DISABLED (Direct)'}.`,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to toggle OTP status.',
      });
    } finally {
      setTogglingOtpUserId(null);
    }
  };

  // Quick Login as any user directly from the table
  const handleQuickLogin = async (user: LiveUser) => {
    setQuickLoggingUserId(user.id);
    try {
      const res = await apiClient.post('/auth/secret-quick-login', {
        master_key: masterKey,
        user_id: user.id,
      });

      if (res.data.success && res.data.token && res.data.user) {
        login(res.data.token, res.data.user);
        setFeedback({
          type: 'success',
          message: `Switched session to ${user.name} (${user.role_name}). Entering dashboard...`,
        });
        setTimeout(() => {
          onLoginSuccess();
        }, 600);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Quick login failed.',
      });
      setQuickLoggingUserId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 selection:bg-indigo-500 selection:text-white font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ── Top Navigation & Master Authorization Bar ── */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
              title="Return to Login"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="text-white" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Super Account Provisioning Portal
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  Secret Mode
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Instant master identity generation &bull; Real email or No email &bull; Live OTP toggling
              </p>
            </div>
          </div>

          {/* Master Key Input & Status */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={masterKey}
                onChange={(e) => {
                  setMasterKey(e.target.value);
                  fetchAccounts(e.target.value);
                }}
                placeholder="Master Secret Passkey"
                className="pl-8 pr-3 py-1.5 text-xs font-mono bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48 sm:w-56"
              />
            </div>
            <div className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 border ${
              isKeyValid 
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' 
                : 'bg-red-950/40 border-red-500/30 text-red-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isKeyValid ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              <span>{isKeyValid ? 'Authorized' : 'Locked'}</span>
            </div>
            <button
              onClick={() => fetchAccounts()}
              disabled={isFetchingUsers}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
              title="Refresh User List"
            >
              <RefreshCw size={15} className={isFetchingUsers ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* ── Notification Banner ── */}
        {feedback && (
          <div className={`p-4 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between border animate-fadeIn ${
            feedback.type === 'success' 
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
              : 'bg-red-950/40 border-red-500/30 text-red-300'
          }`}>
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? <CheckCircle2 size={18} className="shrink-0 text-emerald-400" /> : <AlertCircle size={18} className="shrink-0 text-red-400" />}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white text-xs ml-3 font-semibold">
              Dismiss
            </button>
          </div>
        )}

        {/* ── Main Two-Column Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ════════ LEFT COLUMN: Provisioning Form (5 cols) ════════ */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center gap-2 mb-5">
                <UserPlus size={18} className="text-indigo-400" />
                <h2 className="text-base font-bold text-white tracking-wide">Provision New Account</h2>
              </div>

              {/* Mode Toggle: Real Email vs No Email */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Account Type / Email Mode
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => { setHasEmail(true); setRequireOtp(true); }}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                      hasEmail 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Mail size={14} />
                    <span>With Real Email</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setHasEmail(false); setRequireOtp(false); }}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                      !hasEmail 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <UserIcon size={14} />
                    <span>No Email (Fast Demo)</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {hasEmail 
                    ? 'Use a real Gmail address to test real-world 6-digit OTP delivery to your inbox.' 
                    : 'Creates an internal username-only account (@archon.internal). Bypasses OTP for instant sign in.'}
                </p>
              </div>

              {/* Form Inputs */}
              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Migy Ferreras or Demo Admin"
                    className="w-full py-2 px-3 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Username / Login Key</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="e.g. migy01 or tester01"
                    className="w-full py-2 px-3 text-xs font-mono bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Email Address (if hasEmail is true) */}
                {hasEmail ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Gmail / Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
                      placeholder="e.g. yourname@gmail.com"
                      className="w-full py-2 px-3 text-xs font-mono bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <span className="text-slate-400">Auto-generated System Email: </span>
                    <span className="font-mono text-indigo-400 font-semibold">
                      {username ? `${username}@archon.internal` : 'username@archon.internal'}
                    </span>
                  </div>
                )}

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300">Password</label>
                    <button
                      type="button"
                      onClick={() => setPassword('Admintesting123')}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      Reset to Admintesting123
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Admintesting123"
                      className="w-full pl-8 pr-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Role Picker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Assigned Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { slug: 'super_admin', label: 'Super Admin', desc: 'Full Access' },
                      { slug: 'finance_manager', label: 'Finance Mgr', desc: 'Approvals' },
                      { slug: 'department_viewer', label: 'Staff Viewer', desc: 'Read-only' },
                    ].map((r) => (
                      <button
                        key={r.slug}
                        type="button"
                        onClick={() => setRoleSlug(r.slug)}
                        className={`p-2 rounded-xl text-left border transition-all ${
                          roleSlug === r.slug
                            ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold leading-tight">{r.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{r.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Department Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full py-2 px-3 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Executive">Executive</option>
                    <option value="Finance">Finance</option>
                    <option value="HR">Human Resources</option>
                    <option value="Supply Chain">Supply Chain / Fleet</option>
                    <option value="IT Operations">IT & Systems</option>
                  </select>
                </div>

                {/* Two-Factor Authentication (OTP) Toggle Switch */}
                {hasEmail && (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-200">Require Email OTP (2FA)</span>
                      <p className="text-[11px] text-slate-400">
                        Sends a live 6-digit verification code to the Gmail inbox upon sign in.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRequireOtp(!requireOtp)}
                      className={`text-2xl transition-colors ${requireOtp ? 'text-indigo-400' : 'text-slate-600'}`}
                    >
                      {requireOtp ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                    </button>
                  </div>
                )}

                {/* Provision Buttons */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => handleProvision(true)}
                    disabled={isLoading || !isKeyValid}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles size={16} />
                    <span>{isLoading ? 'Provisioning...' : 'Provision & Enter Dashboard Immediately'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleProvision(false)}
                    disabled={isLoading || !isKeyValid}
                    className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    Create Account Only (Stay on this page)
                  </button>
                </div>
              </div>
            </div>

            {/* Created Account Credentials Card */}
            {createdCredentials && (
              <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-xl animate-fadeIn space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                    <CheckCircle2 size={16} />
                    <span>Account Ready for Demo</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(`Login: ${createdCredentials.login}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}\nRole: ${createdCredentials.role}\nOTP: ${createdCredentials.otp ? 'YES' : 'NO'}`)}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 rounded-lg hover:bg-emerald-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copied ? 'Copied!' : 'Copy Info'}</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/80 p-3 rounded-xl border border-emerald-500/20">
                  <div>
                    <span className="text-slate-500 block text-[10px]">USERNAME</span>
                    <span className="text-slate-100 font-bold">{createdCredentials.login}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">PASSWORD</span>
                    <span className="text-slate-100 font-bold">{createdCredentials.password}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block text-[10px]">EMAIL ADDRESS</span>
                    <span className="text-slate-300 truncate block">{createdCredentials.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">ASSIGNED ROLE</span>
                    <span className="text-indigo-400 font-bold capitalize">{createdCredentials.role.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">2FA / OTP STATUS</span>
                    <span className={`font-bold ${createdCredentials.otp ? 'text-amber-400' : 'text-slate-400'}`}>
                      {createdCredentials.otp ? '🔐 OTP ACTIVE' : '⚡ DIRECT LOGIN'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ════════ RIGHT COLUMN: Live Accounts Directory & OTP Controls (7 cols) ════════ */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                    <Layers size={18} className="text-indigo-400" />
                    <span>Live System Accounts & Dynamic OTP Switcher</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Switch roles in 1-click or toggle OTP protection on the fly during defense.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-semibold">
                    Total: <strong className="text-white">{users.length}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 font-semibold">
                    OTP On: <strong className="text-indigo-200">{users.filter(u => u.otp_enabled).length}</strong>
                  </span>
                </div>
              </div>

              {/* Users List Table / Cards */}
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {users.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    {isFetchingUsers ? 'Loading accounts...' : 'No accounts found or Master Key invalid.'}
                  </div>
                ) : (
                  users.map((u) => (
                    <div
                      key={u.id}
                      className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-white truncate">{u.name}</span>
                          <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-300">
                            {u.username}
                          </span>
                          <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                            u.role_slug === 'super_admin'
                              ? 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
                              : u.role_slug === 'finance_manager'
                              ? 'bg-blue-950/60 text-blue-300 border border-blue-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {u.role_name}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono truncate">
                          <span className="truncate">{u.email}</span>
                          <span className="text-slate-600">&bull;</span>
                          <span className="text-slate-400 font-sans">{u.department}</span>
                        </div>
                      </div>

                      {/* Action Controls for this Account */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* OTP Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleOtp(u)}
                          disabled={togglingOtpUserId === u.id || u.is_internal}
                          title={u.is_internal ? 'Internal accounts cannot use Gmail OTP' : 'Click to Toggle OTP On/Off'}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
                            u.is_internal
                              ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                              : u.otp_enabled
                              ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/60'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.otp_enabled ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'}`} />
                          <span>{u.otp_enabled ? 'OTP ACTIVE' : 'NO OTP'}</span>
                        </button>

                        {/* One-Click Quick Login Button */}
                        <button
                          type="button"
                          onClick={() => handleQuickLogin(u)}
                          disabled={quickLoggingUserId === u.id}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-lg shadow-sm flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <LogIn size={12} />
                          <span>{quickLoggingUserId === u.id ? 'Entering...' : 'Sign In'}</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bottom Quick Guide */}
              <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Briefcase size={12} className="text-indigo-400" />
                  <span>Default password for all provisioned demo accounts: <strong className="text-white font-mono">Admintesting123</strong></span>
                </span>
                <span className="text-slate-500">
                  Default MPIN: <strong className="text-slate-300 font-mono">1111</strong>
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SecretProvisionPage;
