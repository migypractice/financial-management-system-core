import React, { useState, useEffect } from 'react';
import StatCard from '../../components/ui/StatCard';
import ProgressBar from '../../components/ui/ProgressBar';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { budgetService, Budget, BudgetSummary } from '../../services/budgetService';
import { apService } from '../../services/apService';
import { 
  PieChart, 
  Plus, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Building, 
  Calendar, 
  BookOpen, 
  DollarSign 
} from 'lucide-react';

/**
 * Budget Management Module
 * Departmental allocations, real consumption tracking against General Ledger, and variance alerts.
 */
export const BudgetPage: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);
  const [chartOfAccounts, setChartOfAccounts] = useState<any[]>([]);

  const [form, setForm] = useState({
    department: 'Supply Chain & Procurement',
    category: 'Merchandise Inventory Stocks',
    fiscal_year: 2026,
    period: 'FY2026',
    allocated_amount: '',
    chart_of_account_id: '',
    notes: '',
  });

  const fetchData = async () => {
    try {
      setError(null);
      const [budgetRes, coaRes] = await Promise.all([
        budgetService.getBudgets(selectedYear),
        apService.getChartOfAccounts(),
      ]);

      setBudgets(budgetRes.data);
      setSummary(budgetRes.summary);
      setChartOfAccounts(coaRes);

      if (coaRes.length > 0 && !form.chart_of_account_id) {
        setForm(prev => ({ ...prev, chart_of_account_id: coaRes[0].id }));
      }
    } catch (err: any) {
      console.error('Failed to load budget data:', err);
      setError(err.response?.data?.message || 'Failed to load departmental budgets.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalSuccess(null);

    const amountNum = parseFloat(form.allocated_amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setModalError('Please enter a valid allocated amount greater than 0.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await budgetService.createBudget({
        department: form.department,
        category: form.category,
        fiscal_year: form.fiscal_year,
        period: form.period,
        allocated_amount: amountNum,
        chart_of_account_id: form.chart_of_account_id || undefined,
        notes: form.notes || undefined,
      });

      setModalSuccess(res.message || 'Department budget allocated successfully.');
      setForm(prev => ({
        ...prev,
        allocated_amount: '',
        notes: '',
      }));
      await fetchData();

      setTimeout(() => {
        setIsModalOpen(false);
        setModalSuccess(null);
      }, 1500);
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to allocate budget.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <SkeletonLoader />;

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-600/20">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Corporate Budget Management
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Departmental allocations, actual General Ledger consumption, and variance monitoring.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="text-xs font-semibold bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value={2025}>FY 2025</option>
              <option value={2026}>FY 2026</option>
              <option value={2027}>FY 2027</option>
            </select>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-sm shadow-purple-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Allocate Budget
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
          title={`Total Allocated Budget (${selectedYear})`}
          value={`PHP ${(summary?.total_allocated ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          accentColor="bg-purple-600"
          subtitle={`Across ${summary?.budget_count ?? budgets.length} departments`}
        />
        <StatCard
          title="Actual Spent / Consumed"
          value={`PHP ${(summary?.total_spent ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          accentColor="bg-rose-500"
          isPositive={false}
          subtitle="From posted GL journal lines"
        />
        <StatCard
          title="Available Uncommitted Budget"
          value={`PHP ${(summary?.total_remaining ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          accentColor="bg-emerald-500"
          isPositive={true}
          subtitle="Remaining corporate spending ceiling"
        />
        <StatCard
          title="Average Utilization Rate"
          value={`${(summary?.avg_utilization ?? 0).toFixed(1)}%`}
          accentColor="bg-blue-600"
          subtitle="Fiscal year budget burn rate"
        />
      </div>

      {/* Departmental Budgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {budgets.map((b) => {
          const isWarning = b.status === 'NEAR_LIMIT';
          const isOver = b.status === 'OVER_BUDGET';

          return (
            <div
              key={b.id}
              className={`bg-white dark:bg-slate-800 rounded-2xl border p-5 shadow-sm transition-all flex flex-col justify-between ${
                isOver
                  ? 'border-rose-300 dark:border-rose-900 bg-rose-50/20'
                  : isWarning
                  ? 'border-amber-300 dark:border-amber-900 bg-amber-50/20'
                  : 'border-slate-200 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-purple-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {b.period} &bull; {b.category}
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base mt-2">
                      {b.department}
                    </h3>
                    {b.account_code && (
                      <p className="text-xs text-purple-600 dark:text-purple-400 font-mono mt-0.5 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        GL Account: {b.account_code} &mdash; {b.account_name}
                      </p>
                    )}
                  </div>

                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isOver
                        ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                        : isWarning
                        ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                        : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} />
                      {b.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {b.notes && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    {b.notes}
                  </p>
                )}

                {/* Progress Bar Section */}
                <div className="mt-5 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Budget Burn Rate
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {b.utilization_rate.toFixed(1)}%
                    </span>
                  </div>
                  <ProgressBar value={b.spent_amount} max={b.allocated_amount} size="md" />
                </div>
              </div>

              {/* Financial Metrics Strip */}
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">Allocated</p>
                  <p className="font-mono font-bold text-slate-900 dark:text-white truncate">
                    PHP {b.allocated_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">Actual Spent</p>
                  <p className="font-mono font-semibold text-rose-600 dark:text-rose-400 truncate">
                    PHP {b.spent_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">Remaining</p>
                  <p className={`font-mono font-bold truncate ${
                    isOver ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    PHP {b.remaining_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Allocate Budget Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">Allocate Departmental Budget</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Establish corporate fiscal ceiling for operations</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{modalSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Facilities & Utilities"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Budget Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. Office Hardware & Software Subscriptions"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Allocated Amount (PHP)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="0.00"
                    value={form.allocated_amount}
                    onChange={(e) => setForm({ ...form, allocated_amount: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Fiscal Year & Period
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={form.fiscal_year}
                      onChange={(e) => setForm({ ...form, fiscal_year: parseInt(e.target.value, 10) })}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                    />
                    <input
                      type="text"
                      value={form.period}
                      onChange={(e) => setForm({ ...form, period: e.target.value })}
                      placeholder="e.g. FY2026"
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  General Ledger Chart of Account Mapping
                </label>
                <select
                  value={form.chart_of_account_id}
                  onChange={(e) => setForm({ ...form, chart_of_account_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- No Direct Account Link --</option>
                  {chartOfAccounts.map((coa) => (
                    <option key={coa.id} value={coa.id}>
                      {coa.code} &mdash; {coa.name} ({coa.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Budget Notes & Authorization Justification
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Approved under Executive Committee Resolution 2026-04"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-sm disabled:opacity-50 transition-all"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Save Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetPage;
