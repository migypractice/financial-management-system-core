import React from 'react';

/**
 * Premium Skeleton Loader
 * Shows pulsing placeholder blocks while data loads — prevents content flash.
 */

const Shimmer: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200/70 dark:bg-slate-700/50 rounded ${className}`} />
);

export const SkeletonLoader: React.FC = () => (
  <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6">
    {/* Title */}
    <div>
      <Shimmer className="h-6 w-48 mb-2" />
      <Shimmer className="h-4 w-72" />
    </div>

    {/* Summary Cards */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Shimmer className="h-3 w-28" />
            <Shimmer className="h-3 w-3 rounded-full" />
          </div>
          <Shimmer className="h-7 w-36" />
          <Shimmer className="h-3 w-44" />
        </div>
      ))}
    </div>

    {/* Filter Tabs */}
    <div className="flex gap-2">
      {[1, 2, 3, 4].map(i => (
        <Shimmer key={i} className="h-8 w-20 rounded-lg" />
      ))}
    </div>

    {/* Table */}
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
      {/* Table Header */}
      <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30">
        <div className="flex gap-8">
          {[1, 2, 3, 4, 5].map(i => (
            <Shimmer key={i} className="h-3 w-20" />
          ))}
        </div>
      </div>
      {/* Table Rows */}
      {[1, 2, 3, 4, 5].map(row => (
        <div key={row} className="px-5 py-4 border-b border-gray-50 dark:border-slate-700/50 flex gap-8 items-center">
          {[1, 2, 3, 4, 5].map(col => (
            <Shimmer key={col} className={`h-4 ${col === 1 ? 'w-28' : col === 5 ? 'w-20' : 'w-24'}`} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export default SkeletonLoader;
