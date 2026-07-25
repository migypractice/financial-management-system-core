import React, { useState } from 'react';

/**
 * Accounts Payable (AP) Module
 * Manages supplier/vendor invoices, aging analysis, and payout authorization.
 */

type APStatus = 'pending' | 'approved' | 'paid' | 'overdue';

interface PayableInvoice {
  id: string;
  vendorName: string;
  invoiceNumber: string;
  poReference: string;
  amount: number;
  dueDate: string;
  daysOutstanding: number;
  status: APStatus;
  department: string;
}

const STATUS_CONFIG: Record<APStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending:  { label: 'Pending',  bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  approved: { label: 'Approved', bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  paid:     { label: 'Paid',     bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  overdue:  { label: 'Overdue',  bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500' },
};

export const AccountsPayablePage: React.FC = () => {
  const [filter, setFilter] = useState<'ALL' | APStatus>('ALL');

  const invoices: PayableInvoice[] = [
    { id: 'ap-001', vendorName: 'Global Supplies Ltd', invoiceNumber: 'INV-2026-4401', poReference: 'PO-99421', amount: 685000, dueDate: '2026-08-15', daysOutstanding: 0, status: 'pending', department: 'Supply Chain' },
    { id: 'ap-002', vendorName: 'LogiTrans Freight Corp', invoiceNumber: 'INV-2026-4402', poReference: 'PO-88310', amount: 124500, dueDate: '2026-07-20', daysOutstanding: 5, status: 'overdue', department: 'Fleet' },
    { id: 'ap-003', vendorName: 'CloudHost PH Inc', invoiceNumber: 'INV-2026-4403', poReference: 'PO-77200', amount: 45000, dueDate: '2026-08-01', daysOutstanding: 0, status: 'approved', department: 'IT Infrastructure' },
    { id: 'ap-004', vendorName: 'Prime Office Rentals', invoiceNumber: 'INV-2026-4404', poReference: 'PO-66150', amount: 95000, dueDate: '2026-07-31', daysOutstanding: 0, status: 'paid', department: 'Facilities' },
    { id: 'ap-005', vendorName: 'SecurePay Gateway', invoiceNumber: 'INV-2026-4405', poReference: 'PO-55001', amount: 18700, dueDate: '2026-07-28', daysOutstanding: 0, status: 'pending', department: 'E-Commerce' },
  ];

  const agingBuckets = [
    { label: 'Current', range: '0-30 days', amount: 843700, count: 3, color: 'bg-emerald-500' },
    { label: '31-60 Days', range: '31-60 days', amount: 124500, count: 1, color: 'bg-amber-500' },
    { label: '61-90 Days', range: '61-90 days', amount: 0, count: 0, color: 'bg-orange-500' },
    { label: '90+ Days', range: 'Over 90 days', amount: 0, count: 0, color: 'bg-red-500' },
  ];

  const filtered = filter === 'ALL' ? invoices : invoices.filter((i) => i.status === filter);

  return (
    <div className="p-6 bg-slate-50 min-h-full space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Accounts Payable</h1>
        <p className="text-sm text-slate-500 mt-0.5">Supplier invoices, vendor aging analysis, and payout authorization.</p>
      </div>

      {/* Aging buckets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {agingBuckets.map((b) => (
          <div key={b.label} className="bg-white rounded-xl border border-gray-150 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">{b.label}</span>
              <span className={`w-2 h-2 rounded-full ${b.color}`} />
            </div>
            <p className="text-lg font-bold text-slate-900 font-mono tabular-nums">
              PHP {b.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">{b.count} invoice{b.count !== 1 ? 's' : ''} &middot; {b.range}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-1.5">
        {(['ALL', 'pending', 'approved', 'paid', 'overdue'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === key ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-gray-200'
            }`}
          >
            {key === 'ALL' ? `All (${invoices.length})` : `${STATUS_CONFIG[key].label} (${invoices.filter((i) => i.status === key).length})`}
          </button>
        ))}
      </div>

      {/* Invoice table */}
      <div className="bg-white rounded-xl border border-gray-150 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 text-[11px] text-slate-500 uppercase border-b border-gray-200 font-semibold tracking-wider">
            <tr>
              <th className="px-5 py-3">Vendor</th>
              <th className="px-5 py-3">Invoice #</th>
              <th className="px-5 py-3">PO Ref</th>
              <th className="px-5 py-3">Department</th>
              <th className="px-5 py-3">Due Date</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((inv) => {
              const s = STATUS_CONFIG[inv.status];
              return (
                <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-slate-800">{inv.vendorName}</td>
                  <td className="px-5 py-3.5 font-mono text-slate-600">{inv.invoiceNumber}</td>
                  <td className="px-5 py-3.5 font-mono text-slate-400">{inv.poReference}</td>
                  <td className="px-5 py-3.5 text-slate-500">{inv.department}</td>
                  <td className="px-5 py-3.5 font-mono text-slate-600">{inv.dueDate}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${s.bg} ${s.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                    PHP {inv.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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

export default AccountsPayablePage;
