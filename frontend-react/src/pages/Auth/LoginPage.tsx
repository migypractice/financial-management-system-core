import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export const LoginPage: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        login(data.token, data.user);
        onLoginSuccess();
      } else {
        setError(data.message || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection to the Laravel backend.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8" style={{ background: 'linear-gradient(135deg, #f0f4f8 0%, #e8edf5 100%)' }}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Client Logo */}
        <div className="flex justify-center mb-4">
          <img
            src="/archon-nell-logo.png"
            alt="Archon Nell Incorporated"
            className="h-20 w-auto object-contain"
            style={{ maxWidth: '280px' }}
          />
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Financial Management System
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-slate-200/60">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Sign in to your account</h2>
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm font-medium rounded-md border border-red-200">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="admin@hw.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="password123"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white transition-colors disabled:opacity-70"
                style={{ background: isLoading ? '#64748b' : 'linear-gradient(135deg, #1e3a5f, #1d4ed8)' }}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
          
          <div className="mt-5 pt-5 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Demo Accounts</h4>
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-200 rounded uppercase">Demo Mode</span>
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5">
              <li className="flex items-center gap-2"><span className="font-medium text-slate-800 w-28">Admin:</span> admin@hw.com / password123</li>
              <li className="flex items-center gap-2"><span className="font-medium text-slate-800 w-28">Finance Manager:</span> manager@hw.com / password123</li>
              <li className="flex items-center gap-2"><span className="font-medium text-slate-800 w-28">Staff:</span> staff@hw.com / password123</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
