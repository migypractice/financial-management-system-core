import React, { useState, useEffect, useCallback } from 'react';
import { Transaction } from '../../types/financial';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/apiClient';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { SupportingDocumentModal } from '../../components/ui/SupportingDocumentModal';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Clock, RefreshCw, FileText } from 'lucide-react';

/**
 * Maker-Checker AI Approvals Center
 * Displays all pending, AI-flagged, and resolved transactions.
 * Finance Managers and Super Admins review AI recommendations here
 * before approving or rejecting GL postings.
 */

const ConfidenceBar: React.FC<{ score: number }> = ({ score }) => {
  const pct = Math.round(score * 100);
  let barColor = 'bg-emerald-500';
  let label = 'High';
  if (pct < 70) { barColor = 'bg-rose-500'; label = 'Low'; }
  else if (pct < 90) { barColor = 'bg-amber-500'; label = 'Medium'; }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[11px] font-mono font-semibold tabular-nums w-16 text-right ${
        pct < 70 ? 'text-rose-600 dark:text-rose-400' : pct < 90 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
      }`}>{pct}% {label}</span>
    </div>
  );
};

/** Toast notification component */
const Toast: React.FC<{ message: string; type: 'success' | 'error'; onDismiss: () => void }> = ({ message, type, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl border text-sm font-semibold transition-all animate-slideInRight ${
      type === 'success'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
        : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
    }`}>
      {type === 'success' ? (
        <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
      ) : (
        <AlertTriangle size={16} className="text-rose-600 dark:text-rose-400" />
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState({ all: 0, flagged: 0, pending: 0 });
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean; tx: Transaction | null }>({
    isOpen: false,
    tx: null,
  });
  const [selectedDocTx, setSelectedDocTx] = useState<Transaction | null>(null);

  const { user } = useAuth();

  const fetchTransactions = useCallback(async (filter: string = 'ALL', page: number = 1) => {
    try {
      setIsLoading(true);
      setError(null);

      const statusParam = filter === 'ALL' ? 'all' : (filter === 'FLAGGED' ? 'ai_flagged' : 'pending_approval');
      const response = await apiClient.get('/dashboard/transactions', {
        params: { status: statusParam, page }
      });
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
        createdBy: row.created_by,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
      }));

      setTransactions(mapped);

      const meta = response.data?.meta;
      if (meta) {
        setCurrentPage(meta.current_page || 1);
        setTotalPages(meta.last_page || 1);
      }

      const summary = response.data?.summary;
      if (summary) {
        setCounts({
          all: summary.all_count || 0,
          flagged: summary.flagged_count || 0,
          pending: summary.pending_count || 0,
        });
      }

    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Unable to connect to server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions('ALL', 1);
  }, [fetchTransactions]);

  const handleAction = async (id: string, actionType: 'approve' | 'reject') => {
    if (actionInProgress) return; // Guard against accidental double-click

    setActionInProgress(id);

    try {
      await apiClient.post(`/dashboard/transactions/${id}/${actionType}`);
      await fetchTransactions(activeFilter, currentPage);

      setToast({
        message: actionType === 'approve' ? 'Transaction approved & sent to GL.' : 'Transaction rejected.',
        type: 'success',
      });
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Network error while performing action.', type: 'error' });
    } finally {
      setActionInProgress(null);
      setRejectModal({ isOpen: false, tx: null });
    }
  };

  const handleFilterChange = (filter: 'ALL' | 'FLAGGED' | 'PENDING') => {
    setActiveFilter(filter);
    fetchTransactions(filter, 1);
  };

  const filterButtons = [
    { key: 'ALL' as const, label: `All Transactions (${counts.all})`, activeClass: 'bg-indigo-600 text-white shadow-xs' },
    { key: 'FLAGGED' as const, label: `AI Flagged (${counts.flagged})`, activeClass: 'bg-rose-600 text-white shadow-xs' },
    { key: 'PENDING' as const, label: `Pending Review (${counts.pending})`, activeClass: 'bg-amber-600 text-white shadow-xs' },
  ];

  if (isLoading && transactions.length === 0) {
    return (
      <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-4">
        <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        <div className="h-16 w-full bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error && transactions.length === 0) {
    return (
      <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full flex flex-col items-center justify-center">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-rose-200 dark:border-rose-800 p-8 max-w-md text-center shadow-lg">
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-rose-500" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Unable to Load Queue</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{error}</p>
          <button
            onClick={() => fetchTransactions(activeFilter, currentPage)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6">
      {/* Toast notification */}
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      {/* Confirmation Dialog for Destructive Rejection */}
      <ConfirmModal
        isOpen={rejectModal.isOpen}
        title="Reject Transaction Posting"
        message={`Are you sure you want to reject transaction ${rejectModal.tx?.transactionCode} (${rejectModal.tx?.currency} ${rejectModal.tx?.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })})? This will cancel posting to the General Ledger and log an audit rejection.`}
        confirmText="Confirm Rejection"
        cancelText="Cancel"
        confirmVariant="danger"
        isLoading={actionInProgress === rejectModal.tx?.id}
        onConfirm={() => rejectModal.tx && handleAction(rejectModal.tx.id, 'reject')}
        onCancel={() => setRejectModal({ isOpen: false, tx: null })}
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Transaction Approvals & Disbursement Authorization
            </h1>
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              Maker-Checker Protocol
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Verify supporting documents, review AI anomaly evaluations, and authorize general ledger postings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {counts.flagged > 0 && (
            <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-800/60 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              {counts.flagged} AI Flagged
            </span>
          )}
          <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-xl border border-amber-200 dark:border-amber-800/60 flex items-center gap-1">
            <Clock size={12} />
            {counts.pending} Pending
          </span>
          <button
            onClick={() => fetchTransactions(activeFilter, currentPage)}
            className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Refresh Queue"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-indigo-500' : ''} />
          </button>
        </div>
      </div>

      {/* Enterprise Operational Summary Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-indigo-900/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-indigo-500/20 text-indigo-300 rounded-md border border-indigo-500/30">
              Internal Control Active
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Policy: Supporting Document Verification Required
            </span>
          </div>
          <h2 className="text-sm sm:text-base font-bold text-white">
            General Ledger Authorization & Voucher Queue
          </h2>
          <p className="text-xs text-slate-300">
            Click <strong>"View Supporting Document"</strong> on any transaction to inspect vendor invoices, receipts, and line-item breakdowns before signing off.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700/70 text-center min-w-[105px]">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Pending</p>
            <p className="text-lg font-bold font-mono text-amber-400">{counts.pending}</p>
          </div>
          <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700/70 text-center min-w-[105px]">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">AI Flagged</p>
            <p className="text-lg font-bold font-mono text-rose-400">{counts.flagged}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {filterButtons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => handleFilterChange(btn.key)}
            className={`px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeFilter === btn.key
                ? btn.activeClass
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Transaction Cards List */}
      <div className="space-y-3.5">
        {transactions.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No transactions require approval in this queue.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {activeFilter === 'PENDING' ? 'All inbound and outbound vouchers have been verified.' :
               activeFilter === 'FLAGGED' ? 'No AI-flagged anomaly transactions detected.' :
               'No transaction records found.'}
            </p>
          </div>
        ) : (
          transactions.map((tx) => {
            const isActionable = tx.status === 'pending_approval' || tx.status === 'ai_flagged';
            const isProcessing = actionInProgress === tx.id;
            const isAnyProcessing = actionInProgress !== null;
            const isMaker = tx.createdBy === user?.id;

            return (
              <div
                key={tx.id}
                className={`card-hover bg-white dark:bg-slate-800 rounded-2xl border p-4 sm:p-5 shadow-xs transition-all ${
                  isProcessing ? 'opacity-70 pointer-events-none' : ''
                } ${
                  tx.status === 'ai_flagged'
                    ? 'border-rose-200 dark:border-rose-800/80'
                    : tx.status === 'approved' || tx.status === 'posted'
                    ? 'border-emerald-200 dark:border-emerald-800/80'
                    : 'border-slate-200 dark:border-slate-700/80'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left: Metadata & Details */}
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md">
                        {tx.transactionCode}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                        {new Date(tx.createdAt).toLocaleString()}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700">
                        {tx.externalModule} &bull; {tx.externalReferenceId || 'DIRECT'}
                      </span>
                      <StatusBadge status={tx.status} />
                    </div>

                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                      {tx.description}
                    </p>

                    {/* Supporting Document Viewer Trigger */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setSelectedDocTx(tx)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/80 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 transition-all cursor-pointer shadow-2xs hover:border-indigo-400"
                      >
                        <FileText size={13} className="text-indigo-600 dark:text-indigo-400" />
                        <span>View Supporting Document</span>
                      </button>

                      {tx.aiAnomalyFlag && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">
                          <AlertTriangle size={12} />
                          <span>Audit Review Required</span>
                        </span>
                      )}
                    </div>

                    {/* AI Recommendation Box */}
                    <div className="p-3.5 bg-slate-50/80 dark:bg-slate-700/30 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                        <span className="text-slate-600 dark:text-slate-300">
                          AI Suggested GL Account:{' '}
                          <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">
                            {tx.aiSuggestedGlAccountId ? `${tx.aiSuggestedGlAccountId} - ` : ''}{tx.aiSuggestedGlAccountName || 'General Operating'}
                          </strong>
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">
                          <span>AI Classification Confidence</span>
                        </div>
                        <ConfidenceBar score={tx.aiConfidenceScore} />
                      </div>

                      {tx.aiAnomalyFlag && tx.aiAnomalyReason && (
                        <div className="flex items-start gap-1.5 pt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                          <span>{tx.aiAnomalyReason}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Amount & Maker-Checker Actions */}
                  <div className="flex flex-col items-start lg:items-end justify-between gap-3 shrink-0 lg:min-w-[200px]">
                    <div className="lg:text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Voucher Amount
                      </p>
                      <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                        {tx.currency} {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    {isActionable && (user?.role === 'finance_manager' || user?.role === 'super_admin') && (
                      <div className="flex items-center gap-2 w-full lg:w-auto mt-1">
                        {isMaker ? (
                          <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-700/60 rounded-xl border border-slate-200 dark:border-slate-600">
                            <Clock size={13} /> Maker-Checker: Secondary manager required
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setRejectModal({ isOpen: true, tx })}
                              disabled={isAnyProcessing}
                              className="flex-1 lg:flex-none px-3.5 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl border border-rose-200 dark:border-rose-800 transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAction(tx.id, 'approve')}
                              disabled={isAnyProcessing}
                              className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-600/20 transition-all disabled:opacity-50"
                            >
                              {isProcessing && (
                                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                                  <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
                                </svg>
                              )}
                              <span>{isProcessing ? 'Posting...' : 'Approve & Post'}</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {isActionable && !(user?.role === 'finance_manager' || user?.role === 'super_admin') && (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
                        <Clock size={13} /> Awaiting Manager Review
                      </span>
                    )}

                    {!isActionable && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <CheckCircle2 size={13} className="text-emerald-500" />
                        {tx.status === 'posted' ? 'Posted to GL' : 'Processed'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {!isLoading && totalPages > 1 && (
        <div className="mt-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-2xl flex items-center justify-between sm:px-6 shadow-xs">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => fetchTransactions(activeFilter, currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400 self-center">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => fetchTransactions(activeFilter, currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Showing page <span className="font-bold">{currentPage}</span> of <span className="font-bold">{totalPages}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchTransactions(activeFilter, currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => fetchTransactions(activeFilter, currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supporting Document / Voucher Inspection Modal */}
      {selectedDocTx && (
        <SupportingDocumentModal
          tx={selectedDocTx}
          onClose={() => setSelectedDocTx(null)}
          onApprove={() => {
            const id = selectedDocTx.id;
            setSelectedDocTx(null);
            handleAction(id, 'approve');
          }}
          onReject={() => {
            const tx = selectedDocTx;
            setSelectedDocTx(null);
            setRejectModal({ isOpen: true, tx });
          }}
          isActionable={
            (selectedDocTx.status === 'pending_approval' || selectedDocTx.status === 'ai_flagged') &&
            (user?.role === 'finance_manager' || user?.role === 'super_admin') &&
            selectedDocTx.createdBy !== user?.id
          }
          isProcessing={actionInProgress === selectedDocTx.id}
        />
      )}
    </div>
  );
};

export default ApprovalsPage;
