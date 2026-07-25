import React from 'react';

/**
 * Financial Reporting & Analytics Module
 * Provides Income Statement (P&L), Balance Sheet summary, and AI insights.
 */

export const ReportsPage: React.FC = () => {
  return (
    <div className="p-6 bg-slate-50 min-h-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Financial Reporting & Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Automated P&L, Balance Sheet summaries, and AI-driven insights.</p>
        </div>
        <button className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors">
          Export Full Report (PDF)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Statements */}
        <div className="lg:col-span-2 space-y-6">
          {/* Income Statement Summary */}
          <div className="bg-white rounded-xl border border-gray-150 overflow-hidden">
             <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-sm font-semibold text-slate-900">Income Statement (MTD)</h2>
                <span className="text-[11px] text-slate-500 font-medium bg-white px-2 py-1 rounded border border-gray-200">July 2026</span>
             </div>
             <div className="p-5 space-y-4 text-sm">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="font-medium text-slate-700">Gross Revenue</span>
                  <span className="font-mono text-slate-900">PHP 28,900,000.00</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-2 pl-4">
                  <span className="text-slate-600">Less: Cost of Goods Sold (COGS)</span>
                  <span className="font-mono text-slate-600">(PHP 6,850,000.00)</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="font-semibold text-slate-900">Gross Profit</span>
                  <span className="font-mono font-semibold text-emerald-700">PHP 22,050,000.00</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-2 pl-4">
                  <span className="text-slate-600">Operating Expenses</span>
                  <span className="font-mono text-slate-600">(PHP 4,490,200.00)</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold text-slate-900">Net Income</span>
                  <span className="font-mono font-bold text-emerald-600 border-double border-b-4 border-emerald-200">PHP 17,559,800.00</span>
                </div>
             </div>
          </div>
          
           {/* Balance Sheet Summary */}
           <div className="bg-white rounded-xl border border-gray-150 overflow-hidden">
             <div className="px-5 py-4 border-b border-gray-100 bg-slate-50/50">
                <h2 className="text-sm font-semibold text-slate-900">Balance Sheet Summary</h2>
             </div>
             <div className="p-5 grid grid-cols-2 gap-8 text-sm">
                <div>
                   <h3 className="font-semibold text-slate-800 mb-3 border-b border-slate-200 pb-1">Assets</h3>
                   <div className="space-y-2">
                     <div className="flex justify-between"><span className="text-slate-600">Current Assets</span><span className="font-mono text-slate-900">16,340,800.00</span></div>
                     <div className="flex justify-between"><span className="text-slate-600">Fixed Assets</span><span className="font-mono text-slate-900">45,200,000.00</span></div>
                     <div className="flex justify-between pt-2 border-t border-slate-100 font-bold"><span className="text-slate-900">Total Assets</span><span className="font-mono text-emerald-700">61,540,800.00</span></div>
                   </div>
                </div>
                <div>
                   <h3 className="font-semibold text-slate-800 mb-3 border-b border-slate-200 pb-1">Liabilities & Equity</h3>
                   <div className="space-y-2">
                     <div className="flex justify-between"><span className="text-slate-600">Current Liabilities</span><span className="font-mono text-slate-900">2,150,400.00</span></div>
                     <div className="flex justify-between"><span className="text-slate-600">Long-term Debt</span><span className="font-mono text-slate-900">15,000,000.00</span></div>
                     <div className="flex justify-between"><span className="text-slate-600">Total Equity</span><span className="font-mono text-slate-900">44,390,400.00</span></div>
                     <div className="flex justify-between pt-2 border-t border-slate-100 font-bold"><span className="text-slate-900">Total L & E</span><span className="font-mono text-emerald-700">61,540,800.00</span></div>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Right Column: AI Insights */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-150 p-5 bg-gradient-to-br from-indigo-50/50 to-white">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600">✨</span>
              <h2 className="text-sm font-bold text-slate-900">AI Financial Insights</h2>
            </div>
            <ul className="space-y-4 text-xs text-slate-600">
              <li className="flex gap-3">
                <span className="text-emerald-500 mt-0.5">●</span>
                <span><strong className="text-slate-800">Healthy Cash Flow:</strong> Net cash flow is positive (PHP 1.14M). Operating reserves are sufficient for the next 4.2 months of projected expenses.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-red-500 mt-0.5">●</span>
                <span><strong className="text-slate-800">Budget Warning:</strong> Supply Chain department has utilized 72.8% of their Q3 budget. At current run-rate, they will exceed allocation by Aug 15.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-amber-500 mt-0.5">●</span>
                <span><strong className="text-slate-800">Anomaly Trend:</strong> Detected a 15% increase in AI-flagged high-value supplier invoices this week compared to a 3-month rolling average.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
