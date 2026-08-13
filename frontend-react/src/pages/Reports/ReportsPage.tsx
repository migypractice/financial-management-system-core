import React from 'react';

/**
 * Financial Reporting & Analytics Module
 * Provides Income Statement (P&L), Balance Sheet summary, and AI insights.
 */

export const ReportsPage: React.FC = () => {
  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Financial Reporting & Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Automated P&L, Balance Sheet summaries, and AI-driven insights.</p>
        </div>
        <button
          onClick={() => window.print()}
          className="print:hidden px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
        >
          Export Full Report (PDF)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Statements */}
        <div className="lg:col-span-2 space-y-6">
          {/* Income Statement Summary */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-150 dark:border-slate-700 overflow-hidden">
             <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-700/30">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Income Statement (MTD)</h2>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium bg-white dark:bg-slate-800 px-2 py-1 rounded border border-gray-200 dark:border-slate-600">July 2026</span>
             </div>
             <div className="p-5 space-y-4 text-sm">
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-2">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Gross Revenue</span>
                  <span className="font-mono text-slate-900 dark:text-white">PHP 28,900,000.00</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-2 pl-4">
                  <span className="text-slate-600 dark:text-slate-400">Less: Cost of Goods Sold (COGS)</span>
                  <span className="font-mono text-slate-600 dark:text-slate-400">(PHP 6,850,000.00)</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-2">
                  <span className="font-semibold text-slate-900 dark:text-white">Gross Profit</span>
                  <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">PHP 22,050,000.00</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-2 pl-4">
                  <span className="text-slate-600 dark:text-slate-400">Operating Expenses</span>
                  <span className="font-mono text-slate-600 dark:text-slate-400">(PHP 4,490,200.00)</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold text-slate-900 dark:text-white">Net Income</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 border-double border-b-4 border-emerald-200 dark:border-emerald-800">PHP 17,559,800.00</span>
                </div>
             </div>
          </div>

           {/* Balance Sheet Summary */}
           <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-150 dark:border-slate-700 overflow-hidden">
             <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Balance Sheet Summary</h2>
             </div>
             <div className="p-5 grid grid-cols-2 gap-8 text-sm">
                <div>
                   <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 border-b border-slate-200 dark:border-slate-700 pb-1">Assets</h3>
                   <div className="space-y-2">
                     <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Current Assets</span><span className="font-mono text-slate-900 dark:text-white">16,340,800.00</span></div>
                     <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Fixed Assets</span><span className="font-mono text-slate-900 dark:text-white">45,200,000.00</span></div>
                     <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-700 font-bold"><span className="text-slate-900 dark:text-white">Total Assets</span><span className="font-mono text-emerald-700 dark:text-emerald-400">61,540,800.00</span></div>
                   </div>
                </div>
                <div>
                   <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 border-b border-slate-200 dark:border-slate-700 pb-1">Liabilities & Equity</h3>
                   <div className="space-y-2">
                     <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Current Liabilities</span><span className="font-mono text-slate-900 dark:text-white">2,150,400.00</span></div>
                     <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Long-term Debt</span><span className="font-mono text-slate-900 dark:text-white">15,000,000.00</span></div>
                     <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Total Equity</span><span className="font-mono text-slate-900 dark:text-white">44,390,400.00</span></div>
                     <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-700 font-bold"><span className="text-slate-900 dark:text-white">Total L & E</span><span className="font-mono text-emerald-700 dark:text-emerald-400">61,540,800.00</span></div>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Right Column: AI Insights + Key Ratios */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-150 dark:border-slate-700 p-5 bg-gradient-to-br from-indigo-50/50 dark:from-indigo-900/20 to-white dark:to-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">✨</span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">AI Financial Insights</h2>
            </div>
            <ul className="space-y-4 text-xs text-slate-600 dark:text-slate-400">
              <li className="flex gap-3">
                <span className="text-emerald-500 mt-0.5">●</span>
                <span><strong className="text-slate-800 dark:text-slate-200">Healthy Cash Flow:</strong> Net cash flow is positive (PHP 1.14M). Operating reserves are sufficient for the next 4.2 months of projected expenses.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-red-500 mt-0.5">●</span>
                <span><strong className="text-slate-800 dark:text-slate-200">Budget Warning:</strong> Supply Chain department has utilized 72.8% of their Q3 budget. At current run-rate, they will exceed allocation by Aug 15.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-amber-500 mt-0.5">●</span>
                <span><strong className="text-slate-800 dark:text-slate-200">Anomaly Trend:</strong> Detected a 15% increase in AI-flagged high-value supplier invoices this week compared to a 3-month rolling average.</span>
              </li>
            </ul>
          </div>

          {/* Key Financial Ratios — computed from the statements above */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-150 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Key Financial Ratios</h2>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Gross Margin</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">76.3%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Net Margin</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">60.8%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Current Ratio</span>
                <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">7.60x</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Debt-to-Equity</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">0.39x</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
