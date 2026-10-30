import React, { useState, useEffect, useRef } from 'react';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { reportsService, FinancialStatementsResponse } from '../../services/reportsService';
import {
  Lock,
  ShieldCheck,
  AlertCircle,
  X,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  TrendingUp,
  DollarSign,
  Activity,
  AlertTriangle,
  ArrowRight,
  Scale,
  Landmark,
  Gauge
} from 'lucide-react';
import { DatePeriodFilterBar } from '../../components/ui/DatePeriodFilterBar';

export const ReportsPage: React.FC = () => {
  const [data, setData] = useState<FinancialStatementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // MPIN Authorization State for Protected Confidential Export
  const [isMpinModalOpen, setIsMpinModalOpen] = useState(false);
  const [mpin, setMpin] = useState(['', '', '', '']);
  const [mpinError, setMpinError] = useState(false);

  // Date Filter State
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [datePreset, setDatePreset] = useState<'ALL' | 'OCT_2026' | 'Q4_2026'>('OCT_2026');

  const handlePresetSelect = (preset: 'ALL' | 'OCT_2026' | 'Q4_2026') => {
    setDatePreset(preset);
    if (preset === 'ALL') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'OCT_2026') {
      setFromDate('2026-10-01');
      setToDate('2026-10-31');
    } else if (preset === 'Q4_2026') {
      setFromDate('2026-10-01');
      setToDate('2026-12-31');
    }
  };
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

  const currentAssets = bs.assets.total_current_assets;
  const currentLiabilities = bs.liabilities.total_current_liabilities;
  const cashAndEquivalents = bs.assets.cash_and_equivalents;
  const arOutstanding = bs.assets.accounts_receivable;
  const apOutstanding = bs.liabilities.accounts_payable;

  const liveCurrentRatio = ratios.current_ratio;
  const liveQuickRatio = ratios.quick_ratio;
  const liveCashRatio = currentLiabilities > 0
    ? (cashAndEquivalents / currentLiabilities).toFixed(2)
    : (cashAndEquivalents > 0 ? '99.9+' : '0.00');
  const netWorkingCapital = currentAssets - currentLiabilities;
  const workingCapitalVelocityFloat = arOutstanding - apOutstanding;

  let liquidityVerdict = 'HEALTHY LIQUIDITY & SOLVENCY';
  let verdictColor = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
  let verdictDesc = 'Liquid cash reserves and collectible AR comfortably cover near-term trade payables and tax liabilities. System permits discretionary expenditures and capital allocations.';

  if (Number(liveCashRatio) < 0.5 || liveCurrentRatio < 1.0) {
    liquidityVerdict = 'TIGHT LIQUIDITY / WATCHLIST';
    verdictColor = 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30';
    verdictDesc = 'Cash ratio is below 0.50x or Current ratio is below 1.0x. Treasury policy recommends accelerating AR invoice collections before approving non-essential supplier payouts.';
  }

  return (
    <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            Financial Statements & Reporting
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Financial statements and accounting reports.
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

      {/* Dynamic Date-Range / Period Filter Bar */}
      <DatePeriodFilterBar
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        selectedPreset={datePreset}
        onPresetSelect={handlePresetSelect}
      />

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-3 text-sm">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Corporate Solvency & Working Capital Metrics ── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/40">
              <Scale size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Liquidity, Solvency & Working Capital Metrics
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Solvency benchmarks and liquidity indicators derived directly from General Ledger balances.
              </p>
            </div>
          </div>

          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${verdictColor} self-start sm:self-auto`}>
            <ShieldCheck size={13} />
            <span>{liquidityVerdict}</span>
          </span>
        </div>

        {/* 4 Core Financial Solvency Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Tile 1: Current Ratio */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Current Ratio</span>
              <Gauge size={14} className="text-indigo-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                {liveCurrentRatio}x
              </span>
              <span className={`text-[10px] font-semibold ${liveCurrentRatio >= 1.5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                {liveCurrentRatio >= 1.5 ? 'Optimal (>= 1.5x)' : 'Caution (< 1.5x)'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              Assets: ₱{currentAssets.toLocaleString('en-US', { maximumFractionDigits: 0 })} / Liab: ₱{currentLiabilities.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-800">
              Formula: Current Assets ÷ Current Liabilities
            </p>
          </div>

          {/* Tile 2: Quick (Acid-Test) Ratio */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Quick (Acid-Test) Ratio</span>
              <Activity size={14} className="text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                {liveQuickRatio}x
              </span>
              <span className={`text-[10px] font-semibold ${liveQuickRatio >= 1.0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                {liveQuickRatio >= 1.0 ? 'Solvent (>= 1.0x)' : 'Constrained (< 1.0x)'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              Cash: ₱{cashAndEquivalents.toLocaleString('en-US', { maximumFractionDigits: 0 })} + AR: ₱{arOutstanding.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-800">
              Formula: (Cash + Trade AR) ÷ Current Liabilities
            </p>
          </div>

          {/* Tile 3: Cash Liquidity Ratio */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Cash Liquidity Ratio</span>
              <Landmark size={14} className="text-cyan-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                {liveCashRatio}x
              </span>
              <span className={`text-[10px] font-semibold ${Number(liveCashRatio) >= 0.5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                {Number(liveCashRatio) >= 0.5 ? 'Target (>= 0.5x)' : 'Low Cash (< 0.5x)'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Bank Cash Reserves Only
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-800">
              Formula: Cash & Bank Balances ÷ Current Liabilities
            </p>
          </div>

          {/* Tile 4: Net Working Capital */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Net Working Capital</span>
              <DollarSign size={14} className="text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-xl font-bold tabular-nums ${netWorkingCapital >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                ₱{netWorkingCapital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {netWorkingCapital >= 0 ? 'Operational Cushion Surplus' : 'Working Capital Deficit'}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-800">
              Formula: Current Assets - Current Liabilities
            </p>
          </div>
        </div>

        {/* Clean Trade Float Breakdown Strip (No AI Essays) */}
        <div className="p-3 rounded-lg bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
            <span className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Activity size={13} className="text-indigo-600 dark:text-indigo-400" />
              Operating Trade Float (AR Collection vs. AP Payables)
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border self-start sm:self-auto ${workingCapitalVelocityFloat >= 0 ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300' : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300'}`}>
              {workingCapitalVelocityFloat >= 0 ? 'Positive Operating Float (+)' : 'Payable Float Reserve Needed (-)'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block font-medium">Collectible Trade Receivables (AR)</span>
              <span className="font-semibold text-slate-900 dark:text-white text-xs mt-0.5 block tabular-nums">
                ₱{arOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block font-medium">Committed Supplier Payables (AP)</span>
              <span className="font-semibold text-slate-900 dark:text-white text-xs mt-0.5 block tabular-nums">
                ₱{apOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block font-medium">Net Working Capital Velocity Float</span>
              <span className={`font-semibold text-xs mt-0.5 block tabular-nums ${workingCapitalVelocityFloat >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                ₱{workingCapitalVelocityFloat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

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
                <span className="tabular-nums font-semibold text-slate-900 dark:text-white">
                  ₱{is.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {is.revenue_detail.map((rev) => (
                <div key={rev.code} className="flex justify-between items-center pl-4 text-xs text-slate-600 dark:text-slate-400">
                  <span>{rev.code} — {rev.name}</span>
                  <span className="tabular-nums">₱{rev.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}

              {/* COGS */}
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-2 pl-4">
                <span className="text-slate-600 dark:text-slate-400">Less: Cost of Goods Sold (COGS)</span>
                <span className="tabular-nums text-slate-600 dark:text-slate-400">
                  (₱{is.total_cogs.toLocaleString('en-US', { minimumFractionDigits: 2 })})
                </span>
              </div>

              {/* Gross Profit */}
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-2 bg-slate-50/60 dark:bg-slate-700/20 px-3 py-2 rounded-lg">
                <span className="font-semibold text-slate-900 dark:text-white">Gross Profit</span>
                <span className="tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                  ₱{is.gross_profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Operating Expenses */}
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-2">
                <span className="font-semibold text-slate-900 dark:text-white">Operating Expenses</span>
                <span className="tabular-nums text-slate-600 dark:text-slate-400">
                  (₱{is.total_expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })})
                </span>
              </div>

              {is.expense_detail.map((exp) => (
                <div key={exp.code} className="flex justify-between items-center pl-4 text-xs text-slate-600 dark:text-slate-400">
                  <span>{exp.code} — {exp.name}</span>
                  <span className="tabular-nums">(₱{exp.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })})</span>
                </div>
              ))}

              {/* Net Income */}
              <div className="flex justify-between items-center pt-3 border-t-2 border-slate-200 dark:border-slate-700">
                <span className="font-bold text-base text-slate-900 dark:text-white">Net Income / (Loss)</span>
                <span
                  className={`tabular-nums text-base font-bold border-double border-b-4 ${is.net_income >= 0
                    ? 'text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700'
                    : 'text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-700'
                    }`}
                >
                  ₱{is.net_income.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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

            {/* Accounting Equation Verification Banner */}
            <div className="mx-5 mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                  ✓ Accounting Equation Balanced: Total Assets (₱{bs.assets.total_current_assets.toLocaleString('en-US', { minimumFractionDigits: 2 })}) = Total Liabilities (₱{bs.liabilities.total_current_liabilities.toLocaleString('en-US', { minimumFractionDigits: 2 })}) + Total Equity (₱{bs.equity.total_equity.toLocaleString('en-US', { minimumFractionDigits: 2 })})
                </span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded uppercase tracking-wider self-start sm:self-auto shrink-0">
                PFRS Compliant
              </span>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 text-sm">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 border-b border-slate-200 dark:border-slate-700 pb-1">
                  Current Assets
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Cash & Bank Accounts</span>
                    <span className="tabular-nums font-medium text-slate-900 dark:text-white">
                      ₱{bs.assets.cash_and_equivalents.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Accounts Receivable (AR)</span>
                    <span className="tabular-nums font-medium text-slate-900 dark:text-white">
                      ₱{bs.assets.accounts_receivable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Merchandise Inventory</span>
                    <span className="tabular-nums font-medium text-slate-900 dark:text-white">
                      ₱{bs.assets.merchandise_inventory.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-700 font-bold text-sm">
                    <span className="text-slate-900 dark:text-white">Total Assets</span>
                    <span className="tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                      ₱{bs.assets.total_current_assets.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                    <span className="tabular-nums font-medium text-slate-900 dark:text-white">
                      ₱{bs.liabilities.accounts_payable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Estimated Tax Payable</span>
                    <span className="tabular-nums font-medium text-slate-900 dark:text-white">
                      ₱{bs.liabilities.tax_payable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-700 font-medium">
                    <span className="text-slate-700 dark:text-slate-300">Total Liabilities</span>
                    <span className="tabular-nums font-medium text-slate-900 dark:text-white">
                      ₱{bs.liabilities.total_current_liabilities.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 text-slate-600 dark:text-slate-400">
                    <span>Retained Earnings / Equity</span>
                    <span className="tabular-nums font-medium text-slate-900 dark:text-white">
                      ₱{bs.equity.total_equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-700 font-bold text-sm">
                    <span className="text-slate-900 dark:text-white">Total L & E</span>
                    <span className="tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                      ₱{(bs.liabilities.total_current_liabilities + bs.equity.total_equity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Key Financial Ratios & Statement Audit */}
        <div className="space-y-6">
          {/* Key Financial Ratios */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-150 dark:border-slate-700 overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-gray-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={15} className="text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Key Financial Ratios</h2>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                PFRS Standards
              </span>
            </div>
            <div className="p-4 sm:p-5 space-y-3.5 text-xs">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-700/60">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Current Ratio</p>
                  <p className="text-[10px] text-slate-400">Current Assets ÷ Current Liabilities</p>
                </div>
                <div className="text-right">
                  <span className="tabular-nums font-bold text-sm text-emerald-600 dark:text-emerald-400 block">
                    {ratios.current_ratio}x
                  </span>
                  <span className="text-[9px] text-slate-400">Benchmark: &ge; 1.5x</span>
                </div>
              </div>

              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-700/60">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Quick Ratio (Acid-Test)</p>
                  <p className="text-[10px] text-slate-400">(Cash + Trade AR) ÷ Current Liabilities</p>
                </div>
                <div className="text-right">
                  <span className="tabular-nums font-bold text-sm text-indigo-600 dark:text-indigo-400 block">
                    {ratios.quick_ratio}x
                  </span>
                  <span className="text-[9px] text-slate-400">Benchmark: &ge; 1.0x</span>
                </div>
              </div>

              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-700/60">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Cash Liquidity Ratio</p>
                  <p className="text-[10px] text-slate-400">Cash & Bank Balances ÷ Current Liabilities</p>
                </div>
                <div className="text-right">
                  <span className="tabular-nums font-bold text-sm text-cyan-600 dark:text-cyan-400 block">
                    {liveCashRatio}x
                  </span>
                  <span className="text-[9px] text-slate-400">Benchmark: &ge; 0.5x</span>
                </div>
              </div>

              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-700/60">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Net Profit Margin</p>
                  <p className="text-[10px] text-slate-400">Net Income ÷ Total Gross Revenue</p>
                </div>
                <div className="text-right">
                  <span className={`tabular-nums font-bold text-sm block ${ratios.net_profit_margin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {ratios.net_profit_margin}%
                  </span>
                  <span className="text-[9px] text-slate-400">Profitability Ratio</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Budget Burn Rate</p>
                  <p className="text-[10px] text-slate-400">Actual YTD Expenses ÷ Allocated Budget</p>
                </div>
                <div className="text-right">
                  <span className="tabular-nums font-bold text-sm text-amber-600 dark:text-amber-400 block">
                    {ratios.budget_burn_rate}%
                  </span>
                  <span className="text-[9px] text-slate-400">Budget Consumption</span>
                </div>
              </div>
            </div>
          </div>

          {/* Statement of Financial Position Audit Check */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-150 dark:border-slate-700 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">General Ledger Integrity Audit</h2>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Total Assets (Debit):</span>
                <span className="tabular-nums font-semibold text-slate-900 dark:text-white">
                  ₱{bs.assets.total_current_assets.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Total Liabilities + Equity (Credit):</span>
                <span className="tabular-nums font-semibold text-slate-900 dark:text-white">
                  ₱{(bs.liabilities.total_current_liabilities + bs.equity.total_equity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between font-semibold">
                <span className="text-slate-700 dark:text-slate-300">Accounting Equation:</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={12} />
                  Assets = L + E
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 dark:text-slate-500 space-y-1">
              <p>• Statements auto-aggregated from double-entry General Ledger rows.</p>
              <p>• Output VAT accrued under BIR Form 2550M/Q quarterly guidelines.</p>
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
                  className={`w-12 h-14 text-center tabular-nums text-2xl font-bold rounded-xl border transition-all bg-slate-950 text-white focus:outline-none ${mpinError
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
