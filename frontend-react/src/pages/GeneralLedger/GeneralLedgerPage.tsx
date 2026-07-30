import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Search } from 'lucide-react';

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
}

export const GeneralLedgerPage: React.FC = () => {
  const [entries, setEntries] = useState<GLEntry[]>([]);
  const [summary, setSummary] = useState<GLSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { token, logout } = useAuth();

  const fetchGL = async (search: string = '') => {
    try {
      setIsLoading(true);
      setError(null);
      
      const queryParam = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await fetch(`http://localhost:8000/api/v1/dashboard/gl${queryParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.status === 401) {
        alert('Your session has expired. Please log in again.');
        logout();
        return;
      }
      
      if (response.status === 403) {
        throw new Error('Access Denied: You do not have permission to view the General Ledger.');
      }
      
      if (!response.ok) throw new Error('Failed to fetch General Ledger data');
      
      const json = await response.json();
      
      if (json.success) {
        setEntries(json.data);
        setSummary(json.summary);
      } else {
        throw new Error(json.message || 'Unknown error occurred');
      }
    } catch (err: any) {
      setError(err.message || 'Network error while reaching API.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchGL();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGL(searchTerm);
  };

  // Safe formatting for dates
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      return isoString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
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
    };
    return modules[module] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="p-6 bg-slate-50 min-h-full">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-gray-200 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">General Ledger</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Simplified journal entry view of all posted financial transactions.
          </p>
        </div>
        
        {/* Search Bar */}
        <div className="mt-4 md:mt-0 relative w-full md:w-80">
          <form onSubmit={handleSearch}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reference, description..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          </form>
        </div>
      </div>

      {error ? (
        <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => fetchGL(searchTerm)}
            className="mt-3 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Summary Panel */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Entries</p>
                <p className="text-2xl font-bold text-slate-900">{summary.total_entries}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Last Posted</p>
                <p className="text-xl font-bold text-slate-900">
                  {entries.length > 0 ? formatDate(entries[0].posted_at) : 'N/A'}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Current Period</p>
                <p className="text-xl font-bold text-slate-900">
                  {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          )}

          {/* Ledger Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Reference / Module</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Account & Description</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider text-right">Debit</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider text-right">Credit</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-medium">
                        <div className="animate-pulse">Loading Ledger Entries...</div>
                      </td>
                    </tr>
                  ) : entries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No journal entries found.
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 align-top">
                          <p className="text-slate-900 font-medium">{formatDate(entry.posted_at)}</p>
                        </td>
                        <td className="px-4 py-3 align-top space-y-1">
                          <p className="font-mono text-xs font-bold text-indigo-700">{entry.entry_number}</p>
                          <p className="font-mono text-[10px] text-slate-500">{entry.reference_number}</p>
                          <span className={`inline-block px-2 py-0.5 border text-[9px] font-bold rounded ${getModuleBadge(entry.source_module)}`}>
                            {entry.source_module.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top max-w-md">
                          <p className="font-semibold text-slate-900 text-sm mb-0.5">{entry.account_name}</p>
                          <p className="text-xs text-slate-500 leading-relaxed">{entry.description}</p>
                        </td>
                        <td className="px-4 py-3 align-top text-right">
                          {entry.debit > 0 ? (
                            <span className="font-mono text-slate-900">{formatCurrency(entry.debit)}</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-right">
                          {entry.credit > 0 ? (
                            <span className="font-mono text-slate-900">{formatCurrency(entry.credit)}</span>
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
                {!isLoading && summary && (
                  <tfoot className="bg-slate-50 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={3} className="px-4 py-4 text-right font-bold text-slate-900 uppercase text-xs tracking-wider">
                        Totals
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(summary.total_debit)}
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(summary.total_credit)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GeneralLedgerPage;
