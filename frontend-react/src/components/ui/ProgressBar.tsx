import React from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md';
  colorClass?: string;
}

/**
 * Reusable progress bar for budget consumption, confidence scores, etc.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  label,
  showPercentage = true,
  size = 'sm',
  colorClass,
}) => {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;

  const barColor =
    colorClass ??
    (pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500');

  const height = size === 'md' ? 'h-2.5' : 'h-1.5';

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-slate-500 font-medium">{label}</span>
          {showPercentage && (
            <span className="text-[11px] font-mono font-semibold text-slate-600 tabular-nums">{pct}%</span>
          )}
        </div>
      )}
      <div className={`w-full ${height} bg-slate-200 rounded-full overflow-hidden`}>
        <div
          className={`${height} rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
