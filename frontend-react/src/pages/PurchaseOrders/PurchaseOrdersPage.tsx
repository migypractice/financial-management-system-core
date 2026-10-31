import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Building2,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  ExternalLink,
  Info
} from 'lucide-react';
import {
  purchaseOrderService,
  InboundPurchaseOrder,
  PurchaseOrderLineItem
} from '../../services/purchaseOrderService';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';

interface PurchaseOrdersPageProps {
  onNavigate?: (path: string) => void;
}

export const PurchaseOrdersPage: React.FC<PurchaseOrdersPageProps> = ({ onNavigate }) => {
  const [purchaseOrders, setPurchaseOrders] = useState<InboundPurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [receiptFilter, setReceiptFilter] = useState('ALL');
  const [processingFilter, setProcessingFilter] = useState('ALL');
  const [selectedPO, setSelectedPO] = useState<InboundPurchaseOrder | null>(null);
  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 25,
  });

  const fetchPurchaseOrders = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await purchaseOrderService.getPurchaseOrders({
        search: searchQuery.trim() || undefined,
        receipt_status: receiptFilter !== 'ALL' ? receiptFilter : undefined,
        processing_status: processingFilter !== 'ALL' ? processingFilter : undefined,
        per_page: 50,
      });

      setPurchaseOrders(res.data || []);
      if (res.meta) {
        setMeta(res.meta);
      }
    } catch (err) {
      console.error('Failed to load inbound purchase orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, receiptFilter, processingFilter]);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  // Statistics KPIs
  const stats = useMemo(() => {
    const total = purchaseOrders.length;
    const pendingReview = purchaseOrders.filter(
      po => po.processing_status === 'PENDING_REVIEW'
    ).length;
    const received = purchaseOrders.filter(
      po => po.receipt_status === 'RECEIVED'
    ).length;
    const totalValue = purchaseOrders.reduce(
      (sum, po) => sum + (Number(po.total_amount) || 0),
      0
    );

    return { total, pendingReview, received, totalValue };
  }, [purchaseOrders]);

  const formatCurrency = (val: number, currency: string = 'PHP') => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: currency || 'PHP',
      minimumFractionDigits: 2,
    }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderStatusBadge = (status: string, type: 'receipt' | 'processing') => {
    const normalized = (status || '').toUpperCase();
    if (type === 'receipt') {
      if (normalized === 'RECEIVED') {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            RECEIVED
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
          {status}
        </span>
      );
    }

    // Processing status
    if (normalized === 'PENDING_REVIEW') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
          <Clock className="w-3 h-3" />
          PENDING REVIEW
        </span>
      );
    }
    if (normalized === 'APPROVED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
          <CheckCircle2 className="w-3 h-3" />
          APPROVED
        </span>
      );
    }
    if (normalized === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
          <AlertCircle className="w-3 h-3" />
          REJECTED
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
        {status}
      </span>
    );
  };

  if (loading && !refreshing) {
    return <SkeletonLoader />;
  }

  return (
    <div className="p-4 lg:p-6 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-full space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Inbound Purchase Orders
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              SmartChain M2M
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Intake records received from external procurement subsystems (e.g. SmartChain). Acknowledged at receipt and queued for matching without creating premature AP liabilities.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => fetchPurchaseOrders(true)}
            disabled={refreshing}
            className="p-2 sm:px-3 sm:py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-xs"
            title="Refresh Inbound POs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Accounting Compliance Banner */}
      <div className="rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 p-3.5 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
          <span className="font-semibold">Procurement Intake Protocol:</span> These records confirm receipt of approved Purchase Orders transmitted via <code className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 rounded font-mono text-[11px]">POST /api/v1/integration/purchase-orders</code>. Per Financial Core standards, intake does not automatically post journal entries or create Accounts Payable bills until delivery receipts and supplier invoices are matched.
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Total Inbound POs
            </span>
            <ShoppingBag className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {meta.total || stats.total}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Across all external sources
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
              Pending Review
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {stats.pendingReview}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Awaiting AP voucher matching
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              Receipt Acknowledged
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.received}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            HTTP 201 Intake handshake
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
              Total Inbound Value
            </span>
            <Package className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {formatCurrency(stats.totalValue)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Committed purchase orders
          </span>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg p-3.5 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by FIN-PO, PO Number, Supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Receipt:</span>
            <select
              value={receiptFilter}
              onChange={(e) => setReceiptFilter(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="ALL">All Receipts</option>
              <option value="RECEIVED">RECEIVED</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="hidden sm:inline">Processing:</span>
            <select
              value={processingFilter}
              onChange={(e) => setProcessingFilter(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="ALL">All Processing</option>
              <option value="PENDING_REVIEW">PENDING_REVIEW</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Financial Reference</th>
                <th className="py-3 px-4">SmartChain PO</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-center">Receipt Status</th>
                <th className="py-3 px-4 text-center">Processing Status</th>
                <th className="py-3 px-4">Received Date</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
              {purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-medium text-slate-600 dark:text-slate-300">
                      No inbound purchase orders found
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {searchQuery
                        ? 'Try clearing your search query or filters.'
                        : 'Approved purchase orders sent by SmartChain will automatically appear here.'}
                    </p>
                  </td>
                </tr>
              ) : (
                purchaseOrders.map((po) => (
                  <tr
                    key={po.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {po.financial_reference}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                        {po.external_reference_id}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {po.supplier_name}
                      </div>
                      {po.supplier_code && (
                        <div className="text-[11px] text-slate-400 font-mono">
                          {po.supplier_code}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(Number(po.total_amount), po.currency)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {renderStatusBadge(po.receipt_status, 'receipt')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {renderStatusBadge(po.processing_status, 'processing')}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {formatDate(po.received_at)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedPO(po)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 transition-colors shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Meta info */}
        {purchaseOrders.length > 0 && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-900/30 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {purchaseOrders.length} of {meta.total} inbound records
            </span>
            <span>Source System: SMARTCHAIN (Direct M2M)</span>
          </div>
        )}
      </div>

      {/* View Details Modal */}
      {selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    {selectedPO.financial_reference}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                    SmartChain PO: {selectedPO.external_reference_id}
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  Purchase Order Intake Details
                </h2>
              </div>
              <button
                onClick={() => setSelectedPO(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Header Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700/70 text-xs">
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Source System</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedPO.source_system}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Category</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedPO.category_type}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Receipt Status</div>
                  <div className="mt-1">{renderStatusBadge(selectedPO.receipt_status, 'receipt')}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Processing Status</div>
                  <div className="mt-1">{renderStatusBadge(selectedPO.processing_status, 'processing')}</div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Supplier Name</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedPO.supplier_name}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Supplier Code</div>
                  <div className="font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedPO.supplier_code || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Received At</div>
                  <div className="text-slate-800 dark:text-slate-200 mt-0.5">
                    {formatDate(selectedPO.received_at)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Total Amount</div>
                  <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {formatCurrency(Number(selectedPO.total_amount), selectedPO.currency)}
                  </div>
                </div>
              </div>

              {/* Immutable Handshake IDs */}
              <div className="bg-slate-50/70 dark:bg-slate-900/30 p-3 rounded-lg border border-slate-200 dark:border-slate-700/60 text-[11px] space-y-1 font-mono text-slate-500 dark:text-slate-400">
                <div className="flex items-center justify-between">
                  <span>Message UUID:</span>
                  <span className="text-slate-700 dark:text-slate-300">{selectedPO.message_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Idempotency Key:</span>
                  <span className="text-slate-700 dark:text-slate-300">{selectedPO.idempotency_key}</span>
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  Itemized Purchase Order Lines ({selectedPO.lines?.length || 0})
                </h3>

                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-500 uppercase">
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Product Name</th>
                        <th className="py-2 px-3">Product ID</th>
                        <th className="py-2 px-3 text-right">Quantity</th>
                        <th className="py-2 px-3">Unit</th>
                        <th className="py-2 px-3 text-right">Unit Price</th>
                        <th className="py-2 px-3 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {selectedPO.lines && selectedPO.lines.length > 0 ? (
                        selectedPO.lines.map((line, idx) => (
                          <tr key={line.id || idx}>
                            <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                              {line.product_name}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                              {line.product_id}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                              {line.quantity}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 uppercase">
                              {line.unit}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                              {formatCurrency(Number(line.unit_price), selectedPO.currency)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                              {formatCurrency(Number(line.line_total), selectedPO.currency)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-4 text-center text-slate-400">
                            No individual lines recorded
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-white">
                        <td colSpan={6} className="py-2.5 px-3 text-right">
                          Total PO Amount:
                        </td>
                        <td className="py-2.5 px-3 text-right text-indigo-600 dark:text-indigo-400 font-bold">
                          {formatCurrency(Number(selectedPO.total_amount), selectedPO.currency)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Informational Notice */}
              <div className="rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Accounting Notice:</strong> This purchase order intake does not automatically create an Accounts Payable bill, General Ledger journal entry, or disbursement voucher. Upon delivery verification, the warehouse team or procurement officer matches the PO against the supplier invoice before submitting a disbursement request.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
              <span className="text-xs text-slate-400">
                Financial Management System Core • M2M Intake Module
              </span>
              <button
                onClick={() => setSelectedPO(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrdersPage;
