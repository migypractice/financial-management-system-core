import React, { useEffect, useState, useMemo } from 'react';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Building2,
  DollarSign,
  AlertTriangle,
  Send,
  FileCheck,
  ShieldAlert,
  ArrowRight,
  Filter,
  Search,
  RefreshCw,
  X,
  Landmark,
  Calculator,
  Percent,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Activity,
  Info
} from 'lucide-react';
import {
  apService,
  PaymentRequestItem,
  DisbursementItem,
  BankAccountItem
} from '../../services/apService';
import { arService } from '../../services/arService';
import { CorporateLiquidityBanner } from '../../components/treasury/CorporateLiquidityBanner';
import { useAuth } from '../../context/AuthContext';
import { DocumentPreviewModal } from '../../components/ui/DocumentPreviewModal';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { StatusBadge } from '../../components/ui/StatusBadge';

export const DisbursementPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'REQUESTS' | 'REGISTER'>('REQUESTS');

  const [paymentRequests, setPaymentRequests] = useState<PaymentRequestItem[]>([]);
  const [disbursements, setDisbursements] = useState<DisbursementItem[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([]);
  const [unpaidAp, setUnpaidAp] = useState<number>(0);
  const [collectibleAr, setCollectibleAr] = useState<number>(0);
  const [ewtType, setEwtType] = useState<'WC158' | 'WC160'>('WC160');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [prStatusFilter, setPrStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean; pr: PaymentRequestItem | null; reason: string }>({
    isOpen: false,
    pr: null,
    reason: '',
  });

  const [disburseModal, setDisburseModal] = useState<{
    isOpen: boolean;
    pr: PaymentRequestItem | null;
    bank_account_id: string;
    payment_method: string;
    reference_number: string;
  }>({
    isOpen: false,
    pr: null,
    bank_account_id: '',
    payment_method: 'BANK_TRANSFER',
    reference_number: '',
  });

  // Preview Modal
  const [previewDoc, setPreviewDoc] = useState<{
    isOpen: boolean;
    url: string | null;
    name?: string;
    mime?: string;
    type?: string;
  }>({ isOpen: false, url: null });

  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4500);
  };

  const isManagerOrAdmin = user?.role === 'super_admin' || user?.role === 'finance_manager';
  const canDisburse = isManagerOrAdmin || user?.role === 'accountant';

  const loadData = async () => {
    try {
      setLoading(true);
      const [prRes, dbRes, banksRes, apRes, arRes] = await Promise.all([
        apService.getPaymentRequests(),
        apService.getDisbursements(),
        apService.getBankAccounts(),
        apService.getApBills().catch(() => null),
        arService.getArInvoices().catch(() => null),
      ]);

      const safePrs = prRes.data || [];
      setPaymentRequests(safePrs);
      setDisbursements(dbRes.data || []);
      setBankAccounts(banksRes.data || []);

      const apTotal = Number(apRes?.summary?.total_payable ?? 0);
      const prPendingTotal = safePrs
        .filter((p: PaymentRequestItem) => p.status !== 'DISBURSED' && p.status !== 'REJECTED')
        .reduce((sum: number, p: PaymentRequestItem) => sum + Number(p.amount), 0);
      setUnpaidAp(apTotal > 0 ? apTotal : prPendingTotal);
      setCollectibleAr(Number(arRes?.summary?.total_receivable ?? 0));
    } catch (err: any) {
      console.error('Failed to load disbursement data:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      setRefreshing(true);
      const [prRes, dbRes, banksRes, apRes, arRes] = await Promise.all([
        apService.getPaymentRequests({
          status: prStatusFilter !== 'ALL' ? prStatusFilter : undefined,
        }),
        apService.getDisbursements(),
        apService.getBankAccounts(),
        apService.getApBills().catch(() => null),
        arService.getArInvoices().catch(() => null),
      ]);
      const safePrs = prRes.data || [];
      setPaymentRequests(safePrs);
      setDisbursements(dbRes.data || []);
      setBankAccounts(banksRes.data || []);

      const apTotal = Number(apRes?.summary?.total_payable ?? 0);
      const prPendingTotal = safePrs
        .filter((p: PaymentRequestItem) => p.status !== 'DISBURSED' && p.status !== 'REJECTED')
        .reduce((sum: number, p: PaymentRequestItem) => sum + Number(p.amount), 0);
      setUnpaidAp(apTotal > 0 ? apTotal : prPendingTotal);
      setCollectibleAr(Number(arRes?.summary?.total_receivable ?? 0));
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!loading) {
      refreshData();
    }
  }, [prStatusFilter]);

  // Actions
  const handleApprove = async (pr: PaymentRequestItem) => {
    if (!isManagerOrAdmin) {
      showToast('Permission Denied: Only Finance Manager or Super Admin can approve payouts.', 'error');
      return;
    }

    if (pr.requested_by_id === user?.id) {
      showToast('Maker-Checker Violation: You cannot approve your own payment request.', 'error');
      return;
    }

    if (!pr.has_attachment) {
      showToast('Internal Control Violation: Cannot approve without supporting document.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      await apService.approvePaymentRequest(pr.id);
      showToast(`Payment Request #${pr.request_number} approved! Ready for payout release.`);
      refreshData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Approval failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReject = (pr: PaymentRequestItem) => {
    if (pr.requested_by_id === user?.id) {
      showToast('Maker-Checker Violation: You cannot reject your own request.', 'error');
      return;
    }
    setRejectModal({ isOpen: true, pr, reason: '' });
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModal.pr) return;

    setActionLoading(true);
    try {
      await apService.rejectPaymentRequest(rejectModal.pr.id, rejectModal.reason);
      showToast(`Payment Request #${rejectModal.pr.request_number} rejected.`, 'success');
      setRejectModal({ isOpen: false, pr: null, reason: '' });
      refreshData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Rejection failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDisburse = (pr: PaymentRequestItem) => {
    const defaultBank = bankAccounts[0]?.id || '';
    const isGoods = /supply|supplies|material|goods|hardware|parts|paint/i.test(pr.purpose);
    setEwtType(isGoods ? 'WC158' : 'WC160');
    setDisburseModal({
      isOpen: true,
      pr,
      bank_account_id: defaultBank,
      payment_method: 'BANK_TRANSFER',
      reference_number: '',
    });
  };

  const handleConfirmDisburse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disburseModal.pr) return;

    setActionLoading(true);
    try {
      await apService.disbursePaymentRequest(disburseModal.pr.id, {
        bank_account_id: disburseModal.bank_account_id,
        payment_method: disburseModal.payment_method,
        reference_number: disburseModal.reference_number || undefined,
      });

      showToast(`Disbursement complete! Cash discharged from bank & posted to General Ledger.`);
      setDisburseModal({ isOpen: false, pr: null, bank_account_id: '', payment_method: 'BANK_TRANSFER', reference_number: '' });
      refreshData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Disbursement failed. Check bank balance.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Calculations
  const totalLiquidCash = useMemo(() => {
    return bankAccounts.reduce((sum, b) => sum + Number(b.current_balance), 0);
  }, [bankAccounts]);
  const pendingCount = paymentRequests.filter((p) => p.status === 'PENDING_APPROVAL').length;
  const pendingTotal = paymentRequests
    .filter((p) => p.status === 'PENDING_APPROVAL')
    .reduce((sum, p) => sum + p.amount, 0);

  const approvedCount = paymentRequests.filter((p) => p.status === 'APPROVED').length;
  const approvedTotal = paymentRequests
    .filter((p) => p.status === 'APPROVED')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalDisbursedAmount = disbursements.reduce((sum, d) => sum + d.amount, 0);
  const flaggedCount = paymentRequests.filter((p) => p.ai_anomaly_flag).length;

  const filteredRequests = useMemo(() => {
    return paymentRequests.filter((pr) => {
      const matchSearch =
        pr.request_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pr.payee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pr.purpose.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [paymentRequests, searchQuery]);

  const filteredDisbursements = useMemo(() => {
    return disbursements.filter((d) => {
      const matchSearch =
        d.disbursement_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.payee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.reference_number || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [disbursements, searchQuery]);

  if (loading) return <SkeletonLoader />;

  return (
    <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-full space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md animate-slideDown ${
            toastMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/40 text-rose-700 dark:text-rose-300'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-500 dark:text-rose-400" />
          )}
          <span className="text-xs font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Disbursement & Payouts</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Maker-Checker payment authorization, mandatory source document audit, and bank cash discharge.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-500 dark:text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Corporate Liquidity & Solvency Monitor Strip */}
      <CorporateLiquidityBanner
        liquidCash={totalLiquidCash}
        unpaidAp={unpaidAp}
        collectibleAr={collectibleAr}
        onRefresh={refreshData}
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pending Approval</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            PHP {pendingTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{pendingCount} voucher{pendingCount !== 1 ? 's' : ''} awaiting review</p>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-amber-500/80" />
        </div>

        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Approved for Release</span>
            <FileCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            PHP {approvedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{approvedCount} ready for bank payout</p>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-500/80" />
        </div>

        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Disbursed YTD</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            PHP {totalDisbursedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{disbursements.length} payments discharged</p>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500/80" />
        </div>

        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">AI Risk Flags</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white font-mono tabular-nums">{flaggedCount}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Rule-based anomaly warnings</p>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-rose-500/80" />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('REQUESTS')}
            className={`pb-3 text-xs font-semibold transition-all relative shrink-0 ${
              activeTab === 'REQUESTS'
                ? 'text-indigo-600 dark:text-white border-b-2 border-indigo-600 dark:border-indigo-500'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Payment Request Vouchers ({paymentRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('REGISTER')}
            className={`pb-3 text-xs font-semibold transition-all relative shrink-0 ${
              activeTab === 'REGISTER'
                ? 'text-emerald-600 dark:text-white border-b-2 border-emerald-600 dark:border-emerald-500'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Cash Disbursement Register ({disbursements.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-2 w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search payee or voucher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* TAB 1: Payment Request Vouchers */}
      {activeTab === 'REQUESTS' && (
        <div className="space-y-4">
          {/* Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(['ALL', 'PENDING_APPROVAL', 'APPROVED', 'DISBURSED', 'REJECTED'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setPrStatusFilter(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  prStatusFilter === key
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800/80'
                }`}
              >
                {key.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/90 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    <th className="py-3.5 px-4">Voucher # & Date</th>
                    <th className="py-3.5 px-4">Payee & Linked Bill</th>
                    <th className="py-3.5 px-4">Purpose / Memo</th>
                    <th className="py-3.5 px-4">Requester</th>
                    <th className="py-3.5 px-4 text-right">Amount</th>
                    <th className="py-3.5 px-4">Supporting Doc</th>
                    <th className="py-3.5 px-4 text-center">AI Audit Status</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right sticky right-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs z-10 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.12)]">Maker-Checker Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        <FileCheck className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-600 mb-2" />
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No payment requests found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((pr) => {
                      const isOwner = pr.requested_by_id === user?.id;
                      const hasDoc = pr.attachments && pr.attachments.length > 0;
                      const firstDoc = hasDoc ? pr.attachments[0] : null;

                      return (
                        <tr key={pr.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-semibold text-slate-900 dark:text-slate-200 block">{pr.request_number}</span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {new Date(pr.created_at).toLocaleDateString()}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-medium text-slate-900 dark:text-white block">{pr.payee_name}</span>
                            {pr.bill_number ? (
                              <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">Bill #{pr.bill_number}</span>
                            ) : (
                              <span className="text-[11px] text-slate-400 dark:text-slate-500">Direct Expense</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 max-w-[220px]">
                            <p className="truncate text-slate-700 dark:text-slate-300" title={pr.purpose}>
                              {pr.purpose}
                            </p>
                            {pr.rejection_reason && (
                              <p className="text-[11px] text-rose-600 dark:text-rose-400 truncate mt-0.5">
                                Reason: {pr.rejection_reason}
                              </p>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="text-slate-800 dark:text-slate-300 block font-medium">{pr.requester_name}</span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">{pr.requester_dept}</span>
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                            PHP {pr.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Mandatory Supporting Document */}
                          <td className="py-3.5 px-4 text-center">
                            {hasDoc && firstDoc ? (
                              <button
                                onClick={() =>
                                  setPreviewDoc({
                                    isOpen: true,
                                    url: firstDoc.file_url,
                                    name: firstDoc.file_name,
                                    mime: firstDoc.mime_type,
                                    type: firstDoc.document_type || 'BILLING_STATEMENT',
                                  })
                                }
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Verified</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                                <AlertTriangle className="w-3 h-3" /> Missing!
                              </span>
                            )}
                          </td>

                          {/* AI Internal Audit Status Badge */}
                          <td className="py-3.5 px-4 text-center">
                            {pr.ai_anomaly_flag ? (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80 cursor-help whitespace-nowrap shadow-xs"
                                title={pr.ai_anomaly_reason || 'AI Audit Anomaly Flagged'}
                              >
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                <span>{pr.ai_anomaly_reason ? (pr.ai_anomaly_reason.length > 28 ? pr.ai_anomaly_reason.substring(0, 26) + '...' : pr.ai_anomaly_reason) : 'AI Warning'}</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/80 whitespace-nowrap shadow-xs"
                                title={`AI Verified: Within Budget & No Duplicate Detected (${Math.round(pr.ai_confidence_score * 100)}% Confidence)`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>AI Verified: Within Budget & No Duplicate</span>
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            <StatusBadge status={pr.status} />
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right sticky right-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xs z-10 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.12)]">
                            {pr.status === 'PENDING_APPROVAL' && (
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {pr.ai_anomaly_flag ? (
                                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 flex items-center gap-1" title={pr.ai_anomaly_reason || ''}>
                                    <ShieldAlert size={11} /> AI Warning
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1" title="Within Budget & No Duplicate">
                                    <CheckCircle2 size={11} /> AI Verified
                                  </span>
                                )}

                                {isOwner ? (
                                  <span className="text-[11px] text-slate-400 dark:text-slate-500 italic" title="Maker-Checker: You created this voucher and cannot approve it.">
                                    Awaiting Checker
                                  </span>
                                ) : isManagerOrAdmin ? (
                                  <>
                                    <button
                                      onClick={() => handleApprove(pr)}
                                      disabled={actionLoading}
                                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors disabled:opacity-50"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleOpenReject(pr)}
                                      disabled={actionLoading}
                                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-colors disabled:opacity-50"
                                    >
                                      Reject
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-[11px] text-slate-400 dark:text-slate-500">Pending Manager</span>
                                )}
                              </div>
                            )}

                            {pr.status === 'APPROVED' && (
                              <div className="flex items-center justify-end gap-2 flex-wrap">
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                  <CheckCircle2 size={11} /> Budget Cleared
                                </span>
                                {canDisburse ? (
                                  <button
                                    onClick={() => handleOpenDisburse(pr)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition-all"
                                  >
                                    <DollarSign className="w-3.5 h-3.5" />
                                    Release Payout
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">Ready for Release</span>
                                )}
                              </div>
                            )}

                            {pr.status === 'DISBURSED' && (
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Discharged
                              </span>
                            )}

                            {pr.status === 'REJECTED' && (
                              <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">Rejected</span>
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
        </div>
      )}

      {/* TAB 2: Cash Disbursement Register */}
      {activeTab === 'REGISTER' && (
        <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/90 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  <th className="py-3.5 px-4">Disbursement # & Date</th>
                  <th className="py-3.5 px-4">Payee & Purpose</th>
                  <th className="py-3.5 px-4">Source Bank Account</th>
                  <th className="py-3.5 px-4">Method & Ref / Check #</th>
                  <th className="py-3.5 px-4 text-right">Amount Released</th>
                  <th className="py-3.5 px-4">Disbursed By</th>
                  <th className="py-3.5 px-4 text-center">General Ledger Entry</th>
                  <th className="py-3.5 px-4 text-center">Supporting Doc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredDisbursements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <DollarSign className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-600 mb-2" />
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No disbursements recorded yet</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Approve and release payment request vouchers to disburse cash.</p>
                    </td>
                  </tr>
                ) : (
                  filteredDisbursements.map((d) => {
                    const hasDoc = d.attachments && d.attachments.length > 0;
                    const firstDoc = hasDoc ? d.attachments[0] : null;

                    return (
                      <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-semibold text-slate-900 dark:text-slate-200 block">{d.disbursement_number}</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">{d.disbursement_date}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-medium text-slate-900 dark:text-white block">{d.payee_name}</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs block">{d.purpose}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-medium text-indigo-600 dark:text-indigo-300 block">{d.bank_name}</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">{d.account_name}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 block w-fit">
                            {d.payment_method}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                            {d.reference_number || 'N/A'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          PHP {d.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-slate-800 dark:text-slate-300 block font-medium">{d.disbursed_by_name}</span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {d.journal_entry_num ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                              {d.journal_entry_num}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">Auto-Posted</span>
                          )}
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
                                  type: 'DISBURSEMENT_VOUCHER',
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Doc</span>
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
      )}

      {/* MODAL: Reject Reason */}
      {rejectModal.isOpen && rejectModal.pr && (
        <div className="fixed inset-0 !mt-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col p-6 shadow-2xl overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Reject Payment Request
              </h3>
              <button
                onClick={() => setRejectModal({ isOpen: false, pr: null, reason: '' })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Are you sure you want to reject voucher #{rejectModal.pr.request_number} for{' '}
                <span className="font-semibold text-slate-900 dark:text-white">{rejectModal.pr.payee_name}</span>?
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Rejection Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide audit feedback or reason for returning this voucher..."
                  value={rejectModal.reason}
                  onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRejectModal({ isOpen: false, pr: null, reason: '' })}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-sm shadow-rose-600/30 disabled:opacity-50 transition-colors"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Execute Disbursement Payout */}
      {disburseModal.isOpen && disburseModal.pr && (
        <div className="fixed inset-0 !mt-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Execute Disbursement Release</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Voucher #{disburseModal.pr.request_number} — Treasury Liquidity & Tax Verification</p>
                </div>
              </div>
              <button
                onClick={() => setDisburseModal({ isOpen: false, pr: null, bank_account_id: '', payment_method: 'BANK_TRANSFER', reference_number: '' })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDisburse} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Payee Info Banner */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Payee:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{disburseModal.pr.payee_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Voucher Memo / Purpose:</span>
                  <span className="text-slate-700 dark:text-slate-300 italic truncate max-w-xs">{disburseModal.pr.purpose}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Voucher Amount:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    PHP {disburseModal.pr.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Pre-Disbursement Liquidity Impact Simulator & Corporate Tax Engine */}
              {(() => {
                const selectedBank = bankAccounts.find(b => b.id === disburseModal.bank_account_id) || bankAccounts[0];
                const selectedBankBalance = Number(selectedBank?.current_balance ?? 0);
                const voucherAmount = Number(disburseModal.pr.amount ?? 0);
                const projectedEndingBalance = selectedBankBalance - voucherAmount;
                const isOverdraft = projectedEndingBalance < 0;

                // Company-wide Liquidity Ratio Shift
                const currentCoverage = unpaidAp > 0 ? (totalLiquidCash / unpaidAp) : (totalLiquidCash > 0 ? 99.9 : 0);
                const projectedCash = Math.max(0, totalLiquidCash - voucherAmount);
                const projectedAp = Math.max(0, unpaidAp - voucherAmount);
                const projectedCoverage = projectedAp > 0 ? (projectedCash / projectedAp) : (projectedCash > 0 ? 99.9 : 0);
                const isSafetyFloorBreached = projectedCoverage < 1.20;

                // Corporate Tax & EWT Breakdown (BIR Standard)
                const grossInvoiceAmount = voucherAmount;
                const netOfVatBase = grossInvoiceAmount / 1.12;
                const inputVat12 = grossInvoiceAmount - netOfVatBase;
                const ewtRateVal = ewtType === 'WC158' ? 0.01 : 0.02;
                const retainedEwt = netOfVatBase * ewtRateVal;
                const finalNetSettlement = grossInvoiceAmount - retainedEwt;

                return (
                  <div className="space-y-3.5">
                    {/* Live Liquidity Simulator Box */}
                    <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900 p-3.5 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-indigo-100 dark:border-indigo-900/60">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center">
                            <Activity size={13} className="animate-pulse" />
                          </div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            AI Treasury & Liquidity Impact Check
                          </span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 font-semibold">
                          Live Bank Balance Simulation
                        </span>
                      </div>

                      {/* Bank Balance Progression */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Bank Balance</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white text-xs block mt-0.5 tabular-nums">
                            PHP {selectedBankBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/60">
                          <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-medium">Less: Voucher Payout</span>
                          <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs block mt-0.5 tabular-nums">
                            - PHP {voucherAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className={`p-2 rounded-lg border ${isOverdraft ? 'bg-rose-100 dark:bg-rose-950/70 border-rose-400 text-rose-700 dark:text-rose-300' : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'}`}>
                          <span className="text-[10px] block font-medium">Projected Ending</span>
                          <span className="font-mono font-bold text-xs block mt-0.5 tabular-nums">
                            PHP {projectedEndingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {isOverdraft && (
                        <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 text-[11px] flex items-center gap-2 font-medium animate-pulse">
                          <AlertTriangle size={14} className="shrink-0" />
                          <span>CRITICAL OVERDRAFT WARNING: Selected bank account has insufficient balance to cover this voucher payout.</span>
                        </div>
                      )}

                      {/* Cash Liquidity Ratio Shift */}
                      <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                            Company Cash Liquidity Ratio:
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono font-bold text-slate-600 dark:text-slate-400">
                              {currentCoverage >= 99 ? '99.9x+' : `${currentCoverage.toFixed(2)}x`}
                            </span>
                            <ArrowRight size={11} className="text-slate-400" />
                            <span className={`font-mono font-bold ${isSafetyFloorBreached ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {projectedCoverage >= 99 ? '99.9x+' : `${projectedCoverage.toFixed(2)}x`}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              ({isSafetyFloorBreached ? '⚠️ Below 1.20x Safety Floor' : 'Above 1.20x Safety Floor'})
                            </span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${isSafetyFloorBreached ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300'}`}>
                          {isSafetyFloorBreached ? 'Tight Liquidity' : 'Healthy Liquidity'}
                        </span>
                      </div>
                    </div>

                    {/* Corporate Tax & BIR EWT Withholding Box */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/50 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Percent size={13} className="text-indigo-600 dark:text-indigo-400" />
                          <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Corporate Tax & EWT Breakdown
                          </span>
                        </div>
                        {/* EWT Selector */}
                        <div className="flex items-center gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setEwtType('WC160')}
                            className={`px-2 py-0.5 rounded font-medium transition-colors ${ewtType === 'WC160' ? 'bg-indigo-600 text-white font-bold' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'}`}
                          >
                            2% WC160 (Services/Rent)
                          </button>
                          <button
                            type="button"
                            onClick={() => setEwtType('WC158')}
                            className={`px-2 py-0.5 rounded font-medium transition-colors ${ewtType === 'WC158' ? 'bg-indigo-600 text-white font-bold' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'}`}
                          >
                            1% WC158 (Goods/Materials)
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                          <span>Gross Invoice Amount:</span>
                          <span className="font-mono text-slate-900 dark:text-white font-semibold">
                            PHP {grossInvoiceAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px] pl-2 border-l-2 border-slate-300 dark:border-slate-600">
                          <span>12% Input VAT (Tax Base: PHP {netOfVatBase.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}):</span>
                          <span className="font-mono">
                            PHP {inputVat12.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between text-amber-700 dark:text-amber-400 font-medium">
                          <span>Less: Retained EWT ({ewtType === 'WC158' ? '1% WC158' : '2% WC160'} for BIR remittance):</span>
                          <span className="font-mono">
                            - PHP {retainedEwt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1.5 border-t border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs">
                          <span>Final Net Cash Settlement:</span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                            PHP {finalNetSettlement.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 italic pt-1">
                        <Info size={11} className="shrink-0 text-slate-400" />
                        <span>Retained tax credited to 2020-Withholding Tax Payable for BIR 1601-EQ & BIR 2307 issuance.</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Disburse From Bank Account <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={disburseModal.bank_account_id}
                  onChange={(e) => setDisburseModal({ ...disburseModal, bank_account_id: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bank_name} - {b.account_name} (Avail: PHP {Number(b.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={disburseModal.payment_method}
                    onChange={(e) => setDisburseModal({ ...disburseModal, payment_method: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHECK">Corporate Check</option>
                    <option value="ONLINE">Online Real-Time</option>
                    <option value="CASH">Petty Cash</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ref # / Check #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BDO-TRF-99410"
                    value={disburseModal.reference_number}
                    onChange={(e) => setDisburseModal({ ...disburseModal, reference_number: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                Accounting effect: Decrements bank cash balance, decrements AP bill liability balance, and posts balanced journal entry: Debit 2010-AP, Credit 1010-CASH.
              </p>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDisburseModal({ isOpen: false, pr: null, bank_account_id: '', payment_method: 'BANK_TRANSFER', reference_number: '' })}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm shadow-emerald-600/30 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {actionLoading ? 'Processing...' : 'Discharge Cash & Post to GL'}
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

export default DisbursementPage;

