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
 * Reusable KPI stat card for dashboard and module overview.
 */
export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  isPositive = true,
  accentColor = 'bg-emerald-500',
  subtitle,
  icon,
  iconBg = 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400',
  className = '',
}) => {
  return (
    <div className={`card-hover bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
            {title}
          </p>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums tracking-tight truncate">
            {value}
          </h3>
        </div>

        {icon ? (
          <div className={`p-2.5 rounded-xl shrink-0 ${iconBg}`}>
            {icon}
          </div>
        ) : (
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${accentColor}`} />
        )}
      </div>

      {(change || subtitle) && (
        <div className="mt-3 flex items-center justify-between text-xs gap-2">
          {change && (
            <span
              className={`font-semibold px-2 py-0.5 rounded-md text-[11px] shrink-0 ${isPositive
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50'
                }`}
            >
              {isPositive ? '↑' : '↓'} {change}
            </span>
          )}
          {subtitle && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate text-right flex-1">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;
