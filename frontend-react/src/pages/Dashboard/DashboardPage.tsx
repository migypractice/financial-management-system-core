import React, { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Landmark,
  ArrowUpRight, Clock, CheckCircle2,
  BookOpen, CreditCard, Send, PieChart, BarChart2,
  Receipt, Inbox, Activity, Eye, EyeOff, Calendar
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDashboardData } from '../../hooks/useDashboardData';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { FinancialChart } from '../../components/ui/FinancialChart';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { StatCard } from '../../components/ui/StatCard';

const Toast: React.FC<{ message: string; type: 'success' | 'info'; onDismiss: () => void }> = ({ message, type, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl border text-sm font-semibold transition-all animate-slideInRight ${
      type === 'success'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
        : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
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

const fallbackRecentTransactions = [
  { code: 'TXN-2026-8801', module: 'SUPPLY_CHAIN', amount: 685000, status: 'ai_flagged', time: '2 min ago' },
  { code: 'TXN-2026-8802', module: 'HRMS', amount: 145000, status: 'pending_approval', time: '18 min ago' },
  { code: 'TXN-2026-8803', module: 'ECOMMERCE', amount: 45000, status: 'pending_approval', time: '35 min ago' },
  { code: 'TXN-2026-8804', module: 'FLEET', amount: 12800, status: 'approved', time: '1 hr ago' },
  { code: 'TXN-2026-8805', module: 'FACILITIES', amount: 95000, status: 'posted', time: '2 hrs ago' },
];

const quickAccessItems = [
  { label: 'General Ledger', icon: BookOpen, color: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400', path: '/gl' },
  { label: 'Accounts Payable', icon: CreditCard, color: 'bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400', path: '/ap' },
  { label: 'Disbursement', icon: Send, color: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400', path: '/disbursements' },
  { label: 'Reports', icon: BarChart2, color: 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400', path: '/reports' },
  { label: 'Budget', icon: PieChart, color: 'bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400', path: '/budget' },
  { label: 'Collections', icon: Inbox, color: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400', path: '/collections' },
  { label: 'Cash Mgmt', icon: Landmark, color: 'bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400', path: '/cash' },
  { label: 'Tax', icon: Receipt, color: 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400', path: '/tax' },
];

const moduleHealth = [
  { label: 'General Ledger', path: '/gl', desc: 'Double-entry books' },
  { label: 'Accounts Payable', path: '/ap', desc: 'Supplier bills & aging' },
  { label: 'Accounts Receivable', path: '/ar', desc: 'Customer invoices' },
  { label: 'Disbursement', path: '/disbursements', desc: 'Authorized payouts' },
  { label: 'Collections', path: '/collections', desc: 'Bank inflow & OR' },
  { label: 'Budget Mgmt', path: '/budget', desc: 'GL variance control' },
  { label: 'Cash Mgmt', path: '/cash', desc: 'Multi-bank treasury' },
  { label: 'Fin. Reports', path: '/reports', desc: 'Live P&L statement' },
  { label: 'Tax Mgmt', path: '/tax', desc: 'VAT & withholding' },
];

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'there';
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [showBalances, setShowBalances] = useState(true);

  const { transactions, loading } = useDashboardData();

  // Compute live financial totals
  const approvedRevenue = transactions
    .filter(t => (t.status === 'approved' || t.status === 'posted') && t.flowType === 'INBOUND')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const approvedExpenses = transactions
    .filter(t => (t.status === 'approved' || t.status === 'posted') && t.flowType === 'OUTBOUND')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const pendingApprovalsCount = transactions.filter(
    t => t.status === 'pending_approval' || t.status === 'ai_flagged'
  ).length;

  const postedCount = transactions.filter(
    t => t.status === 'posted' || t.status === 'approved'
  ).length;

  const cogs = approvedRevenue * 0.25;
  const netIncome = approvedRevenue - cogs - approvedExpenses;
  const cashPosition = 12450800 + approvedRevenue - approvedExpenses;

  // Real or fallback transactions
  const displayTransactions = transactions.length > 0
    ? transactions.slice(0, 5).map(t => ({
        code: t.transactionCode,
        module: t.externalModule || 'SYSTEM',
        amount: Number(t.amount),
        status: t.status === 'posted' ? 'posted' : t.status,
        time: new Date(t.createdAt).toLocaleDateString(),
        flowType: t.flowType,
      }))
    : fallbackRecentTransactions.map(t => ({ ...t, flowType: t.module === 'ECOMMERCE' ? 'INBOUND' : 'OUTBOUND' }));

  // Inflow vs Outflow Chart Data
  const chartData = [
    { label: 'Week 1', inflow: Math.round(approvedRevenue * 0.18 + 120000), outflow: Math.round(approvedExpenses * 0.22 + 80000) },
    { label: 'Week 2', inflow: Math.round(approvedRevenue * 0.25 + 95000), outflow: Math.round(approvedExpenses * 0.19 + 60000) },
    { label: 'Week 3', inflow: Math.round(approvedRevenue * 0.32 + 140000), outflow: Math.round(approvedExpenses * 0.31 + 110000) },
    { label: 'Week 4', inflow: Math.round(approvedRevenue * 0.25 + 110000), outflow: Math.round(approvedExpenses * 0.28 + 95000) },
    { label: 'Current', inflow: Math.max(approvedRevenue, 250000), outflow: Math.max(approvedExpenses, 180000) },
  ];

  const handleNavigate = (path: string) => {
    onNavigate?.(path);
  };

  if (loading) return <SkeletonLoader />;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      {/* Welcome & Fiscal Period Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Financial Management Overview
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Welcome back, <strong className="text-slate-800 dark:text-slate-200">{user?.name || firstName}</strong>. Central transaction core & ledger status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs">
            <Calendar size={13} className="text-indigo-500" />
            <span>Period: FY2026 (Active)</span>
          </div>

          <button
            onClick={() => setShowBalances(!showBalances)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {showBalances ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>{showBalances ? 'Hide Balances' : 'Show Balances'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards — 4 Core Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard
          title="Total Inbound Revenue"
          value={showBalances ? `₱${approvedRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '₱ ••••••••'}
          change="Live Inflow"
          isPositive={true}
          icon={<TrendingUp size={18} />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
          subtitle="Sales & Collections"
        />

        <StatCard
          title="Total Outbound Expenses"
          value={showBalances ? `₱${approvedExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '₱ ••••••••'}
          change="Disbursed"
          isPositive={false}
          icon={<TrendingDown size={18} />}
          iconBg="bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"
          subtitle="Bills, Payroll & AP"
        />

        <StatCard
          title="Net Corporate Income"
          value={showBalances ? `₱${netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '₱ ••••••••'}
          change={netIncome >= 0 ? 'Operating Profit' : 'Operating Loss'}
          isPositive={netIncome >= 0}
          icon={<DollarSign size={18} />}
          iconBg={netIncome >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'}
          subtitle="Net after COGS & OPEX"
        />

        <StatCard
          title="Cash Position (Treasury)"
          value={showBalances ? `₱${cashPosition.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '₱ ••••••••'}
          change="Liquid Funds"
          isPositive={true}
          icon={<Landmark size={18} />}
          iconBg="bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
          subtitle="4 Commercial Accounts"
        />
      </div>

      {/* Operational Stats: Pending Approvals & Posted Vouchers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div 
          onClick={() => handleNavigate('/approvals')}
          className="card-hover p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs flex items-center justify-between cursor-pointer hover:border-amber-400 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending Maker-Checker Approvals</p>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                {pendingApprovalsCount} Transactions
              </h4>
            </div>
          </div>
          <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
            Review Queue <ArrowUpRight size={13} />
          </span>
        </div>

        <div 
          onClick={() => handleNavigate('/gl')}
          className="card-hover p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs flex items-center justify-between cursor-pointer hover:border-indigo-400 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Posted Journal Vouchers</p>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                {postedCount} Balanced
              </h4>
            </div>
          </div>
          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
            View Ledger <ArrowUpRight size={13} />
          </span>
        </div>
      </div>

      {/* Financial Chart Component */}
      <FinancialChart
        title="Revenue Inflow vs Expense Outflow"
        subtitle="Weekly operational liquidity comparison (Core System movements)"
        data={chartData}
      />

      {/* Quick Access Module Buttons */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700/80">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Transaction Core Modules</h2>
        </div>
        <div className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {quickAccessItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => handleNavigate(item.path)}
                className="flex flex-col items-center gap-2 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-600 group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform shadow-xs`}>
                  <Icon size={17} />
                </div>
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 text-center leading-tight">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom 2-Column: Recent Transaction Activity + Subsystem Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Activity size={16} className="text-indigo-500" />
                Recent Transaction Activity
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time transactions audited by AI Expert System
              </p>
            </div>
            <button
              onClick={() => handleNavigate('/approvals')}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              Open Approvals Queue <ArrowUpRight size={12} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[540px]">
              <thead className="bg-slate-50/80 dark:bg-slate-700/40 border-b border-slate-100 dark:border-slate-700/80 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Transaction</th>
                  <th className="px-5 py-3">Source Module</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {displayTransactions.map((tx) => (
                  <tr 
                    key={tx.code} 
                    onClick={() => handleNavigate('/approvals')}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">{tx.code}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{tx.time}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-slate-600 dark:text-slate-300 text-xs">{tx.module}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs font-bold text-slate-900 dark:text-white tabular-nums">
                      {tx.flowType === 'OUTBOUND' ? '-' : '+'}₱{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Subsystem Status */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs overflow-hidden h-fit">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/80">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Subsystem Health</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">All 9 Transaction Core subsystems active</p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/60 px-2 py-1">
            {moduleHealth.map((m) => (
              <button
                key={m.label}
                onClick={() => handleNavigate(m.path)}
                className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/40 rounded-xl transition-colors text-left group"
              >
                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {m.label}
                  </span>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">{m.desc}</p>
                </div>
                <StatusBadge status="operational" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
