import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  accentColor?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  className?: string;
}

/**
 * Clean, compact KPI stat card (Linear / QuickBooks style).
 */
export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  isPositive = true,
  subtitle,
  className = '',
}) => {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3.5 shadow-xs ${className}`}>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
        {title}
      </p>
      <h3 className="kpi-value whitespace-nowrap text-lg sm:text-xl font-semibold text-slate-900 dark:text-white tabular-nums tracking-tight mt-1 truncate">
        {value}
      </h3>

      {(change || subtitle) && (
        <div className="mt-2 flex items-center justify-between text-xs gap-2">
          {change && (
            <span
              className={`font-medium px-1.5 py-0.5 rounded text-[11px] shrink-0 ${
                isPositive
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
              }`}
            >
              {isPositive ? '↑' : '↓'} {change}
            </span>
          )}
          {subtitle && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate flex-1">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;
