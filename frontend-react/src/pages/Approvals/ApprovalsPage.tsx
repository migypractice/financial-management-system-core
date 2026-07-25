import React, { useState } from 'react';
import { Transaction, TransactionStatus } from '../../types/financial';

/**
 * Maker-Checker AI Approvals Center
 *
 * Displays all pending, AI-flagged, and resolved transactions.
 * Finance Managers and Super Admins review AI recommendations here
 * before approving or rejecting GL postings.
 */

const STATUS_CONFIG: Record<TransactionStatus, { label: string; bg: string; text: string; dot: string }> = {
  ai_flagged:       { label: 'AI Flagged',    bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500' },
  pending_approval: { label: 'Pending Review', bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  approved:         { label: 'Approved',       bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  rejected:         { label: 'Rejected',       bg: 'bg-slate-100',  text: 'text-slate-600',   dot: 'bg-slate-400' },
  posted:           { label: 'Posted to GL',   bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  disbursed:        { label: 'Disbursed',      bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500' },
};

const ConfidenceBar: React.FC<{ score: number }> = ({ score }) => {
  const pct = Math.round(score * 100);
  let barColor = 'bg-emerald-500';
  if (pct < 85) barColor = 'bg-red-500';
  else if (pct < 92) barColor = 'bg-amber-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-mono font-semibold text-slate-600 tabular-nums w-10 text-right">{pct}%</span>
    </div>
  );
};

export const ApprovalsPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'FLAGGED' | 'PENDING'>('ALL');

  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: 'tx-001',
      transactionCode: 'TXN-2026-8801',
      flowType: 'OUTBOUND',
      categoryType: 'SUPPLIER_INVOICE',
      externalModule: 'SUPPLY_CHAIN',
      externalReferenceId: 'PO-99421',
      amount: 685000.00,
      taxAmount: 82200.00,
      feeAmount: 0.00,
      netAmount: 602800.00,
      currency: 'PHP',
      payeeAccount: 'ACC-8831-SUPPLIER-INC',
      description: 'Bulk raw inventory procurement from Global Supplies Ltd (High Value)',
      status: 'ai_flagged',
      aiConfidenceScore: 0.7450,
      aiSuggestedGlAccountName: '2100-AP — Accounts Payable Trade',
      aiAnomalyFlag: true,
      aiAnomalyReason: 'High-value transaction (PHP 685,000.00) exceeds threshold. Requires mandatory human review.',
      createdAt: '2026-07-25 19:30:00',
      updatedAt: '2026-07-25 19:30:00',
    },
    {
      id: 'tx-002',
      transactionCode: 'TXN-2026-8802',
      flowType: 'OUTBOUND',
      categoryType: 'PAYROLL_SALARY',
      externalModule: 'HRMS',
      externalReferenceId: 'PAYROLL-2026-M07',
      amount: 145000.00,
      taxAmount: 18000.00,
      feeAmount: 0.00,
      netAmount: 127000.00,
      currency: 'PHP',
      payeeAccount: 'ACC-PAYROLL-BNK',
      description: 'July 2026 Mid-month executive claim disbursement batch',
      status: 'pending_approval',
      aiConfidenceScore: 0.9650,
      aiSuggestedGlAccountName: '5100-EXP — Salaries and Compensation',
      aiAnomalyFlag: false,
      createdAt: '2026-07-25 20:15:00',
      updatedAt: '2026-07-25 20:15:00',
    },
    {
      id: 'tx-003',
      transactionCode: 'TXN-2026-8803',
      flowType: 'INBOUND',
      categoryType: 'SALES_REVENUE',
      externalModule: 'ECOMMERCE_CORE',
      externalReferenceId: 'ORD-998241',
      amount: 45000.00,
      taxAmount: 5400.00,
      feeAmount: 900.00,
      netAmount: 38700.00,
      currency: 'PHP',
      payerAccount: 'GATEWAY-PAYPAL-STRIPE',
      description: 'Settlement for E-Commerce Marketplace Order batch #ORD-998241',
      status: 'pending_approval',
      aiConfidenceScore: 0.9880,
      aiSuggestedGlAccountName: '4000-REV — E-Commerce Sales Revenue',
      aiAnomalyFlag: false,
      createdAt: '2026-07-25 20:45:00',
      updatedAt: '2026-07-25 20:45:00',
    },
  ]);

  const handleAction = (id: string, newStatus: 'approved' | 'rejected') => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );
  };

  const filteredTransactions = transactions.filter((t) => {
    if (activeFilter === 'FLAGGED') return t.status === 'ai_flagged';
    if (activeFilter === 'PENDING') return t.status === 'pending_approval';
    return true;
  });

  const flaggedCount = transactions.filter((t) => t.status === 'ai_flagged').length;
  const pendingCount = transactions.filter((t) => t.status === 'pending_approval').length;

  const filterButtons = [
    { key: 'ALL' as const, label: `All (${transactions.length})`, activeClass: 'bg-slate-900 text-white' },
    { key: 'FLAGGED' as const, label: `Flagged (${flaggedCount})`, activeClass: 'bg-red-600 text-white' },
    { key: 'PENDING' as const, label: `Pending (${pendingCount})`, activeClass: 'bg-amber-600 text-white' },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-full">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-gray-200 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Approval Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Review AI-categorized transactions before General Ledger posting.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-3 md:mt-0">
          {flaggedCount > 0 && (
            <span className="px-2.5 py-1 bg-red-50 text-red-700 text-[11px] font-semibold rounded-full border border-red-200">
              {flaggedCount} flagged
            </span>
          )}
          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[11px] font-semibold rounded-full border border-blue-200">
            {pendingCount} pending
          </span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-5">
        {filterButtons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => setActiveFilter(btn.key)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeFilter === btn.key
                ? btn.activeClass
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-gray-200'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Transaction cards */}
      <div className="space-y-3">
        {filteredTransactions.map((tx) => {
          const statusCfg = STATUS_CONFIG[tx.status];
          const isActionable = tx.status === 'pending_approval' || tx.status === 'ai_flagged';

          return (
            <div
              key={tx.id}
              className={`bg-white rounded-xl border p-5 transition-all hover:shadow-sm ${
                tx.status === 'ai_flagged'
                  ? 'border-red-200'
                  : tx.status === 'approved' || tx.status === 'posted'
                  ? 'border-emerald-200'
                  : 'border-gray-150'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                {/* Left: metadata */}
                <div className="flex-1 min-w-0 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                      {tx.transactionCode}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {tx.externalModule} / {tx.externalReferenceId}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${statusCfg.bg} ${statusCfg.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                      {statusCfg.label}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-slate-800 leading-snug">{tx.description}</p>

                  {/* AI recommendation panel */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>
                        Suggested GL: <strong className="text-slate-800">{tx.aiSuggestedGlAccountName}</strong>
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500 mb-1">AI Confidence</p>
                      <ConfidenceBar score={tx.aiConfidenceScore} />
                    </div>
                    {tx.aiAnomalyFlag && tx.aiAnomalyReason && (
                      <p className="text-xs text-red-600 font-medium leading-snug pt-0.5">
                        {tx.aiAnomalyReason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: amount + actions */}
                <div className="flex flex-col items-start lg:items-end gap-3 shrink-0 lg:min-w-[180px]">
                  <div className="lg:text-right">
                    <p className="text-[11px] text-slate-400 uppercase font-medium tracking-wide">Amount</p>
                    <p className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                      {tx.currency} {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  {isActionable && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAction(tx.id, 'rejected')}
                        className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleAction(tx.id, 'approved')}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        Approve
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ApprovalsPage;
