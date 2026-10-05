import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface ChartDataPoint {
  label: string;
  inflow: number;
  outflow: number;
}

interface FinancialChartProps {
  title?: string;
  subtitle?: string;
  data: ChartDataPoint[];
  className?: string;
}

export const FinancialChart: React.FC<FinancialChartProps> = ({
  title = 'Inflow vs Outflow Overview',
  subtitle = 'Actual cash movements across operational periods',
  data,
  className = '',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxVal = Math.max(...data.map(d => Math.max(d.inflow, d.outflow)), 100000);
  // Rounded ceiling for nice Y-axis
  const ceiling = Math.ceil(maxVal / 100000) * 100000;

  const totalInflow = data.reduce((acc, d) => acc + d.inflow, 0);
  const totalOutflow = data.reduce((acc, d) => acc + d.outflow, 0);

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-xs ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700/80 gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span className="text-slate-600 dark:text-slate-300 font-medium">Inbound Revenue</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold ml-1">
              ₱{(totalInflow / 1000).toFixed(0)}k
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
            <span className="text-slate-600 dark:text-slate-300 font-medium">Outbound Expenses</span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold ml-1">
              ₱{(totalOutflow / 1000).toFixed(0)}k
            </span>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="pt-6 relative">
        <div className="h-44 sm:h-52 w-full flex items-end gap-2 sm:gap-4 px-2">
          {data.map((item, idx) => {
            const inflowHeight = (item.inflow / ceiling) * 100;
            const outflowHeight = (item.outflow / ceiling) * 100;
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={item.label}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer relative"
              >
                {/* Tooltip on hover */}
                {isHovered && (
                  <div className="absolute -top-12 z-20 bg-slate-900 text-white text-[10px] py-1.5 px-2.5 rounded-lg shadow-xl whitespace-nowrap pointer-events-none animate-fadeIn border border-slate-700">
                    <p className="font-bold text-slate-200">{item.label}</p>
                    <div className="flex gap-2 font-mono mt-0.5">
                      <span className="text-emerald-400">In: ₱{item.inflow.toLocaleString()}</span>
                      <span className="text-indigo-400">Out: ₱{item.outflow.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {/* Bars side by side */}
                <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full pb-1">
                  <div
                    style={{ height: `${Math.max(inflowHeight, 4)}%` }}
                    className={`w-full max-w-[14px] sm:max-w-[20px] rounded-t-sm transition-all duration-300 ${
                      isHovered ? 'bg-emerald-400 shadow-md shadow-emerald-500/20' : 'bg-emerald-500/85 hover:bg-emerald-500'
                    }`}
                  />
                  <div
                    style={{ height: `${Math.max(outflowHeight, 4)}%` }}
                    className={`w-full max-w-[14px] sm:max-w-[20px] rounded-t-sm transition-all duration-300 ${
                      isHovered ? 'bg-indigo-400 shadow-md shadow-indigo-500/20' : 'bg-indigo-500/85 hover:bg-indigo-500'
                    }`}
                  />
                </div>

                {/* X-axis Label */}
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1 truncate">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Background Grid Lines */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between py-6 px-2 opacity-20 dark:opacity-10">
          <div className="border-b border-slate-400 w-full" />
          <div className="border-b border-slate-400 w-full" />
          <div className="border-b border-slate-400 w-full" />
        </div>
      </div>
    </div>
  );
};

export default FinancialChart;
