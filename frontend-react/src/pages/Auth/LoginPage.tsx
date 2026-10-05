import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { firstApiError, validateLoginIdentifier } from '../../utils/securityRules';

export const LoginPage: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const idError = validateLoginIdentifier(identifier);
    setFieldError(idError);
    if (idError) return;

    const loginKey = identifier.trim().toLowerCase();

    // Check for MPIN lockout
    const lockoutDataStr = localStorage.getItem(`lockout_${loginKey}`);
    if (lockoutDataStr) {
      const lockoutData = JSON.parse(lockoutDataStr);
      const remainingMs = lockoutData.until - Date.now();
      if (remainingMs > 0) {
        setError(`Account locked due to multiple failed MPIN attempts. Please try again in ${Math.ceil(remainingMs / 1000)} seconds.`);
        return;
      }
    }

    setIsLoading(true);

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ login: loginKey, password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        // MPIN lockout is keyed by email; re-check now that we know it
        // (the user may have signed in with a username).
        const mpinLock = localStorage.getItem(`lockout_${String(data.user?.email || '').toLowerCase()}`);
        if (mpinLock && JSON.parse(mpinLock).until > Date.now()) {
          const secs = Math.ceil((JSON.parse(mpinLock).until - Date.now()) / 1000);
          setError(`Account locked due to multiple failed MPIN attempts. Please try again in ${secs} seconds.`);
          return;
        }
        login(data.token, data.user);
        onLoginSuccess();
      } else {
        setError(firstApiError(data, 'Invalid credentials. Please try again.'));
      }
    } catch (err) {
      setError('Network error. Please check your connection to the Laravel backend.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-56 rounded-2xl bg-white shadow-sm border border-slate-200 p-4">
            <img src="/archon-nell-logo.png" alt="Archon Nell Incorporated" className="w-full h-auto object-contain" />
          </div>
        </div>
        <h1 className="mt-4 text-center text-sm text-slate-600">
          Sign in to your Financial System account
        </h1>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            {error && (
              <div id="login-error" role="alert" className="p-3 bg-red-50 text-red-700 text-sm font-medium rounded-md border border-red-200">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="login-identifier" className="block text-sm font-medium text-slate-700">
                Email or Username
              </label>
              <div className="mt-1 relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-identifier"
                  type="text"
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); setFieldError(null); }}
                  onBlur={() => identifier && setFieldError(validateLoginIdentifier(identifier))}
                  className={`appearance-none block w-full pl-9 pr-3 py-2 border rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${fieldError ? 'border-red-400' : 'border-slate-300'}`}
                  placeholder="admin@hw.com or admin01"
                />
              </div>
              {fieldError && <p className="mt-1 text-xs text-red-600">{fieldError}</p>}
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="mt-1 relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-9 pr-10 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="••••••••"
                />
                <button
                  id="toggle-password-visibility"
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <button
                id="login-submit"
                type="submit"
                disabled={isLoading || password.length === 0 || identifier.trim().length === 0}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 transition-colors"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              5 failed attempts will temporarily lock the account for 60 seconds.
            </p>
          </form>
          
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Test Accounts</h4>
            <ul className="text-xs text-slate-600 space-y-2">
              <li><span className="font-medium text-slate-900">Admin:</span> admin01 / Admin@2026</li>
              <li><span className="font-medium text-slate-900">Finance Manager:</span> manager01 / Manager@2026</li>
              <li><span className="font-medium text-slate-900">Staff:</span> staff01 / Staff@2026</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
