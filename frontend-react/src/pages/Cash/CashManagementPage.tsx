import React from 'react';
import StatCard from '../../components/ui/StatCard';

/**
 * Cash Management Module
 * Tracks multi-bank liquidity positions, daily cash flow, and bank reconciliation.
 */

export const CashManagementPage: React.FC = () => {
  const bankAccounts = [
    { id: 'bnk-1', bank: 'BDO Corporate', type: 'Operating', acctNum: '**** 8821', balance: 8450000, status: 'Reconciled' },
    { id: 'bnk-2', bank: 'BPI Trade', type: 'AP/Payroll', acctNum: '**** 0092', balance: 2150000, status: 'Reconciled' },
    { id: 'bnk-3', bank: 'UnionBank', type: 'E-Commerce Receivables', acctNum: '**** 1122', balance: 1420800, status: 'Pending Recon' },
    { id: 'bnk-4', bank: 'Metrobank', type: 'Operating Reserve', acctNum: '**** 4410', balance: 430000, status: 'Reconciled' },
  ];

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Cash Management</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Corporate treasury, multi-bank liquidity positions, and daily reconciliation.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Cash Equivalents" value="PHP 12,450,800" accentColor="bg-blue-500" subtitle="Across 4 bank accounts" />
        <StatCard title="Inflow (Today)" value="PHP 1,990,000" accentColor="bg-emerald-500" isPositive={true} />
        <StatCard title="Outflow (Today)" value="PHP 845,000" accentColor="bg-red-500" isPositive={false} />
        <StatCard title="Net Cash Flow" value="PHP 1,145,000" accentColor="bg-emerald-500" isPositive={true} />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-150 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Bank Account Balances</h2>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">As of {new Date().toLocaleDateString()}</span>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 dark:bg-slate-700/50 text-[11px] text-slate-500 dark:text-slate-400 uppercase border-b border-gray-200 dark:border-slate-600 font-semibold tracking-wider">
            <tr>
              <th className="px-5 py-3">Bank Name</th>
              <th className="px-5 py-3">Account Type</th>
              <th className="px-5 py-3">Account Number</th>
              <th className="px-5 py-3">Reconciliation Status</th>
              <th className="px-5 py-3 text-right">Ledger Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {bankAccounts.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">{b.bank}</td>
                <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">{b.type}</td>
                <td className="px-5 py-3.5 font-mono text-slate-500 dark:text-slate-400">{b.acctNum}</td>
                <td className="px-5 py-3.5">
                   <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                     b.status === 'Reconciled' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                   }`}>
                     <span className={`w-1.5 h-1.5 rounded-full ${b.status === 'Reconciled' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                     {b.status}
                   </span>
                </td>
                <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                  PHP {b.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CashManagementPage;
