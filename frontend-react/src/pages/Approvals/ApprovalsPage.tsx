import React, { useState } from 'react';
import { Transaction } from '../../types/financial';

/**
 * Maker-Checker AI Approvals Dashboard Page
 * Allows Finance Managers and Super Admins to review AI recommendations,
 * analyze anomaly flags, and execute/reject GL postings.
 */
export const ApprovalsPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'FLAGGED' | 'PENDING'>('ALL');

  // Demonstration state matching AI Maker-Checker workflow
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
      status: 'ai_flagged_anomaly',
      aiConfidenceScore: 0.7450,
      aiSuggestedGlAccountId: 'gl-2100',
      aiSuggestedGlAccountName: '2100-AP - Accounts Payable Trade',
      aiAnomalyFlag: true,
      aiAnomalyReason: 'High-Value Transaction Threshold Exceeded (PHP 685,000.00). Requires mandatory Human Checker review.',
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
      aiSuggestedGlAccountId: 'gl-5100',
      aiSuggestedGlAccountName: '5100-EXP - Salaries & Executive Compensation',
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
      aiSuggestedGlAccountId: 'gl-4000',
      aiSuggestedGlAccountName: '4000-REV - E-Commerce Sales Revenue',
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
    if (activeFilter === 'FLAGGED') return t.status === 'ai_flagged_anomaly';
    if (activeFilter === 'PENDING') return t.status === 'pending_approval';
    return true;
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header Title Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-200 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Maker-Checker AI Approvals Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Human-in-the-loop verification hub. Review AI-categorized transactions and flag overrides before General Ledger posting.
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full border border-amber-200">
            {transactions.filter((t) => t.status === 'ai_flagged_anomaly').length} AI Flagged Anomalies
          </span>
          <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
            {transactions.filter((t) => t.status === 'pending_approval').length} Pending Human Check
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
            activeFilter === 'ALL'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-gray-200'
          }`}
        >
          All Items ({transactions.length})
        </button>
        <button
          onClick={() => setActiveFilter('FLAGGED')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
            activeFilter === 'FLAGGED'
              ? 'bg-red-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-gray-200'
          }`}
        >
          AI Flagged Anomalies ({transactions.filter((t) => t.status === 'ai_flagged_anomaly').length})
        </button>
        <button
          onClick={() => setActiveFilter('PENDING')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
            activeFilter === 'PENDING'
              ? 'bg-amber-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-gray-200'
          }`}
        >
          Pending Review ({transactions.filter((t) => t.status === 'pending_approval').length})
        </button>
      </div>

      {/* Transactions List Cards */}
      <div className="grid grid-cols-1 gap-4">
        {filteredTransactions.map((tx) => (
          <div
            key={tx.id}
            className={`bg-white rounded-xl shadow-sm border p-5 transition-all ${
              tx.status === 'ai_flagged_anomaly'
                ? 'border-red-200 bg-red-50/20'
                : tx.status === 'approved'
                ? 'border-emerald-200 bg-emerald-50/10'
                : 'border-gray-100'
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Left Column: Transaction Metadata */}
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md">
                    {tx.transactionCode}
                  </span>
                  <span className="text-xs font-medium text-slate-500 uppercase">
                    {tx.externalModule} • {tx.externalReferenceId}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tx.status === 'ai_flagged_anomaly'
                        ? 'bg-red-100 text-red-700'
                        : tx.status === 'pending_approval'
                        ? 'bg-amber-100 text-amber-700'
                        : tx.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {tx.status === 'ai_flagged_anomaly'
                      ? '⚠️ AI Flagged Anomaly'
                      : tx.status === 'pending_approval'
                      ? '⏳ Pending Human Checker'
                      : tx.status === 'approved'
                      ? '✅ Approved & Posted to GL'
                      : '❌ Rejected'}
                  </span>
                </div>

                <p className="text-sm font-semibold text-slate-900">{tx.description}</p>

                {/* AI Recommendation Box */}
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">
                      <strong>AI Suggested GL:</strong> {tx.aiSuggestedGlAccountName}
                    </span>
                    <span className="text-slate-500 font-mono">
                      Confidence Score: <strong>{(tx.aiConfidenceScore * 100).toFixed(1)}%</strong>
                    </span>
                  </div>

                  {tx.aiAnomalyFlag && (
                    <p className="text-red-600 font-medium pt-1">
                      <strong>Anomaly Reason:</strong> {tx.aiAnomalyReason}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Column: Amount & Actions */}
              <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 min-w-[200px]">
                <div className="text-left lg:text-right">
                  <p className="text-xs text-slate-500 uppercase font-medium">Total Amount</p>
                  <p className="text-xl font-bold text-slate-900 font-mono">
                    {tx.currency} {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                {tx.status !== 'approved' && tx.status !== 'rejected' && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleAction(tx.id, 'rejected')}
                      className="px-3.5 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors w-full sm:w-auto"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleAction(tx.id, 'approved')}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm w-full sm:w-auto"
                    >
                      Approve & Post GL
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApprovalsPage;
