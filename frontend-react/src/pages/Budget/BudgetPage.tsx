import React, { useState, useEffect } from 'react';
import StatCard from '../../components/ui/StatCard';
import ProgressBar from '../../components/ui/ProgressBar';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { 
  budgetService, 
  Budget, 
  BudgetSummary, 
  BudgetHistoryItem, 
  BudgetAllocationLog 
} from '../../services/budgetService';
import { apService } from '../../services/apService';
import { 
  PieChart, 
  Plus, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Building, 
  Calendar, 
  BookOpen, 
  Archive, 
  Layers, 
  Search, 
  Filter, 
  History, 
  HelpCircle, 
  ArrowUpRight, 
  TrendingUp, 
  CheckCheck,
  ShieldCheck
} from 'lucide-react';

/**
 * Enterprise Corporate Budget Management & Monthly History Archive
 * Real-time GL consumption tracking, monthly company budget allocations, and historical archives.
 */
export const BudgetPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');

  // Active Budgets State
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-10');
  const [availablePeriods, setAvailablePeriods] = useState<string[]>(['2026-10', '2026-09', '2026-08', '2026-07', 'FY2026']);

  // History & Archive State
  const [historyItems, setHistoryItems] = useState<BudgetHistoryItem[]>([]);
  const [allocationLogs, setAllocationLogs] = useState<BudgetAllocationLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilterPeriod, setHistoryFilterPeriod] = useState<string>('ALL');
  const [historyFilterDept, setHistoryFilterDept] = useState<string>('ALL');
  const [historySearch, setHistorySearch] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);
  const [chartOfAccounts, setChartOfAccounts] = useState<any[]>([]);

  const [form, setForm] = useState({
    department: 'Human Resources (HRMS)',
    category: 'Payroll & Compensation',
    fiscal_year: 2026,
    period: '2026-10',
    allocation_mode: 'SET' as 'SET' | 'ADD',
    allocated_amount: '',
    chart_of_account_id: '',
    notes: '',
  });

  const departmentPresets = [
    { department: 'Human Resources (HRMS)', category: 'Payroll & Compensation', defaultCoaCode: '5100-EXP-SALARY' },
    { department: 'Supply Chain & Procurement', category: 'Merchandise Inventory Stocks', defaultCoaCode: '1200-INV' },
    { department: 'Fleet & Logistics', category: 'Transportation & Maintenance', defaultCoaCode: '5400-EXP-LOGISTICS' },
    { department: 'Facilities & Operations', category: 'Rent & Commercial Utilities', defaultCoaCode: '5200-EXP-UTIL' },
    { department: 'IT & Infrastructure', category: 'Software & Network Hardware', defaultCoaCode: '5500-EXP-SUPPLIES' },
    { department: 'E-Commerce Marketing', category: 'Digital Ads & Promotion', defaultCoaCode: '5500-EXP-SUPPLIES' },
  ];

  const fetchActiveBudgets = async () => {
    try {
      setError(null);
      const [budgetRes, coaRes] = await Promise.all([
        budgetService.getBudgets(selectedYear, selectedPeriod),
        apService.getChartOfAccounts(),
      ]);

      setBudgets(budgetRes.data);
      setSummary(budgetRes.summary);
      setChartOfAccounts(coaRes);

      if (budgetRes.meta?.available_periods && budgetRes.meta.available_periods.length > 0) {
        setAvailablePeriods(budgetRes.meta.available_periods);
      }
    } catch (err: any) {
      console.error('Failed to load budget data:', err);
      setError(err.response?.data?.message || 'Failed to load departmental budgets.');
    }
  };

  const fetchHistoryData = async () => {
    try {
      setHistoryLoading(true);
      const res = await budgetService.getBudgetHistory({
        fiscal_year: selectedYear,
        department: historyFilterDept !== 'ALL' ? historyFilterDept : undefined,
        period: historyFilterPeriod !== 'ALL' ? historyFilterPeriod : undefined,
      });

      setHistoryItems(res.history);
      setAllocationLogs(res.allocation_logs);
    } catch (err: any) {
      console.error('Failed to load budget archive:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchActiveBudgets(), fetchHistoryData()]).finally(() => {
      setLoading(false);
      setRefreshing(false);
    });
  }, [selectedYear, selectedPeriod]);

  useEffect(() => {
    if (activeTab === 'archive') {
      fetchHistoryData();
    }
  }, [historyFilterPeriod, historyFilterDept, activeTab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchActiveBudgets(), fetchHistoryData()]);
    setRefreshing(false);
  };

  const handleDepartmentSelect = (deptName: string) => {
    const found = departmentPresets.find(p => p.department === deptName);
    if (found) {
      const coa = chartOfAccounts.find(c => c.code === found.defaultCoaCode);
      setForm(prev => ({
        ...prev,
        department: found.department,
        category: found.category,
        chart_of_account_id: coa ? coa.id : prev.chart_of_account_id,
      }));
    } else {
      setForm(prev => ({ ...prev, department: deptName }));
    }
  };

  const openAllocateModal = (prefillDept?: string, mode: 'SET' | 'ADD' = 'SET') => {
    setModalError(null);
    setModalSuccess(null);
    if (prefillDept) {
      handleDepartmentSelect(prefillDept);
    }
    setForm(prev => ({
      ...prev,
      period: selectedPeriod !== 'ALL' ? selectedPeriod : '2026-10',
      allocation_mode: mode,
      allocated_amount: '',
      notes: mode === 'ADD' ? 'Budget top-up granted by Finance Management' : 'Monthly department operational budget allocation',
    }));
    setIsModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalSuccess(null);

    const amountNum = parseFloat(form.allocated_amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setModalError('Please enter a valid allocated amount greater than PHP 0.00.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await budgetService.createBudget({
        department: form.department,
        category: form.category,
        fiscal_year: form.fiscal_year,
        period: form.period,
        allocation_mode: form.allocation_mode,
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

      await Promise.all([fetchActiveBudgets(), fetchHistoryData()]);

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

  // Filtered Archive Items
  const filteredHistory = historyItems.filter(item => {
    const matchesSearch = 
      item.department.toLowerCase().includes(historySearch.toLowerCase()) ||
      item.category.toLowerCase().includes(historySearch.toLowerCase()) ||
      (item.notes && item.notes.toLowerCase().includes(historySearch.toLowerCase())) ||
      item.period.toLowerCase().includes(historySearch.toLowerCase());
    return matchesSearch;
  });

  if (loading) return <SkeletonLoader />;

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-600/20">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Corporate Budget Management
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Fiscal Control
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Departmental spending ceilings, General Ledger consumption, and monthly budget history archive.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Year Selector */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="text-xs font-semibold bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
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
            onClick={() => openAllocateModal()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-sm shadow-purple-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Allocate Budget
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-px">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'active'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Active Department Budgets
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
            {budgets.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('archive')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'archive'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Archive className="w-4 h-4" />
          Monthly Budget History & Archive
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {historyItems.length} Records
          </span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: ACTIVE DEPARTMENT BUDGETS                                          */}
      {/* ========================================================================= */}
      {activeTab === 'active' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Controls Bar: Period Filter + Info Notice */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Viewing Period:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {availablePeriods.map(period => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      selectedPeriod === period
                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/20'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {period === '2026-10' ? 'October 2026 (Current)' : period === 'FY2026' ? 'FY2026 (Annual)' : period}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-purple-500" />
              <span>Approved POs, payroll & vouchers auto-deduct in real time</span>
            </div>
          </div>

          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title={`Allocated Budget (${selectedPeriod})`}
              value={`PHP ${(summary?.total_allocated ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              accentColor="bg-purple-600"
              subtitle={`Total across ${summary?.budget_count ?? budgets.length} departments`}
            />
            <StatCard
              title="Actual Spent / Consumed"
              value={`PHP ${(summary?.total_spent ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              accentColor="bg-rose-500"
              isPositive={false}
              subtitle="From General Ledger & disbursements"
            />
            <StatCard
              title="Available Remaining Budget"
              value={`PHP ${(summary?.total_remaining ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              accentColor="bg-emerald-500"
              isPositive={true}
              subtitle="Remaining uncommitted cash limit"
            />
            <StatCard
              title="Budget Burn Rate"
              value={`${(summary?.avg_utilization ?? 0).toFixed(1)}%`}
              accentColor="bg-blue-600"
              subtitle="Average department utilization"
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
                      ? 'border-rose-300 dark:border-rose-900 bg-rose-50/15'
                      : isWarning
                      ? 'border-amber-300 dark:border-amber-900 bg-amber-50/15'
                      : 'border-slate-200 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-purple-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200/50">
                            {b.period}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {b.category}
                          </span>
                        </div>
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

                      <div className="flex flex-col items-end gap-1.5">
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

                        <button
                          onClick={() => openAllocateModal(b.department, 'ADD')}
                          className="text-[10px] font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center gap-0.5 mt-1"
                        >
                          <Plus className="w-2.5 h-2.5" /> Top Up
                        </button>
                      </div>
                    </div>

                    {b.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
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
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">Allocated Limit</p>
                      <p className="font-mono font-bold text-slate-900 dark:text-white truncate">
                        PHP {b.allocated_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">Actual Spent</p>
                      <p className="font-mono font-bold text-rose-600 dark:text-rose-400 truncate">
                        PHP {b.spent_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">Available Funds</p>
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MONTHLY BUDGET HISTORY & ARCHIVE                                   */}
      {/* ========================================================================= */}
      {activeTab === 'archive' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Explanation Banner */}
          <div className="bg-gradient-to-r from-purple-900/20 via-purple-800/10 to-transparent p-5 rounded-2xl border border-purple-200 dark:border-purple-800/60 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Monthly Department Budget Archive & Audit Records
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                The executive leadership provides a monthly budget allotment per operational department. 
                Below is the comprehensive historical record of previous monthly budgets, showing historical spending vs ceiling limits, 
                along with the chronological audit trail of all allocation approvals.
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search department, category, notes..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Month / Period Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={historyFilterPeriod}
                  onChange={(e) => setHistoryFilterPeriod(e.target.value)}
                  className="text-xs font-semibold bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Periods / Months</option>
                  <option value="2026-10">October 2026</option>
                  <option value="2026-09">September 2026</option>
                  <option value="2026-08">August 2026</option>
                  <option value="2026-07">July 2026</option>
                  <option value="FY2026">Full Year FY2026</option>
                </select>
              </div>

              {/* Department Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={historyFilterDept}
                  onChange={(e) => setHistoryFilterDept(e.target.value)}
                  className="text-xs font-semibold bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Departments</option>
                  {departmentPresets.map(d => (
                    <option key={d.department} value={d.department}>{d.department}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Showing {filteredHistory.length} monthly archive entries
            </div>
          </div>

          {/* Historical Budgets Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Archive className="w-4 h-4 text-purple-600" />
                Monthly Department Budget Performance History
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Sorted by latest period
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">Period / Month</th>
                    <th className="py-3 px-4">Department & Category</th>
                    <th className="py-3 px-4 text-right">Allocated (PHP)</th>
                    <th className="py-3 px-4 text-right">Actual Spent (PHP)</th>
                    <th className="py-3 px-4 text-right">Remaining (PHP)</th>
                    <th className="py-3 px-4 text-center">Utilization</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Authorized By</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                        No historical budget records found matching the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((item) => {
                      const isOver = item.status === 'OVER_BUDGET';
                      const isWarn = item.status === 'NEAR_LIMIT';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-mono font-bold px-2.5 py-1 rounded-lg text-[11px] bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200/50">
                              {item.period_label || item.period}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {item.department}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {item.category}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            PHP {item.allocated_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            PHP {item.spent_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap ${
                            isOver ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            PHP {item.remaining_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5 font-mono font-bold text-xs">
                              <span className={isOver ? 'text-rose-600' : isWarn ? 'text-amber-600' : 'text-slate-700 dark:text-slate-300'}>
                                {item.utilization_rate.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isOver
                                ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-300'
                                : isWarn
                                ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-300'
                                : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300'
                            }`}>
                              {item.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 text-xs whitespace-nowrap">
                            {item.allocated_by || 'Finance Management'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-xs max-w-xs truncate">
                            {item.notes || 'Monthly recurring operational grant'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Allocation Audit Trail Log */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Executive Allocation & Grant Audit Trail
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Chronological log of budget issuance & adjustments
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {allocationLogs.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No allocation audit logs recorded yet.
                </div>
              ) : (
                allocationLogs.map((log) => (
                  <div key={log.id} className="p-4 flex items-center justify-between gap-4 text-xs hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
                        ₱
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {log.department}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {log.action_type.replace('_', ' ')}
                          </span>
                          <span className="font-mono text-[11px] text-purple-600 dark:text-purple-400">
                            {log.period}
                          </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                          {log.notes || 'Allocated by management'} &bull; Authorized by <span className="font-semibold">{log.allocated_by}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                        +PHP {log.allocated_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {new Date(log.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ALLOCATE BUDGET MODAL                                                     */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    {form.allocation_mode === 'ADD' ? 'Top-Up Department Budget' : 'Allocate Departmental Budget'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Assign monthly spending authorization ceiling
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {/* Purpose helper alert explaining what Allocate Budget does */}
            <div className="mx-6 mt-4 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-xs text-purple-800 dark:text-purple-300 flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
              <div>
                <span className="font-bold">What does "Allocate Budget" do?</span>
                <p className="mt-0.5 leading-relaxed text-[11px] text-purple-700 dark:text-purple-300">
                  It grants or tops up the authorized spending ceiling for this department for the chosen period. 
                  When transactions (payroll, supplier bills, fuel vouchers) are approved, money will automatically 
                  consume this budget without exceeding corporate liquidity.
                </p>
              </div>
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

              {/* Allocation Mode: SET vs ADD */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Allocation Action
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, allocation_mode: 'SET' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      form.allocation_mode === 'SET'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Set Total Allotment
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, allocation_mode: 'ADD' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      form.allocation_mode === 'ADD'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    + Top Up Existing
                  </button>
                </div>
              </div>

              {/* Department Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department
                </label>
                <select
                  value={form.department}
                  onChange={(e) => handleDepartmentSelect(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                >
                  {departmentPresets.map(d => (
                    <option key={d.department} value={d.department}>
                      {d.department}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Expense Category
                </label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Amount and Period Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {form.allocation_mode === 'ADD' ? 'Top-Up Amount (PHP)' : 'Total Budget Amount (PHP)'}
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
                    Allocation Month / Period
                  </label>
                  <select
                    value={form.period}
                    onChange={(e) => setForm({ ...form, period: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="2026-10">October 2026 (Active Month)</option>
                    <option value="2026-11">November 2026</option>
                    <option value="2026-12">December 2026</option>
                    <option value="2026-09">September 2026</option>
                    <option value="FY2026">FY 2026 (Full Year Master)</option>
                  </select>
                </div>
              </div>

              {/* Chart of Accounts Mapping */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  General Ledger Chart of Account Mapping
                </label>
                <select
                  value={form.chart_of_account_id}
                  onChange={(e) => setForm({ ...form, chart_of_account_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Auto-detect by Department --</option>
                  {chartOfAccounts.map((coa) => (
                    <option key={coa.id} value={coa.id}>
                      {coa.code} &mdash; {coa.name} ({coa.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Budget Notes & Authorization Justification
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Monthly operational budget approved by Finance Executive Committee"
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
                  Confirm Budget Allocation
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
