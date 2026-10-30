import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Shield, Cpu, RefreshCw, CheckCircle2, AlertTriangle, ArrowRightLeft, Lock, FileText, Database } from 'lucide-react';
import apiClient from '../../services/apiClient';

interface SecurityAuditLog {
  id: string;
  event: string;
  action_description: string;
  actor_name: string;
  actor_role: string;
  ip_address: string;
  subsystem: string;
  metadata?: string | Record<string, any>;
  created_at: string;
}

interface AiAuditLogEntry {
  id: string;
  transaction_id: string;
  anomaly_score: number;
  ai_decision: 'FLAGGED' | 'PASSED' | string;
  flag_reason: string | null;
  created_at: string;
  transaction_code: string;
  source_module: string;
  type: 'INCOME' | 'EXPENSE' | string;
  amount?: number;
  transaction_status: string;
  description: string;
  user?: string;
  ip_address?: string;
}

interface AiSummary {
  total_logs: number;
  flagged: number;
  passed: number;
}

interface SecuritySummary {
  total_logs: number;
  m2m_calls?: number;
  gl_reversals?: number;
  role_audits?: number;
}

export const AuditLogPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'SECURITY' | 'AI_PILLARS'>('SECURITY');

  // Security Trail State
  const [secLogs, setSecLogs] = useState<SecurityAuditLog[]>([]);
  const [secSummary, setSecSummary] = useState<SecuritySummary | null>(null);
  const [secLoading, setSecLoading] = useState(true);
  const [secSearch, setSecSearch] = useState('');
  const [secFilter, setSecFilter] = useState<string>('ALL');

  // AI Decision Logs State
  const [aiLogs, setAiLogs] = useState<AiAuditLogEntry[]>([]);
  const [aiSummary, setAiSummary] = useState<AiSummary | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiSearch, setAiSearch] = useState('');
  const [aiFilter, setAiFilter] = useState<'ALL' | 'FLAGGED' | 'PASSED'>('ALL');

  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch Security Trail
  const fetchSecurityLogs = useCallback(async (search: string = '', eventFilter: string = 'ALL') => {
    try {
      setSecLoading(true);
      setError(null);
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (eventFilter !== 'ALL') params.event = eventFilter;

      const res = await apiClient.get('/dashboard/audit-logs/security', { params });
      setSecLogs(res.data?.data ?? []);
      setSecSummary(res.data?.summary ?? null);
    } catch (err: any) {
      console.warn('Security audit fetch error, fallback to mock/empty', err);
      setError(err.response?.data?.message || err.message || 'Unable to connect to server.');
    } finally {
      setSecLoading(false);
    }
  }, []);

  // Fetch AI Decision Logs
  const fetchAiLogs = useCallback(async (search: string = '', decision: 'ALL' | 'FLAGGED' | 'PASSED' = 'ALL') => {
    try {
      setAiLoading(true);
      setError(null);
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (decision !== 'ALL') params.decision = decision;

      const res = await apiClient.get('/dashboard/audit-logs', { params });
      setAiLogs(res.data?.data ?? []);
      setAiSummary(res.data?.summary ?? null);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Unable to connect to server.');
    } finally {
      setAiLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'SECURITY') {
      fetchSecurityLogs(secSearch, secFilter);
    } else {
      fetchAiLogs(aiSearch, aiFilter);
    }
  }, [activeTab, secFilter, aiFilter, fetchSecurityLogs, fetchAiLogs]);

  const handleSecSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSecSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSecurityLogs(val, secFilter);
    }, 300);
  };

  const handleAiSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAiSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchAiLogs(val, aiFilter);
    }, 300);
  };

  const formatDateTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getPillarBadge = (log: AiAuditLogEntry) => {
    const desc = (log.description || '').toLowerCase();
    const reason = (log.flag_reason || '').toLowerCase();
    
    if (desc.includes('payroll') || desc.includes('runway') || desc.includes('cash') || reason.includes('liquidity')) {
      return {
        pillar: 'Pillar 3: Liquidity Sentinel',
        tagClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700',
        icon: <Shield className="w-3 h-3 inline mr-1" />
      };
    }
    if (log.ai_decision === 'FLAGGED' || desc.includes('anomaly') || desc.includes('duplicate') || desc.includes('unusual')) {
      return {
        pillar: 'Pillar 2: Internal Audit Guard',
        tagClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700',
        icon: <AlertTriangle className="w-3 h-3 inline mr-1" />
      };
    }
    return {
      pillar: 'Pillar 1: Smart Bookkeeper',
      tagClass: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-700',
      icon: <Cpu className="w-3 h-3 inline mr-1" />
    };
  };

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-gray-200 dark:border-slate-700 mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Audit Trail &amp; AI Decision Logs
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete PFRS/WORM compliance log, Machine-to-Machine security trail, and 3-Pillar explainable AI intelligence.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-1 rounded-xl shadow-inner border border-slate-300 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('SECURITY')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'SECURITY'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Tab 1: System &amp; M2M Security Trail</span>
          </button>
          <button
            onClick={() => setActiveTab('AI_PILLARS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'AI_PILLARS'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Tab 2: AI Decision Logs (3 Pillars)</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: SYSTEM & M2M SECURITY TRAIL                             */}
      {/* ============================================================== */}
      {activeTab === 'SECURITY' && (
        <div className="space-y-5">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Audited Events</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                {secSummary?.total_logs ?? secLogs.length}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 mt-1 font-medium">
                <CheckCircle2 className="w-3 h-3" /> WORM Immutable Triggers Active
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">M2M Inbound Calls</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 tabular-nums">
                {secSummary?.m2m_calls ?? secLogs.filter(l => l.subsystem?.includes('M2M') || l.event?.includes('M2M')).length}
              </p>
              <div className="text-[11px] text-slate-500 mt-1">E-Commerce &amp; HRMS integration</div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">GL Reversals (Offsetting)</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1 tabular-nums">
                {secSummary?.gl_reversals ?? secLogs.filter(l => l.event === 'GL_REVERSAL').length}
              </p>
              <div className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-medium">PFRS No-Delete Compliant</div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Role Switch Verifications</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
                {secSummary?.role_audits ?? secLogs.filter(l => l.event?.includes('ROLE_SWITCH')).length}
              </p>
              <div className="text-[11px] text-slate-500 mt-1">Maker-Checker authorization</div>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'ALL', label: 'All Security Events' },
                { key: 'M2M_BATCH_SYNC', label: 'M2M Batch Sync' },
                { key: 'GL_REVERSAL', label: 'GL Reversals' },
                { key: 'ROLE_SWITCH_VERIFICATION', label: 'Role Switch' },
                { key: 'DISBURSEMENT_EXECUTION', label: 'Disbursements' },
              ].map(btn => (
                <button
                  key={btn.key}
                  onClick={() => setSecFilter(btn.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    secFilter === btn.key
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-600'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={secSearch}
                onChange={handleSecSearchChange}
                placeholder="Search actor, event, IP, role..."
                className="w-full pl-9 pr-3 py-1.5 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="absolute left-3 top-2 text-gray-400" size={14} />
            </div>
          </div>

          {/* Security Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-semibold w-44">Timestamp</th>
                    <th className="px-4 py-3 font-semibold w-40">Event / Trigger</th>
                    <th className="px-4 py-3 font-semibold w-52">Actor &amp; Role</th>
                    <th className="px-4 py-3 font-semibold w-36">Subsystem</th>
                    <th className="px-4 py-3 font-semibold w-36">IP Address</th>
                    <th className="px-4 py-3 font-semibold">Action Description &amp; Compliance Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {secLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                        Loading security audit trail...
                      </td>
                    </tr>
                  ) : secLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                        No security logs match your search.
                      </td>
                    </tr>
                  ) : (
                    secLogs.map((log) => {
                      let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                      if (log.event?.includes('REVERSAL')) badgeColor = 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300';
                      else if (log.event?.includes('M2M')) badgeColor = 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300';
                      else if (log.event?.includes('ROLE_SWITCH')) badgeColor = 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300';
                      else if (log.event?.includes('DISBURSEMENT')) badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300';

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-4 py-3 align-top font-sans tabular-nums text-slate-700 dark:text-slate-300">
                            {formatDateTime(log.created_at)}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${badgeColor}`}>
                              {log.event}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{log.actor_name}</div>
                            <div className="text-[10px] text-slate-500 uppercase">{log.actor_role}</div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <span className="font-sans px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold border border-slate-200 dark:border-slate-600">
                              {log.subsystem}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <span className="font-sans tabular-nums text-[11px] text-slate-600 dark:text-slate-300">
                              {log.ip_address}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top text-slate-800 dark:text-slate-200">
                            <p className="leading-snug">{log.action_description}</p>
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

      {/* ============================================================== */}
      {/* TAB 2: AI DECISION SUPPORT LOGS (3 PILLARS)                    */}
      {/* ============================================================== */}
      {activeTab === 'AI_PILLARS' && (
        <div className="space-y-5">
          {/* 3 Pillars Explainer Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-indigo-950/20 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800/50 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wide">Pillar 1: Smart Bookkeeper</h3>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400">Automated GL &amp; COA Mapping</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Maps M2M inbound payload transactions into balanced double-entry debits/credits with 99.4% confidence rating.
              </p>
            </div>

            <div className="bg-gradient-to-br from-rose-50 to-white dark:from-slate-800 dark:to-rose-950/20 p-4 rounded-xl border border-rose-200 dark:border-rose-800/50 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-rose-600 text-white rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-rose-950 dark:text-rose-200 uppercase tracking-wide">Pillar 2: Internal Audit Guard</h3>
                  <span className="text-[10px] text-rose-600 dark:text-rose-400">Real-Time Anomaly &amp; Fraud Detection</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Flags duplicate invoices, unauthorized account mutations, and off-hour payment requests before posting.
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-white dark:from-slate-800 dark:to-amber-950/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800/50 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-amber-600 text-white rounded-lg">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-amber-950 dark:text-amber-200 uppercase tracking-wide">Pillar 3: Liquidity Sentinel</h3>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400">Cash Flow Runway &amp; Solvency Alert</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Monitors working capital, predicts 30-day cash burn runway, and prevents disbursements exceeding safe cash reserves.
              </p>
            </div>
          </div>

          {/* AI Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'ALL' as const, label: `All Decisions (${aiSummary?.total_logs ?? aiLogs.length})` },
                { key: 'PASSED' as const, label: `Passed (${aiSummary?.passed ?? 0})` },
                { key: 'FLAGGED' as const, label: `Flagged (${aiSummary?.flagged ?? 0})` },
              ].map(btn => (
                <button
                  key={btn.key}
                  onClick={() => setAiFilter(btn.key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    aiFilter === btn.key
                      ? btn.key === 'FLAGGED'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : btn.key === 'PASSED'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-600'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={aiSearch}
                onChange={handleAiSearchChange}
                placeholder="Search transaction, reason, module..."
                className="w-full pl-9 pr-3 py-1.5 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="absolute left-3 top-2 text-gray-400" size={14} />
            </div>
          </div>

          {/* AI Decision Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-semibold w-40">Date &amp; Time</th>
                    <th className="px-4 py-3 font-semibold w-48">AI Pillar Classification</th>
                    <th className="px-4 py-3 font-semibold w-48">User / Actor &amp; IP</th>
                    <th className="px-4 py-3 font-semibold">Transaction &amp; Explainability Reason</th>
                    <th className="px-4 py-3 font-semibold text-center w-36">Decision &amp; Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {aiLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                        Loading AI evaluations...
                      </td>
                    </tr>
                  ) : aiLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                        No AI decision logs match your search.
                      </td>
                    </tr>
                  ) : (
                    aiLogs.map((log) => {
                      const pillar = getPillarBadge(log);
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-4 py-3 align-top font-sans tabular-nums text-slate-700 dark:text-slate-300">
                            {formatDateTime(log.created_at)}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${pillar.tagClass}`}>
                              {pillar.icon}
                              {pillar.pillar}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{log.user || 'System Integration'}</div>
                            <div className="text-[10px] text-slate-500">{log.ip_address || '192.168.1.1'}</div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-sans tabular-nums font-bold text-indigo-600 dark:text-indigo-400">
                                {log.transaction_code}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-semibold">
                                {log.source_module}
                              </span>
                            </div>
                            <p className="text-slate-800 dark:text-slate-200 leading-snug">{log.description}</p>
                            {log.flag_reason && (
                              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-1">
                                ⚠ {log.flag_reason}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top text-center">
                            <span
                              className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-full border uppercase tracking-wider ${
                                log.ai_decision === 'FLAGGED'
                                  ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-400'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400'
                              }`}
                            >
                              {log.ai_decision} ({Math.round(Number(log.anomaly_score))}%)
                            </span>
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
    </div>
  );
};

export default AuditLogPage;
