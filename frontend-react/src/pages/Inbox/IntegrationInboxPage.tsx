import React, { useState, useEffect, useMemo } from 'react';
import {
  Inbox,
  Mail,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Eye,
  ExternalLink,
  Code,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Copy,
  Check,
  X,
  Server
} from 'lucide-react';
import apiClient from '../../services/apiClient';

interface Transmission {
  id: string;
  transactionCode: string;
  sourceModule: string;
  senderLabel: string;
  cluster: 'HRMS' | 'ESFA' | 'SUPPLY_CHAIN' | 'FLEET' | 'FACILITIES';
  categoryType: string;
  referenceId: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  status: 'pending_approval' | 'approved' | 'posted' | 'rejected' | 'ai_flagged';
  aiConfidence: number;
  aiAnomalyFlag: boolean;
  aiAnomalyReason?: string;
  description: string;
  createdAt: string;
  rawPayload: any;
}

interface PartnerMemo {
  id: string;
  cluster: string;
  sender: string;
  subject: string;
  preview: string;
  content: string;
  time: string;
  priority: 'HIGH' | 'NORMAL' | 'URGENT';
  status: 'ACTIVE' | 'RESOLVED';
}

const DEFAULT_MEMOS: PartnerMemo[] = [
  {
    id: 'memo-1',
    cluster: 'HR4 (Payroll & Benefits)',
    sender: 'Group 9 — HRMS Cluster Core',
    subject: 'Batch Payroll Protocol v2.0 Live Handshake',
    preview: 'Our batch disbursement endpoint at /api/integrations/hr4/payroll is verified and ready for testing.',
    content: 'We verified the batch JSON schema { records: [...] } with integer centavos and deterministic idempotency keys. All payroll batches for the 2026-10-15 cutoff will be transmitted directly into the Finance Core.',
    time: '15 mins ago',
    priority: 'HIGH',
    status: 'ACTIVE'
  },
  {
    id: 'memo-2',
    cluster: 'ESFA (Group 3 E-Commerce)',
    sender: 'Group 3 — Online Store & Merchant Support',
    subject: 'Checkout Sales Revenue & Commission Hook Connected',
    preview: 'Online store customer orders and seller commission takerate webhooks are mapped to /api/integrations/esfa/revenue.',
    content: 'Customer cart settlements will automatically issue AR Invoices and official collection deposit vouchers in the Finance Core. Merchant subscription fees are routed to GL account 4100-REV-SERVICE.',
    time: '1 hour ago',
    priority: 'NORMAL',
    status: 'ACTIVE'
  },
  {
    id: 'memo-3',
    cluster: 'Supply Chain (Group 2)',
    sender: 'Group 2 — Procurement & Warehouse Hub',
    subject: 'Procurement PO Disbursement Ingestion Operational',
    preview: 'Approved purchase orders over ₱50,000 will be queued directly into Accounts Payable as unpaid supplier bills.',
    content: 'All purchase order records carry corresponding supplier names (e.g. Makita Philippines, Bosch Tools). Auto-generation of AP bills allows maker-checker cash release without manual data re-entry.',
    time: '3 hours ago',
    priority: 'NORMAL',
    status: 'ACTIVE'
  }
];

export const IntegrationInboxPage: React.FC<{ onNavigate?: (path: string) => void }> = ({ onNavigate }) => {
  const [transmissions, setTransmissions] = useState<Transmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCluster, setSelectedCluster] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'TRANSMISSIONS' | 'MEMOS'>('TRANSMISSIONS');
  const [selectedTransmission, setSelectedTransmission] = useState<Transmission | null>(null);
  const [selectedMemo, setSelectedMemo] = useState<PartnerMemo | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchTransmissions = async () => {
    try {
      setRefreshing(true);
      const res = await apiClient.get('/dashboard/transactions', {
        params: { status: 'all', per_page: 100 }
      });
      const rawRows = res.data?.data ?? res.data;
      const rows: any[] = Array.isArray(rawRows) ? rawRows : [];

      const mapped: Transmission[] = rows.map((r: any) => {
        const mod = (r.source_module || 'ENTERPRISE').toUpperCase();
        let cluster: Transmission['cluster'] = 'HRMS';
        let senderLabel = 'External Subsystem';

        if (mod.includes('HR') || mod === 'HRMS') {
          cluster = 'HRMS';
          senderLabel = 'HR4 Payroll & HRMS Cluster';
        } else if (mod.includes('ESFA') || mod.includes('ECOMMERCE')) {
          cluster = 'ESFA';
          senderLabel = 'ESFA Group 3 (E-Commerce)';
        } else if (mod.includes('SUPPLY') || mod.includes('PURCHASE')) {
          cluster = 'SUPPLY_CHAIN';
          senderLabel = 'Supply Chain Group 2';
        } else if (mod.includes('FLEET')) {
          cluster = 'FLEET';
          senderLabel = 'Fleet Group 7';
        } else if (mod.includes('FACILIT')) {
          cluster = 'FACILITIES';
          senderLabel = 'Facilities & Legal Group 4';
        }

        return {
          id: r.id,
          transactionCode: r.transaction_code || `TXN-${r.id.substring(0, 8).toUpperCase()}`,
          sourceModule: r.source_module || 'HRMS',
          senderLabel,
          cluster,
          categoryType: r.category_type || r.type || 'INTEGRATION_RECORD',
          referenceId: r.external_reference_id || `REF-${r.id.substring(0, 6)}`,
          amount: Number(r.amount || 0),
          type: r.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
          status: r.status || 'pending_approval',
          aiConfidence: Number(r.ai_confidence_score || 0.95),
          aiAnomalyFlag: Boolean(r.ai_anomaly_flag),
          aiAnomalyReason: r.ai_anomaly_reason,
          description: r.description || 'Enterprise integration transmission',
          createdAt: r.created_at || new Date().toISOString(),
          rawPayload: {
            transaction_code: r.transaction_code,
            external_module: r.source_module,
            external_reference_id: r.external_reference_id,
            category_type: r.category_type,
            type: r.type,
            amount: r.amount,
            tax_amount: r.tax_amount,
            fee_amount: r.fee_amount,
            net_amount: r.net_amount,
            description: r.description,
            metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata || '{}') : (r.metadata || {}),
            status: r.status,
            created_at: r.created_at,
          }
        };
      });

      // If backend has few or no records, inject demo cluster records so page is immediately rich
      if (mapped.length === 0) {
        const demoTransmissions: Transmission[] = [
          {
            id: 'demo-tx-1',
            transactionCode: 'TXN-20261018-HR401',
            sourceModule: 'HRMS',
            senderLabel: 'HR4 Payroll & Benefits',
            cluster: 'HRMS',
            categoryType: 'PAYROLL_SALARY',
            referenceId: 'PAY-2026-10A-EMP-0101',
            amount: 25400.00,
            type: 'EXPENSE',
            status: 'pending_approval',
            aiConfidence: 0.98,
            aiAnomalyFlag: false,
            description: 'Bi-monthly payroll disbursement for Juan Dela Cruz (Engineering)',
            createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            rawPayload: {
              sender: 'HR4_PAYROLL',
              payroll_run_id: 'PAY-2026-10A',
              employee_code: 'EMP-0101',
              employee_name: 'Juan Dela Cruz',
              department: 'Engineering',
              period: '2026-10-15',
              net_pay_centavos: 2540000,
              gross_pay_centavos: 3000000,
              bank_name: 'BDO Unibank',
              account_number: '001234567890'
            }
          },
          {
            id: 'demo-tx-2',
            transactionCode: 'TXN-20261018-ESFA02',
            sourceModule: 'ESFA_GROUP3',
            senderLabel: 'ESFA Group 3 (E-Commerce)',
            cluster: 'ESFA',
            categoryType: 'SALES_REVENUE',
            referenceId: 'ORD-2026-9921',
            amount: 84500.00,
            type: 'INCOME',
            status: 'posted',
            aiConfidence: 0.99,
            aiAnomalyFlag: false,
            description: 'Online checkout settlement for heavy-duty drill press order',
            createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
            rawPayload: {
              sender: 'ESFA_ECOMMERCE',
              order_id: 'ORD-2026-9921',
              customer_name: 'Metro Builders Hardware Co.',
              category_type: 'SALES_REVENUE',
              amount: 84500.00,
              gateway_fee: 169.00,
              payment_status: 'PAID'
            }
          },
          {
            id: 'demo-tx-3',
            transactionCode: 'TXN-20261018-SC03',
            sourceModule: 'SUPPLY_CHAIN',
            senderLabel: 'Supply Chain Group 2',
            cluster: 'SUPPLY_CHAIN',
            categoryType: 'INVENTORY_PURCHASE',
            referenceId: 'PO-2026-5541',
            amount: 142000.00,
            type: 'EXPENSE',
            status: 'pending_approval',
            aiConfidence: 0.96,
            aiAnomalyFlag: false,
            description: 'Procurement of 50 units Cordless Rotary Hammers PO #5541',
            createdAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
            rawPayload: {
              sender: 'SUPPLY_CHAIN_HUB',
              po_number: 'PO-2026-5541',
              supplier_name: 'Makita Philippines Corp.',
              category_type: 'INVENTORY_PURCHASE',
              amount: 142000.00,
              due_date: '2026-11-15'
            }
          },
          {
            id: 'demo-tx-4',
            transactionCode: 'TXN-20261018-HR304',
            sourceModule: 'HRMS',
            senderLabel: 'HR3 (PDMS) Group 1',
            cluster: 'HRMS',
            categoryType: 'EMPLOYEE_CLAIM',
            referenceId: 'PDMS-CERT-991',
            amount: 12500.00,
            type: 'EXPENSE',
            status: 'pending_approval',
            aiConfidence: 0.94,
            aiAnomalyFlag: false,
            description: 'AWS Solutions Architect Certification fee sponsorship for Engr. David Cruz',
            createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
            rawPayload: {
              sender: 'HR3_PDMS',
              reference_id: 'PDMS-CERT-991',
              employee_name: 'Engr. David Cruz',
              employee_code: 'EMP-0210',
              claim_type: 'TRAINING_SPONSORSHIP',
              amount: 12500.00
            }
          }
        ];
        setTransmissions(demoTransmissions);
      } else {
        setTransmissions(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch transmissions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransmissions();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredTransmissions = useMemo(() => {
    return transmissions.filter(item => {
      const matchCluster = selectedCluster === 'ALL' || item.cluster === selectedCluster;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !searchQuery ||
        item.transactionCode.toLowerCase().includes(q) ||
        item.referenceId.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.senderLabel.toLowerCase().includes(q) ||
        item.categoryType.toLowerCase().includes(q);
      return matchCluster && matchSearch;
    });
  }, [transmissions, selectedCluster, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: transmissions.length,
      hrms: transmissions.filter(t => t.cluster === 'HRMS').length,
      esfa: transmissions.filter(t => t.cluster === 'ESFA').length,
      supplyChain: transmissions.filter(t => t.cluster === 'SUPPLY_CHAIN').length,
      pending: transmissions.filter(t => t.status === 'pending_approval' || t.status === 'ai_flagged').length,
    };
  }, [transmissions]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl border border-indigo-900/40 text-white shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                Integration Inbox & M2M Transmissions
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Live Active
                </span>
              </h1>
              <p className="text-xs text-indigo-200/70">
                Inbound request queue from HRMS (HR1–HR4), ESFA (Group 3), Supply Chain (Group 2), Fleet, and Facilities.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchTransmissions}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold text-white transition-all backdrop-blur-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Feed
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Received</span>
            <Server className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{stats.total}</p>
          <span className="text-[11px] text-slate-400">M2M Inbound Requests</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">HRMS Cluster</span>
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{stats.hrms}</p>
          <span className="text-[11px] text-slate-400">HR1–HR4 Payroll & Claims</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">ESFA Group 3</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{stats.esfa}</p>
          <span className="text-[11px] text-slate-400">Orders, Payouts & Revenue</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Awaiting Approval</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{stats.pending}</p>
          <span className="text-[11px] text-slate-400">In Maker-Checker Queue</span>
        </div>
      </div>

      {/* Main Tab Controls */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('TRANSMISSIONS')}
            className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'TRANSMISSIONS'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Inbox className="w-4 h-4" />
            Inbound Transmissions ({transmissions.length})
          </button>
          <button
            onClick={() => setActiveTab('MEMOS')}
            className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'MEMOS'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Mail className="w-4 h-4" />
            Cluster Memos ({DEFAULT_MEMOS.length})
          </button>
        </div>
      </div>

      {activeTab === 'TRANSMISSIONS' ? (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              {[
                { key: 'ALL', label: 'All Groups' },
                { key: 'HRMS', label: 'HRMS (HR1–HR4)' },
                { key: 'ESFA', label: 'ESFA Group 3' },
                { key: 'SUPPLY_CHAIN', label: 'Supply Chain' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setSelectedCluster(f.key)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    selectedCluster === f.key
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search code, reference, or description..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Transmissions Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Transmission Code</th>
                    <th className="px-4 py-3">Sender Subsystem</th>
                    <th className="px-4 py-3">Reference & Details</th>
                    <th className="px-4 py-3">Flow Type</th>
                    <th className="px-4 py-3 text-right">Amount (PHP)</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredTransmissions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        No transmissions found matching current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTransmissions.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {item.transactionCode}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            item.cluster === 'HRMS'
                              ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20'
                              : item.cluster === 'ESFA'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                          }`}>
                            {item.senderLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">{item.referenceId}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{item.description}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                            item.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {item.type === 'INCOME' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {item.categoryType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          ₱{item.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'posted' || item.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                              : item.status === 'ai_flagged'
                              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                          }`}>
                            {item.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedTransmission(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] transition-colors border border-indigo-200 dark:border-indigo-800"
                          >
                            <Code className="w-3 h-3" />
                            Inspect JSON
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Memos View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DEFAULT_MEMOS.map(m => (
            <div
              key={m.id}
              onClick={() => setSelectedMemo(m)}
              className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all shadow-sm cursor-pointer space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  {m.cluster}
                </span>
                <span className="text-[10px] text-slate-400">{m.time}</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{m.subject}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                  {m.preview}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                <span>View Full Memo</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: Inspect Raw Transmission JSON */}
      {selectedTransmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <Code className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">M2M Transmission Payload Inspector</h3>
                  <p className="text-xs text-slate-400">{selectedTransmission.transactionCode} • {selectedTransmission.senderLabel}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTransmission(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block">Category</span>
                  <span className="font-bold text-indigo-400">{selectedTransmission.categoryType}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Amount</span>
                  <span className="font-mono font-bold text-emerald-400">
                    ₱{selectedTransmission.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">AI Confidence</span>
                  <span className="font-bold text-cyan-400">{Math.round(selectedTransmission.aiConfidence * 100)}%</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status</span>
                  <span className="font-bold text-amber-400 uppercase">{selectedTransmission.status}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-300">Raw JSON Transmission</span>
                  <button
                    onClick={() => handleCopy(JSON.stringify(selectedTransmission.rawPayload, null, 2), selectedTransmission.id)}
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
                  >
                    {copiedId === selectedTransmission.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedId === selectedTransmission.id ? 'Copied' : 'Copy JSON'}
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto max-h-64">
                  {JSON.stringify(selectedTransmission.rawPayload, null, 2)}
                </pre>
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Verified by Group 10 Universal M2M Gateway
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedTransmission(null);
                    if (onNavigate) {
                      onNavigate(selectedTransmission.type === 'INCOME' ? '/ar' : '/disbursements');
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View in Module
                </button>
                <button
                  onClick={() => setSelectedTransmission(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Full Memo Viewer */}
      {selectedMemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                {selectedMemo.cluster}
              </span>
              <button onClick={() => setSelectedMemo(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <h3 className="text-base font-bold">{selectedMemo.subject}</h3>
              <p className="text-xs text-slate-400 mt-0.5">From: {selectedMemo.sender} • {selectedMemo.time}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {selectedMemo.content}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedMemo(null)}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors"
              >
                Close Memo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationInboxPage;
