import React, { useEffect, useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Calendar,
  DollarSign,
  AlertTriangle,
  Building2,
  Clock,
  ArrowRight,
  Send,
  X,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { apService, ApBillItem, ApBillSummary, Supplier, ChartOfAccountItem } from '../../services/apService';
import { FileUploadZone } from '../../components/ui/FileUploadZone';
import { DocumentPreviewModal } from '../../components/ui/DocumentPreviewModal';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { StatusBadge } from '../../components/ui/StatusBadge';

export const AccountsPayablePage: React.FC = () => {
  const [bills, setBills] = useState<ApBillItem[]>([]);
  const [summary, setSummary] = useState<ApBillSummary | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [isPaymentRequestModalOpen, setIsPaymentRequestModalOpen] = useState(false);
  const [selectedBillForPR, setSelectedBillForPR] = useState<ApBillItem | null>(null);

  // Preview Modal
  const [previewDoc, setPreviewDoc] = useState<{
    isOpen: boolean;
    url: string | null;
    name?: string;
    mime?: string;
    type?: string;
  }>({ isOpen: false, url: null });

  // Bill Form State
  const [billForm, setBillForm] = useState({
    supplier_id: '',
    bill_number: '',
    bill_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    chart_of_account_id: '',
    category_type: 'INVENTORY_PURCHASE',
    total_amount: '',
    description: '',
  });
  const [billAttachment, setBillAttachment] = useState<File | null>(null);
  const [billSubmitting, setBillSubmitting] = useState(false);
  const [billError, setBillError] = useState<string | null>(null);

  // Payment Request Form State
  const [prForm, setPrForm] = useState({
    amount: '',
    purpose: '',
  });
  const [prAttachment, setPrAttachment] = useState<File | null>(null);
  const [prSubmitting, setPrSubmitting] = useState(false);
  const [prError, setPrError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [billsRes, suppliersRes, coaRes] = await Promise.all([
        apService.getApBills(),
        apService.getSuppliers(),
        apService.getChartOfAccounts(),
      ]);

      setBills(billsRes.data || []);
      setSummary(billsRes.summary || null);
      setSuppliers(suppliersRes.data || []);
      setAccounts(coaRes.data || []);
    } catch (err: any) {
      console.error('Failed to load AP data:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshBills = async () => {
    try {
      setRefreshing(true);
      const res = await apService.getApBills({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        supplier_id: supplierFilter !== 'ALL' ? supplierFilter : undefined,
      });
      setBills(res.data || []);
      setSummary(res.summary || null);
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!loading) {
      refreshBills();
    }
  }, [statusFilter, supplierFilter]);

  const handleOpenPRModal = (bill: ApBillItem) => {
    setSelectedBillForPR(bill);
    setPrForm({
      amount: bill.balance.toString(),
      purpose: `Payment for Supplier Bill #${bill.bill_number} (${bill.supplier_name})`,
    });
    setPrAttachment(null);
    setPrError(null);
    setIsPaymentRequestModalOpen(true);
  };

  const handleSubmitBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setBillError(null);
    setBillSubmitting(true);

    try {
      const fd = new FormData();
      fd.append('supplier_id', billForm.supplier_id);
      fd.append('bill_number', billForm.bill_number);
      fd.append('bill_date', billForm.bill_date);
      fd.append('due_date', billForm.due_date);
      fd.append('total_amount', billForm.total_amount);
      fd.append('category_type', billForm.category_type);
      if (billForm.chart_of_account_id) {
        fd.append('chart_of_account_id', billForm.chart_of_account_id);
      }
      fd.append('description', billForm.description);
      if (billAttachment) {
        fd.append('attachment', billAttachment);
      }

      await apService.createApBill(fd);
      setIsBillModalOpen(false);
      setBillForm({
        supplier_id: '',
        bill_number: '',
        bill_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        chart_of_account_id: '',
        category_type: 'INVENTORY_PURCHASE',
        total_amount: '',
        description: '',
      });
      setBillAttachment(null);
      setSuccessToast(`Supplier Bill #${billForm.bill_number} recorded & posted to General Ledger!`);
      setTimeout(() => setSuccessToast(null), 4000);
      refreshBills();
    } catch (err: any) {
      setBillError(err.response?.data?.message || 'Failed to record supplier bill. Please check inputs.');
    } finally {
      setBillSubmitting(false);
    }
  };

  const handleSubmitPaymentRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillForPR) return;
    if (!prAttachment) {
      setPrError('Supporting document attachment is strictly mandatory by Internal Control policy.');
      return;
    }

    setPrError(null);
    setPrSubmitting(true);

    try {
      const fd = new FormData();
      fd.append('ap_bill_id', selectedBillForPR.id);
      fd.append('payee_name', selectedBillForPR.supplier_name);
      fd.append('amount', prForm.amount);
      fd.append('purpose', prForm.purpose);
      fd.append('attachment', prAttachment);

      await apService.createPaymentRequest(fd);
      setIsPaymentRequestModalOpen(false);
      setSelectedBillForPR(null);
      setPrAttachment(null);
      setSuccessToast('Payment Request submitted with supporting attachment. Awaiting Manager Approval.');
      setTimeout(() => setSuccessToast(null), 4000);
      refreshBills();
    } catch (err: any) {
      setPrError(err.response?.data?.message || 'Failed to submit payment request.');
    } finally {
      setPrSubmitting(false);
    }
  };

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const matchesSearch =
        b.bill_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [bills, searchQuery]);

  if (loading) return <SkeletonLoader />;

  return (
    <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-full space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 shadow-xl backdrop-blur-md animate-slideDown">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-semibold">{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3.5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Accounts Payable (AP)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Supplier bills, verified aging schedule, and payout authorization with supporting documents.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={refreshBills}
            disabled={refreshing}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-xs"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setIsBillModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-xs shadow-indigo-600/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            Record Supplier Bill
          </button>
        </div>
      </div>

      {/* Real AP Aging Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Outstanding</span>
            <DollarSign className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            PHP {(summary?.total_payable || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            {summary?.unpaid_count || 0} unpaid bill{(summary?.unpaid_count || 0) !== 1 ? 's' : ''}
          </p>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-indigo-500 to-cyan-500" />
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Current (Not Due)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            PHP {(summary?.current || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Within terms</p>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-500" />
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">1 - 30 Days Due</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            PHP {(summary?.days_1_30 || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Past terms 1-30d</p>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-amber-500" />
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">31 - 60 Days</span>
            <span className="w-2 h-2 rounded-full bg-orange-500" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            PHP {(summary?.days_31_60 || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Past terms 31-60d</p>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-orange-500" />
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-xs relative overflow-hidden group col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">90+ Days (Critical)</span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            PHP {(summary?.days_90_plus || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Requires review</p>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-rose-500" />
        </div>
      </div>

      {/* Control Bar & Filters */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['ALL', 'UNPAID', 'PARTIAL', 'PAID', 'OVERDUE'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === key
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          {/* Supplier Dropdown Filter */}
          <div className="relative w-full sm:w-48">
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="w-full appearance-none bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-8"
            >
              <option value="ALL">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search bill # or supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* AP Bills Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-700/40 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3.5 px-4">Bill Number & Date</th>
                <th className="py-3.5 px-4">Supplier / Vendor</th>
                <th className="py-3.5 px-4">Category & GL Account</th>
                <th className="py-3.5 px-4">Due Date & Aging</th>
                <th className="py-3.5 px-4 text-right">Total Amount</th>
                <th className="py-3.5 px-4 text-right">Balance Due</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Supporting Doc</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No accounts payable bills found</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Click "Record Supplier Bill" to enter a new invoice.</p>
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => {
                  const hasAttachment = bill.attachments && bill.attachments.length > 0;
                  const firstAttach = hasAttachment ? bill.attachments[0] : null;

                  return (
                    <tr key={bill.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 dark:text-white block">{bill.bill_number}</span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {bill.bill_date}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">{bill.supplier_name}</span>
                        {bill.company_name && (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">{bill.company_name}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 block w-fit">
                          {bill.category_type}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-1 truncate max-w-[160px]">
                          {bill.account_name}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-slate-700 dark:text-slate-300 block">{bill.due_date}</span>
                        {bill.balance > 0 && bill.days_past_due > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            {bill.days_past_due}d past due
                          </span>
                        ) : bill.balance > 0 ? (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 block font-medium">Current</span>
                        ) : (
                          <span className="text-[11px] text-slate-400 mt-0.5 block">Settled</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                        PHP {bill.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                        PHP {bill.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={bill.status} />
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {hasAttachment && firstAttach ? (
                          <button
                            onClick={() =>
                              setPreviewDoc({
                                isOpen: true,
                                url: firstAttach.file_url,
                                name: firstAttach.file_name,
                                mime: firstAttach.mime_type,
                                type: firstAttach.document_type || 'SUPPLIER_INVOICE',
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 transition-colors"
                            title="View Supporting Document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Doc</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">None</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {bill.balance > 0 ? (
                          <button
                            onClick={() => handleOpenPRModal(bill)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors"
                          >
                            <Send className="w-3 h-3" />
                            Request Payment
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                          </span>
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

      {/* MODAL 1: Record Supplier Bill */}
      {isBillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800/60">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Record Supplier Bill (Money Out)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Creates obligation and posts balanced GL Journal Entry.</p>
                </div>
              </div>
              <button
                onClick={() => setIsBillModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitBill} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {billError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{billError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Supplier / Vendor <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={billForm.supplier_id}
                    onChange={(e) => setBillForm({ ...billForm, supplier_id: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.supplier_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bill / Supplier Invoice # <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-HOLCIM-2026-001"
                    value={billForm.bill_number}
                    onChange={(e) => setBillForm({ ...billForm, bill_number: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 uppercase font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bill Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={billForm.bill_date}
                    onChange={(e) => setBillForm({ ...billForm, bill_date: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Due Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={billForm.due_date}
                    onChange={(e) => setBillForm({ ...billForm, due_date: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={billForm.category_type}
                    onChange={(e) => setBillForm({ ...billForm, category_type: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="INVENTORY_PURCHASE">Inventory Purchase (Merchandise)</option>
                    <option value="UTILITIES_BILL">Utilities & Electricity</option>
                    <option value="FREIGHT_SHIPPING">Freight & Logistics</option>
                    <option value="OFFICE_SUPPLIES">Office Supplies & Tools</option>
                    <option value="EQUIPMENT_REPAIR">Equipment Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Total Amount (PHP) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={billForm.total_amount}
                    onChange={(e) => setBillForm({ ...billForm, total_amount: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  General Ledger Debit Account
                </label>
                <select
                  value={billForm.chart_of_account_id}
                  onChange={(e) => setBillForm({ ...billForm, chart_of_account_id: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Default (Auto-select by Category)</option>
                  {accounts
                    .filter((a) => a.type === 'ASSET' || a.type === 'EXPENSE')
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        [{a.code}] {a.name} ({a.type})
                      </option>
                    ))}
                </select>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                  Accounting entry: Debit Selected Account, Credit 2010-AP (Accounts Payable).
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Particulars <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Details of the items or services purchased..."
                  value={billForm.description}
                  onChange={(e) => setBillForm({ ...billForm, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Supporting Document Upload Zone */}
              <FileUploadZone
                file={billAttachment}
                onFileSelect={setBillAttachment}
                label="Supplier Supporting Document / Invoice"
                required={false}
                helperText="Upload Supplier Sales Invoice, Delivery Receipt, or PO (PDF, JPG, PNG)"
              />

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBillModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={billSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-xs transition-all disabled:opacity-50"
                >
                  {billSubmitting ? 'Recording...' : 'Record & Post to GL'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create Payment Request */}
      {isPaymentRequestModalOpen && selectedBillForPR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800/60">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Submit Payment Request Voucher</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Bill #{selectedBillForPR.bill_number} &middot; Payee: {selectedBillForPR.supplier_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPaymentRequestModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPaymentRequest} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Internal Control Alert */}
              <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-indigo-900 dark:text-indigo-200 text-xs">
                <p className="font-semibold flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                  <Building2 className="w-4 h-4" /> Internal Control Policy Requirement
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  Before any payment request can be approved or money released by the Finance Manager, a verified supporting attachment (Supplier Billing Statement, Official Receipt, or Bank Voucher) must be attached.
                </p>
              </div>

              {prError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{prError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Outstanding Bill Balance</label>
                  <p className="text-base font-mono font-bold text-amber-600 dark:text-amber-400">
                    PHP {selectedBillForPR.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Request Amount (PHP) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedBillForPR.balance}
                    required
                    value={prForm.amount}
                    onChange={(e) => setPrForm({ ...prForm, amount: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Purpose / Justification <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={prForm.purpose}
                  onChange={(e) => setPrForm({ ...prForm, purpose: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* STRICT MANDATORY ATTACHMENT */}
              <FileUploadZone
                file={prAttachment}
                onFileSelect={setPrAttachment}
                label="Mandatory Supporting Document"
                required={true}
                helperText="Upload Billing Statement, Supplier Invoice, or Statement of Account"
              />

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPaymentRequestModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={prSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-xs transition-all disabled:opacity-50"
                >
                  {prSubmitting ? 'Submitting...' : 'Submit with Mandatory Doc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

export default AccountsPayablePage;

