import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Lock, User, ShieldCheck, ArrowLeft, RefreshCw, KeyRound, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { firstApiError, validateLoginIdentifier } from '../../utils/securityRules';

interface LoginPageProps {
  onLoginSuccess: () => void;
  onOpenSecretProvision?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onOpenSecretProvision }) => {
  const [logoClickCount, setLogoClickCount] = useState(0);
  // Step: 'LOGIN' | 'OTP'
  const [step, setStep] = useState<'LOGIN' | 'OTP'>('LOGIN');

  // Login credentials state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // OTP State
  const [otpUserId, setOtpUserId] = useState<string>('');
  const [otpEmail, setOtpEmail] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [demoOtpHint, setDemoOtpHint] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState<number>(60);
  const [isResending, setIsResending] = useState<boolean>(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { login } = useAuth();

  // Cooldown countdown effect when entering OTP step
  useEffect(() => {
    if (step === 'OTP' && resendCooldown > 0) {
      cooldownTimerRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, [step, resendCooldown]);

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

      if (response.ok) {
        // Check if user requires 2FA / OTP
        if (data.requires_otp) {
          setOtpUserId(data.user_id);
          setOtpEmail(data.email);
          setDemoOtpHint(data.demo_otp || '');
          setOtpCode('');
          setResendCooldown(60);
          setStep('OTP');
          return;
        }

        // Direct login for regular accounts
        if (data.token) {
          const mpinLock = localStorage.getItem(`lockout_${String(data.user?.email || '').toLowerCase()}`);
          if (mpinLock && JSON.parse(mpinLock).until > Date.now()) {
            const secs = Math.ceil((JSON.parse(mpinLock).until - Date.now()) / 1000);
            setError(`Account locked due to multiple failed MPIN attempts. Please try again in ${secs} seconds.`);
            return;
          }
          login(data.token, data.user);
          onLoginSuccess();
        }
      } else {
        setError(firstApiError(data, 'Invalid credentials. Please try again.'));
      }
    } catch (err) {
      setError('Network error. Please check your connection to the Laravel backend.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim().length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          user_id: otpUserId,
          otp_code: otpCode.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        login(data.token, data.user);
        onLoginSuccess();
      } else {
        setError(data.message || 'Invalid or expired OTP code. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setError(null);

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE}/auth/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ user_id: otpUserId }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.demo_otp) {
          setDemoOtpHint(data.demo_otp);
        }
        setResendCooldown(60);
      } else {
        setError(data.message || 'Failed to resend code. Please try again.');
      }
    } catch (err) {
      setError('Network error while resending OTP.');
    } finally {
      setIsResending(false);
    }
  };

  // Keyboard shortcut for Secret Portal (Alt+Shift+P or Ctrl+Shift+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.altKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's'))
      ) {
        e.preventDefault();
        if (onOpenSecretProvision) onOpenSecretProvision();
        else window.location.hash = '#secret-provision';
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSecretProvision]);

  const handleLogoClick = () => {
    const next = logoClickCount + 1;
    if (next >= 3) {
      setLogoClickCount(0);
      if (onOpenSecretProvision) onOpenSecretProvision();
      else window.location.hash = '#secret-provision';
    } else {
      setLogoClickCount(next);
      setTimeout(() => setLogoClickCount(0), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div 
            onClick={handleLogoClick}
            className="w-56 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-4 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors select-none"
            title="Archon Nell Incorporated (Triple-click for Super Provisioning)"
          >
            <img src="/archon-nell-logo.png" alt="Archon Nell Incorporated" className="w-full h-auto object-contain" />
          </div>
        </div>
        <h1 className="mt-4 text-center text-sm font-medium text-slate-600 dark:text-slate-400">
          {step === 'OTP' ? 'Two-Factor Authentication' : 'Sign in to your Financial System account'}
        </h1>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow-sm sm:rounded-2xl sm:px-10 border border-slate-200 dark:border-slate-700">
          {error && (
            <div id="login-error" role="alert" className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 text-sm font-medium rounded-xl border border-rose-200 dark:border-rose-800">
              {error}
            </div>
          )}

          {step === 'LOGIN' ? (
            /* ── Step 1: Username & Password Form ── */
            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <div>
                <label htmlFor="login-identifier" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Email or Username
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-identifier"
                    type="text"
                    autoComplete="username"
                    required
                    value={identifier}
                    onChange={(e) => { setIdentifier(e.target.value); setFieldError(null); }}
                    onBlur={() => identifier && setFieldError(validateLoginIdentifier(identifier))}
                    className={`appearance-none block w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900 border rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${fieldError ? 'border-red-400' : 'border-slate-300 dark:border-slate-700'}`}
                    placeholder="admin@hw.com or ferrerasmigy@gmail.com"
                  />
                </div>
                {fieldError && <p className="mt-1 text-xs text-red-600">{fieldError}</p>}
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="••••••••••••"
                  />
                  <button
                    id="toggle-password-visibility"
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl shadow-xs text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 transition-all cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Authenticating & Verifying...</span>
                    </>
                  ) : (
                    <span>Sign in</span>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
                5 failed attempts will temporarily lock the account for 60 seconds.
              </p>
            </form>
          ) : (
            /* ── Step 2: Two-Factor Authentication (OTP) Screen ── */
            <form className="space-y-5" onSubmit={handleVerifyOtp} noValidate>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <ShieldCheck size={24} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Verify Your Identity</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  We've sent a 6-digit verification code to: <br />
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{otpEmail}</span>
                </p>
              </div>

              {/* Demo Quick-Fill Pill / Helper */}
              {demoOtpHint && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300">
                    <KeyRound size={14} className="shrink-0" />
                    <span>Demo Code: <strong className="font-mono tracking-widest text-sm">{demoOtpHint}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtpCode(demoOtpHint)}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-amber-200/80 dark:bg-amber-800 text-amber-900 dark:text-amber-100 rounded-lg hover:bg-amber-300 transition-colors"
                  >
                    Auto-Fill
                  </button>
                </div>
              )}

              {/* 6-Digit Code Input */}
              <div>
                <label htmlFor="otp-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 text-center">
                  Enter 6-Digit Code
                </label>
                <div className="relative">
                  <input
                    id="otp-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoFocus
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full text-center font-mono text-2xl tracking-[0.4em] py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                    placeholder="••••••"
                  />
                </div>
              </div>

              {/* Verify Button */}
              <div>
                <button
                  id="otp-verify-submit"
                  type="submit"
                  disabled={isLoading || otpCode.trim().length !== 6}
                  className="w-full flex justify-center py-2.5 px-4 rounded-xl shadow-xs text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 transition-all cursor-pointer"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Continue'}
                </button>
              </div>

              {/* Resend Code Section with 60s Cooldown */}
              <div className="flex flex-col items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/80">
                {resendCooldown > 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Resend code in <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{resendCooldown}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isResending}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                  >
                    <RefreshCw size={13} className={isResending ? 'animate-spin' : ''} />
                    {isResending ? 'Sending new code...' : 'Resend Verification Code'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => { setStep('LOGIN'); setError(null); }}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors mt-1"
                >
                  <ArrowLeft size={13} /> Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* ── Test Accounts Reference ── */}
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-700">
            <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">
              Available Test Accounts
            </h4>
            <div className="space-y-2 text-xs">
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">🔐 OTP Enabled (2FA Demo):</span>
                <p className="text-slate-700 dark:text-slate-300 font-mono mt-0.5">ferrerasmigy@gmail.com / Admintesting123</p>
                <p className="text-slate-700 dark:text-slate-300 font-mono">rexsemerebot@gmail.com / Admintesting123</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Direct Login (No OTP):</span>
                <p className="text-slate-600 dark:text-slate-400 font-mono mt-0.5">admin01 / Admin@2026</p>
                <p className="text-slate-600 dark:text-slate-400 font-mono">manager01 / Manager@2026</p>
              </div>
            </div>

            {/* Secret Master Portal Access */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">PASS: ArchonMaster2026!</span>
              <button
                type="button"
                onClick={() => {
                  if (onOpenSecretProvision) onOpenSecretProvision();
                  else window.location.hash = '#secret-provision';
                }}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors py-1 px-2.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
              >
                <Sparkles size={13} />
                <span>Super Account Provisioning</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
