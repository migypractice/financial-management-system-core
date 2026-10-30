import React from 'react';
import { Calendar, Filter, RotateCcw } from 'lucide-react';

export interface DatePeriodFilterBarProps {
  fromDate: string;
  toDate: string;
  onFromDateChange: (val: string) => void;
  onToDateChange: (val: string) => void;
  selectedPreset: 'ALL' | 'OCT_2026' | 'Q4_2026';
  onPresetSelect: (preset: 'ALL' | 'OCT_2026' | 'Q4_2026') => void;
  className?: string;
}

export const DatePeriodFilterBar: React.FC<DatePeriodFilterBarProps> = ({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  selectedPreset,
  onPresetSelect,
  className = '',
}) => {
  return (
    <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${className}`}>
      
      {/* Preset Pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
          <Filter className="w-3.5 h-3.5" /> Period:
        </span>

        <button
          onClick={() => onPresetSelect('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            selectedPreset === 'ALL'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          All Time
        </button>

        <button
          onClick={() => onPresetSelect('OCT_2026')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            selectedPreset === 'OCT_2026'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Oct 2026 (Current)
        </button>

        <button
          onClick={() => onPresetSelect('Q4_2026')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            selectedPreset === 'Q4_2026'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Q4 2026 (Fiscal Qtr)
        </button>
      </div>

      {/* Date Pickers */}
      <div className="flex items-center gap-2 self-start md:self-auto text-xs">
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-lg">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400 text-[10px] uppercase font-bold">From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => onFromDateChange(e.target.value)}
            className="bg-transparent text-slate-800 dark:text-slate-200 text-xs focus:outline-none"
          />
        </div>

        <span className="text-slate-400 font-bold">—</span>

        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-lg">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400 text-[10px] uppercase font-bold">To:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => onToDateChange(e.target.value)}
            className="bg-transparent text-slate-800 dark:text-slate-200 text-xs focus:outline-none"
          />
        </div>
      </div>

    </div>
  );
};

