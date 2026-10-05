import React, { useEffect, useState, useMemo } from 'react';
import {
  DollarSign,
  Search,
  Eye,
  Calendar,
  Building2,
  Receipt,
  CheckCircle2,
  RefreshCw,
  ArrowDownLeft,
  FileCheck
} from 'lucide-react';
import { arService, CollectionItem, CollectionSummary } from '../../services/arService';
import { DocumentPreviewModal } from '../../components/ui/DocumentPreviewModal';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';

export const CollectionPage: React.FC = () => {
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [summary, setSummary] = useState<CollectionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Preview Modal
  const [previewDoc, setPreviewDoc] = useState<{
    isOpen: boolean;
    url: string | null;
    name?: string;
    mime?: string;
    type?: string;
  }>({ isOpen: false, url: null });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await arService.getCollections();
      setCollections(res.data || []);
      setSummary(res.summary || null);
    } catch (err) {
      console.error('Failed to load collections:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      setRefreshing(true);
      const res = await arService.getCollections();
      setCollections(res.data || []);
      setSummary(res.summary || null);
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalCollected = summary?.total_collected || collections.reduce((sum, c) => sum + c.amount, 0);

  const filteredCollections = useMemo(() => {
    return collections.filter((c) => {
      const matchSearch =
        c.collection_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.invoice_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.reference_number || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [collections, searchQuery]);

  if (loading) return <SkeletonLoader />;

  return (
    <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Cash Collections & Inflow</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Reconciled bank deposits, customer payment settlements, and verified proof of payments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
            title="Refresh Collections"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-500 dark:text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Inflow Collected</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            PHP {totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{collections.length} deposit settlements</p>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500/80" />
        </div>

        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Bank Accounts Active</span>
            <Building2 className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">4 Inflow Channels</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">BDO, BPI, UnionBank, Metrobank</p>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-500/80" />
        </div>

        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">Official Receipts Attached</span>
            <FileCheck className="w-4 h-4 text-teal-500" />
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {collections.filter((c) => c.attachments && c.attachments.length > 0).length} Verified
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Proof of deposit & OR docs</p>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-teal-500/80" />
        </div>
      </div>

      {/* Search and Table */}
      <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search receipt #, customer, or invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">Showing {filteredCollections.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/90 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                <th className="py-3.5 px-4">Receipt # & Date</th>
                <th className="py-3.5 px-4">Customer & Settled Invoice</th>
                <th className="py-3.5 px-4">Deposit Bank Account</th>
                <th className="py-3.5 px-4">Method & Ref #</th>
                <th className="py-3.5 px-4 text-right">Amount Deposited</th>
                <th className="py-3.5 px-4">Collected By</th>
                <th className="py-3.5 px-4 text-center">Proof of Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredCollections.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Receipt className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-600 mb-2" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No collection records found</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Collect invoice payments from the Accounts Receivable page.</p>
                  </td>
                </tr>
              ) : (
                filteredCollections.map((c) => {
                  const hasDoc = c.attachments && c.attachments.length > 0;
                  const firstDoc = hasDoc ? c.attachments[0] : null;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold text-slate-900 dark:text-slate-200 block">{c.collection_number}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {c.collection_date}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-900 dark:text-white block">{c.customer_name}</span>
                        {c.invoice_number && (
                          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                            Invoice #{c.invoice_number}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-medium text-indigo-600 dark:text-indigo-300 block">{c.bank_name}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{c.account_name}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 block w-fit">
                          {c.payment_method}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                          {c.reference_number || 'N/A'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        PHP {c.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-slate-800 dark:text-slate-300 block font-medium">{c.collected_by_name || 'Staff'}</span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {hasDoc && firstDoc ? (
                          <button
                            onClick={() =>
                              setPreviewDoc({
                                isOpen: true,
                                url: firstDoc.file_url,
                                name: firstDoc.file_name,
                                mime: firstDoc.mime_type,
                                type: firstDoc.document_type || 'OFFICIAL_RECEIPT',
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View OR</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">None</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={previewDoc.isOpen}
        onClose={() => setPreviewDoc({ isOpen: false, url: null })}
        fileUrl={previewDoc.url}
        fileName={previewDoc.name}
        mimeType={previewDoc.mime}
        documentType={previewDoc.type}
      />
    </div>
  );
};

export default CollectionPage;
