import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, User, Moon, Sun, Server, Lock, AlertCircle, Info } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    const handleThemeChange = () => {
      setIsDark(localStorage.getItem('theme') === 'dark');
    };
    window.addEventListener('themeToggleSync', handleThemeChange);
    return () => window.removeEventListener('themeToggleSync', handleThemeChange);
  }, []);

  const toggleTheme = () => {
    window.dispatchEvent(new Event('themeToggle'));
    setIsDark(!isDark);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings & System Status</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Manage your profile, preferences, and view system health.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Profile & Appearance */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Profile Section */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <User size={18} className="text-blue-500" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Profile Information</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Full Name</label>
                  <input type="text" disabled value={user?.name || ''} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-500 dark:text-slate-400 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Email Address</label>
                  <input type="text" disabled value={user?.email || ''} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-500 dark:text-slate-400 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">System Role</label>
                  <input type="text" disabled value={user?.role || ''} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-500 dark:text-slate-400 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Department</label>
                  <input type="text" disabled value={user?.department || 'Finance'} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-500 dark:text-slate-400 cursor-not-allowed" />
                </div>
              </div>
              <div className="flex items-start gap-2 mt-4 p-3 bg-blue-50 dark:bg-slate-700/50 rounded-lg border border-blue-100 dark:border-slate-600">
                <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-slate-300">Profile editing is disabled in this environment. Contact your system administrator for role changes.</p>
              </div>
            </div>
          </div>

          {/* Appearance Section */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <Sun size={18} className="text-orange-500" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Appearance</h2>
            </div>
            <div className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Dark Mode</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Toggle the visual theme of the application.</p>
              </div>
              <button 
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${isDark ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDark ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Security & System Status */}
        <div className="space-y-6">
          
          {/* System Status */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <Server size={18} className="text-emerald-500" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">System Status</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 dark:text-slate-400">Transaction Core</span>
                <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded border border-emerald-200 dark:border-emerald-800/50">OPERATIONAL</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 dark:text-slate-400">AI Expert System</span>
                <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded border border-emerald-200 dark:border-emerald-800/50">ONLINE</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 dark:text-slate-400">M2M Simulator</span>
                <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded border border-emerald-200 dark:border-emerald-800/50">CONNECTED</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 dark:text-slate-400">Audit Trail</span>
                <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded border border-emerald-200 dark:border-emerald-800/50">LOGGING</span>
              </div>
            </div>
          </div>

          {/* Security Context */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <ShieldCheck size={18} className="text-purple-500" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Security Context</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 dark:text-slate-400">Session Status</span>
                <span className="text-xs text-gray-900 dark:text-slate-200 flex items-center gap-1.5"><Lock size={12} className="text-emerald-500" /> Authenticated</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 dark:text-slate-400">Maker-Checker Policy</span>
                <span className="text-xs text-gray-900 dark:text-slate-200">Enforced</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 dark:text-slate-400">RBAC Enforcement</span>
                <span className="text-xs text-gray-900 dark:text-slate-200">Strict</span>
              </div>
            </div>
          </div>

          {/* Demonstration Mode Card */}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl shadow-sm border border-amber-200 dark:border-amber-800/50 overflow-hidden p-5">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-500">Demonstration Context</h3>
                <p className="text-xs text-amber-800 dark:text-amber-400/90 mt-2 leading-relaxed">
                  This interface operates in a defense-ready demonstration mode. 
                  Dashboard metrics use representative data, while live transaction activity is strictly visible through the <strong>AI Approvals</strong> and <strong>General Ledger</strong> modules.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
