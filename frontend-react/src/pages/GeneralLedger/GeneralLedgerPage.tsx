import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search } from 'lucide-react';
import apiClient from '../../services/apiClient';

interface GLEntry {
  id: string;
  entry_number: string;
  posted_at: string;
  description: string;
  account_name: string;
  debit: number;
  credit: number;
  reference_number: string;
  source_module: string;
  status: string;
}

interface GLSummary {
  total_entries: number;
  total_debit: number;
  total_credit: number;
  net: number;
}

export const GeneralLedgerPage: React.FC = () => {
  const [entries, setEntries] = useState<GLEntry[]>([]);
  const [summary, setSummary] = useState<GLSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchGL = useCallback(async (search: string = '', page: number = 1) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.get('/dashboard/gl', {
        params: { search: search || undefined, page },
      });

      const rows: GLEntry[] = response.data?.data ?? [];
      setEntries(rows);

      const backendSummary = response.data?.summary;
      if (backendSummary) {
        setSummary({
          total_entries: backendSummary.total_entries,
          total_debit: backendSummary.total_debit,
          total_credit: backendSummary.total_credit,
          net: backendSummary.total_credit - backendSummary.total_debit,
        });
      } else {
        const totalDebit = rows.reduce((sum, e) => sum + Number(e.debit || 0), 0);
        const totalCredit = rows.reduce((sum, e) => sum + Number(e.credit || 0), 0);

        setSummary({
          total_entries: rows.length,
          total_debit: totalDebit,
          total_credit: totalCredit,
          net: totalCredit - totalDebit,
        });
      }

      const backendMeta = response.data?.meta;
      if (backendMeta) {
        setTotalPages(backendMeta.last_page || 1);
        setCurrentPage(backendMeta.current_page || 1);
      }

    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Unable to connect to server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGL();
  }, [fetchGL]);

  // Debounced search — fires 300ms after the user stops typing
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchGL(value, 1);
    }, 300);
  };

  // Fallback: also search on Enter key
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    fetchGL(searchTerm, 1);
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getModuleBadge = (module: string) => {
    const modules: Record<string, string> = {
      HRMS: 'bg-pink-50 text-pink-700 border-pink-200',
      FLEET: 'bg-amber-50 text-amber-700 border-amber-200',
      SUPPLY_CHAIN: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      FACILITIES_LEGAL: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      ECOMMERCE_CORE: 'bg-violet-50 text-violet-700 border-violet-200',
      PROCUREMENT: 'bg-orange-50 text-orange-700 border-orange-200',
    };
    return modules[module] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  /** Skeleton row for loading state */
  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-4 py-3"><div className="h-4 w-20 bg-slate-100 rounded" /></td>
      <td className="px-4 py-3 space-y-1.5">
        <div className="h-3 w-28 bg-slate-100 rounded" />
        <div className="h-3 w-20 bg-slate-50 rounded" />
        <div className="h-4 w-14 bg-slate-100 rounded" />
      </td>
      <td className="px-4 py-3 space-y-1.5">
        <div className="h-4 w-40 bg-slate-100 rounded" />
        <div className="h-3 w-56 bg-slate-50 rounded" />
      </td>
      <td className="px-4 py-3"><div className="h-4 w-24 bg-slate-100 rounded ml-auto" /></td>
      <td className="px-4 py-3"><div className="h-4 w-24 bg-slate-100 rounded ml-auto" /></td>
      <td className="px-4 py-3"><div className="h-5 w-16 bg-slate-100 rounded mx-auto" /></td>
    </tr>
  );

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-gray-200 dark:border-slate-700 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">General Ledger</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Simplified journal entry view of all posted financial transactions.
          </p>
        </div>

        {/* Search Bar — instant debounced search */}
        <div className="mt-4 md:mt-0 relative w-full md:w-80">
          <form onSubmit={handleSearchSubmit}>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by entry, reference, module, description..."
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
              onClick={() => fetchGL(searchTerm, currentPage)}
              className="px-5 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Panel */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Entries</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{summary.total_entries}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Last Posted</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {entries.length > 0 ? formatDate(entries[0].posted_at) : 'N/A'}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Current Period</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          )}

          {/* Ledger Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider w-28">Date</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider w-44">Reference / Module</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Account & Description</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-right w-32">Debit</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-right w-32">Credit</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-center w-24">Status</th>
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
                  ) : entries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <p className="text-sm font-semibold text-slate-700">
                          {searchTerm ? 'No entries match your search.' : 'No journal entries found.'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {searchTerm ? 'Try adjusting your search terms.' : 'Approve transactions in the Approval Center to generate journal entries.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3 align-top">
                          <p className="text-slate-900 dark:text-slate-100 font-medium whitespace-nowrap">{formatDate(entry.posted_at)}</p>
                        </td>
                        <td className="px-4 py-3 align-top space-y-1">
                          <p className="font-mono text-xs font-bold text-indigo-700">{entry.entry_number}</p>
                          <p className="font-mono text-[10px] text-slate-500 truncate max-w-[160px]">{entry.reference_number}</p>
                          <span className={`inline-block px-2 py-0.5 border text-[9px] font-bold rounded ${getModuleBadge(entry.source_module)}`}>
                            {entry.source_module.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top max-w-md">
                          <p className="font-semibold text-slate-900 dark:text-white text-sm mb-0.5">{entry.account_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed break-words">{entry.description}</p>
                        </td>
                        <td className="px-4 py-3 align-top text-right">
                          {entry.debit > 0 ? (
                            <span className="font-mono text-slate-900 dark:text-slate-100 whitespace-nowrap">{formatCurrency(entry.debit)}</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-right">
                          {entry.credit > 0 ? (
                            <span className="font-mono text-slate-900 dark:text-slate-100 whitespace-nowrap">{formatCurrency(entry.credit)}</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-center">
                          <span className="inline-flex items-center px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200 uppercase tracking-wider">
                            {entry.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Totals Footer */}
                {!isLoading && summary && entries.length > 0 && (
                  <tfoot className="bg-slate-50 dark:bg-slate-700/50 border-t-2 border-gray-200 dark:border-slate-600">
                    <tr>
                      <td colSpan={3} className="px-4 py-4 text-right font-bold text-slate-900 dark:text-white uppercase text-xs tracking-wider">
                        Totals <span className="text-slate-400 dark:text-slate-500 font-normal normal-case">(Net: {formatCurrency(summary.net)})</span>
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(summary.total_debit)}
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(summary.total_credit)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Pagination Controls */}
            {!isLoading && totalPages > 1 && (
              <div className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => fetchGL(searchTerm, currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchGL(searchTerm, currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-slate-300">
                      Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => fetchGL(searchTerm, currentPage - 1)}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium text-gray-500 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50"
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        onClick={() => fetchGL(searchTerm, currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium text-gray-500 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50"
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default GeneralLedgerPage;
