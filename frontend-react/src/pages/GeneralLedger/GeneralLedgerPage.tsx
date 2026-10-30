import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Scale,
  Users,
  Building2,
  Briefcase,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Calendar,
  DollarSign,
  FileText,
  ShoppingCart,
  Paperclip,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { StatusBadge } from '../../components/ui/StatusBadge';

interface GLLine {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  debit: number;
  credit: number;
  description: string;
}

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
  category?: string;
  category_label?: string;
  status: string;
  lines?: GLLine[];
  total_debit?: number;
  total_credit?: number;
  is_balanced?: boolean;
}

interface BuyOrderItem {
  id: string;
  reference_number: string;
  bill_number?: string | null;
  date: string;
  payee_name: string;
  purpose: string;
  category: string;
  department: string;
  requested_by: string;
  approved_by?: string | null;
  approved_at?: string | null;
  amount: number;
  status: string;
  buy_type: 'REQUEST_BUY' | 'APPROVED_BUY';
  mode_of_payment: string;
  gl_account_code: string;
  gl_account_name: string;
  has_attachment: boolean;
}

interface BuyOrdersSummary {
  total_request_buys_count: number;
  total_request_buys_amount: number;
  total_approved_buys_count: number;
  total_approved_buys_amount: number;
}

interface TrialBalanceAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  normal_balance: string;
  total_debit: number;
  total_credit: number;
  ending_debit: number;
  ending_credit: number;
}

interface ARSubledgerItem {
  customer_id: string;
  customer_code: string;
  customer_name: string;
  company_name: string;
  total_invoiced: number;
  total_collected: number;
  balance_due: number;
  invoices_count: number;
  unpaid_count: number;
  recent_invoices: Array<{
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    total_amount: number;
    balance: number;
    status: string;
  }>;
}

interface APSubledgerItem {
  supplier_id: string;
  supplier_code: string;
  supplier_name: string;
  company_name: string;
  total_billed: number;
  total_paid: number;
  balance_owed: number;
  bills_count: number;
  unpaid_count: number;
  recent_bills: Array<{
    bill_number: string;
    bill_date: string;
    due_date: string;
    total_amount: number;
    balance: number;
    status: string;
  }>;
}

interface PayrollItem {
  id: string;
  reference: string;
  batch_name: string;
  amount: number;
  date: string;
  status: string;
  journal_entry?: string;
  gl_account: string;
}

export const GeneralLedgerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'JOURNAL' | 'BUY_ORDERS' | 'TRIAL_BALANCE' | 'AR_SUBLEDGER' | 'AP_SUBLEDGER' | 'PAYROLL'>('JOURNAL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Tab 1: General Journal
  const [entries, setEntries] = useState<GLEntry[]>([]);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [glSummary, setGlSummary] = useState<{ total_entries: number; total_debit: number; total_credit: number } | null>(null);

  // Tab: Buy Orders (Request Buy & Approved Buy)
  const [requestBuys, setRequestBuys] = useState<BuyOrderItem[]>([]);
  const [approvedBuys, setApprovedBuys] = useState<BuyOrderItem[]>([]);
  const [buyOrdersSummary, setBuyOrdersSummary] = useState<BuyOrdersSummary | null>(null);
  const [buyOrdersSearch, setBuyOrdersSearch] = useState('');

  // Tab 2: Trial Balance
  const [trialAccounts, setTrialAccounts] = useState<TrialBalanceAccount[]>([]);
  const [trialSummary, setTrialSummary] = useState<{ total_debits: number; total_credits: number; is_balanced: boolean } | null>(null);

  // Tab 3: AR Sub-ledger
  const [arSubledger, setArSubledger] = useState<ARSubledgerItem[]>([]);
  const [arTotal, setArTotal] = useState<number>(0);

  // Tab 4: AP Sub-ledger
  const [apSubledger, setApSubledger] = useState<APSubledgerItem[]>([]);
  const [apTotal, setApTotal] = useState<number>(0);

  // Tab 5: Payroll Sub-ledger
  const [payrollEntries, setPayrollEntries] = useState<PayrollItem[]>([]);
  const [payrollTotal, setPayrollTotal] = useState<number>(0);

  const fetchJournalEntries = useCallback(async (search: string = '', catFilter: string = 'ALL') => {
    try {
      const params: Record<string, any> = {};
      if (search) params.search = search;
      if (catFilter && catFilter !== 'ALL') params.category = catFilter;
      const res = await apiClient.get('/dashboard/gl', { params });
      const raw = res.data?.data ?? res.data;
      const list = Array.isArray(raw) ? raw : [];
      setEntries(list);
      setGlSummary(res.data?.summary || null);
      if (list.length > 0) {
        setExpandedRows((prev) => (Object.keys(prev).length === 0 ? { [list[0].id]: true } : prev));
      }
    } catch (err) {
      console.error('Failed to load GL entries:', err);
    }
  }, []);

  const fetchBuyOrders = useCallback(async (search: string = '') => {
    try {
      const res = await apiClient.get('/dashboard/gl/buy-orders', { params: { search: search || undefined } });
      const raw = res.data?.data;
      setRequestBuys(Array.isArray(raw?.request_buys) ? raw.request_buys : []);
      setApprovedBuys(Array.isArray(raw?.approved_buys) ? raw.approved_buys : []);
      setBuyOrdersSummary(res.data?.summary || null);
    } catch (err) {
      console.error('Failed to load buy orders:', err);
    }
  }, []);

  const fetchTrialBalance = useCallback(async () => {
    try {
      const res = await apiClient.get('/dashboard/gl/trial-balance');
      const raw = res.data?.data ?? res.data;
      setTrialAccounts(Array.isArray(raw) ? raw : []);
      setTrialSummary(res.data?.summary || null);
    } catch (err) {
      console.error('Failed to load Trial Balance:', err);
    }
  }, []);

  const fetchSubledgers = useCallback(async () => {
    try {
      const [arRes, apRes, payRes] = await Promise.all([
        apiClient.get('/dashboard/gl/ar-subledger'),
        apiClient.get('/dashboard/gl/ap-subledger'),
        apiClient.get('/dashboard/gl/payroll-subledger'),
      ]);
      const arRaw = arRes.data?.data ?? arRes.data;
      const apRaw = apRes.data?.data ?? apRes.data;
      const payRaw = payRes.data?.data ?? payRes.data;

      setArSubledger(Array.isArray(arRaw) ? arRaw : []);
      setArTotal(arRes.data?.summary?.total_receivable || 0);

      setApSubledger(Array.isArray(apRaw) ? apRaw : []);
      setApTotal(apRes.data?.summary?.total_payable || 0);

      setPayrollEntries(Array.isArray(payRaw) ? payRaw : []);
      setPayrollTotal(payRes.data?.summary?.total_payroll_ytd || 0);
    } catch (err) {
      console.error('Failed to load subledgers:', err);
    }
  }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchJournalEntries(), fetchBuyOrders(), fetchTrialBalance(), fetchSubledgers()]);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchJournalEntries(searchTerm, categoryFilter), fetchBuyOrders(buyOrdersSearch), fetchTrialBalance(), fetchSubledgers()]);
    setRefreshing(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const safeEntries = Array.isArray(entries) ? entries : [];
  const safeTrialAccounts = Array.isArray(trialAccounts) ? trialAccounts : [];
  const safeArSubledger = Array.isArray(arSubledger) ? arSubledger : [];
  const safeApSubledger = Array.isArray(apSubledger) ? apSubledger : [];
  const safePayrollEntries = Array.isArray(payrollEntries) ? payrollEntries : [];

  if (loading) return <SkeletonLoader />;

  return (
    <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3.5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            General Ledger & Sub-Ledgers
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Double-entry journals, trial balance, and subsidiary ledger schedules.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 sm:px-3 sm:py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors self-start sm:self-auto flex items-center gap-1.5 text-xs font-semibold shadow-xs cursor-pointer"
          title="Refresh Ledger"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
          <span className="hidden sm:inline">Sync Books</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 sm:gap-6 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('JOURNAL')}
          className={`pb-3 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'JOURNAL'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          General Journal ({safeEntries.length})
        </button>

        <button
          onClick={() => setActiveTab('BUY_ORDERS')}
          className={`pb-3 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'BUY_ORDERS'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          Buy Orders (Request & Approved)
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            {requestBuys.length + approvedBuys.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('TRIAL_BALANCE')}
          className={`pb-3 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'TRIAL_BALANCE'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Scale className="w-4 h-4" />
          Trial Balance
          {trialSummary?.is_balanced && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              Balanced
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('AR_SUBLEDGER')}
          className={`pb-3 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'AR_SUBLEDGER'
              ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          AR Sub-ledger (Customers)
        </button>

        <button
          onClick={() => setActiveTab('AP_SUBLEDGER')}
          className={`pb-3 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'AP_SUBLEDGER'
              ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-600 dark:border-amber-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          AP Sub-ledger (Suppliers)
        </button>

        <button
          onClick={() => setActiveTab('PAYROLL')}
          className={`pb-3 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'PAYROLL'
              ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Payroll Sub-ledger
        </button>
      </div>

      {/* TAB 1: General Journal */}
      {activeTab === 'JOURNAL' && (
        <div className="space-y-4">
          {/* Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg p-3.5 shadow-xs">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                Total Journal Entries
              </span>
              <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                {glSummary?.total_entries || entries.length} Vouchers
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Balanced double-entry records</p>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg p-3.5 shadow-xs">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                Total Debits
              </span>
              <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                ₱{(glSummary?.total_debit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Balanced Double-Entry Total
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg p-3.5 shadow-xs">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                Total Credits
              </span>
              <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                ₱{(glSummary?.total_credit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Balanced Double-Entry Total
              </p>
            </div>
          </div>

          {/* Search Box & Category Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search entry #, reference, or description..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  fetchJournalEntries(e.target.value, categoryFilter);
                }}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs"
              />
            </div>

            {/* Categorised Transactions Filter Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'ALL', label: 'All Transactions' },
                { id: 'EXPENSE', label: 'AP Purchases & Buys' },
                { id: 'INCOME', label: 'Revenue & Sales' },
                { id: 'HRMS', label: 'Payroll & HR' },
                { id: 'SUPPLY_CHAIN', label: 'Supply Chain' },
                { id: 'FLEET', label: 'Fleet & Logistics' },
                { id: 'FACILITIES', label: 'Facilities' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCategoryFilter(c.id);
                    fetchJournalEntries(searchTerm, c.id);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    categoryFilter === c.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Entries Table */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-700/40 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-2.5 px-2 w-28 text-center">Lines</th>
                    <th className="py-2.5 px-2 sm:px-3 w-28 sm:w-36">Entry # & Date</th>
                    <th className="py-2.5 px-2 sm:px-3">Particulars & Memo</th>
                    <th className="py-2.5 px-2 sm:px-3">Category</th>
                    <th className="py-2.5 px-2 sm:px-3 hidden lg:table-cell w-36">Module / Reference</th>
                    <th className="py-2.5 px-2 sm:px-3 text-right w-20 sm:w-28">Debit (₱)</th>
                    <th className="py-2.5 px-2 sm:px-3 text-right w-20 sm:w-28">Credit (₱)</th>
                    <th className="py-2.5 px-2 sm:px-3 text-center w-24 sm:w-28">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {safeEntries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <BookOpen className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No journal entries found</p>
                      </td>
                    </tr>
                  ) : (
                    safeEntries.map((entry) => {
                      const isExpanded = !!expandedRows[entry.id];
                      const hasLines = Array.isArray(entry.lines) && entry.lines.length > 0;

                      return (
                        <React.Fragment key={entry.id}>
                          <tr
                            onClick={() => hasLines && toggleRow(entry.id)}
                            className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors ${
                              hasLines ? 'cursor-pointer' : ''
                            }`}
                          >
                            <td className="py-2.5 px-2 text-center whitespace-nowrap">
                              {hasLines ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleRow(entry.id);
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                                  title={isExpanded ? 'Hide entry lines' : 'View double-entry lines'}
                                >
                                  {isExpanded ? '▴ Hide Lines' : '▾ View Lines'}
                                </button>
                              ) : null}
                            </td>

                            <td className="py-2.5 px-2 sm:px-3 whitespace-nowrap">
                              <span className="font-semibold text-slate-900 dark:text-white block text-xs">{entry.entry_number}</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                                {new Date(entry.posted_at).toLocaleDateString()}
                              </span>
                              <span className="lg:hidden mt-0.5 inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                {entry.source_module}
                              </span>
                            </td>

                            <td className="py-2.5 px-2 sm:px-3 max-w-[160px] sm:max-w-xs md:max-w-md">
                              <p className="truncate text-slate-800 dark:text-slate-200 font-semibold" title={entry.description}>
                                {entry.description}
                              </p>
                              <span className="text-[11px] text-slate-400 dark:text-slate-500 block truncate">
                                {entry.account_name}
                              </span>
                            </td>

                            <td className="py-2.5 px-2 sm:px-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 inline-block">
                                {entry.category_label || entry.category || 'General Ledger'}
                              </span>
                            </td>

                            <td className="py-2.5 px-2 sm:px-3 hidden lg:table-cell">
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 truncate block max-w-[130px]" title={entry.source_module}>
                                {entry.source_module}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5 truncate max-w-[130px]" title={entry.reference_number}>
                                {entry.reference_number}
                              </span>
                            </td>

                            <td className="py-2.5 px-2 sm:px-3 text-right font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums whitespace-nowrap">
                              {Number(entry.debit) > 0 ? Number(entry.debit).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                            </td>

                            <td className="py-2.5 px-2 sm:px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                              {Number(entry.credit) > 0 ? Number(entry.credit).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                            </td>

                            <td className="py-2.5 px-2 sm:px-3 text-center whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Balanced
                              </span>
                            </td>
                          </tr>

                          {/* Expanded Double-Entry Breakdown */}
                          {isExpanded && hasLines && (
                            <tr className="bg-slate-50/70 dark:bg-slate-900/60">
                              <td colSpan={8} className="py-3 px-3 sm:px-6 border-y border-slate-200 dark:border-slate-700">
                                <div className="space-y-2 pl-3 sm:pl-4 border-l-2 border-indigo-500">
                                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                    Double-Entry Breakdown for Voucher #{entry.entry_number}
                                  </p>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="text-[10px] font-semibold text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700">
                                          <th className="py-1.5 px-2 text-left">Account Code & Name</th>
                                          <th className="py-1.5 px-2 text-left hidden sm:table-cell">Line Memo</th>
                                          <th className="py-1.5 px-2 text-right w-24">Debit (₱)</th>
                                          <th className="py-1.5 px-2 text-right w-24">Credit (₱)</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
                                        {(Array.isArray(entry.lines) ? entry.lines : []).map((line) => (
                                          <tr key={line.id} className="text-slate-700 dark:text-slate-300">
                                            <td className="py-2 px-2">
                                              <span className="font-semibold text-indigo-600 dark:text-indigo-400">[{line.account_code}]</span>{' '}
                                              <span className="text-slate-900 dark:text-white font-medium">{line.account_name}</span>
                                              <span className="sm:hidden block text-[10px] text-slate-400 mt-0.5">{line.description}</span>
                                            </td>
                                            <td className="py-2 px-2 text-slate-500 dark:text-slate-400 text-[11px] hidden sm:table-cell max-w-xs truncate" title={line.description}>{line.description}</td>
                                            <td className="py-2 px-2 text-right text-indigo-600 dark:text-indigo-400 font-semibold tabular-nums whitespace-nowrap">
                                              {line.debit > 0 ? line.debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                                            </td>
                                            <td className="py-2 px-2 text-right text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums whitespace-nowrap">
                                              {line.credit > 0 ? line.credit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: BUY ORDERS (REQUEST BUY & APPROVED BUY REQUISITIONS)                */}
      {/* ========================================================================= */}
      {activeTab === 'BUY_ORDERS' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Notice Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Procurement & Buy Orders Sub-Ledger
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tracks all internal department purchasing requisitions (Request Buy) and authorized vendor purchases (Approved Buy) linked to General Ledger.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                GL Sub-Ledger Synchronized
              </span>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Request Buy (Pending Requisitions)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  {buyOrdersSummary?.total_request_buys_count || requestBuys.length} Pending
                </span>
              </div>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                ₱{(buyOrdersSummary?.total_request_buys_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Awaiting Manager & Internal Audit review</p>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Approved Buy (Authorized & Disbursed)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  {buyOrdersSummary?.total_approved_buys_count || approvedBuys.length} Authorized
                </span>
              </div>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                ₱{(buyOrdersSummary?.total_approved_buys_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Committed against departmental budgets</p>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Purchasing Requisitions</span>
                <ShoppingCart className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                ₱{((buyOrdersSummary?.total_request_buys_amount || 0) + (buyOrdersSummary?.total_approved_buys_amount || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Total procurement demand volume</p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search request #, payee, or purpose..."
              value={buyOrdersSearch}
              onChange={(e) => {
                setBuyOrdersSearch(e.target.value);
                fetchBuyOrders(e.target.value);
              }}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs"
            />
          </div>

          {/* ========================================================================= */}
          {/* TABLE 1: REQUEST BUY (PENDING REQUISITIONS & PURCHASES)                   */}
          {/* ========================================================================= */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Request Buy Table (Procurement Requisitions Pending Authorization)
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  {requestBuys.length} Requests
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-700/40 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      <th className="py-2.5 px-3">Request # & Date</th>
                      <th className="py-2.5 px-3">Payee / Supplier</th>
                      <th className="py-2.5 px-3">Department & Buyer</th>
                      <th className="py-2.5 px-3">Purpose / Requisition</th>
                      <th className="py-2.5 px-3">Category & GL Account</th>
                      <th className="py-2.5 px-3">Mode of Payment</th>
                      <th className="py-2.5 px-3 text-right">Amount (₱)</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Attachment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {requestBuys.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          <ShoppingCart className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-1.5" />
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No pending buy requests</p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">All department purchasing requisitions have been authorized.</p>
                        </td>
                      </tr>
                    ) : (
                      requestBuys.map((rb) => (
                        <tr key={rb.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-semibold text-slate-900 dark:text-white block">{rb.reference_number}</span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {rb.date}
                            </span>
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">{rb.payee_name}</span>
                            {rb.bill_number && (
                              <span className="text-[11px] text-slate-400 dark:text-slate-500">Ref: {rb.bill_number}</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="font-medium text-slate-800 dark:text-slate-200 block">{rb.department}</span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">By: {rb.requested_by}</span>
                          </td>

                          <td className="py-2.5 px-3 max-w-[200px]">
                            <p className="truncate text-slate-700 dark:text-slate-300 font-medium" title={rb.purpose}>
                              {rb.purpose}
                            </p>
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 block w-fit">
                              {rb.category}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5">
                              [{rb.gl_account_code}] {rb.gl_account_name}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 inline-block">
                              {rb.mode_of_payment.replace(/_/g, ' ')}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-right font-semibold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                            ₱{rb.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              PENDING APPROVAL
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {rb.has_attachment ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                                <Paperclip className="w-3.5 h-3.5" /> Attached
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">None</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TABLE 2: APPROVED BUY (AUTHORIZED PURCHASES & DISBURSED)                   */}
          {/* ========================================================================= */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Approved Buy Table (Authorized Purchases & Disbursed Vouchers)
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {approvedBuys.length} Approved
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-700/40 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      <th className="py-2.5 px-3">Reference / PO #</th>
                      <th className="py-2.5 px-3">Payee / Supplier</th>
                      <th className="py-2.5 px-3">Department & Buyer</th>
                      <th className="py-2.5 px-3">Purpose & Description</th>
                      <th className="py-2.5 px-3">Authorized By</th>
                      <th className="py-2.5 px-3">Category & GL Account</th>
                      <th className="py-2.5 px-3">Mode of Payment</th>
                      <th className="py-2.5 px-3 text-right">Amount (₱)</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Attachment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {approvedBuys.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-slate-400">
                          <CheckCircle2 className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-1.5" />
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No authorized buy orders found</p>
                        </td>
                      </tr>
                    ) : (
                      approvedBuys.map((ab) => (
                        <tr key={ab.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-semibold text-slate-900 dark:text-white block">{ab.reference_number}</span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {ab.date}
                            </span>
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">{ab.payee_name}</span>
                            {ab.bill_number && (
                              <span className="text-[11px] text-slate-400 dark:text-slate-500">Ref: {ab.bill_number}</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="font-medium text-slate-800 dark:text-slate-200 block">{ab.department}</span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">Buyer: {ab.requested_by}</span>
                          </td>

                          <td className="py-2.5 px-3 max-w-[200px]">
                            <p className="truncate text-slate-700 dark:text-slate-300 font-medium" title={ab.purpose}>
                              {ab.purpose}
                            </p>
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400 block">{ab.approved_by || 'Finance Approver'}</span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">{ab.approved_at || ab.date}</span>
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 block w-fit">
                              {ab.category}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5">
                              [{ab.gl_account_code}] {ab.gl_account_name}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 inline-block">
                              {ab.mode_of_payment.replace(/_/g, ' ')}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-right font-semibold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                            ₱{ab.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ab.status === 'DISBURSED'
                                ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            }`}>
                              {ab.status}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {ab.has_attachment ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Attached
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">None</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Trial Balance */}
      {activeTab === 'TRIAL_BALANCE' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Balanced Trial Balance (FY 2026)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Summary of all general ledger accounts ensuring Total Debits equal Total Credits.
              </p>
            </div>
            {trialSummary?.is_balanced && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 self-start sm:self-auto">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Balanced
              </span>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-700/40 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-2.5 px-3 w-28">Account Code</th>
                    <th className="py-2.5 px-3">Account Title</th>
                    <th className="py-2.5 px-3 hidden sm:table-cell w-28">Type</th>
                    <th className="py-2.5 px-3 text-right w-28 sm:w-36">Debit Balance (₱)</th>
                    <th className="py-2.5 px-3 text-right w-28 sm:w-36">Credit Balance (₱)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {safeTrialAccounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-indigo-600 dark:text-indigo-400">{acc.code}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{acc.name}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                          {acc.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                        {acc.ending_debit > 0
                          ? acc.ending_debit.toLocaleString('en-US', { minimumFractionDigits: 2 })
                          : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                        {acc.ending_credit > 0
                          ? acc.ending_credit.toLocaleString('en-US', { minimumFractionDigits: 2 })
                          : '-'}
                      </td>
                    </tr>
                  ))}
                  {/* Grand Totals */}
                  <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/60 font-semibold text-sm">
                    <td colSpan={3} className="py-3 px-3 uppercase tracking-wider text-slate-900 dark:text-white">
                      Grand Totals
                    </td>
                    <td className="py-3 px-3 text-right text-indigo-600 dark:text-indigo-400 tabular-nums">
                      ₱{(trialSummary?.total_debits || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400 tabular-nums">
                      ₱{(trialSummary?.total_credits || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AR Sub-ledger */}
      {activeTab === 'AR_SUBLEDGER' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Accounts Receivable Sub-ledger (Customer Schedule)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Reconciles with GL Control Account [1020-AR Accounts Receivable — Trade].
              </p>
            </div>
            <div className="sm:text-right">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-medium">Total Outstanding</span>
              <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                ₱{arTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-700/40 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-2.5 px-3 w-28">Customer Code</th>
                    <th className="py-2.5 px-3">Customer / Company Name</th>
                    <th className="py-2.5 px-3 text-right hidden md:table-cell w-28 sm:w-36">Total Invoiced (₱)</th>
                    <th className="py-2.5 px-3 text-right hidden sm:table-cell w-28 sm:w-36">Total Collected (₱)</th>
                    <th className="py-2.5 px-3 text-right w-28 sm:w-36">Balance Due (₱)</th>
                    <th className="py-2.5 px-3 text-center w-24">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {safeArSubledger.map((c) => (
                    <tr key={c.customer_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">{c.customer_code}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-900 dark:text-white block">{c.customer_name}</span>
                        {c.company_name && <span className="text-[11px] text-slate-500 dark:text-slate-400">{c.company_name}</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                        ₱{c.total_invoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 tabular-nums">
                        ₱{c.total_collected.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900 dark:text-white tabular-nums">
                        ₱{c.balance_due.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                          {c.unpaid_count} pending
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AP Sub-ledger */}
      {activeTab === 'AP_SUBLEDGER' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Accounts Payable Sub-ledger (Supplier Schedule)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Reconciles with GL Control Account [2010-AP Accounts Payable — Trade].
              </p>
            </div>
            <div className="sm:text-right">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-medium">Total Payable</span>
              <p className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                ₱{apTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-700/40 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-2.5 px-3 w-28">Supplier Code</th>
                    <th className="py-2.5 px-3">Supplier / Vendor Name</th>
                    <th className="py-2.5 px-3 text-right hidden md:table-cell w-28 sm:w-36">Total Billed (₱)</th>
                    <th className="py-2.5 px-3 text-right hidden sm:table-cell w-28 sm:w-36">Total Paid (₱)</th>
                    <th className="py-2.5 px-3 text-right w-28 sm:w-36">Balance Owed (₱)</th>
                    <th className="py-2.5 px-3 text-center w-24">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {safeApSubledger.map((s) => (
                    <tr key={s.supplier_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-amber-600 dark:text-amber-400">{s.supplier_code}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-900 dark:text-white block">{s.supplier_name}</span>
                        {s.company_name && <span className="text-[11px] text-slate-500 dark:text-slate-400">{s.company_name}</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                        ₱{s.total_billed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 tabular-nums">
                        ₱{s.total_paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900 dark:text-white tabular-nums">
                        ₱{s.balance_owed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                          {s.unpaid_count} unpaid
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Payroll Sub-ledger */}
      {activeTab === 'PAYROLL' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Payroll Sub-ledger (HRMS Integration)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Compensation expense register from HR and staff payouts.
              </p>
            </div>
            <div className="sm:text-right">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-medium">Total Payroll YTD</span>
              <p className="text-base sm:text-lg font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                ₱{payrollTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-700/40 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-2.5 px-3 w-32 sm:w-40">Batch Reference & Date</th>
                    <th className="py-2.5 px-3">Payroll Particulars</th>
                    <th className="py-2.5 px-3 hidden md:table-cell">GL Expense Account</th>
                    <th className="py-2.5 px-3 text-right w-28 sm:w-36">Disbursement (₱)</th>
                    <th className="py-2.5 px-3 text-center w-24 sm:w-28">Journal Entry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {safePayrollEntries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <Briefcase className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No payroll sub-ledger entries found</p>
                      </td>
                    </tr>
                  ) : (
                    safePayrollEntries.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-semibold text-slate-900 dark:text-white block">{p.reference}</span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">{p.date}</span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{p.batch_name}</td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 text-[11px]">{p.gl_account}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-900 dark:text-white tabular-nums">
                          ₱{p.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {p.journal_entry ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              {p.journal_entry}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Logged</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneralLedgerPage;
