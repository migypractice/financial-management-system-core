import React, { useState } from 'react';

/**
 * Accounts Receivable (AR) Module
 * Tracks E-Commerce marketplace receipts, payment gateway settlements, and merchant payouts.
 */

type ARStatus = 'settled' | 'pending_settlement' | 'partially_received' | 'disputed';

interface Receivable {
  id: string;
  orderBatch: string;
  gateway: string;
  merchantName: string;
  grossAmount: number;
  gatewayFee: number;
  taxWithheld: number;
  netAmount: number;
  settlementDate: string;
  status: ARStatus;
}

const STATUS_CONFIG: Record<ARStatus, { label: string; bg: string; text: string; dot: string }> = {
  settled:            { label: 'Settled',     bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  pending_settlement: { label: 'Pending',     bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  partially_received: { label: 'Partial',     bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  disputed:           { label: 'Disputed',    bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500' },
};

export const AccountsReceivablePage: React.FC = () => {
  const [filter, setFilter] = useState<'ALL' | ARStatus>('ALL');

  const receivables: Receivable[] = [
    { id: 'ar-001', orderBatch: 'ORD-998241', gateway: 'Stripe', merchantName: 'TechMart PH', grossAmount: 45000, gatewayFee: 900, taxWithheld: 5400, netAmount: 38700, settlementDate: '2026-07-25', status: 'pending_settlement' },
    { id: 'ar-002', orderBatch: 'ORD-998190', gateway: 'PayPal', merchantName: 'FashionHub Manila', grossAmount: 128500, gatewayFee: 3855, taxWithheld: 15420, netAmount: 109225, settlementDate: '2026-07-24', status: 'settled' },
    { id: 'ar-003', orderBatch: 'ORD-998120', gateway: 'GCash', merchantName: 'GadgetWorld PH', grossAmount: 67200, gatewayFee: 1344, taxWithheld: 8064, netAmount: 57792, settlementDate: '2026-07-24', status: 'settled' },
    { id: 'ar-004', orderBatch: 'ORD-997988', gateway: 'Bank Transfer', merchantName: 'HomeLiving Co', grossAmount: 234000, gatewayFee: 0, taxWithheld: 28080, netAmount: 205920, settlementDate: '2026-07-23', status: 'partially_received' },
    { id: 'ar-005', orderBatch: 'ORD-997850', gateway: 'Stripe', merchantName: 'AutoParts Express', grossAmount: 18900, gatewayFee: 378, taxWithheld: 2268, netAmount: 16254, settlementDate: '2026-07-22', status: 'disputed' },
  ];

  const summaryCards = [
    { label: 'Total Receivables', amount: receivables.reduce((s, r) => s + r.grossAmount, 0), color: 'bg-blue-500' },
    { label: 'Net After Fees & Tax', amount: receivables.reduce((s, r) => s + r.netAmount, 0), color: 'bg-emerald-500' },
    { label: 'Gateway Fees', amount: receivables.reduce((s, r) => s + r.gatewayFee, 0), color: 'bg-amber-500' },
    { label: 'Tax Withheld', amount: receivables.reduce((s, r) => s + r.taxWithheld, 0), color: 'bg-red-500' },
  ];

  const filtered = filter === 'ALL' ? receivables : receivables.filter((r) => r.status === filter);

  return (
    <div className="p-6 bg-slate-50 min-h-full space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Accounts Receivable</h1>
        <p className="text-sm text-slate-500 mt-0.5">Payment gateway settlements, merchant receipts, and collection tracking.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-150 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">{c.label}</span>
              <span className={`w-2 h-2 rounded-full ${c.color}`} />
            </div>
            <p className="text-lg font-bold text-slate-900 font-mono tabular-nums">
              PHP {c.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-1.5">
        {(['ALL', 'settled', 'pending_settlement', 'partially_received', 'disputed'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === key ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-gray-200'
            }`}
          >
            {key === 'ALL' ? `All (${receivables.length})` : `${STATUS_CONFIG[key].label} (${receivables.filter((r) => r.status === key).length})`}
          </button>
        ))}
      </div>

      {/* Receivables table */}
      <div className="bg-white rounded-xl border border-gray-150 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 text-[11px] text-slate-500 uppercase border-b border-gray-200 font-semibold tracking-wider">
            <tr>
              <th className="px-5 py-3">Order Batch</th>
              <th className="px-5 py-3">Merchant</th>
              <th className="px-5 py-3">Gateway</th>
              <th className="px-5 py-3">Settlement Date</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Gross</th>
              <th className="px-5 py-3 text-right">Fees</th>
              <th className="px-5 py-3 text-right">Net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((r) => {
              const s = STATUS_CONFIG[r.status];
              return (
                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5 font-mono font-semibold text-slate-700">{r.orderBatch}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-800">{r.merchantName}</td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600">{r.gateway}</span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-slate-500">{r.settlementDate}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${s.bg} ${s.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-slate-600 tabular-nums">
                    {r.grossAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-red-600 tabular-nums">
                    ({r.gatewayFee.toLocaleString('en-US', { minimumFractionDigits: 2 })})
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                    PHP {r.netAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AccountsReceivablePage;
