import React, { useState } from 'react';
import StatCard from '../../components/ui/StatCard';

/**
 * Collection Management Module
 * Tracks inbound payments, automated reconciliation matches, and unallocated deposits.
 */

type CollectionStatus = 'matched' | 'unmatched' | 'processing';

interface CollectionRecord {
  id: string;
  depositReference: string;
  source: string;
  amount: number;
  date: string;
  status: CollectionStatus;
  matchedInvoice?: string;
  confidenceScore?: number;
}

const STATUS_CONFIG: Record<CollectionStatus, { label: string; bg: string; text: string; dot: string }> = {
  matched:    { label: 'Matched',      bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  processing: { label: 'Processing',   bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  unmatched:  { label: 'Unmatched',    bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
};

export const CollectionPage: React.FC = () => {
  const [filter, setFilter] = useState<'ALL' | CollectionStatus>('ALL');

  const collections: CollectionRecord[] = [
    { id: 'col-001', depositReference: 'DEP-BDO-9921', source: 'BDO Corporate', amount: 1540000, date: '2026-07-25', status: 'matched', matchedInvoice: 'INV-BATCH-77', confidenceScore: 0.99 },
    { id: 'col-002', depositReference: 'DEP-BPI-8820', source: 'BPI Trade', amount: 450000, date: '2026-07-25', status: 'processing', confidenceScore: 0.65 },
    { id: 'col-003', depositReference: 'DEP-UBP-1122', source: 'UnionBank', amount: 89000, date: '2026-07-24', status: 'unmatched' },
    { id: 'col-004', depositReference: 'STRIPE-SET-99', source: 'Stripe Gateway', amount: 320500, date: '2026-07-23', status: 'matched', matchedInvoice: 'ECOM-SETTLE-09', confidenceScore: 1.0 },
  ];

  const filtered = filter === 'ALL' ? collections : collections.filter((c) => c.status === filter);

  return (
    <div className="p-6 bg-slate-50 min-h-full space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Collection Management</h1>
        <p className="text-sm text-slate-500 mt-0.5">Automated invoice matching, deposit reconciliation, and unallocated fund tracking.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Collections Today" value="PHP 1,990,000" accentColor="bg-blue-500" />
        <StatCard title="Auto-Matched" value="PHP 1,860,500" accentColor="bg-emerald-500" subtitle="93.5% match rate" />
        <StatCard title="Unmatched Deposits" value="PHP 89,000" accentColor="bg-amber-500" isPositive={false} />
        <StatCard title="Processing" value="PHP 450,000" accentColor="bg-slate-400" />
      </div>

       {/* Filters */}
       <div className="flex flex-wrap gap-1.5">
         {(['ALL', 'matched', 'processing', 'unmatched'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === key ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-gray-200'
            }`}
          >
            {key === 'ALL' ? `All (${collections.length})` : `${STATUS_CONFIG[key].label} (${collections.filter((c) => c.status === key).length})`}
          </button>
        ))}
      </div>

      {/* Collections Table */}
      <div className="bg-white rounded-xl border border-gray-150 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 text-[11px] text-slate-500 uppercase border-b border-gray-200 font-semibold tracking-wider">
            <tr>
              <th className="px-5 py-3">Deposit Ref</th>
              <th className="px-5 py-3">Source Bank/Gateway</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Matched To</th>
              <th className="px-5 py-3">AI Match Score</th>
              <th className="px-5 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((col) => {
               const s = STATUS_CONFIG[col.status];
               return (
                <tr key={col.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5 font-mono font-semibold text-slate-700">{col.depositReference}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-800">{col.source}</td>
                  <td className="px-5 py-3.5 text-slate-600">{col.date}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${s.bg} ${s.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-slate-500">{col.matchedInvoice || '-'}</td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {col.confidenceScore ? `${(col.confidenceScore * 100).toFixed(0)}%` : '-'}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                    PHP {col.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
               )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CollectionPage;
