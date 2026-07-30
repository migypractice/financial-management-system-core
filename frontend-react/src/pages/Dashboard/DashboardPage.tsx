import React from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Landmark,
  ArrowUpRight, CheckCircle, Clock, AlertTriangle,
  BookOpen, CreditCard, Send, PieChart, BarChart2,
  Receipt, Inbox, Activity
} from 'lucide-react';

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
  { label: 'General Ledger', icon: BookOpen, color: 'bg-blue-50 text-blue-600' },
  { label: 'Accounts Payable', icon: CreditCard, color: 'bg-orange-50 text-orange-600' },
  { label: 'Disbursement', icon: Send, color: 'bg-purple-50 text-purple-600' },
  { label: 'Reports', icon: BarChart2, color: 'bg-teal-50 text-teal-600' },
  { label: 'Budget', icon: PieChart, color: 'bg-pink-50 text-pink-600' },
  { label: 'Collections', icon: Inbox, color: 'bg-indigo-50 text-indigo-600' },
  { label: 'Cash Mgmt', icon: Landmark, color: 'bg-green-50 text-green-600' },
  { label: 'Tax', icon: Receipt, color: 'bg-red-50 text-red-600' },
];

const moduleHealth = [
  'General Ledger', 'Accounts Payable', 'Accounts Receivable',
  'Disbursement', 'Collections', 'Budget Mgmt', 'Cash Mgmt', 'Fin. Reports', 'Tax Mgmt',
];

export const DashboardPage: React.FC = () => {
  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Welcome back, Rexseme! 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Here's what's happening in your Transaction Core today.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-md transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #1e3a5f, #1d4ed8)' }}>
          + Add New
        </button>
      </div>

      {/* Analytics Context Note */}
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50/60 rounded-lg border border-blue-100">
        <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-[11px] text-blue-600 font-medium">
          Analytics Module (Under Integration) — Live data is available in AI Approvals and General Ledger. Connected subsystem modules are being integrated by other teams.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.iconBg}`}>
                {kpi.icon}
              </div>
              <ArrowUpRight size={14} className="text-gray-300 mt-1" />
            </div>
            <p className="text-xs text-gray-500 mt-3 font-medium">{kpi.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5 tracking-tight">{kpi.value}</p>
            <p className={`text-[11px] mt-1 font-medium ${kpi.positive ? 'text-green-500' : 'text-red-400'}`}>
              {kpi.change}
            </p>
          </div>
        ))}
      </div>

      {/* Main 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Activity size={15} className="text-blue-500" />
                Recent Transaction Activity
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Latest inbound and outbound financial movements</p>
            </div>
            <button className="text-[11px] text-blue-600 font-semibold hover:underline flex items-center gap-1">
              View All <ArrowUpRight size={11} />
            </button>
          </div>

          {/* Table Header */}
          <div className="px-5 py-2 grid grid-cols-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-gray-50/60">
            <span>Transaction</span>
            <span>Source</span>
            <span>Status</span>
            <span className="text-right">Amount</span>
          </div>

          <div className="divide-y divide-gray-50">
            {recentTransactions.map((tx) => {
              const s = statusConfig[tx.status] || statusConfig['pending_approval'];
              return (
                <div key={tx.code} className="px-5 py-3 grid grid-cols-4 items-center hover:bg-gray-50/60 transition-colors cursor-pointer">
                  <div>
                    <p className="font-mono text-[11px] font-semibold text-gray-800">{tx.code}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{tx.time}</p>
                  </div>
                  <span className="text-[11px] text-gray-500 font-medium">{tx.module}</span>
                  <div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border ${s.bg} ${s.text} ${s.border}`}>
                      {s.icon}
                      {s.label}
                    </span>
                  </div>
                  <span className="text-right font-mono text-xs font-bold text-gray-900">
                    ₱{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Module Status + Quick Access */}
        <div className="space-y-5">

          {/* Module Health */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Module Status</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">All 9 Transaction Core subsystems</p>
            </div>
            <div className="divide-y divide-gray-50 px-2 py-1">
              {moduleHealth.map((m) => (
                <div key={m} className="px-3 py-2 flex items-center justify-between">
                  <span className="text-xs text-gray-700 font-medium">{m}</span>
                  <span className="flex items-center gap-1.5 text-[11px] text-green-600 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Operational
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Access */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Quick Access</h2>
            </div>
            <div className="p-4 grid grid-cols-4 gap-3">
              {quickAccessItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.label} className="flex flex-col items-center gap-1.5 group">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform shadow-sm`}>
                      <Icon size={18} />
                    </div>
                    <span className="text-[9px] font-medium text-gray-500 text-center leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
