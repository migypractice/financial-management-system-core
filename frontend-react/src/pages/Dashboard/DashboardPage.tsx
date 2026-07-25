import React from 'react';
import StatCard from '../../components/ui/StatCard';

/**
 * Executive Overview Dashboard
 * Displays high-level KPIs, real-time transaction activity, and system health at a glance.
 */
export const DashboardPage: React.FC = () => {
  const recentTransactions = [
    { code: 'TXN-2026-8801', module: 'SUPPLY_CHAIN', amount: 685000, status: 'ai_flagged', time: '2 min ago' },
    { code: 'TXN-2026-8802', module: 'HRMS', amount: 145000, status: 'pending_approval', time: '18 min ago' },
    { code: 'TXN-2026-8803', module: 'ECOMMERCE_CORE', amount: 45000, status: 'pending_approval', time: '35 min ago' },
    { code: 'TXN-2026-8804', module: 'FLEET', amount: 12800, status: 'approved', time: '1 hr ago' },
    { code: 'TXN-2026-8805', module: 'FACILITIES_LEGAL', amount: 95000, status: 'posted', time: '2 hrs ago' },
  ];

  const statusStyle: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    ai_flagged:       { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'AI Flagged' },
    pending_approval: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Pending' },
    approved:         { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Approved' },
    posted:           { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Posted' },
  };

  const moduleHealth = [
    { name: 'General Ledger', status: 'Operational', color: 'bg-emerald-500' },
    { name: 'Accounts Payable', status: 'Operational', color: 'bg-emerald-500' },
    { name: 'Accounts Receivable', status: 'Operational', color: 'bg-emerald-500' },
    { name: 'Disbursement Mgmt', status: 'Operational', color: 'bg-emerald-500' },
    { name: 'Collection Mgmt', status: 'Operational', color: 'bg-emerald-500' },
    { name: 'Budget Management', status: 'Operational', color: 'bg-emerald-500' },
    { name: 'Cash Management', status: 'Operational', color: 'bg-emerald-500' },
    { name: 'Financial Reports', status: 'Operational', color: 'bg-emerald-500' },
    { name: 'Tax Management', status: 'Operational', color: 'bg-emerald-500' },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-full space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Overview Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Financial Management System — Transaction Core real-time summary.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue (MTD)" value="PHP 28,900,000" change="12.4%" isPositive accentColor="bg-emerald-500" subtitle="vs last month" />
        <StatCard title="Total Expenses (MTD)" value="PHP 11,340,200" change="3.1%" isPositive={false} accentColor="bg-red-500" subtitle="vs last month" />
        <StatCard title="Net Income" value="PHP 17,559,800" change="18.7%" isPositive accentColor="bg-blue-500" subtitle="vs last month" />
        <StatCard title="Cash Position" value="PHP 12,450,800" change="5.2%" isPositive accentColor="bg-amber-500" subtitle="across all banks" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent transactions */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-150 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-slate-900">Recent Transaction Activity</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Latest inbound and outbound financial movements</p>
          </div>
          <div className="divide-y divide-gray-100">
            {recentTransactions.map((tx) => {
              const s = statusStyle[tx.status] || statusStyle['pending_approval'];
              return (
                <div key={tx.code} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-semibold text-slate-700">{tx.code}</span>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">{tx.module}</span>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${s.bg} ${s.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                      PHP {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[11px] text-slate-400 w-16 text-right">{tx.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Module health */}
        <div className="bg-white rounded-xl border border-gray-150 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-slate-900">Module Status</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">All 9 Transaction Core subsystems</p>
          </div>
          <div className="divide-y divide-gray-50">
            {moduleHealth.map((m) => (
              <div key={m.name} className="px-5 py-2.5 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700">{m.name}</span>
                <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                  <span className={`w-1.5 h-1.5 rounded-full ${m.color}`} />
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
