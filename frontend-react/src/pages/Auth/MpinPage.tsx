import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Lock, AlertCircle } from 'lucide-react';

export const MpinPage: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const { user, logout } = useAuth();

  const handleInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError(false);

    // Auto focus next input
    if (value !== '' && index < 3) {
      const nextInput = document.getElementById(`pin-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && pin[index] === '' && index > 0) {
      const prevInput = document.getElementById(`pin-${index - 1}`);
      prevInput?.focus();
    }
  };

  useEffect(() => {
    if (pin.every(p => p !== '')) {
      if (pin.join('') === '1111') {
        onSuccess();
      } else {
        const newFails = failedAttempts + 1;
        if (newFails >= 3) {
          // Calculate lockout duration (30s * multiplier)
          const email = user?.email || 'unknown';
          const lockoutDataStr = localStorage.getItem(`lockout_${email}`);
          const lockoutData = lockoutDataStr ? JSON.parse(lockoutDataStr) : { multiplier: 0 };
          
          const nextMultiplier = lockoutData.multiplier + 1;
          const lockoutMs = 30000 * nextMultiplier; // 30s, 60s, 90s...
          
          localStorage.setItem(`lockout_${email}`, JSON.stringify({
            until: Date.now() + lockoutMs,
            multiplier: nextMultiplier
          }));

          alert(`Security Violation: Maximum MPIN attempts reached. Account locked for ${lockoutMs / 1000} seconds.`);
          logout();
          return;
        }
        setFailedAttempts(newFails);
        setError(true);
        setPin(['', '', '', '']);
        document.getElementById('pin-0')?.focus();
      }
    }
  }, [pin, onSuccess, failedAttempts, logout]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Premium Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/10 backdrop-blur-xl py-10 px-8 shadow-2xl sm:rounded-2xl border border-white/20 text-center">
          
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-500/20 text-blue-400 mb-6 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            <ShieldCheck size={32} />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2 tracking-wide">
            Enterprise Verification
          </h2>
          <p className="text-sm text-slate-300 mb-8">
            Welcome back, {user?.name}. Please enter your 4-digit Security PIN (Authenticator App) to access the corporate dashboard.
          </p>

          <div className="flex justify-center gap-4 mb-6">
            {pin.map((digit, i) => (
              <input
                key={i}
                id={`pin-${i}`}
                type="password"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInput(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`w-14 h-16 text-center text-2xl font-bold rounded-xl bg-slate-800/50 text-white border-2 focus:outline-none focus:ring-0 transition-all ${
                  error ? 'border-red-500 text-red-500' : 'border-slate-600 focus:border-blue-400'
                }`}
                autoFocus={i === 0}
              />
            ))}
          </div>

          {error && (
            <div className="flex flex-col items-center justify-center gap-1 text-red-400 text-sm font-medium animate-pulse mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} />
                Invalid PIN. Please try again.
              </div>
              <span className="text-xs text-red-300">Attempt {failedAttempts} of 3</span>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mt-6 bg-slate-800/50 py-3 px-4 rounded-lg border border-slate-700">
            <Lock size={14} className="text-blue-400" />
            <span>2-Factor Authentication Required by Corporate IT Policy</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MpinPage;
