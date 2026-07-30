import React, { useState } from 'react';
import { Send, Zap, CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';

/**
 * M2M API Simulator (Dev Mode)
 *
 * Simulates sending transactions from HR, Supply Chain, E-Commerce, and Fleet
 * directly into the Transaction Core's IntegrationController API.
 * Used for development demos and client presentations.
 */

// Pre-built scenario templates for quick demo
const SCENARIOS = [
  {
    label: '🏗️ Cement Purchase (Normal)',
    module: 'SUPPLY_CHAIN',
    category: 'SUPPLIER_INVOICE',
    amount: '185000',
    description: 'Bulk purchase of Portland Cement (500 bags) from National Hardware Supply',
    endpoint: 'disbursement',
  },
  {
    label: '💰 Online Sales Revenue',
    module: 'ECOMMERCE_CORE',
    category: 'SALES_REVENUE',
    amount: '45600',
    description: 'Online order — construction nails, screws, and bolts assortment (Batch #10500)',
    endpoint: 'revenue',
  },
  {
    label: '👷 Payroll (1st Half July)',
    module: 'HRMS',
    category: 'PAYROLL_SALARY',
    amount: '285000',
    description: 'July 2026 Payroll — Warehouse staff, delivery drivers, and cashiers (1st half)',
    endpoint: 'disbursement',
  },
  {
    label: '⚠️ SUSPICIOUS Employee Claim',
    module: 'HRMS',
    category: 'EMPLOYEE_CLAIM',
    amount: '520000',
    description: 'SUSPICIOUS — Unverified reimbursement claim from terminated employee account',
    endpoint: 'disbursement',
  },
  {
    label: '🚨 OFFSHORE Steel Import (High Risk)',
    module: 'SUPPLY_CHAIN',
    category: 'SUPPLIER_INVOICE',
    amount: '1200000',
    description: 'OFFSHORE supplier — Imported Chinese steel rebar containers via unknown vendor',
    endpoint: 'disbursement',
  },
  {
    label: '⛽ Fleet Diesel Fuel',
    module: 'FLEET',
    category: 'FLEET_FUEL',
    amount: '42000',
    description: 'Monthly diesel fuel for 6 delivery trucks — Shell Fleet Card July 2026',
    endpoint: 'disbursement',
  },
  {
    label: '🏠 Warehouse Rent',
    module: 'FACILITIES_LEGAL',
    category: 'FACILITY_RENT',
    amount: '150000',
    description: 'Monthly warehouse and showroom rental — July 2026 (Main Branch, Quezon City)',
    endpoint: 'disbursement',
  },
  {
    label: '↩️ Customer Refund (Defective)',
    module: 'ECOMMERCE_CORE',
    category: 'CUSTOMER_REFUND',
    amount: '12500',
    description: 'Customer refund — Defective hollow blocks returned (Batch #REF-0050)',
    endpoint: 'revenue',
  },
];

const MODULE_COLORS: Record<string, string> = {
  SUPPLY_CHAIN:      'bg-orange-50 text-orange-700 border-orange-200',
  ECOMMERCE_CORE:    'bg-blue-50 text-blue-700 border-blue-200',
  HRMS:              'bg-violet-50 text-violet-700 border-violet-200',
  FLEET:             'bg-emerald-50 text-emerald-700 border-emerald-200',
  FACILITIES_LEGAL:  'bg-rose-50 text-rose-700 border-rose-200',
};

interface ApiResponse {
  status: string;
  message: string;
  transaction_id: string;
  transaction_code: string;
  workflow_status: string;
  ai_evaluation: {
    confidence_score: number;
    suggested_gl_code: string;
    anomaly_detected: boolean;
  };
}

interface LogEntry {
  id: string;
  timestamp: string;
  scenario: string;
  status: 'success' | 'error' | 'flagged';
  response?: ApiResponse;
  error?: string;
}

export const SimulatorPage: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<number | null>(null);
  const [customModule, setCustomModule] = useState('SUPPLY_CHAIN');
  const [customCategory, setCustomCategory] = useState('SUPPLIER_INVOICE');
  const [customAmount, setCustomAmount] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

  const sendTransaction = async (
    module: string,
    category: string,
    amount: string,
    description: string,
    endpoint: string,
    scenarioLabel: string
  ) => {
    setLoading(true);

    const idempotencyKey = `SIM-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const isRevenue = endpoint === 'revenue';

    const body: Record<string, unknown> = {
      external_module: module,
      external_reference_id: `SIM-${Date.now()}`,
      category_type: category,
      amount: parseFloat(amount),
      tax_amount: parseFloat(amount) * 0.12,
      fee_amount: isRevenue ? parseFloat(amount) * 0.02 : 0,
      currency: 'PHP',
      description,
      metadata: { simulator: true, sent_at: new Date().toISOString() },
    };

    if (!isRevenue) {
      body.payee_info = {
        name: 'Simulator Payee',
        account: 'SIM-ACCT-001',
        bank: 'BDO',
      };
    }

    const url = isRevenue
      ? `${API_BASE}/integration/inbound-revenue`
      : `${API_BASE}/integration/request-disbursement`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(body),
      });

      const data: ApiResponse = await res.json();

      const logEntry: LogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleTimeString(),
        scenario: scenarioLabel,
        status: data.ai_evaluation?.anomaly_detected ? 'flagged' : 'success',
        response: data,
      };

      setLogs((prev) => [logEntry, ...prev]);
    } catch (err: unknown) {
      const logEntry: LogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleTimeString(),
        scenario: scenarioLabel,
        status: 'error',
        error: err instanceof Error ? err.message : 'Network error — Is the Laravel backend running?',
      };
      setLogs((prev) => [logEntry, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const handleScenarioClick = (index: number) => {
    const s = SCENARIOS[index];
    setSelectedScenario(index);
    setCustomModule(s.module);
    setCustomCategory(s.category);
    setCustomAmount(s.amount);
    setCustomDescription(s.description);
  };

  const handleSend = () => {
    if (!customAmount || !customDescription) return;

    const endpoint =
      customModule === 'ECOMMERCE_CORE' &&
      (customCategory === 'SALES_REVENUE' || customCategory === 'CUSTOMER_REFUND')
        ? 'revenue'
        : 'disbursement';

    sendTransaction(
      customModule,
      customCategory,
      customAmount,
      customDescription,
      endpoint,
      selectedScenario !== null ? SCENARIOS[selectedScenario].label : `Custom: ${customModule}`
    );
  };

  return (
    <div className="p-6 bg-slate-50 min-h-full" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between pb-5 border-b border-gray-200 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">M2M API Simulator</h1>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-wide border border-amber-200">
              Dev Mode
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Simulate external modules (HR, Supply Chain, E-Commerce, Fleet) sending transactions to the Core API.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-amber-500" />
          <span className="text-[11px] font-medium text-slate-400">{logs.length} sent</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Scenario Picker + Form ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Quick Scenarios */}
          <div className="bg-white rounded-xl border border-gray-150 p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-3">Quick Scenarios</h2>
            <p className="text-[11px] text-slate-400 mb-4">Click a scenario to auto-fill the form, then hit "Send to Core".</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {SCENARIOS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleScenarioClick(i)}
                  className={`text-left p-3 rounded-lg border transition-all text-xs leading-snug ${
                    selectedScenario === i
                      ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="font-medium text-slate-700">{s.label}</span>
                  <span className={`mt-1.5 inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold border ${MODULE_COLORS[s.module] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                    {s.module}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Form */}
          <div className="bg-white rounded-xl border border-gray-150 p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Transaction Payload</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Source Module</label>
                <select
                  value={customModule}
                  onChange={(e) => setCustomModule(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2.5 text-slate-700 bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
                >
                  <option value="SUPPLY_CHAIN">SUPPLY_CHAIN</option>
                  <option value="ECOMMERCE_CORE">ECOMMERCE_CORE</option>
                  <option value="HRMS">HRMS</option>
                  <option value="FLEET">FLEET</option>
                  <option value="FACILITIES_LEGAL">FACILITIES_LEGAL</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Category Type</label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2.5 text-slate-700 bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
                >
                  <option value="SUPPLIER_INVOICE">SUPPLIER_INVOICE</option>
                  <option value="SALES_REVENUE">SALES_REVENUE</option>
                  <option value="CUSTOMER_REFUND">CUSTOMER_REFUND</option>
                  <option value="PAYROLL_SALARY">PAYROLL_SALARY</option>
                  <option value="EMPLOYEE_CLAIM">EMPLOYEE_CLAIM</option>
                  <option value="FLEET_FUEL">FLEET_FUEL</option>
                  <option value="FLEET_MAINTENANCE">FLEET_MAINTENANCE</option>
                  <option value="FACILITY_RENT">FACILITY_RENT</option>
                  <option value="LEGAL_BILLING">LEGAL_BILLING</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Amount (PHP)</label>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="e.g. 500000"
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2.5 text-slate-700 placeholder-gray-400 focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Currency</label>
                <input
                  type="text"
                  value="PHP"
                  readOnly
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2.5 text-slate-400 bg-gray-50 outline-none font-mono"
                />
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
              <textarea
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder="Describe the transaction (include keywords like SUSPICIOUS or OFFSHORE to trigger AI flags)"
                rows={3}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2.5 text-slate-700 placeholder-gray-400 focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none resize-none"
              />
            </div>

            <button
              onClick={handleSend}
              disabled={loading || !customAmount || !customDescription}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white shadow-md transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #1e3a5f, #1d4ed8)' }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending to Core API...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Send to Transaction Core
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Right: Live Response Log ── */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-150 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">API Response Log</h2>
              {logs.length > 0 && (
                <button
                  onClick={() => setLogs([])}
                  className="text-[10px] text-slate-400 hover:text-red-500 transition-colors font-medium"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100">
              {logs.length === 0 ? (
                <div className="p-8 text-center">
                  <Zap size={24} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">No transactions sent yet.</p>
                  <p className="text-[10px] text-gray-300 mt-1">Click a scenario and hit "Send to Core"</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start gap-2 mb-2">
                      {log.status === 'success' && <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />}
                      {log.status === 'flagged' && <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />}
                      {log.status === 'error' && <XCircle size={14} className="text-gray-400 mt-0.5 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-700 leading-snug">{log.scenario}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{log.timestamp}</p>
                      </div>
                    </div>

                    {log.response && (
                      <div className="bg-slate-50 rounded-lg p-3 mt-2 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Transaction Code</span>
                          <span className="font-mono font-bold text-slate-800">{log.response.transaction_code}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Workflow Status</span>
                          <span className={`font-semibold ${
                            log.response.workflow_status === 'ai_flagged' ? 'text-red-600' : 'text-amber-600'
                          }`}>
                            {log.response.workflow_status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">AI Confidence</span>
                          <span className="font-mono font-semibold text-slate-700">
                            {((log.response.ai_evaluation?.confidence_score || 0) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">GL Code</span>
                          <span className="font-mono text-slate-600">
                            {log.response.ai_evaluation?.suggested_gl_code}
                          </span>
                        </div>
                        {log.response.ai_evaluation?.anomaly_detected && (
                          <p className="text-[10px] text-red-600 font-medium mt-1 pt-1.5 border-t border-red-100">
                            🚨 AI Anomaly Detected — Flagged for human review
                          </p>
                        )}
                      </div>
                    )}

                    {log.error && (
                      <div className="bg-red-50 rounded-lg p-3 mt-2">
                        <p className="text-[11px] text-red-600 font-medium">{log.error}</p>
                        <p className="text-[10px] text-red-400 mt-1">Run: php artisan serve</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulatorPage;
