import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search } from 'lucide-react';
import apiClient from '../../services/apiClient';

interface AuditLogEntry {
  id: string;
  transaction_id: string;
  anomaly_score: number;
  ai_decision: 'FLAGGED' | 'PASSED';
  flag_reason: string | null;
  created_at: string;
  transaction_code: string;
  source_module: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  transaction_status: string;
  description: string;
}

interface AuditSummary {
  total_logs: number;
  flagged: number;
  passed: number;
}

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'FLAGGED' | 'PASSED'>('ALL');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLogs = useCallback(async (search: string = '', decision: 'ALL' | 'FLAGGED' | 'PASSED' = 'ALL') => {
    try {
      setIsLoading(true);
      setError(null);

      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (decision !== 'ALL') params.decision = decision;

      const response = await apiClient.get('/dashboard/audit-logs', { params });

      setLogs(response.data?.data ?? []);
      setSummary(response.data?.summary ?? null);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Unable to connect to server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(searchTerm, activeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchLogs(value, activeFilter);
    }, 300);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    fetchLogs(searchTerm, activeFilter);
  };

  const formatDateTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(amount);
  };

  const filterButtons = [
    { key: 'ALL' as const, label: `All (${summary?.total_logs ?? 0})`, activeClass: 'bg-slate-900 text-white' },
    { key: 'FLAGGED' as const, label: `Flagged (${summary?.flagged ?? 0})`, activeClass: 'bg-red-600 text-white' },
    { key: 'PASSED' as const, label: `Passed (${summary?.passed ?? 0})`, activeClass: 'bg-emerald-600 text-white' },
  ];

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-4 py-3"><div className="h-3 w-28 bg-slate-100 rounded" /></td>
      <td className="px-4 py-3 space-y-1.5">
        <div className="h-3 w-28 bg-slate-100 rounded" />
        <div className="h-3 w-20 bg-slate-50 rounded" />
      </td>
      <td className="px-4 py-3"><div className="h-4 w-56 bg-slate-100 rounded" /></td>
      <td className="px-4 py-3"><div className="h-4 w-20 bg-slate-100 rounded ml-auto" /></td>
      <td className="px-4 py-3"><div className="h-5 w-16 bg-slate-100 rounded mx-auto" /></td>
    </tr>
  );

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-gray-200 dark:border-slate-700 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Audit Trail</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Every AI risk evaluation performed on incoming transactions.
          </p>
        </div>

        <div className="mt-4 md:mt-0 relative w-full md:w-80">
          <form onSubmit={handleSearchSubmit}>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by code, module, description..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder-slate-400 dark:placeholder-slate-500"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          </form>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-800 p-8 max-w-md text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Unable to Connect</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{error}</p>
            <button
              onClick={() => fetchLogs(searchTerm, activeFilter)}
              className="px-5 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </div>
      ) : (
        <>
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

          {/* Log Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider w-40">Evaluated At</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider w-44">Transaction / Module</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Description &amp; Reason</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-right w-32">Amount</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-center w-28">AI Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {isLoading ? (
                    <>
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                    </>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {searchTerm ? 'No logs match your search.' : 'No AI evaluations recorded yet.'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Every transaction ingested through the M2M endpoints generates an entry here.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3 align-top">
                          <p className="text-slate-900 dark:text-slate-100 font-medium whitespace-nowrap">{formatDateTime(log.created_at)}</p>
                        </td>
                        <td className="px-4 py-3 align-top space-y-1">
                          <p className="font-mono text-xs font-bold text-indigo-700">{log.transaction_code}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wide">{log.source_module.replace('_', ' ')}</p>
                        </td>
                        <td className="px-4 py-3 align-top max-w-md">
                          <p className="text-slate-800 dark:text-slate-200 text-sm mb-0.5 leading-snug">{log.description}</p>
                          {log.flag_reason && (
                            <p className="text-xs text-red-600 font-medium leading-snug pt-0.5">{log.flag_reason}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-right">
                          <span className="font-mono text-slate-900 dark:text-slate-100 whitespace-nowrap block">{formatCurrency(log.amount)}</span>
                          <span className={`inline-block mt-1.5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border ${
                            {
                              ai_flagged: 'bg-red-50 text-red-700 border-red-200',
                              pending_approval: 'bg-amber-50 text-amber-700 border-amber-200',
                              approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                              rejected: 'bg-slate-100 text-slate-600 border-slate-300',
                              posted: 'bg-blue-50 text-blue-700 border-blue-200',
                            }[log.transaction_status] || 'bg-gray-50 text-gray-600 border-gray-200'
                          }`}>
                            {{
                              ai_flagged: 'AI Flagged',
                              pending_approval: 'Pending Approval',
                              approved: 'Approved',
                              rejected: 'Rejected',
                              posted: 'Posted',
                            }[log.transaction_status] || log.transaction_status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold rounded-full border uppercase tracking-wider ${
                            log.ai_decision === 'FLAGGED'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {log.ai_decision} ({Math.round(Number(log.anomaly_score))}%)
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AuditLogPage;
