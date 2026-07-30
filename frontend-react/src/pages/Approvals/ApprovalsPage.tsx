import React, { useState, useEffect, useCallback } from 'react';
import { Transaction, TransactionStatus } from '../../types/financial';
import { useAuth } from '../../context/AuthContext';

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
  const { user, token } = useAuth();

  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:8000/api/v1/dashboard/transactions', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.status === 401) {
        alert('Your session has expired. Please log in again.');
        window.location.reload();
        return;
      }
      
      if (response.status === 403) {
        throw new Error('Access Denied: You do not have permission to view transactions.');
      }
      
      if (!response.ok) throw new Error('Failed to fetch transactions');
      
      const json = await response.json();
      
      if (json.success) {
        const mapped = json.data.map((tx: any) => ({
          id: tx.id,
          transactionCode: tx.transaction_code,
          flowType: tx.type === 'INCOME' ? 'INBOUND' : 'OUTBOUND',
          categoryType: tx.category_type || 'UNKNOWN',
          externalModule: tx.source_module,
          externalReferenceId: tx.external_reference_id,
          amount: parseFloat(tx.amount),
          taxAmount: parseFloat(tx.tax_amount || 0),
          feeAmount: parseFloat(tx.fee_amount || 0),
          netAmount: parseFloat(tx.net_amount || 0),
          currency: tx.currency,
          description: tx.description,
          status: tx.status,
          aiConfidenceScore: parseFloat(tx.ai_confidence_score || 0),
          aiSuggestedGlAccountName: tx.ai_suggested_gl_name || 'N/A',
          aiAnomalyFlag: tx.ai_anomaly_flag === 1 || tx.ai_anomaly_flag === true,
          aiAnomalyReason: tx.ai_anomaly_reason,
          createdAt: tx.created_at,
          updatedAt: tx.updated_at,
        }));
        
        setTransactions(mapped);
      } else {
        throw new Error(json.message || 'Unknown error occurred');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to server. Please ensure the Laravel backend is running.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleAction = async (id: string, actionType: 'approve' | 'reject') => {
    if (actionInProgress) return; // Guard against double-click
    
    setActionInProgress(id);
    
    try {
      const response = await fetch(`http://localhost:8000/api/v1/dashboard/transactions/${id}/${actionType}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      const json = await response.json();
      
      if (!response.ok || !json.success) {
        setToast({ message: json.message || `Failed to ${actionType} transaction`, type: 'error' });
        return;
      }
      
      // Show success toast
      const successMsg = actionType === 'approve'
        ? '✓ Transaction Approved — Journal Entry Posted'
        : '✓ Transaction Rejected Successfully';
      setToast({ message: successMsg, type: 'success' });
      
      // Re-fetch from backend (source of truth) — preserves current filter
      await fetchTransactions();
    } catch (err) {
      setToast({ message: 'Network error while performing action.', type: 'error' });
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
    <div className="p-6 bg-slate-50 min-h-full">
      {/* Toast notification */}
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

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
        {filteredTransactions.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-700">No transactions match this filter.</p>
            <p className="text-xs text-slate-400 mt-1">
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
                className={`bg-white rounded-xl border p-5 transition-all hover:shadow-sm ${
                  isProcessing ? 'opacity-75' : ''
                } ${
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

                    {isActionable && (user?.role === 'finance_manager' || user?.role === 'super_admin') && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAction(tx.id, 'reject')}
                          disabled={isAnyProcessing}
                          className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-50"
                        >
                          {isProcessing ? 'Rejecting...' : 'Reject'}
                        </button>
                        <button
                          onClick={() => handleAction(tx.id, 'approve')}
                          disabled={isAnyProcessing}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-900 flex items-center gap-1.5"
                        >
                          {isProcessing && (
                            <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
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
