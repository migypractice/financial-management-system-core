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
  FileText
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
  status: string;
  lines?: GLLine[];
  total_debit?: number;
  total_credit?: number;
  is_balanced?: boolean;
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
  const [activeTab, setActiveTab] = useState<'JOURNAL' | 'TRIAL_BALANCE' | 'AR_SUBLEDGER' | 'AP_SUBLEDGER' | 'PAYROLL'>('JOURNAL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Tab 1: General Journal
  const [entries, setEntries] = useState<GLEntry[]>([]);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [glSummary, setGlSummary] = useState<{ total_entries: number; total_debit: number; total_credit: number } | null>(null);

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

  const fetchJournalEntries = useCallback(async (search: string = '') => {
    try {
      const res = await apiClient.get('/dashboard/gl', { params: { search: search || undefined } });
      const raw = res.data?.data ?? res.data;
      setEntries(Array.isArray(raw) ? raw : []);
      setGlSummary(res.data?.summary || null);
    } catch (err) {
      console.error('Failed to load GL entries:', err);
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
    await Promise.all([fetchJournalEntries(), fetchTrialBalance(), fetchSubledgers()]);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchJournalEntries(searchTerm), fetchTrialBalance(), fetchSubledgers()]);
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
          className={`pb-3 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'JOURNAL'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          General Journal ({safeEntries.length})
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
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Asset & Expense debits</p>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg p-3.5 shadow-xs">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                Total Credits
              </span>
              <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                ₱{(glSummary?.total_credit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Liability, Equity & Revenue</p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search entry #, reference, or description..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                fetchJournalEntries(e.target.value);
              }}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs"
            />
          </div>

          {/* Entries Table */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-700/40 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-2.5 px-3 w-10"></th>
                    <th className="py-2.5 px-3">Entry # & Date</th>
                    <th className="py-2.5 px-3">Particulars & Memo</th>
                    <th className="py-2.5 px-3">Module / Reference</th>
                    <th className="py-2.5 px-3 text-right">Debit (₱)</th>
                    <th className="py-2.5 px-3 text-right">Credit (₱)</th>
                    <th className="py-2.5 px-3 text-center">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {safeEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
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
                            <td className="py-2.5 px-3 text-slate-400">
                              {hasLines ? (
                                isExpanded ? <ChevronDown className="w-4 h-4 text-indigo-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />
                              ) : null}
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="font-semibold text-slate-900 dark:text-white block">{entry.entry_number}</span>
                              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                {new Date(entry.posted_at).toLocaleDateString()}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 max-w-sm">
                              <p className="truncate text-slate-800 dark:text-slate-200 font-semibold" title={entry.description}>
                                {entry.description}
                              </p>
                              <span className="text-[11px] text-slate-400 dark:text-slate-500 block truncate">
                                {entry.account_name}
                              </span>
                            </td>

                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                {entry.source_module}
                              </span>
                              <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-1">
                                {entry.reference_number}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-right font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums whitespace-nowrap">
                              {Number(entry.debit) > 0 ? Number(entry.debit).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                            </td>

                            <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                              {Number(entry.credit) > 0 ? Number(entry.credit).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                            </td>

                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Balanced
                              </span>
                            </td>
                          </tr>

                          {/* Expanded Double-Entry Breakdown */}
                          {isExpanded && hasLines && (
                            <tr className="bg-slate-50/70 dark:bg-slate-900/60">
                              <td colSpan={7} className="py-3 px-4 sm:px-8 border-y border-slate-200 dark:border-slate-700">
                                <div className="space-y-2 pl-4 sm:pl-6 border-l-2 border-indigo-500">
                                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
                                    Double-Entry Breakdown for Voucher #{entry.entry_number}
                                  </p>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="text-[10px] font-semibold text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700">
                                          <th className="py-1.5 text-left">Account Code & Name</th>
                                          <th className="py-1.5 text-left">Line Memo</th>
                                          <th className="py-1.5 text-right">Debit (₱)</th>
                                          <th className="py-1.5 text-right">Credit (₱)</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
                                        {(Array.isArray(entry.lines) ? entry.lines : []).map((line) => (
                                          <tr key={line.id} className="text-slate-700 dark:text-slate-300">
                                            <td className="py-2">
                                              <span className="font-semibold text-indigo-600 dark:text-indigo-400">[{line.account_code}]</span>{' '}
                                              <span className="text-slate-900 dark:text-white font-medium">{line.account_name}</span>
                                            </td>
                                            <td className="py-2 text-slate-500 dark:text-slate-400 text-[11px]">{line.description}</td>
                                            <td className="py-2 text-right text-indigo-600 dark:text-indigo-400 font-semibold tabular-nums">
                                              {line.debit > 0 ? line.debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                                            </td>
                                            <td className="py-2 text-right text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
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
              <table className="w-full text-left border-collapse text-xs min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-700/40 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-2.5 px-3">Account Code</th>
                    <th className="py-2.5 px-3">Account Title</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Debit Balance (₱)</th>
                    <th className="py-2.5 px-3 text-right">Credit Balance (₱)</th>
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
              <table className="w-full text-left border-collapse text-xs min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-700/40 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-2.5 px-3">Customer Code</th>
                    <th className="py-2.5 px-3">Customer / Company Name</th>
                    <th className="py-2.5 px-3 text-right">Total Invoiced (₱)</th>
                    <th className="py-2.5 px-3 text-right">Total Collected (₱)</th>
                    <th className="py-2.5 px-3 text-right">Balance Due (₱)</th>
                    <th className="py-2.5 px-3 text-center">Unpaid Invoices</th>
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
              <table className="w-full text-left border-collapse text-xs min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-700/40 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-2.5 px-3">Supplier Code</th>
                    <th className="py-2.5 px-3">Supplier / Vendor Name</th>
                    <th className="py-2.5 px-3 text-right">Total Billed (₱)</th>
                    <th className="py-2.5 px-3 text-right">Total Paid (₱)</th>
                    <th className="py-2.5 px-3 text-right">Balance Owed (₱)</th>
                    <th className="py-2.5 px-3 text-center">Unpaid Bills</th>
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
              <table className="w-full text-left border-collapse text-xs min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-700/40 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-2.5 px-3">Batch Reference & Date</th>
                    <th className="py-2.5 px-3">Payroll Particulars</th>
                    <th className="py-2.5 px-3">GL Expense Account</th>
                    <th className="py-2.5 px-3 text-right">Disbursement Amount (₱)</th>
                    <th className="py-2.5 px-3 text-center">Journal Entry</th>
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
