import React from 'react';

export const GeneralLedgerPage: React.FC = () => {
  const chartOfAccounts = [
    { code: '1000-CASH', name: 'Cash and Cash Equivalents', type: 'Asset', sub: 'GL', balance: 'PHP 12,450,800.00' },
    { code: '1100-AR', name: 'Accounts Receivable Trade', type: 'Asset', sub: 'AR', balance: 'PHP 3,890,000.00' },
    { code: '2100-AP', name: 'Accounts Payable Trade Suppliers', type: 'Liability', sub: 'AP', balance: 'PHP 2,150,400.00' },
    { code: '4000-REV', name: 'E-Commerce Sales Revenue', type: 'Revenue', sub: 'GL', balance: 'PHP 28,900,000.00' },
    { code: '5100-EXP', name: 'Salaries & Executive Compensation', type: 'Expense', sub: 'GL', balance: 'PHP 8,450,000.00' },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between pb-6 border-b border-gray-200 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">General Ledger (GL) & Chart of Accounts</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time double-entry account balances and posted journal entries.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase border-b border-gray-200 font-semibold">
            <tr>
              <th className="p-4">Account Code</th>
              <th className="p-4">Account Title</th>
              <th className="p-4">Category Type</th>
              <th className="p-4">Sub-Ledger</th>
              <th className="p-4 text-right">Current Ledger Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium">
            {chartOfAccounts.map((acc) => (
              <tr key={acc.code} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-mono font-bold text-slate-900">{acc.code}</td>
                <td className="p-4 text-slate-800">{acc.name}</td>
                <td className="p-4">
                  <span className="px-2.5 py-0.5 rounded-full text-slate-700 bg-slate-100">
                    {acc.type}
                  </span>
                </td>
                <td className="p-4 text-slate-500 font-mono">{acc.sub}</td>
                <td className="p-4 text-right font-mono font-bold text-slate-900">{acc.balance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GeneralLedgerPage;
