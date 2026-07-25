import React from 'react';
import StatCard from '../../components/ui/StatCard';

/**
 * Tax Management Module
 * Tracks Output VAT, Input VAT, Withholding Taxes, and Compliance.
 */

export const TaxManagementPage: React.FC = () => {
  return (
    <div className="p-6 bg-slate-50 min-h-full space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Tax Management</h1>
        <p className="text-sm text-slate-500 mt-0.5">Value Added Tax (VAT) tracking, withholding schedules, and compliance reporting.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Output VAT (Sales)" value="PHP 3,468,000" accentColor="bg-emerald-500" subtitle="12% on E-Com Sales" />
        <StatCard title="Total Input VAT (Purchases)" value="PHP 1,360,824" accentColor="bg-amber-500" subtitle="Claimable credits" />
        <StatCard title="Net VAT Payable" value="PHP 2,107,176" accentColor="bg-red-500" subtitle="Due end of quarter" />
      </div>

      <div className="bg-white rounded-xl border border-gray-150 overflow-hidden">
         <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-sm font-semibold text-slate-900">Withholding Tax (WHT) Summary</h2>
            <button className="text-xs font-semibold text-blue-600 hover:text-blue-700">View BIR Forms &rarr;</button>
         </div>
         <table className="w-full text-left text-xs">
          <thead className="bg-white text-[11px] text-slate-500 uppercase border-b border-gray-200 font-semibold tracking-wider">
            <tr>
              <th className="px-5 py-3">Tax Code</th>
              <th className="px-5 py-3">Description</th>
              <th className="px-5 py-3 text-center">Rate</th>
              <th className="px-5 py-3 text-right">Tax Base (PHP)</th>
              <th className="px-5 py-3 text-right">Amount Withheld (PHP)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr className="hover:bg-slate-50/60 transition-colors">
              <td className="px-5 py-3.5 font-mono font-semibold text-slate-700">WC158</td>
              <td className="px-5 py-3.5 text-slate-800">Professional/Consultancy Fees</td>
              <td className="px-5 py-3.5 text-center font-mono">10%</td>
              <td className="px-5 py-3.5 text-right font-mono text-slate-600 tabular-nums">450,000.00</td>
              <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 tabular-nums">45,000.00</td>
            </tr>
            <tr className="hover:bg-slate-50/60 transition-colors">
              <td className="px-5 py-3.5 font-mono font-semibold text-slate-700">WC160</td>
              <td className="px-5 py-3.5 text-slate-800">Rental of Real/Personal Properties</td>
              <td className="px-5 py-3.5 text-center font-mono">5%</td>
              <td className="px-5 py-3.5 text-right font-mono text-slate-600 tabular-nums">800,000.00</td>
              <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 tabular-nums">40,000.00</td>
            </tr>
            <tr className="hover:bg-slate-50/60 transition-colors">
              <td className="px-5 py-3.5 font-mono font-semibold text-slate-700">WC120</td>
              <td className="px-5 py-3.5 text-slate-800">Payments to Contractors</td>
              <td className="px-5 py-3.5 text-center font-mono">2%</td>
              <td className="px-5 py-3.5 text-right font-mono text-slate-600 tabular-nums">2,450,000.00</td>
              <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 tabular-nums">49,000.00</td>
            </tr>
            <tr className="bg-slate-50 font-bold">
              <td colSpan={4} className="px-5 py-3 text-right text-slate-700">Total WHT Payable:</td>
              <td className="px-5 py-3 text-right font-mono text-slate-900 tabular-nums border-double border-b-4 border-slate-300">134,000.00</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TaxManagementPage;
