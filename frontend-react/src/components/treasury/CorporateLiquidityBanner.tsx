import React from 'react';
import { Landmark, ShieldCheck, AlertTriangle, TrendingUp, DollarSign, Wallet, ArrowRight, Activity } from 'lucide-react';

interface CorporateLiquidityBannerProps {
  liquidCash: number;
  unpaidAp: number;
  collectibleAr: number;
  onRefresh?: () => void;
  className?: string;
}

export const CorporateLiquidityBanner: React.FC<CorporateLiquidityBannerProps> = ({
  liquidCash,
  unpaidAp,
  collectibleAr,
  onRefresh,
  className = '',
}) => {
  // 1. Immediate Cash Liquidity Ratio (Cash Coverage) = Total Liquid Cash / max(1, Unpaid AP)
  const cashCoverageRatio = unpaidAp > 0 ? liquidCash / unpaidAp : liquidCash > 0 ? 99.9 : 0;
  
  // 2. Net Working Capital = (Liquid Cash + Collectible AR) - Unpaid AP
  const netWorkingCapital = (liquidCash + collectibleAr) - unpaidAp;

  // 3. Solvency / Liquidity Badge determination
  let badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
  let badgeText = 'HEALTHY LIQUIDITY (>= 1.5x Coverage)';
  let recommendation = 'Liquid reserves exceed near-term obligations. Payout releases fully solvent.';
  let badgeIcon = ShieldCheck;

  if (cashCoverageRatio < 1.0) {
    badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-700 animate-pulse';
    badgeText = 'LIQUIDITY DEFICIT (< 1.0x)';
    recommendation = 'Cash reserves fall below near-term obligations. Prioritize customer collections before releasing discretionary disbursements.';
    badgeIcon = AlertTriangle;
  } else if (cashCoverageRatio < 1.5) {
    badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-700';
    badgeText = 'WATCH / TIGHT LIQUIDITY (1.0x - 1.49x)';
    recommendation = 'Moderate liquidity cushion. Maintain selective payout scheduling.';
    badgeIcon = AlertTriangle;
  }

  const BadgeIcon = badgeIcon;

  return (
    <div className={`rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 shadow-lg relative overflow-hidden ${className}`}>
      {/* Background Decorative Ambient */}
      <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute left-1/3 -top-10 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3.5 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center shadow-xs">
            <Activity size={16} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold tracking-tight text-white uppercase">
                Corporate Liquidity & Treasury Health Monitor
              </h2>
              <span className="hidden md:inline-flex px-1.5 py-0.5 text-[9px] font-mono rounded bg-white/10 text-slate-300 border border-white/10">
                Live Subledger Sync
              </span>
            </div>
            <p className="text-[11px] text-slate-300/80 mt-0.5">
              Real-time solvency analysis comparing liquid bank reserves against near-term accounts payable.
            </p>
          </div>
        </div>

        {/* Dynamic Liquidity Status Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-bold border shadow-xs ${badgeColor}`}>
            <BadgeIcon size={13} />
            <span>{badgeText}</span>
          </span>
        </div>
      </div>

      {/* 4 Real-Time Treasury Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-3.5 relative z-10">
        {/* 1. Liquid Cash Reserves */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold tracking-wider">
            <span>Liquid Cash Reserves</span>
            <Landmark size={13} className="text-emerald-400" />
          </div>
          <p className="text-base sm:text-lg font-bold font-mono text-emerald-400 mt-1 tabular-nums">
            PHP {liquidCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Active bank balances</span>
        </div>

        {/* 2. Near-Term AP Exposure */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold tracking-wider">
            <span>Near-Term Payables (AP)</span>
            <Wallet size={13} className="text-rose-400" />
          </div>
          <p className="text-base sm:text-lg font-bold font-mono text-rose-300 mt-1 tabular-nums">
            PHP {unpaidAp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Pending bills & vouchers</span>
        </div>

        {/* 3. Immediate Cash Coverage Ratio */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold tracking-wider">
            <span>Cash Liquidity Ratio</span>
            <TrendingUp size={13} className="text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-base sm:text-lg font-bold font-mono text-white tabular-nums">
              {cashCoverageRatio >= 99 ? '99.9x+' : `${cashCoverageRatio.toFixed(2)}x`}
            </span>
            <span className="text-[10px] text-slate-400">coverage</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Formula: Cash / AP Exposure</span>
        </div>

        {/* 4. Net Working Capital */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold tracking-wider">
            <span>Net Working Capital</span>
            <DollarSign size={13} className="text-cyan-400" />
          </div>
          <p className={`text-base sm:text-lg font-bold font-mono mt-1 tabular-nums ${netWorkingCapital >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
            PHP {netWorkingCapital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">(Cash + AR) - AP Payables</span>
        </div>
      </div>

      {/* Recommendation Footer Strip */}
      <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-300/80 relative z-10">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-white">Treasury Guidance:</span>
          <span className="text-slate-300">{recommendation}</span>
        </div>
        <div className="text-[10px] text-slate-400 font-mono">
          Safe Corporate Floor: <span className="text-emerald-400 font-bold">1.20x</span>
        </div>
      </div>
    </div>
  );
};

export default CorporateLiquidityBanner;
