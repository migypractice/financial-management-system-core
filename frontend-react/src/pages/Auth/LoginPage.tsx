import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export const LoginPage: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  // Strong Password Regex: At least 8 chars, 1 uppercase, 1 number, 1 special char
  const isStrongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);

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
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-56 rounded-2xl bg-white shadow-sm border border-slate-200 p-4">
            <img src="/archon-nell-logo.png" alt="Archon Nell Incorporated" className="w-full h-auto object-contain" />
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-slate-600">
          Sign in to your Financial System account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm font-medium rounded-md border border-red-200">
                {error}
              </div>
            )}
            
            <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-md border border-blue-200">
              <strong>Enterprise Security Active:</strong> Access is restricted to corporate emails only (e.g., @hw.com). Personal emails (Gmail, Yahoo) are blocked by IT policy.
            </div>
            
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
                  className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                    password.length > 0 && !isStrongPassword ? 'border-red-300' : 'border-slate-300'
                  }`}
                  placeholder="Password"
                />
              </div>
              {password.length > 0 && !isStrongPassword && (
                <p className="mt-1 text-xs text-red-500">
                  Password must be at least 8 characters, include an uppercase letter, a number, and a special character.
                </p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || (password.length > 0 && !isStrongPassword)}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 transition-colors"
              >
                {isLoading ? 'Authenticating...' : 'Sign in securely'}
              </button>
            </div>
          </form>
          
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Test Accounts</h4>
            <ul className="text-xs text-slate-600 space-y-2">
              <li><span className="font-medium text-slate-900">Admin:</span> admin@hw.com / Admin@123!</li>
              <li><span className="font-medium text-slate-900">Finance Manager:</span> manager@hw.com / Admin@123!</li>
              <li><span className="font-medium text-slate-900">Staff:</span> staff@hw.com / Admin@123!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
