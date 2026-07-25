import React, { useState } from 'react';

/**
 * Disbursement Management Module
 * Manages outbound payments such as payroll, vendor payouts, and fleet expenses.
 */

type DisbursementStatus = 'pending_execution' | 'processing' | 'completed' | 'failed';

interface DisbursementBatch {
  id: string;
  batchReference: string;
  category: string;
  totalAmount: number;
  recipientCount: number;
  bankAccount: string;
  scheduledDate: string;
  status: DisbursementStatus;
}

const STATUS_CONFIG: Record<DisbursementStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending_execution: { label: 'Pending',    bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  processing:        { label: 'Processing', bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  completed:         { label: 'Completed',  bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  failed:            { label: 'Failed',     bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500' },
};

export const DisbursementPage: React.FC = () => {
  const [filter, setFilter] = useState<'ALL' | DisbursementStatus>('ALL');

  const batches: DisbursementBatch[] = [
    { id: 'db-001', batchReference: 'PAYROLL-2026-M07', category: 'Payroll', totalAmount: 1450000, recipientCount: 45, bankAccount: 'BDO-Corp-8821', scheduledDate: '2026-07-30', status: 'pending_execution' },
    { id: 'db-002', batchReference: 'VEND-PAY-992', category: 'Supplier Payouts', totalAmount: 843700, recipientCount: 12, bankAccount: 'BPI-Trade-0092', scheduledDate: '2026-07-26', status: 'processing' },
    { id: 'db-003', batchReference: 'FLEET-EXP-21', category: 'Fleet Fuel', totalAmount: 12800, recipientCount: 4, bankAccount: 'Metrobank-Op-441', scheduledDate: '2026-07-25', status: 'completed' },
    { id: 'db-004', batchReference: 'LEGAL-RET-07', category: 'Legal Fees', totalAmount: 45000, recipientCount: 1, bankAccount: 'BDO-Corp-8821', scheduledDate: '2026-07-24', status: 'completed' },
    { id: 'db-005', batchReference: 'REFUND-BATCH-8', category: 'Customer Refunds', totalAmount: 18900, recipientCount: 8, bankAccount: 'UnionBank-Ecom-11', scheduledDate: '2026-07-25', status: 'failed' },
  ];

  const filtered = filter === 'ALL' ? batches : batches.filter((b) => b.status === filter);

  return (
    <div className="p-6 bg-slate-50 min-h-full space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Disbursement Management</h1>
        <p className="text-sm text-slate-500 mt-0.5">Outbound payment batches, payroll execution, and settlement tracking.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-150 p-4">
          <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Pending Execution</p>
          <p className="text-xl font-bold text-slate-900 font-mono tabular-nums">
            PHP {batches.filter(b => b.status === 'pending_execution').reduce((sum, b) => sum + b.totalAmount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-150 p-4 border-l-4 border-l-blue-500">
          <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Processing (Bank Queue)</p>
          <p className="text-xl font-bold text-slate-900 font-mono tabular-nums">
            PHP {batches.filter(b => b.status === 'processing').reduce((sum, b) => sum + b.totalAmount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-150 p-4 border-l-4 border-l-red-500">
          <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Failed Disbursements</p>
          <p className="text-xl font-bold text-slate-900 font-mono tabular-nums">
            PHP {batches.filter(b => b.status === 'failed').reduce((sum, b) => sum + b.totalAmount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5">
         {(['ALL', 'pending_execution', 'processing', 'completed', 'failed'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === key ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-gray-200'
            }`}
          >
            {key === 'ALL' ? `All (${batches.length})` : `${STATUS_CONFIG[key].label} (${batches.filter((b) => b.status === key).length})`}
          </button>
        ))}
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-xl border border-gray-150 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 text-[11px] text-slate-500 uppercase border-b border-gray-200 font-semibold tracking-wider">
            <tr>
              <th className="px-5 py-3">Batch Ref</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">Funding Account</th>
              <th className="px-5 py-3">Scheduled Date</th>
              <th className="px-5 py-3 text-center">Recipients</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((batch) => {
               const s = STATUS_CONFIG[batch.status];
               return (
                <tr key={batch.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5 font-mono font-semibold text-slate-700">{batch.batchReference}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-800">{batch.category}</td>
                  <td className="px-5 py-3.5 font-mono text-slate-500">{batch.bankAccount}</td>
                  <td className="px-5 py-3.5 text-slate-600">{batch.scheduledDate}</td>
                  <td className="px-5 py-3.5 text-center font-mono text-slate-600">{batch.recipientCount}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${s.bg} ${s.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                    PHP {batch.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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

export default DisbursementPage;
