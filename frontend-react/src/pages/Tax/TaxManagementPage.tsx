import React from 'react';
import StatCard from '../../components/ui/StatCard';

/**
 * Tax Management Module
 * Tracks Output VAT, Input VAT, Withholding Taxes, and Compliance.
 */

export const TaxManagementPage: React.FC = () => {
  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Tax Management</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Value Added Tax (VAT) tracking, withholding schedules, and compliance reporting.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Output VAT (Sales)" value="PHP 3,468,000" accentColor="bg-emerald-500" subtitle="12% on E-Com Sales" />
        <StatCard title="Total Input VAT (Purchases)" value="PHP 1,360,824" accentColor="bg-amber-500" subtitle="Claimable credits" />
        <StatCard title="Net VAT Payable" value="PHP 2,107,176" accentColor="bg-red-500" subtitle="Due end of quarter" />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-150 dark:border-slate-700 overflow-hidden">
         <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-700/30">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Withholding Tax (WHT) Summary</h2>
            <button className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">View BIR Forms &rarr;</button>
         </div>
         <table className="w-full text-left text-xs">
          <thead className="bg-white dark:bg-slate-800 text-[11px] text-slate-500 dark:text-slate-400 uppercase border-b border-gray-200 dark:border-slate-600 font-semibold tracking-wider">
            <tr>
              <th className="px-5 py-3">Tax Code</th>
              <th className="px-5 py-3">Description</th>
              <th className="px-5 py-3 text-center">Rate</th>
              <th className="px-5 py-3 text-right">Tax Base (PHP)</th>
              <th className="px-5 py-3 text-right">Amount Withheld (PHP)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
              <td className="px-5 py-3.5 font-mono font-semibold text-slate-700 dark:text-slate-300">WC158</td>
              <td className="px-5 py-3.5 text-slate-800 dark:text-slate-200">Professional/Consultancy Fees</td>
              <td className="px-5 py-3.5 text-center font-mono text-slate-700 dark:text-slate-300">10%</td>
              <td className="px-5 py-3.5 text-right font-mono text-slate-600 dark:text-slate-400 tabular-nums">450,000.00</td>
              <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">45,000.00</td>
            </tr>
            <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
              <td className="px-5 py-3.5 font-mono font-semibold text-slate-700 dark:text-slate-300">WC160</td>
              <td className="px-5 py-3.5 text-slate-800 dark:text-slate-200">Rental of Real/Personal Properties</td>
              <td className="px-5 py-3.5 text-center font-mono text-slate-700 dark:text-slate-300">5%</td>
              <td className="px-5 py-3.5 text-right font-mono text-slate-600 dark:text-slate-400 tabular-nums">800,000.00</td>
              <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">40,000.00</td>
            </tr>
            <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
              <td className="px-5 py-3.5 font-mono font-semibold text-slate-700 dark:text-slate-300">WC120</td>
              <td className="px-5 py-3.5 text-slate-800 dark:text-slate-200">Payments to Contractors</td>
              <td className="px-5 py-3.5 text-center font-mono text-slate-700 dark:text-slate-300">2%</td>
              <td className="px-5 py-3.5 text-right font-mono text-slate-600 dark:text-slate-400 tabular-nums">2,450,000.00</td>
              <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">49,000.00</td>
            </tr>
            <tr className="bg-slate-50 dark:bg-slate-700/50 font-bold">
              <td colSpan={4} className="px-5 py-3 text-right text-slate-700 dark:text-slate-300">Total WHT Payable:</td>
              <td className="px-5 py-3 text-right font-mono text-slate-900 dark:text-white tabular-nums border-double border-b-4 border-slate-300 dark:border-slate-600">134,000.00</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Filing Deadlines */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-150 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Upcoming Filing Deadlines</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700 text-sm">
            <div className="px-5 py-3.5 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">BIR Form 2550M — Monthly VAT</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Covers July 2026</p>
              </div>
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-full px-2.5 py-1">Aug 20</span>
            </div>
            <div className="px-5 py-3.5 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">BIR Form 1601-EQ — Quarterly WHT</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Q3 2026</p>
              </div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full px-2.5 py-1">Oct 31</span>
            </div>
            <div className="px-5 py-3.5 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">BIR Form 1702-RT — Annual ITR</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">FY 2026</p>
              </div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full px-2.5 py-1">Apr 15, 2027</span>
            </div>
          </div>
        </div>

        {/* Compliance Status */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-150 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Compliance Status</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700 text-sm">
            <div className="px-5 py-3.5 flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300">June 2026 VAT Return</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Filed</span>
            </div>
            <div className="px-5 py-3.5 flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300">Q2 2026 WHT Return</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Filed</span>
            </div>
            <div className="px-5 py-3.5 flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300">July 2026 VAT Return</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Due Aug 20</span>
            </div>
            <div className="px-5 py-3.5 flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300">FY 2026 Annual ITR</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400"><span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />Not yet due</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxManagementPage;
