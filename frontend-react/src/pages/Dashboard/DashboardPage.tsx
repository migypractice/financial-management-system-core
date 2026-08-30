import React, { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Landmark,
  ArrowUpRight, CheckCircle, Clock, AlertTriangle,
  BookOpen, CreditCard, Send, PieChart, BarChart2,
  Receipt, Inbox, Activity
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Toast: React.FC<{ message: string; type: 'success' | 'info'; onDismiss: () => void }> = ({ message, type, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all animate-slideInRight ${
      type === 'success'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-blue-50 text-blue-700 border-blue-200'
    }`}>
      {type === 'success' ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      )}
      {message}
    </div>
  );
};

interface DashboardPageProps {
  onNavigate?: (path: string) => void;
}

const recentTransactions = [
  { code: 'TXN-2026-8801', module: 'SUPPLY_CHAIN', amount: 685000, status: 'ai_flagged', time: '2 min ago' },
  { code: 'TXN-2026-8802', module: 'HRMS', amount: 145000, status: 'pending_approval', time: '18 min ago' },
  { code: 'TXN-2026-8803', module: 'ECOMMERCE', amount: 45000, status: 'pending_approval', time: '35 min ago' },
  { code: 'TXN-2026-8804', module: 'FLEET', amount: 12800, status: 'approved', time: '1 hr ago' },
  { code: 'TXN-2026-8805', module: 'FACILITIES', amount: 95000, status: 'posted', time: '2 hrs ago' },
];

const statusConfig: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode; label: string }> = {
  ai_flagged: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', icon: <AlertTriangle size={11} />, label: 'AI Flagged' },
  pending_approval: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', icon: <Clock size={11} />, label: 'Pending' },
  approved: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', icon: <CheckCircle size={11} />, label: 'Approved' },
  posted: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', icon: <CheckCircle size={11} />, label: 'Posted' },
};

const quickAccessItems = [
  { label: 'General Ledger', icon: BookOpen, color: 'bg-blue-50 text-blue-600', path: '/gl' },
  { label: 'Accounts Payable', icon: CreditCard, color: 'bg-orange-50 text-orange-600', path: '/ap' },
  { label: 'Disbursement', icon: Send, color: 'bg-purple-50 text-purple-600', path: '/disbursements' },
  { label: 'Reports', icon: BarChart2, color: 'bg-teal-50 text-teal-600', path: '/reports' },
  { label: 'Budget', icon: PieChart, color: 'bg-pink-50 text-pink-600', path: '/budget' },
  { label: 'Collections', icon: Inbox, color: 'bg-indigo-50 text-indigo-600', path: '/collections' },
  { label: 'Cash Mgmt', icon: Landmark, color: 'bg-green-50 text-green-600', path: '/cash' },
  { label: 'Tax', icon: Receipt, color: 'bg-red-50 text-red-600', path: '/tax' },
];

const moduleHealth = [
  { label: 'General Ledger', path: '/gl' },
  { label: 'Accounts Payable', path: '/ap' },
  { label: 'Accounts Receivable', path: '/ar' },
  { label: 'Disbursement', path: '/disbursements' },
  { label: 'Collections', path: '/collections' },
  { label: 'Budget Mgmt', path: '/budget' },
  { label: 'Cash Mgmt', path: '/cash' },
  { label: 'Fin. Reports', path: '/reports' },
  { label: 'Tax Mgmt', path: '/tax' },
];

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'there';
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const CORE_ROUTES = ['/dashboard', '/approvals', '/gl', '/simulator', '/audit-logs'];

  const handleNavigate = (path: string) => {
    if (CORE_ROUTES.includes(path)) {
      onNavigate?.(path);
    } else {
      setToast({ message: 'Module under integration — not part of the current Transaction Core implementation.', type: 'info' });
    }
  };

  return (
    <div className="p-6 space-y-5">
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      {/* Welcome Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Welcome back, {firstName}! 👋
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
          Here's what's happening in your Transaction Core today.
        </p>
      </div>

      {/* Analytics Context Note */}
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50/60 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/40">
        <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-[11px] text-blue-600 dark:text-blue-300 font-medium">
          Analytics Module (Under Integration) — Live data is available in AI Approvals and General Ledger. Connected subsystem modules are being integrated by other teams.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Revenue (MTD)',
            value: '₱28,900,000',
            change: '↑ 12.4% from last month',
            positive: true,
            icon: <TrendingUp size={20} />,
            iconBg: 'bg-blue-100 text-blue-600',
          },
          {
            label: 'Total Expenses (MTD)',
            value: '₱11,340,200',
            change: '↑ 3.1% from last month',
            positive: false,
            icon: <TrendingDown size={20} />,
            iconBg: 'bg-red-100 text-red-500',
          },
          {
            label: 'Net Income',
            value: '₱17,559,800',
            change: '↑ 18.7% from last month',
            positive: true,
            icon: <DollarSign size={20} />,
            iconBg: 'bg-green-100 text-green-600',
          },
          {
            label: 'Cash Position',
            value: '₱12,450,800',
            change: '↑ 5.2% across all banks',
            positive: true,
            icon: <Landmark size={20} />,
            iconBg: 'bg-amber-100 text-amber-600',
          },
        ].map((kpi) => (
          <div key={kpi.label} className="card-hover bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 shadow-sm hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.iconBg}`}>
                {kpi.icon}
              </div>
              <ArrowUpRight size={14} className="text-gray-300 dark:text-slate-600 mt-1" />
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-3 font-medium">{kpi.label}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5 tracking-tight">{kpi.value}</p>
            <p className={`text-[11px] mt-1 font-medium ${kpi.positive ? 'text-green-500' : 'text-red-400'}`}>
              {kpi.change}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Access — kept above the fold, right under the KPIs, so it never requires scrolling */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-700">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Quick Access</h2>
        </div>
        <div className="p-3 grid grid-cols-4 sm:grid-cols-8 gap-2">
          {quickAccessItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => handleNavigate(item.path)}
                className="flex flex-col items-center gap-1.5 group py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors relative"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform shadow-sm`}>
                  <Icon size={16} />
                </div>
                {!CORE_ROUTES.includes(item.path) && (
                  <div className="absolute top-0 right-1 lg:right-3 xl:right-5 text-slate-400 bg-white dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700">
                    <svg className="w-3.5 h-3.5 p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                )}
                <span className="text-[9px] font-medium text-gray-500 dark:text-slate-400 text-center leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Activity size={15} className="text-blue-500" />
                Recent Transaction Activity <span className="text-gray-400 dark:text-slate-500 text-xs font-medium">(Representative Data)</span>
              </h2>
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">Latest inbound and outbound financial movements</p>
            </div>
            <button
              onClick={() => handleNavigate('/approvals')}
              className="text-[11px] text-blue-600 font-semibold hover:underline flex items-center gap-1"
            >
              View Live Approvals Queue <ArrowUpRight size={11} />
            </button>
          </div>

          {/* Table Container for Mobile Scrolling */}
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Table Header */}
              <div className="px-5 py-2 grid grid-cols-4 text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider border-b border-gray-50 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-700/30">
                <span>Transaction</span>
                <span>Source</span>
                <span>Status</span>
                <span className="text-right">Amount</span>
              </div>

              <div className="divide-y divide-gray-50 dark:divide-slate-700">
                {recentTransactions.map((tx) => {
                  const s = statusConfig[tx.status] || statusConfig['pending_approval'];
                  return (
                    <div key={tx.code} className="px-5 py-3 grid grid-cols-4 items-center hover:bg-gray-50/60 dark:hover:bg-slate-700/30 transition-colors cursor-pointer">
                      <div>
                        <p className="font-mono text-[11px] font-semibold text-gray-800 dark:text-slate-200">{tx.code}</p>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">{tx.time}</p>
                      </div>
                      <span className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">{tx.module}</span>
                      <div>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border ${s.bg} ${s.text} ${s.border}`}>
                          {s.icon}
                          {s.label}
                        </span>
                      </div>
                      <span className="text-right font-mono text-xs font-bold text-gray-900 dark:text-white">
                        ₱{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Module Status */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden h-fit">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Module Status</h2>
            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">All 9 Transaction Core subsystems</p>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-slate-700 px-2 py-1">
            {moduleHealth.map((m) => (
              <button
                key={m.label}
                onClick={() => handleNavigate(m.path)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/40 rounded-lg transition-colors text-left"
              >
                <span className="text-xs text-gray-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                  {m.label}
                  {!CORE_ROUTES.includes(m.path) && (
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  )}
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-green-600 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Operational
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
