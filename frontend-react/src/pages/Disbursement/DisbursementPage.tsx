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
import { WorkflowGuideBar } from '../../components/navigation/WorkflowGuideBar';
import { BirForm2307Modal, BirForm2307Data } from '../../components/modals/BirForm2307Modal';

export interface DisbursementPageProps {
  onNavigate?: (path: string) => void;
}

export const DisbursementPage: React.FC<DisbursementPageProps> = ({ onNavigate }) => {
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

  // BIR Form 2307 Modal
  const [birModalData, setBirModalData] = useState<BirForm2307Data>({
    isOpen: false,
    payeeName: '',
    atcCode: 'WC160',
    taxBase: 0,
    taxWithheld: 0,
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4500);
  };

  const isManagerOrAdmin = user?.role === 'super_admin' || user?.role === 'finance_manager';
  const isAccountant = user?.role === 'accountant';
  const isAuditor = user?.role === 'auditor';
  const canDisburse = isManagerOrAdmin;

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
    const list = paymentRequests.filter((pr) => {
      const matchSearch =
        pr.request_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pr.payee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pr.purpose.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });

    const statusPriority: Record<string, number> = {
      PENDING_APPROVAL: 1,
      APPROVED: 2,
      DISBURSED: 3,
      REJECTED: 4,
    };

    return [...list].sort((a, b) => {
      const pA = statusPriority[a.status] || 99;
      const pB = statusPriority[b.status] || 99;
      if (pA !== pB) return pA - pB;
      return (b.id ? String(b.id).localeCompare(String(a.id)) : 0);
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
    <div className="p-4 lg:p-5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-full space-y-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl backdrop-blur-md animate-slideDown ${
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Disbursements</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review approved bills and release supplier payments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-xs cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Interactive Workflow Guide */}
      <WorkflowGuideBar flow="PAYABLES" currentStep={3} onNavigate={onNavigate} />

      {/* Corporate Liquidity & Solvency Monitor Strip */}
      <CorporateLiquidityBanner
        liquidCash={totalLiquidCash}
        unpaidAp={unpaidAp}
        collectibleAr={collectibleAr}
        onRefresh={refreshData}
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3.5 shadow-xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Approval</span>
          <p className="text-lg font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5">
            ₱{pendingTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{pendingCount} voucher{pendingCount !== 1 ? 's' : ''}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3.5 shadow-xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Ready to Pay</span>
          <p className="text-lg font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5">
            ₱{approvedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{approvedCount} approved</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3.5 shadow-xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Paid</span>
          <p className="text-lg font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5">
            ₱{totalDisbursedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{disbursements.length} payments</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3.5 shadow-xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Needs Review</span>
          <p className="text-lg font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5">{flaggedCount}</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Flagged items</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('REQUESTS')}
            className={`pb-2.5 text-xs font-semibold transition-all relative shrink-0 cursor-pointer ${
              activeTab === 'REQUESTS'
                ? 'text-blue-600 dark:text-white border-b-2 border-blue-600 dark:border-blue-500'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Payment Vouchers ({paymentRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('REGISTER')}
            className={`pb-2.5 text-xs font-semibold transition-all relative shrink-0 cursor-pointer ${
              activeTab === 'REGISTER'
                ? 'text-blue-600 dark:text-white border-b-2 border-blue-600 dark:border-blue-500'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Disbursement Register ({disbursements.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-1.5 w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search payee or voucher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* TAB 1: Payment Request Vouchers */}
      {activeTab === 'REQUESTS' && (
        <div className="space-y-3">
          {/* Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(['ALL', 'PENDING_APPROVAL', 'APPROVED', 'DISBURSED', 'REJECTED'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setPrStatusFilter(key)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  prStatusFilter === key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {key === 'ALL' ? 'All' : key === 'PENDING_APPROVAL' ? 'Pending' : key === 'APPROVED' ? 'Approved' : key === 'DISBURSED' ? 'Paid' : 'Rejected'}
              </button>
            ))}
          </div>

          {/* Desktop Table View (>= 640px) */}
          <div className="hidden sm:block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-600 dark:text-slate-400">
                    <th className="py-2.5 px-3 whitespace-nowrap">Voucher #</th>
                    <th className="py-2.5 px-3">Payee & Bill</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Amount</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Attachment</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Status</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-500">
                        <FileCheck className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-600 mb-1.5" />
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">No payment requests found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((pr) => {
                      const isOwner = pr.requested_by_id === user?.id;
                      const hasDoc = pr.attachments && pr.attachments.length > 0;
                      const firstDoc = hasDoc ? pr.attachments[0] : null;

                      return (
                        <tr key={pr.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-semibold text-slate-900 dark:text-slate-200 block">{pr.request_number}</span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(pr.created_at).toLocaleDateString()}
                            </span>
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="font-medium text-slate-900 dark:text-white block">{pr.payee_name}</span>
                            {pr.bill_number ? (
                              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">Bill #{pr.bill_number}</span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Direct Expense</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 max-w-[200px]">
                            <p className="truncate text-slate-700 dark:text-slate-300" title={pr.purpose}>
                              {pr.purpose}
                            </p>
                            {pr.rejection_reason && (
                              <p className="text-[11px] text-rose-600 dark:text-rose-400 truncate mt-0.5">
                                Reason: {pr.rejection_reason}
                              </p>
                            )}
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="text-slate-800 dark:text-slate-300 block">{pr.requester_name}</span>
                            <span className="text-[11px] text-slate-400">{pr.requester_dept}</span>
                          </td>

                          <td className="py-2.5 px-3 text-right font-semibold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                            ₱{pr.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Supporting Document */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
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
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-750 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View</span>
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  setPreviewDoc({
                                    isOpen: true,
                                    url: '/sample-receipt.svg',
                                    name: `voucher-support-${pr.request_number}.pdf`,
                                    mime: 'application/pdf',
                                    type: 'BILLING_STATEMENT',
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-750 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View</span>
                              </button>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <StatusBadge status={pr.status} />
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            {pr.status === 'PENDING_APPROVAL' && (
                              isManagerOrAdmin ? (
                                <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                                  <button
                                    onClick={() => handleApprove(pr)}
                                    disabled={actionLoading}
                                    className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleOpenReject(pr)}
                                    disabled={actionLoading}
                                    className="px-2.5 py-1 rounded text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : isAccountant ? (
                                <div className="flex flex-col items-end">
                                  <button
                                    disabled
                                    className="px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-600 cursor-not-allowed"
                                    title="Segregation of Duties: Requires Finance Manager Approval (Maker ≠ Checker)"
                                  >
                                    Locked (Maker)
                                  </button>
                                  <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                                    Requires Checker
                                  </span>
                                </div>
                              ) : isAuditor ? (
                                <span className="text-xs text-slate-400 dark:text-slate-500 italic">Read-Only Mode</span>
                              ) : (
                                <span className="text-xs text-slate-400">Pending Checker</span>
                              )
                            )}

                            {pr.status === 'APPROVED' && (
                              canDisburse ? (
                                <button
                                  onClick={() => handleOpenDisburse(pr)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-xs transition-all cursor-pointer"
                                >
                                  Release Payment
                                </button>
                              ) : isAccountant ? (
                                <div className="flex flex-col items-end">
                                  <button
                                    disabled
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 font-semibold text-xs border border-slate-200 dark:border-slate-600 cursor-not-allowed"
                                    title="Segregation of Duties: Requires Finance Manager Approval"
                                  >
                                    Disburse Locked
                                  </button>
                                  <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                                    Requires Checker
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Read-Only Mode</span>
                              )
                            )}

                            {pr.status === 'DISBURSED' && (
                              <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                                </span>
                                <button
                                  onClick={() => setBirModalData({
                                    isOpen: true,
                                    payeeName: pr.payee_name,
                                    tin: '004-882-913-000',
                                    atcCode: pr.purpose.toLowerCase().includes('good') || pr.purpose.toLowerCase().includes('steel') || pr.purpose.toLowerCase().includes('cement') ? 'WC158' : 'WC160',
                                    taxBase: pr.amount / 1.12,
                                    taxWithheld: (pr.amount / 1.12) * (pr.purpose.toLowerCase().includes('good') || pr.purpose.toLowerCase().includes('steel') || pr.purpose.toLowerCase().includes('cement') ? 0.01 : 0.02),
                                    period: 'October 2026',
                                    voucherRef: pr.request_number,
                                  })}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
                                  title="View & Print BIR Form 2307 Withholding Certificate"
                                >
                                  <span>🖨️ Form 2307</span>
                                </button>
                              </div>
                            )}

                            {pr.status === 'REJECTED' && (
                              <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">Rejected</span>
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

          {/* Mobile Card View (< 640px) */}
          <div className="block sm:hidden space-y-3">
            {filteredRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <FileCheck className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-600 mb-1.5" />
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">No payment requests found</p>
              </div>
            ) : (
              filteredRequests.map((pr) => {
                const isOwner = pr.requested_by_id === user?.id;
                const hasDoc = pr.attachments && pr.attachments.length > 0;
                const firstDoc = hasDoc ? pr.attachments[0] : null;

                return (
                  <div key={`mob-${pr.id}`} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 p-4 shadow-xs space-y-3">
                    {/* Header: Voucher # + Status Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono tracking-wide">
                        {pr.request_number}
                      </span>
                      <StatusBadge status={pr.status} />
                    </div>

                    {/* Payee & Purpose */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                        {pr.payee_name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {pr.purpose}
                      </p>
                      {pr.bill_number && (
                        <span className="inline-block mt-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                          Bill #{pr.bill_number}
                        </span>
                      )}
                    </div>

                    {/* Info Rows */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Created Date</span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {new Date(pr.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Department</span>
                        <span className="text-slate-700 dark:text-slate-300">{pr.requester_dept || 'Finance'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Amount</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
                          ₱{pr.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Attachment preview trigger on mobile */}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-slate-400">Receipt / Invoice:</span>
                      <button
                        onClick={() =>
                          setPreviewDoc({
                            isOpen: true,
                            url: firstDoc ? firstDoc.file_url : '/sample-receipt.svg',
                            name: firstDoc ? firstDoc.file_name : `voucher-support-${pr.request_number}.pdf`,
                            mime: firstDoc ? firstDoc.mime_type : 'application/pdf',
                            type: firstDoc?.document_type || 'BILLING_STATEMENT',
                          })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Document</span>
                      </button>
                    </div>

                    {/* Actions with 44px min-height touch targets (Fix 4) */}
                    {pr.status === 'PENDING_APPROVAL' && isManagerOrAdmin && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                        <button
                          onClick={() => handleApprove(pr)}
                          disabled={actionLoading}
                          className="w-full min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors active:scale-95 disabled:opacity-50 cursor-pointer touch-target"
                        >
                          <CheckCircle2 size={16} /> Approve
                        </button>
                        <button
                          onClick={() => handleOpenReject(pr)}
                          disabled={actionLoading}
                          className="w-full min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-colors active:scale-95 disabled:opacity-50 cursor-pointer touch-target"
                        >
                          <X size={16} /> Reject
                        </button>
                      </div>
                    )}

                    {pr.status === 'APPROVED' && canDisburse && (
                      <button
                        onClick={() => handleOpenDisburse(pr)}
                        className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer touch-target"
                      >
                        <Send size={15} /> Release Payment
                      </button>
                    )}

                    {pr.status === 'DISBURSED' && (
                      <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5">
                        <CheckCircle2 size={15} /> Disbursed & Posted to Ledger
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Cash Disbursement Register */}
      {activeTab === 'REGISTER' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <th className="py-2.5 px-3 whitespace-nowrap">Disbursement #</th>
                  <th className="py-2.5 px-3">Payee & Purpose</th>
                  <th className="py-2.5 px-3">Source Bank</th>
                  <th className="py-2.5 px-3">Method & Ref</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Amount</th>
                  <th className="py-2.5 px-3">Disbursed By</th>
                  <th className="py-2.5 px-3 text-center">GL Entry</th>
                  <th className="py-2.5 px-3 text-center">Document</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDisbursements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500">
                      <DollarSign className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-600 mb-1.5" />
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">No disbursements recorded yet</p>
                    </td>
                  </tr>
                ) : (
                  filteredDisbursements.map((d) => {
                    const hasDoc = d.attachments && d.attachments.length > 0;
                    const firstDoc = hasDoc ? d.attachments[0] : null;

                    return (
                      <tr key={d.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-semibold text-slate-900 dark:text-slate-200 block">{d.disbursement_number}</span>
                          <span className="text-[11px] text-slate-400">{d.disbursement_date}</span>
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="font-medium text-slate-900 dark:text-white block">{d.payee_name}</span>
                          <span className="text-[11px] text-slate-400 truncate max-w-xs block">{d.purpose}</span>
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="font-medium text-slate-900 dark:text-white block">{d.bank_name}</span>
                          <span className="text-[11px] text-slate-400">{d.account_name}</span>
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 block w-fit">
                            {d.payment_method}
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {d.reference_number || '—'}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                          ₱{d.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="text-slate-700 dark:text-slate-300">{d.disbursed_by_name}</span>
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          {d.journal_entry_num ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300">
                              {d.journal_entry_num}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Auto-Posted</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-center">
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
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-750 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View</span>
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                setPreviewDoc({
                                  isOpen: true,
                                  url: '/sample-receipt.svg',
                                  name: `disbursement-receipt-${d.disbursement_number}.pdf`,
                                  mime: 'application/pdf',
                                  type: 'DISBURSEMENT_RECEIPT',
                                })
                              }
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-750 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View</span>
                            </button>
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
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm tabular-nums">
                    ₱{disburseModal.pr.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3.5 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                          <Activity size={14} className="text-indigo-600 dark:text-indigo-400" />
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">
                            Liquidity & Bank Balance Impact
                          </span>
                        </div>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-medium">
                          Real-time Balance Simulation
                        </span>
                      </div>

                      {/* Bank Balance Progression */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Current Bank Balance</span>
                          <span className="tabular-nums font-semibold text-slate-900 dark:text-white text-xs block mt-0.5">
                            ₱{selectedBankBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/60">
                          <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-medium">Less: Voucher Payout</span>
                          <span className="tabular-nums font-semibold text-rose-600 dark:text-rose-400 text-xs block mt-0.5">
                            - ₱{voucherAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className={`p-2 rounded-lg border ${isOverdraft ? 'bg-rose-100 dark:bg-rose-950/70 border-rose-400 text-rose-700 dark:text-rose-300' : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'}`}>
                          <span className="text-[10px] block font-medium">Projected Ending</span>
                          <span className="tabular-nums font-semibold text-xs block mt-0.5">
                            ₱{projectedEndingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {isOverdraft && (
                        <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 text-[11px] flex items-center gap-2 font-medium">
                          <AlertTriangle size={14} className="shrink-0" />
                          <span>Insufficient balance: Selected bank account cannot cover this payout.</span>
                        </div>
                      )}

                      {/* Cash Liquidity Ratio Shift */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block">
                            Company Cash Liquidity Ratio:
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                              {currentCoverage >= 99 ? '99.9x+' : `${currentCoverage.toFixed(2)}x`}
                            </span>
                            <ArrowRight size={11} className="text-slate-400" />
                            <span className={`tabular-nums font-semibold ${isSafetyFloorBreached ? 'text-amber-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {projectedCoverage >= 99 ? '99.9x+' : `${projectedCoverage.toFixed(2)}x`}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({isSafetyFloorBreached ? 'Below 1.20x safety floor' : 'Above 1.20x safety floor'})
                            </span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${isSafetyFloorBreached ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300'}`}>
                          {isSafetyFloorBreached ? 'Tight Liquidity' : 'Healthy Liquidity'}
                        </span>
                      </div>
                    </div>

                    {/* Corporate Tax & BIR EWT Withholding Box */}
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Percent size={14} className="text-indigo-600 dark:text-indigo-400" />
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">
                            Tax & EWT Breakdown
                          </span>
                        </div>
                        {/* EWT Selector */}
                        <div className="flex items-center gap-1 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setEwtType('WC160')}
                            className={`px-2 py-0.5 rounded font-medium transition-colors ${ewtType === 'WC160' ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'}`}
                          >
                            2% WC160 (Services/Rent)
                          </button>
                          <button
                            type="button"
                            onClick={() => setEwtType('WC158')}
                            className={`px-2 py-0.5 rounded font-medium transition-colors ${ewtType === 'WC158' ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'}`}
                          >
                            1% WC158 (Goods/Materials)
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                          <span>Gross Invoice Amount:</span>
                          <span className="tabular-nums font-semibold text-slate-900 dark:text-white">
                            ₱{grossInvoiceAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px] pl-2 border-l-2 border-slate-200 dark:border-slate-600">
                          <span>12% Input VAT (Tax Base: ₱{netOfVatBase.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}):</span>
                          <span className="tabular-nums font-medium">
                            ₱{inputVat12.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between text-amber-700 dark:text-amber-400 font-medium">
                          <span>Less: Retained EWT ({ewtType === 'WC158' ? '1% WC158' : '2% WC160'} for BIR remittance):</span>
                          <span className="tabular-nums font-semibold">
                            - ₱{retainedEwt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1.5 border-t border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs">
                          <span>Final Net Cash Settlement:</span>
                          <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                            ₱{finalNetSettlement.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 italic pt-1">
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
                      {b.bank_name} - {b.account_name} (Avail: ₱{Number(b.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })})
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
                  {actionLoading ? 'Processing...' : 'Release Payment & Post to GL'}
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

      {/* BIR Form 2307 Certificate Modal */}
      <BirForm2307Modal
        data={birModalData}
        onClose={() => setBirModalData((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default DisbursementPage;

