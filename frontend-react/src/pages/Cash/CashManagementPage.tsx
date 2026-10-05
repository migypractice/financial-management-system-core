import React, { useState, useEffect } from 'react';
import StatCard from '../../components/ui/StatCard';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { DocumentPreviewModal } from '../../components/ui/DocumentPreviewModal';
import { cashService, BankAccount, BankSummary, BankTransaction } from '../../services/cashService';
import { 
  Building2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowLeftRight, 
  RefreshCw, 
  CheckCircle2, 
  FileText, 
  Search, 
  Filter, 
  Plus, 
  AlertTriangle,
  CreditCard,
  Wallet
} from 'lucide-react';

/**
 * Real-Time Corporate Treasury & Cash Management Module
 * Multi-bank liquidity positions, inter-bank fund transfers, and verified bank ledger.
 */
export const CashManagementPage: React.FC = () => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [summary, setSummary] = useState<BankSummary | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<'accounts' | 'ledger'>('accounts');
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>('ALL');
  const [flowFilter, setFlowFilter] = useState<'ALL' | 'INFLOW' | 'OUTFLOW'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Transfer Modal State
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  const [transferForm, setTransferForm] = useState({
    from_bank_account_id: '',
    to_bank_account_id: '',
    amount: '',
    transfer_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    notes: '',
  });

  // Document Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<{
    isOpen: boolean;
    url: string | null;
    title: string;
    type?: string;
  }>({
    isOpen: false,
    url: null,
    title: '',
  });

  const fetchData = async () => {
    try {
      setError(null);
      const [accountsRes, txnsRes] = await Promise.all([
        cashService.getBankAccounts(),
        cashService.getBankTransactions(),
      ]);

      setBankAccounts(accountsRes.data);
      setSummary(accountsRes.summary);
      setTransactions(txnsRes.data);

      if (accountsRes.data.length >= 2 && !transferForm.from_bank_account_id) {
        setTransferForm(prev => ({
          ...prev,
          from_bank_account_id: accountsRes.data[0].id,
          to_bank_account_id: accountsRes.data[1].id,
        }));
      }
    } catch (err: any) {
      console.error('Failed to load cash management data:', err);
      setError(err.response?.data?.message || 'Failed to load treasury bank accounts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError(null);
    setTransferSuccess(null);

    const amountNum = parseFloat(transferForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setTransferError('Please enter a valid transfer amount greater than 0.');
      return;
    }

    if (transferForm.from_bank_account_id === transferForm.to_bank_account_id) {
      setTransferError('Source and destination bank accounts must be different.');
      return;
    }

    const sourceAccount = bankAccounts.find(b => b.id === transferForm.from_bank_account_id);
    if (sourceAccount && amountNum > sourceAccount.current_balance) {
      setTransferError(`Insufficient funds in ${sourceAccount.bank_name}. Available: PHP ${sourceAccount.current_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
      return;
    }

    try {
      setTransferSubmitting(true);
      const res = await cashService.transferFunds({
        from_bank_account_id: transferForm.from_bank_account_id,
        to_bank_account_id: transferForm.to_bank_account_id,
        amount: amountNum,
        transfer_date: transferForm.transfer_date,
        reference_number: transferForm.reference_number || undefined,
        notes: transferForm.notes || undefined,
      });

      setTransferSuccess(res.message || 'Inter-bank fund transfer completed successfully.');
      setTransferForm(prev => ({
        ...prev,
        amount: '',
        reference_number: '',
        notes: '',
      }));
      await fetchData();

      setTimeout(() => {
        setIsTransferOpen(false);
        setTransferSuccess(null);
      }, 1500);
    } catch (err: any) {
      setTransferError(err.response?.data?.message || 'Fund transfer failed. Please verify balances.');
    } finally {
      setTransferSubmitting(false);
    }
  };

  // Filtered transactions
  const filteredTransactions = transactions.filter(t => {
    if (selectedBankFilter !== 'ALL' && t.bank_id !== selectedBankFilter) return false;
    if (flowFilter !== 'ALL' && t.flow_type !== flowFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchParty = t.party_name.toLowerCase().includes(q);
      const matchRef = t.reference_number.toLowerCase().includes(q);
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchBank = t.bank_name?.toLowerCase().includes(q) ?? false;
      if (!matchParty && !matchRef && !matchDesc && !matchBank) return false;
    }
    return true;
  });

  const sourceAccount = bankAccounts.find(b => b.id === transferForm.from_bank_account_id);

  if (loading) return <SkeletonLoader />;

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-600/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Corporate Treasury & Cash Management
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time bank liquidity positions, daily cash flow reconciliation, and inter-bank fund transfers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => setIsTransferOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-all"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Inter-Bank Transfer
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Cash in Banks"
          value={`PHP ${(summary?.total_cash_in_bank ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          accentColor="bg-blue-600"
          subtitle={`Across ${summary?.account_count ?? bankAccounts.length} corporate accounts`}
        />
        <StatCard
          title="Verified Inflows (Deposits)"
          value={`PHP ${(summary?.total_inflows ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          accentColor="bg-emerald-500"
          isPositive={true}
          subtitle="Customer receipts credited to bank"
        />
        <StatCard
          title="Verified Outflows (Payouts)"
          value={`PHP ${(summary?.total_outflows ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          accentColor="bg-rose-500"
          isPositive={false}
          subtitle="Approved disbursements released"
        />
        <StatCard
          title="Net Cash Position"
          value={`PHP ${(summary?.net_cash_flow ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          accentColor="bg-indigo-500"
          isPositive={(summary?.net_cash_flow ?? 0) >= 0}
          subtitle="Net corporate cash variance"
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'accounts'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Corporate Bank Accounts ({bankAccounts.length})
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'ledger'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          Cash Flow & Bank Ledger ({transactions.length})
        </button>
      </div>

      {/* TAB 1: Bank Accounts Matrix */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {bankAccounts.map((account) => {
              const isPrimary = account.account_type.toLowerCase().includes('operating');
              return (
                <div
                  key={account.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-sm flex flex-col justify-between hover:border-blue-400 dark:hover:border-blue-500/50 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
                          isPrimary
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}>
                          {account.account_type}
                        </span>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base mt-2">
                          {account.bank_name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{account.account_name}</p>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                        <Wallet className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/60">
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Current Ledger Balance</p>
                      <p className="font-mono text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                        PHP {account.current_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-1">
                        Acct: {account.account_number}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {account.reconciliation_status}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedBankFilter(account.id);
                        setActiveTab('ledger');
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                    >
                      View Ledger &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Bank Ledger Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Bank Balances Breakdown & Audit</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Live beginning balance + real deposits - real disbursements = actual balance.</p>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-lg">
                Audited: {new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400 font-semibold tracking-wider uppercase text-[11px] border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-5 py-3.5">Bank Institution</th>
                    <th className="px-5 py-3.5">Account Number</th>
                    <th className="px-5 py-3.5">Type & Purpose</th>
                    <th className="px-5 py-3.5 text-right">Beginning Balance</th>
                    <th className="px-5 py-3.5 text-right text-emerald-600 dark:text-emerald-400">+ Inflows (Deposits)</th>
                    <th className="px-5 py-3.5 text-right text-rose-600 dark:text-rose-400">- Outflows (Disbursements)</th>
                    <th className="px-5 py-3.5 text-right">Current Ledger Balance</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {bankAccounts.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">{b.bank_name}</td>
                      <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-300">{b.account_number}</td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">{b.account_type}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-600 dark:text-slate-400">
                        PHP {b.beginning_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        +PHP {b.total_inflows.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-medium text-rose-600 dark:text-rose-400">
                        -PHP {b.total_outflows.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                        PHP {b.current_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          {b.reconciliation_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50/90 dark:bg-slate-800/90 font-bold border-t border-slate-200 dark:border-slate-700">
                  <tr>
                    <td colSpan={3} className="px-5 py-3.5 text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                      Total Cash Equivalents
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-slate-700 dark:text-slate-300">
                      PHP {bankAccounts.reduce((sum, b) => sum + b.beginning_balance, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      +PHP {(summary?.total_inflows ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-rose-600 dark:text-rose-400">
                      -PHP {(summary?.total_outflows ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-sm text-blue-600 dark:text-blue-400">
                      PHP {(summary?.total_cash_in_bank ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Cash Flow & Bank Ledger */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          {/* Controls / Filter Bar */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search ref, payee, notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={selectedBankFilter}
                onChange={(e) => setSelectedBankFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="ALL">All Bank Accounts</option>
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bank_name} ({b.account_number})
                  </option>
                ))}
              </select>

              <select
                value={flowFilter}
                onChange={(e) => setFlowFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="ALL">All Flows (In & Out)</option>
                <option value="INFLOW">Deposits / Inflows Only</option>
                <option value="OUTFLOW">Disbursements / Outflows Only</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Showing <span className="font-bold text-slate-900 dark:text-white">{filteredTransactions.length}</span> bank transaction{filteredTransactions.length === 1 ? '' : 's'}
            </div>
          </div>

          {/* Transactions Ledger Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400 font-semibold tracking-wider uppercase text-[11px] border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Flow & Type</th>
                    <th className="px-5 py-3.5">Bank Institution</th>
                    <th className="px-5 py-3.5">Reference No.</th>
                    <th className="px-5 py-3.5">Counterparty & Description</th>
                    <th className="px-5 py-3.5 text-right">Amount</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-center">Attachment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-slate-400 dark:text-slate-500">
                        No transactions found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">{t.date}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            t.flow_type === 'INFLOW'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          }`}>
                            {t.flow_type === 'INFLOW' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {t.flow_type === 'INFLOW' ? 'DEPOSIT' : 'PAYOUT'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-900 dark:text-white">{t.bank_name || 'Bank Account'}</div>
                          <div className="font-mono text-[10px] text-slate-400">{t.account_number || ''}</div>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-700 dark:text-slate-300 font-medium">{t.reference_number}</td>
                        <td className="px-5 py-3.5 max-w-xs">
                          <div className="font-medium text-slate-900 dark:text-white truncate">{t.party_name}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{t.description}</div>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold whitespace-nowrap">
                          <span className={t.flow_type === 'INFLOW' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            {t.flow_type === 'INFLOW' ? '+' : '-'}PHP {t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {t.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {t.attachment ? (
                            <button
                              onClick={() => setPreviewDoc({
                                isOpen: true,
                                url: t.attachment!,
                                title: `${t.type} Document (${t.reference_number})`,
                                type: t.flow_type === 'INFLOW' ? 'Deposit Slip' : 'Disbursement Voucher',
                              })}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              View
                            </button>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600 text-[11px]">&mdash;</span>
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

      {/* Inter-Bank Fund Transfer Modal */}
      {isTransferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">Inter-Bank Fund Transfer</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Transfer treasury cash between corporate bank accounts</p>
                </div>
              </div>
              <button
                onClick={() => setIsTransferOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="p-6 space-y-4">
              {transferError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{transferError}</span>
                </div>
              )}

              {transferSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{transferSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    From Account (Debit Source)
                  </label>
                  <select
                    value={transferForm.from_bank_account_id}
                    onChange={(e) => setTransferForm({ ...transferForm, from_bank_account_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bank_name} (PHP {b.current_balance.toLocaleString()})
                      </option>
                    ))}
                  </select>
                  {sourceAccount && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Available: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">PHP {sourceAccount.current_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    To Account (Credit Destination)
                  </label>
                  <select
                    value={transferForm.to_bank_account_id}
                    onChange={(e) => setTransferForm({ ...transferForm, to_bank_account_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bank_name} ({b.account_number})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Transfer Amount (PHP)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="0.00"
                    value={transferForm.amount}
                    onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Transfer Date
                  </label>
                  <input
                    type="date"
                    value={transferForm.transfer_date}
                    onChange={(e) => setTransferForm({ ...transferForm, transfer_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bank Reference Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. TRF-202610-098"
                  value={transferForm.reference_number}
                  onChange={(e) => setTransferForm({ ...transferForm, reference_number: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Transfer Purpose / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Replenishment of AP and Payroll disbursement account"
                  value={transferForm.notes}
                  onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50 transition-all"
                >
                  {transferSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowLeftRight className="w-3.5 h-3.5" />}
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supporting Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={previewDoc.isOpen}
        onClose={() => setPreviewDoc({ ...previewDoc, isOpen: false, url: null })}
        fileUrl={previewDoc.url}
        title={previewDoc.title}
        documentType={previewDoc.type}
      />
    </div>
  );
};

export default CashManagementPage;
