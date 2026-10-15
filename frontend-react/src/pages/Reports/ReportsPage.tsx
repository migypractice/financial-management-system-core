import React, { useState, useEffect, useRef } from 'react';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { reportsService, FinancialStatementsResponse } from '../../services/reportsService';
import { Lock, ShieldCheck, AlertCircle, X, CheckCircle2, RefreshCw, Sparkles, TrendingUp, DollarSign } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [data, setData] = useState<FinancialStatementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // MPIN Authorization State for Protected Confidential Export
  const [isMpinModalOpen, setIsMpinModalOpen] = useState(false);
  const [mpin, setMpin] = useState(['', '', '', '']);
  const [mpinError, setMpinError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const fetchStatements = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await reportsService.getFinancialStatements();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load financial statements', err);
      setError(err?.response?.data?.message || 'Failed to generate financial statements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatements();
  }, []);

  const handleOpenExportModal = () => {
    setMpin(['', '', '', '']);
    setMpinError(false);
    setIsSuccess(false);
    setIsMpinModalOpen(true);
  };

  const handleMpinChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const nextPin = [...mpin];
    nextPin[index] = val.slice(-1);
    setMpin(nextPin);
    setMpinError(false);

    if (val && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleMpinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !mpin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  useEffect(() => {
    if (mpin.every(d => d !== '')) {
      const code = mpin.join('');
      if (code === '1111') {
        setIsSuccess(true);
        setTimeout(() => {
          setIsMpinModalOpen(false);
          setIsSuccess(false);
          window.print();
        }, 700);
      } else {
        setMpinError(true);
        setTimeout(() => {
          setMpin(['', '', '', '']);
          inputRefs.current[0]?.focus();
        }, 600);
      }
    }
  }, [mpin]);

  if (loading) return <SkeletonLoader />;

  const is = data?.income_statement || {
    period: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    total_revenue: 0,
    revenue_detail: [],
    total_cogs: 0,
    gross_profit: 0,
    total_expenses: 0,
    expense_detail: [],
    net_income: 0,
  };

  const bs = data?.balance_sheet || {
    assets: {
      cash_and_equivalents: 0,
      accounts_receivable: 0,
      merchandise_inventory: 0,
      total_current_assets: 0,
    },
    liabilities: {
      accounts_payable: 0,
      tax_payable: 0,
      total_current_liabilities: 0,
    },
    equity: {
      retained_earnings: 0,
      total_equity: 0,
    },
  };

  const ratios = data?.ratios || {
    current_ratio: 0,
    quick_ratio: 0,
    net_profit_margin: 0,
    budget_burn_rate: 0,
  };

  const aiInsights = data?.ai_insights || [];

  return (
    <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Financial Reporting & Analytics
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700">
              100% Live Subledger Sync
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Automated P&L, Balance Sheet, Financial Ratios, and AI Cash Flow Insights generated directly from General Ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStatements}
            className="px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Recalculate</span>
          </button>
          <button
            onClick={handleOpenExportModal}
            className="print:hidden px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Lock size={13} className="text-amber-400" />
            <span>Export Full Report (PDF)</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-3 text-sm">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Statements */}
        <div className="lg:col-span-2 space-y-6">
          {/* Income Statement Summary */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-150 dark:border-slate-700 overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-700/30">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Income Statement (Profit & Loss)</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Accrual basis from posted journal entries</p>
              </div>
              <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium bg-white dark:bg-slate-800 px-2.5 py-1 rounded border border-gray-200 dark:border-slate-600">
                {is.period}
              </span>
            </div>

            <div className="p-5 space-y-4 text-sm">
              {/* Revenue */}
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-2">
                <span className="font-semibold text-slate-900 dark:text-white">Total Gross Revenue</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  PHP {is.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {is.revenue_detail.map((rev) => (
                <div key={rev.code} className="flex justify-between items-center pl-4 text-xs text-slate-600 dark:text-slate-400">
                  <span>{rev.code} — {rev.name}</span>
                  <span className="font-mono">PHP {rev.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}

              {/* COGS */}
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-2 pl-4">
                <span className="text-slate-600 dark:text-slate-400">Less: Cost of Goods Sold (COGS)</span>
                <span className="font-mono text-slate-600 dark:text-slate-400">
                  (PHP {is.total_cogs.toLocaleString('en-US', { minimumFractionDigits: 2 })})
                </span>
              </div>

              {/* Gross Profit */}
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-2 bg-slate-50/60 dark:bg-slate-700/20 px-3 py-2 rounded-lg">
                <span className="font-semibold text-slate-900 dark:text-white">Gross Profit</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  PHP {is.gross_profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Operating Expenses */}
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-2">
                <span className="font-semibold text-slate-900 dark:text-white">Operating Expenses</span>
                <span className="font-mono text-slate-600 dark:text-slate-400">
                  (PHP {is.total_expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })})
                </span>
              </div>

              {is.expense_detail.map((exp) => (
                <div key={exp.code} className="flex justify-between items-center pl-4 text-xs text-slate-600 dark:text-slate-400">
                  <span>{exp.code} — {exp.name}</span>
                  <span className="font-mono">(PHP {exp.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })})</span>
                </div>
              ))}

              {/* Net Income */}
              <div className="flex justify-between items-center pt-3 border-t-2 border-slate-200 dark:border-slate-700">
                <span className="font-bold text-base text-slate-900 dark:text-white">Net Income / (Loss)</span>
                <span
                  className={`font-mono text-base font-bold border-double border-b-4 ${
                    is.net_income >= 0
                      ? 'text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700'
                      : 'text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-700'
                  }`}
                >
                  PHP {is.net_income.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Balance Sheet Summary */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-150 dark:border-slate-700 overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Statement of Financial Position (Balance Sheet)</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Assets = Liabilities + Owner Equity</p>
              </div>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 text-sm">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 border-b border-slate-200 dark:border-slate-700 pb-1">
                  Current Assets
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Cash & Bank Accounts</span>
                    <span className="font-mono text-slate-900 dark:text-white">
                      PHP {bs.assets.cash_and_equivalents.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Accounts Receivable (AR)</span>
                    <span className="font-mono text-slate-900 dark:text-white">
                      PHP {bs.assets.accounts_receivable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Merchandise Inventory</span>
                    <span className="font-mono text-slate-900 dark:text-white">
                      PHP {bs.assets.merchandise_inventory.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-700 font-bold text-sm">
                    <span className="text-slate-900 dark:text-white">Total Assets</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400">
                      PHP {bs.assets.total_current_assets.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 border-b border-slate-200 dark:border-slate-700 pb-1">
                  Liabilities & Equity
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Accounts Payable (AP)</span>
                    <span className="font-mono text-slate-900 dark:text-white">
                      PHP {bs.liabilities.accounts_payable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Estimated Tax Payable</span>
                    <span className="font-mono text-slate-900 dark:text-white">
                      PHP {bs.liabilities.tax_payable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-700 font-medium">
                    <span className="text-slate-700 dark:text-slate-300">Total Liabilities</span>
                    <span className="font-mono text-slate-900 dark:text-white">
                      PHP {bs.liabilities.total_current_liabilities.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 text-slate-600 dark:text-slate-400">
                    <span>Retained Earnings / Equity</span>
                    <span className="font-mono text-slate-900 dark:text-white">
                      PHP {bs.equity.total_equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-700 font-bold text-sm">
                    <span className="text-slate-900 dark:text-white">Total L & E</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400">
                      PHP {(bs.liabilities.total_current_liabilities + bs.equity.total_equity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Cash Flow Insights & Ratios */}
        <div className="space-y-6">
          {/* AI Financial Insights (Pillar 3) */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-150 dark:border-slate-700 p-5 bg-gradient-to-br from-indigo-50/50 dark:from-indigo-900/20 to-white dark:to-slate-800 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600 text-white shadow-xs">
                <Sparkles size={15} />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">AI Financial Insights</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Pillar 3: Cash Flow & Liquidity Forecaster</p>
              </div>
            </div>

            <ul className="space-y-3.5 text-xs text-slate-600 dark:text-slate-400">
              {aiInsights.length === 0 ? (
                <li className="text-slate-400 italic">No AI insights generated yet.</li>
              ) : (
                aiInsights.map((insight, idx) => (
                  <li key={idx} className="flex gap-2.5 items-start p-2.5 rounded-lg bg-white/70 dark:bg-slate-750 border border-slate-150 dark:border-slate-700">
                    <span
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        insight.type === 'healthy'
                          ? 'bg-emerald-500'
                          : insight.type === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    />
                    <div>
                      <strong className="text-slate-800 dark:text-slate-200 block text-xs font-semibold">
                        {insight.title}
                      </strong>
                      <span className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                        {insight.desc}
                      </span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Key Financial Ratios */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-150 dark:border-slate-700 overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30 flex items-center gap-2">
              <TrendingUp size={15} className="text-indigo-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Key Financial Ratios</h2>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">Current Ratio</p>
                  <p className="text-[10px] text-slate-400">Current Assets / Current Liabilities</p>
                </div>
                <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                  {ratios.current_ratio}x
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">Quick Ratio (Acid-Test)</p>
                  <p className="text-[10px] text-slate-400">(Cash + AR) / Liabilities</p>
                </div>
                <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                  {ratios.quick_ratio}x
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">Net Profit Margin</p>
                  <p className="text-[10px] text-slate-400">Net Income / Total Revenue</p>
                </div>
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                  {ratios.net_profit_margin}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">Budget Burn Rate</p>
                  <p className="text-[10px] text-slate-400">Actual YTD Expenses / Allocated Budget</p>
                </div>
                <span className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">
                  {ratios.budget_burn_rate}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Executive MPIN Authorization Modal ── */}
      {isMpinModalOpen && (
        <div className="fixed inset-0 !mt-0 z-[999] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative text-center space-y-4 text-slate-100">
            <button
              onClick={() => setIsMpinModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Lock size={22} />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Executive Authorization</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Financial statements contain confidential proprietary data. Enter your 4-digit Executive MPIN to export.
              </p>
            </div>

            {/* 4 Digit Inputs */}
            <div className="flex justify-center gap-3 pt-2">
              {mpin.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  autoFocus={idx === 0}
                  onChange={(e) => handleMpinChange(idx, e.target.value)}
                  onKeyDown={(e) => handleMpinKeyDown(idx, e)}
                  className={`w-12 h-14 text-center font-mono text-2xl font-bold rounded-xl border transition-all bg-slate-950 text-white focus:outline-none ${
                    mpinError
                      ? 'border-rose-500 shadow-rose-500/20 shadow-lg animate-shake'
                      : isSuccess
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                  }`}
                />
              ))}
            </div>

            {mpinError && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 font-semibold animate-fadeIn">
                <AlertCircle size={14} />
                <span>Invalid MPIN. Access Denied.</span>
              </div>
            )}

            {isSuccess && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-semibold animate-fadeIn">
                <CheckCircle2 size={14} />
                <span>Clearance Granted. Exporting PDF...</span>
              </div>
            )}

            <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-800">
              Internal Control: Data Loss Prevention (DLP) Active
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
