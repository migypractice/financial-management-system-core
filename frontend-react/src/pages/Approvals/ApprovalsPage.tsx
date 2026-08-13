import React, { useState, useEffect, useCallback } from 'react';
import { Transaction, TransactionStatus } from '../../types/financial';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/apiClient';

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
  let label = 'High';
  if (pct < 70) { barColor = 'bg-red-500'; label = 'Low'; }
  else if (pct < 90) { barColor = 'bg-amber-500'; label = 'Medium'; }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[11px] font-mono font-semibold tabular-nums w-16 text-right ${
        pct < 70 ? 'text-red-600' : pct < 90 ? 'text-amber-600' : 'text-emerald-600'
      }`}>{pct}% {label}</span>
    </div>
  );
};

/** Toast notification component */
const Toast: React.FC<{ message: string; type: 'success' | 'error'; onDismiss: () => void }> = ({ message, type, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all ${
      type === 'success'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-red-50 text-red-700 border-red-200'
    }`}>
      {type === 'success' ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
      )}
      {message}
    </div>
  );
};

export const ApprovalsPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'FLAGGED' | 'PENDING'>('ALL');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { user } = useAuth();

  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.get('/dashboard/transactions');
      const rows: any[] = response.data?.data ?? [];

      const mapped: Transaction[] = rows.map((row) => ({
        id: row.id,
        transactionCode: row.transaction_code,
        flowType: row.type === 'INCOME' ? 'INBOUND' : 'OUTBOUND',
        categoryType: row.type,
        externalModule: row.source_module,
        externalReferenceId: row.external_reference_id,
        amount: Number(row.amount),
        taxAmount: Number(row.tax_amount ?? 0),
        feeAmount: Number(row.fee_amount ?? 0),
        netAmount: Number(row.net_amount ?? 0),
        currency: row.currency,
        description: row.description,
        status: row.status,
        aiConfidenceScore: Number(row.ai_confidence_score ?? 0),
        aiSuggestedGlAccountId: row.ai_suggested_gl_code,
        aiSuggestedGlAccountName: row.ai_suggested_gl_name,
        aiAnomalyFlag: !!row.ai_anomaly_flag,
        aiAnomalyReason: row.ai_anomaly_reason,
        approvedBy: row.approved_by,
        approvedAt: row.approved_at,
        postedAt: row.posted_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      setTransactions(mapped);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Unable to connect to server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleAction = async (id: string, actionType: 'approve' | 'reject') => {
    if (actionInProgress) return; // Guard against double-click

    setActionInProgress(id);

    try {
      await apiClient.post(`/dashboard/transactions/${id}/${actionType}`);

      await fetchTransactions();

      setToast({
        message: actionType === 'approve' ? 'Transaction approved successfully.' : 'Transaction rejected successfully.',
        type: 'success',
      });
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Network error while performing action.', type: 'error' });
    } finally {
      setActionInProgress(null);
    }
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

  if (isLoading) {
    return (
      <div className="p-6 bg-slate-50 min-h-full">
        <div className="pb-5 border-b border-gray-200 mb-6">
          <div className="h-6 w-48 bg-slate-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-80 bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
              <div className="flex justify-between">
                <div className="space-y-3 flex-1">
                  <div className="h-4 w-64 bg-slate-100 rounded" />
                  <div className="h-3 w-48 bg-slate-50 rounded" />
                  <div className="h-12 w-full bg-slate-50 rounded-lg" />
                </div>
                <div className="h-8 w-24 bg-slate-100 rounded-lg ml-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-slate-50 min-h-full flex flex-col items-center justify-center">
        <div className="bg-white rounded-xl border border-red-200 p-8 max-w-md text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Unable to Connect</h3>
          <p className="text-sm text-slate-500 mb-4">{error}</p>
          <button onClick={fetchTransactions} className="px-5 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full">
      {/* Toast notification */}
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-gray-200 dark:border-slate-700 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Approval Center</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
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
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Transaction cards */}
      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No transactions match this filter.</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {activeFilter === 'PENDING' ? 'All transactions have been reviewed.' :
               activeFilter === 'FLAGGED' ? 'No AI-flagged anomalies detected.' :
               'No transactions found in the system.'}
            </p>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const statusCfg = STATUS_CONFIG[tx.status];
            const isActionable = tx.status === 'pending_approval' || tx.status === 'ai_flagged';
            const isProcessing = actionInProgress === tx.id;
            const isAnyProcessing = actionInProgress !== null;

            return (
              <div
                key={tx.id}
                className={`bg-white dark:bg-slate-800 rounded-xl border p-5 transition-all hover:shadow-sm ${
                  isProcessing ? 'opacity-75' : ''
                } ${
                  tx.status === 'ai_flagged'
                    ? 'border-red-200'
                    : tx.status === 'approved' || tx.status === 'posted'
                    ? 'border-emerald-200'
                    : 'border-gray-150 dark:border-slate-700'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left: metadata */}
                  <div className="flex-1 min-w-0 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded">
                        {tx.transactionCode}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                        {tx.externalModule} / {tx.externalReferenceId}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${statusCfg.bg} ${statusCfg.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug">{tx.description}</p>

                    {/* AI recommendation panel */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                        <span>
                          Suggested GL: <strong className="text-slate-800 dark:text-white">{tx.aiSuggestedGlAccountName}</strong>
                        </span>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">AI Confidence</p>
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
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 uppercase font-medium tracking-wide">Amount</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                        {tx.currency} {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    {isActionable && (user?.role === 'finance_manager' || user?.role === 'super_admin') && (
                      <div className="flex items-center gap-2 w-full lg:w-auto mt-2 lg:mt-0">
                        <button
                          onClick={() => handleAction(tx.id, 'reject')}
                          disabled={isAnyProcessing}
                          className="flex-1 lg:flex-none flex items-center justify-center px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-50"
                        >
                          {isProcessing ? 'Rejecting...' : 'Reject'}
                        </button>
                        <button
                          onClick={() => handleAction(tx.id, 'approve')}
                          disabled={isAnyProcessing}
                          className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-900"
                        >
                          {isProcessing && (
                            <svg className="w-3 h-3 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                              <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
                            </svg>
                          )}
                          {isProcessing ? 'Processing...' : 'Approve'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ApprovalsPage;
