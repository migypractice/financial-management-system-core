import React from 'react';

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
  className = '',
}) => {
  // Cash Coverage Ratio = Total Liquid Cash / max(1, Unpaid AP)
  const cashCoverageRatio = unpaidAp > 0 ? liquidCash / unpaidAp : liquidCash > 0 ? 99.9 : 0;
  
  // Net Working Capital = (Liquid Cash + Collectible AR) - Unpaid AP
  const netWorkingCapital = (liquidCash + collectibleAr) - unpaidAp;

  // Simple subtle pill
  let pillStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
  let pillLabel = `Healthy (${cashCoverageRatio >= 99 ? '99+' : cashCoverageRatio.toFixed(1)}x)`;

  if (cashCoverageRatio < 1.0) {
    pillStyle = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
    pillLabel = `Deficit (${cashCoverageRatio.toFixed(1)}x)`;
  } else if (cashCoverageRatio < 1.5) {
    pillStyle = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    pillLabel = `Watch (${cashCoverageRatio.toFixed(1)}x)`;
  }

  return (
    <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs ${className}`}>
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 divide-x divide-slate-200 dark:divide-slate-700">
        <div>
          <span className="text-slate-500 dark:text-slate-400">Bank Cash Available: </span>
          <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
            ₱{liquidCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="pl-4 sm:pl-6">
          <span className="text-slate-500 dark:text-slate-400">Unpaid Payables: </span>
          <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
            ₱{unpaidAp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="pl-4 sm:pl-6">
          <span className="text-slate-500 dark:text-slate-400">Working Capital: </span>
          <span className={`font-semibold tabular-nums ${netWorkingCapital >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>
            ₱{netWorkingCapital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-slate-500 dark:text-slate-400 text-xs">Liquidity Status:</span>
        <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${pillStyle}`}>
          {pillLabel}
        </span>
      </div>
    </div>
  );
};

export default CorporateLiquidityBanner;
