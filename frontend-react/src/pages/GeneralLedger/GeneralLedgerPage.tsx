import React from 'react';

const ACCOUNT_TYPE_STYLES: Record<string, string> = {
  Asset:     'bg-blue-50 text-blue-700',
  Liability: 'bg-amber-50 text-amber-700',
  Revenue:   'bg-emerald-50 text-emerald-700',
  Expense:   'bg-red-50 text-red-700',
  Equity:    'bg-purple-50 text-purple-700',
};

export const GeneralLedgerPage: React.FC = () => {
  const chartOfAccounts = [
    { code: '1000-CASH', name: 'Cash and Cash Equivalents',        type: 'Asset',     sub: 'GL', balance: 12_450_800.00 },
    { code: '1100-AR',   name: 'Accounts Receivable Trade',        type: 'Asset',     sub: 'AR', balance: 3_890_000.00 },
    { code: '2100-AP',   name: 'Accounts Payable Trade Suppliers', type: 'Liability', sub: 'AP', balance: 2_150_400.00 },
    { code: '4000-REV',  name: 'E-Commerce Sales Revenue',         type: 'Revenue',   sub: 'GL', balance: 28_900_000.00 },
    { code: '5100-EXP',  name: 'Salaries and Compensation',        type: 'Expense',   sub: 'GL', balance: 8_450_000.00 },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-5 border-b border-gray-200 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Chart of Accounts</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time double-entry account balances and posted journal entries.
          </p>
        </div>
        <span className="text-[11px] font-medium text-slate-400 tabular-nums">
          {chartOfAccounts.length} accounts
        </span>
      </div>

      {/* Accounts table */}
      <div className="bg-white rounded-xl border border-gray-150 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 text-[11px] text-slate-500 uppercase border-b border-gray-200 font-semibold tracking-wider">
            <tr>
              <th className="px-5 py-3">Code</th>
              <th className="px-5 py-3">Account Title</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Sub-Ledger</th>
              <th className="px-5 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {chartOfAccounts.map((acc) => (
              <tr key={acc.code} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-3.5 font-mono font-bold text-slate-900 text-[13px]">{acc.code}</td>
                <td className="px-5 py-3.5 text-slate-700 font-medium">{acc.name}</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${ACCOUNT_TYPE_STYLES[acc.type] || 'bg-slate-100 text-slate-600'}`}>
                    {acc.type}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-slate-400 font-mono">{acc.sub}</td>
                <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                  PHP {acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GeneralLedgerPage;
