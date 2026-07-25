import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  accentColor?: string;
  subtitle?: string;
}

/**
 * Reusable KPI stat card for dashboard overview.
 * Uses a colored accent dot instead of emoji icons for a clean, professional look.
 */
export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  isPositive = true,
  accentColor = 'bg-emerald-500',
  subtitle,
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-150 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
        <span className={`w-2.5 h-2.5 rounded-full ${accentColor}`} />
      </div>

      <div className="mt-2">
        <h3 className="text-2xl font-bold text-slate-900 tracking-tight font-mono tabular-nums">{value}</h3>
      </div>

      {(change || subtitle) && (
        <div className="mt-2 flex items-center justify-between text-xs">
          {change && (
            <span
              className={`font-semibold px-2 py-0.5 rounded-full ${
                isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {isPositive ? '↑' : '↓'} {change}
            </span>
          )}
          {subtitle && <span className="text-slate-400">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};

export default StatCard;
