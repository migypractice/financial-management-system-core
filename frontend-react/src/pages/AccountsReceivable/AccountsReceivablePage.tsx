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
  CheckCircle2,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { arService, ArInvoiceItem, ArInvoiceSummary, Customer } from '../../services/arService';
import { apService, BankAccountItem, ChartOfAccountItem } from '../../services/apService';
import { FileUploadZone } from '../../components/ui/FileUploadZone';
import { DocumentPreviewModal } from '../../components/ui/DocumentPreviewModal';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { StatusBadge } from '../../components/ui/StatusBadge';

export const AccountsReceivablePage: React.FC = () => {
  const [invoices, setInvoices] = useState<ArInvoiceItem[]>([]);
  const [summary, setSummary] = useState<ArInvoiceSummary | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccountItem[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [customerFilter, setCustomerFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [selectedInvoiceForCollect, setSelectedInvoiceForCollect] = useState<ArInvoiceItem | null>(null);

  // Preview Modal
  const [previewDoc, setPreviewDoc] = useState<{
    isOpen: boolean;
    url: string | null;
    name?: string;
    mime?: string;
    type?: string;
  }>({ isOpen: false, url: null });

  // Invoice Form State
  const [invoiceForm, setInvoiceForm] = useState({
    customer_id: '',
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    chart_of_account_id: '',
    total_amount: '',
    description: '',
  });
  const [invoiceAttachment, setInvoiceAttachment] = useState<File | null>(null);
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  // Collection Form State
  const [collectForm, setCollectForm] = useState({
    amount: '',
    bank_account_id: '',
    payment_method: 'BANK_TRANSFER',
    reference_number: '',
  });
  const [collectAttachment, setCollectAttachment] = useState<File | null>(null);
  const [collectSubmitting, setCollectSubmitting] = useState(false);
  const [collectError, setCollectError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4500);
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [invRes, custRes, coaRes, banksRes] = await Promise.all([
        arService.getArInvoices(),
        arService.getCustomers(),
        arService.getChartOfAccounts(),
        apService.getBankAccounts(),
      ]);

      setInvoices(invRes.data || []);
      setSummary(invRes.summary || null);
      setCustomers(custRes.data || []);
      setAccounts(coaRes.data || []);
      setBankAccounts(banksRes.data || []);
    } catch (err: any) {
      console.error('Failed to load AR data:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshInvoices = async () => {
    try {
      setRefreshing(true);
      const res = await arService.getArInvoices({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        customer_id: customerFilter !== 'ALL' ? customerFilter : undefined,
      });
      setInvoices(res.data || []);
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
      refreshInvoices();
    }
  }, [statusFilter, customerFilter]);

  const handleOpenCollectModal = (inv: ArInvoiceItem) => {
    setSelectedInvoiceForCollect(inv);
    setCollectForm({
      amount: inv.balance.toString(),
      bank_account_id: bankAccounts[0]?.id || '',
      payment_method: 'BANK_TRANSFER',
      reference_number: '',
    });
    setCollectAttachment(null);
    setCollectError(null);
    setIsCollectModalOpen(true);
  };

  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvoiceError(null);
    setInvoiceSubmitting(true);

    try {
      const fd = new FormData();
      fd.append('customer_id', invoiceForm.customer_id);
      fd.append('invoice_number', invoiceForm.invoice_number);
      fd.append('invoice_date', invoiceForm.invoice_date);
      fd.append('due_date', invoiceForm.due_date);
      fd.append('total_amount', invoiceForm.total_amount);
      if (invoiceForm.chart_of_account_id) {
        fd.append('chart_of_account_id', invoiceForm.chart_of_account_id);
      }
      fd.append('description', invoiceForm.description);
      if (invoiceAttachment) {
        fd.append('attachment', invoiceAttachment);
      }

      await arService.createArInvoice(fd);
      setIsInvoiceModalOpen(false);
      setInvoiceForm({
        customer_id: '',
        invoice_number: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        chart_of_account_id: '',
        total_amount: '',
        description: '',
      });
      setInvoiceAttachment(null);
      showToast(`Sales Invoice #${invoiceForm.invoice_number} created and posted to General Ledger!`);
      refreshInvoices();
    } catch (err: any) {
      setInvoiceError(err.response?.data?.message || 'Failed to create sales invoice. Please check inputs.');
    } finally {
      setInvoiceSubmitting(false);
    }
  };

  const handleSubmitCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForCollect) return;

    setCollectError(null);
    setCollectSubmitting(true);

    try {
      const fd = new FormData();
      fd.append('amount', collectForm.amount);
      fd.append('bank_account_id', collectForm.bank_account_id);
      fd.append('payment_method', collectForm.payment_method);
      if (collectForm.reference_number) {
        fd.append('reference_number', collectForm.reference_number);
      }
      if (collectAttachment) {
        fd.append('attachment', collectAttachment);
      }

      await arService.collectInvoice(selectedInvoiceForCollect.id, fd);
      setIsCollectModalOpen(false);
      setSelectedInvoiceForCollect(null);
      setCollectAttachment(null);
      showToast(`Payment collected successfully! Cash deposited into bank & posted to General Ledger.`);
      refreshInvoices();
    } catch (err: any) {
      setCollectError(err.response?.data?.message || 'Failed to record collection.');
    } finally {
      setCollectSubmitting(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [invoices, searchQuery]);

  if (loading) return <SkeletonLoader />;

  return (
    <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-full space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md animate-slideDown ${
            toastMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/40 text-rose-700 dark:text-rose-300'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Accounts Receivable (AR)</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Customer sales invoices, receivables aging schedule, and cash collection deposits.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={refreshInvoices}
            disabled={refreshing}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-500 dark:text-emerald-400' : ''}`} />
          </button>
          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Create Sales Invoice
          </button>
        </div>
      </div>

      {/* Real AR Aging Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Receivable</span>
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            PHP {(summary?.total_receivable || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {summary?.unpaid_count || 0} unpaid invoice{(summary?.unpaid_count || 0) !== 1 ? 's' : ''}
          </p>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-60" />
        </div>

        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Current (Not Due)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            PHP {(summary?.current || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Within payment terms</p>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500/70" />
        </div>

        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">1 - 30 Days Due</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            PHP {(summary?.days_1_30 || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Past terms 1-30d</p>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-amber-500/70" />
        </div>

        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">31 - 60 Days</span>
            <span className="w-2 h-2 rounded-full bg-orange-500" />
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            PHP {(summary?.days_31_60 || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Past terms 31-60d</p>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-orange-500/70" />
        </div>

        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm relative overflow-hidden group col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">90+ Days (Critical)</span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            PHP {(summary?.days_90_plus || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Requires follow-up</p>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-rose-500/70" />
        </div>
      </div>

      {/* Control Bar & Filters */}
      <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['ALL', 'UNPAID', 'PARTIAL', 'PAID', 'OVERDUE'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === key
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          {/* Customer Dropdown Filter */}
          <div className="relative w-full sm:w-48">
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500 pr-8"
            >
              <option value="ALL">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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
              placeholder="Search invoice # or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* AR Invoices Table */}
      <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/90 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                <th className="py-3.5 px-4">Invoice # & Date</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Particulars</th>
                <th className="py-3.5 px-4">Due Date & Aging</th>
                <th className="py-3.5 px-4 text-right">Total Amount</th>
                <th className="py-3.5 px-4 text-right">Balance Due</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Supporting Doc</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <FileText className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-600 mb-2" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No accounts receivable invoices found</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Click "Create Sales Invoice" to bill a customer.</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const hasAttachment = inv.attachments && inv.attachments.length > 0;
                  const firstAttach = hasAttachment ? inv.attachments[0] : null;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold text-slate-900 dark:text-slate-200 block">{inv.invoice_number}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {inv.invoice_date}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-900 dark:text-white block">{inv.customer_name}</span>
                        {inv.company_name && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">{inv.company_name}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 max-w-[200px]">
                        <p className="truncate text-slate-700 dark:text-slate-300" title={inv.description}>
                          {inv.description}
                        </p>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5">
                          Revenue Account: {inv.account_name}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-slate-700 dark:text-slate-300 block">{inv.due_date}</span>
                        {inv.balance > 0 && inv.days_past_due > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 mt-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            {inv.days_past_due}d past due
                          </span>
                        ) : inv.balance > 0 ? (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 block font-medium">Current</span>
                        ) : (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 block">Fully Collected</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                        PHP {inv.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                        PHP {inv.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={inv.status} />
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
                                type: firstAttach.document_type || 'SALES_ORDER',
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 transition-colors"
                            title="View Sales Order / Document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Doc</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">None</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {inv.balance > 0 ? (
                          <button
                            onClick={() => handleOpenCollectModal(inv)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition-colors"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            Collect Payment
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Settled
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

      {/* MODAL 1: Create Sales Invoice */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Create Customer Sales Invoice (Money In)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Records credit sale and posts balanced GL Journal Entry.</p>
                </div>
              </div>
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitInvoice} className="flex-1 overflow-y-auto p-6 space-y-4">
              {invoiceError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{invoiceError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Customer <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={invoiceForm.customer_id}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, customer_id: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.customer_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sales Invoice # <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-2026-9901"
                    value={invoiceForm.invoice_number}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 uppercase font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Invoice Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.invoice_date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_date: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Due Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.due_date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    value={invoiceForm.total_amount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, total_amount: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Revenue Account
                  </label>
                  <select
                    value={invoiceForm.chart_of_account_id}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, chart_of_account_id: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Default [4000-REV Sales Revenue]</option>
                    {accounts
                      .filter((a) => a.type === 'REVENUE')
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          [{a.code}] {a.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Items Sold <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Details of materials, cement bags, or hardware items sold..."
                  value={invoiceForm.description}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Supporting Document Upload Zone */}
              <FileUploadZone
                file={invoiceAttachment}
                onFileSelect={setInvoiceAttachment}
                label="Sales Order / Delivery Receipt Attachment"
                required={false}
                helperText="Upload Sales Order, Signed Delivery Receipt, or Contract (PDF, JPG, PNG)"
              />

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={invoiceSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm shadow-emerald-600/30 transition-all disabled:opacity-50"
                >
                  {invoiceSubmitting ? 'Recording...' : 'Create & Post to GL'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Collect Payment */}
      {isCollectModalOpen && selectedInvoiceForCollect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Record Customer Collection (Cash In)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Invoice #{selectedInvoiceForCollect.invoice_number} &middot; {selectedInvoiceForCollect.customer_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCollectModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCollection} className="space-y-4">
              {collectError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{collectError}</span>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Total Invoice Amount:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    PHP {selectedInvoiceForCollect.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Remaining Balance:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    PHP {selectedInvoiceForCollect.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount to Collect (PHP) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedInvoiceForCollect.balance}
                    required
                    value={collectForm.amount}
                    onChange={(e) => setCollectForm({ ...collectForm, amount: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={collectForm.payment_method}
                    onChange={(e) => setCollectForm({ ...collectForm, payment_method: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHECK">Customer Check</option>
                    <option value="CASH">Cash on Hand</option>
                    <option value="GCASH">GCash / E-Wallet</option>
                    <option value="ONLINE">Online Gateway</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deposit Into Bank Account <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={collectForm.bank_account_id}
                  onChange={(e) => setCollectForm({ ...collectForm, bank_account_id: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bank_name} - {b.account_name} (Current: PHP {Number(b.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deposit / Check / Transaction Ref #
                </label>
                <input
                  type="text"
                  placeholder="e.g. BDO-DEP-99412"
                  value={collectForm.reference_number}
                  onChange={(e) => setCollectForm({ ...collectForm, reference_number: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Upload Proof of Payment */}
              <FileUploadZone
                file={collectAttachment}
                onFileSelect={setCollectAttachment}
                label="Proof of Payment / Official Receipt Attachment"
                required={false}
                helperText="Upload Bank Deposit Slip, Official Receipt (OR), or E-Wallet confirmation"
              />

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCollectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={collectSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm shadow-emerald-600/30 transition-all disabled:opacity-50"
                >
                  {collectSubmitting ? 'Processing...' : 'Deposit Cash & Post to GL'}
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

export default AccountsReceivablePage;
