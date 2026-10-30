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
  ShieldCheck,
  Paperclip,
  Eye,
  Edit3,
  Sliders
} from 'lucide-react';
import { DocumentPreviewModal } from '../../components/ui/DocumentPreviewModal';

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
  const [selectedCadence, setSelectedCadence] = useState<'ALL' | 'YEARLY' | 'MONTHLY' | 'WEEKLY'>('ALL');
  const [availablePeriods, setAvailablePeriods] = useState<string[]>(['2026-10', '2026-09', '2026-08', '2026-07', 'FY2026']);

  // Document Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<{
    isOpen: boolean;
    url: string | null;
    name?: string;
    mime?: string;
    type?: string;
  }>({ isOpen: false, url: null });

  // History & Archive State
  const [historyItems, setHistoryItems] = useState<BudgetHistoryItem[]>([]);
  const [allocationLogs, setAllocationLogs] = useState<BudgetAllocationLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilterPeriod, setHistoryFilterPeriod] = useState<string>('ALL');
  const [historyFilterDept, setHistoryFilterDept] = useState<string>('ALL');
  const [historySearch, setHistorySearch] = useState<string>('');

  // Allocate Budget Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);
  const [chartOfAccounts, setChartOfAccounts] = useState<any[]>([]);

  const [form, setForm] = useState({
    department: 'Human Resources (HRMS)',
    category: 'Payroll & Compensation',
    purpose: 'Departmental staff operational payroll and monthly employee incentives',
    period_type: 'MONTHLY' as 'YEARLY' | 'MONTHLY' | 'WEEKLY',
    fiscal_year: 2026,
    period: '2026-10',
    allocation_mode: 'SET' as 'SET' | 'ADD',
    allocated_amount: '',
    chart_of_account_id: '',
    notes: '',
  });
  const [formAttachment, setFormAttachment] = useState<File | null>(null);

  // Adjust Budget Modal State (Adjust if attachment is wrong / discrepancy)
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedBudgetForAdjust, setSelectedBudgetForAdjust] = useState<Budget | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    allocated_amount: '',
    attachment_verified: true,
    adjustment_reason: '',
  });
  const [adjustAttachment, setAdjustAttachment] = useState<File | null>(null);
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustSuccess, setAdjustSuccess] = useState<string | null>(null);

  const departmentPresets = [
    { department: 'Human Resources (HRMS)', category: 'Payroll & Compensation', defaultPurpose: 'Staff salaries, compensation, and mandatory benefits', defaultCoaCode: '5100-EXP-SALARY' },
    { department: 'Supply Chain & Procurement', category: 'Merchandise Inventory Stocks', defaultPurpose: 'Raw hardware inventory and supplier purchase order allocations', defaultCoaCode: '1200-INV' },
    { department: 'Fleet & Logistics', category: 'Transportation & Maintenance', defaultPurpose: 'Delivery vehicle fuel, diesel replenishment, and truck repairs', defaultCoaCode: '5400-EXP-LOGISTICS' },
    { department: 'Facilities & Operations', category: 'Rent & Commercial Utilities', defaultPurpose: 'Warehouse electricity, security, commercial rent, and water bills', defaultCoaCode: '5200-EXP-UTIL' },
    { department: 'IT & Infrastructure', category: 'Software & Network Hardware', defaultPurpose: 'Cloud servers, networking gear, enterprise software subscriptions', defaultCoaCode: '5500-EXP-SUPPLIES' },
    { department: 'E-Commerce Marketing', category: 'Digital Ads & Promotion', defaultPurpose: 'Online store advertising, social media campaigns, customer promotions', defaultCoaCode: '5500-EXP-SUPPLIES' },
  ];

  const fetchActiveBudgets = async () => {
    try {
      setError(null);
      const [budgetRes, coaRes] = await Promise.all([
        budgetService.getBudgets(selectedYear, selectedPeriod, selectedCadence),
        apService.getChartOfAccounts(),
      ]);

      setBudgets(Array.isArray(budgetRes?.data) ? budgetRes.data : []);
      setSummary(budgetRes?.summary || null);

      const rawCoa = (coaRes && typeof coaRes === 'object' && 'data' in coaRes) ? coaRes.data : coaRes;
      const coaList = Array.isArray(rawCoa) ? rawCoa : [];
      setChartOfAccounts(coaList);

      if (budgetRes?.meta?.available_periods && budgetRes.meta.available_periods.length > 0) {
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

      setHistoryItems(Array.isArray(res?.history) ? res.history : []);
      setAllocationLogs(Array.isArray(res?.allocation_logs) ? res.allocation_logs : []);
    } catch (err: any) {
      console.error('Failed to load budget archive:', err);
      setHistoryItems([]);
      setAllocationLogs([]);
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
  }, [selectedYear, selectedPeriod, selectedCadence]);

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

  const handleDepartmentSelect = (deptName: string, coaOverride?: any[]) => {
    const list = Array.isArray(coaOverride)
      ? coaOverride
      : (Array.isArray(chartOfAccounts) ? chartOfAccounts : []);
    const found = departmentPresets.find(p => p.department === deptName);
    if (found) {
      const coa = list.find(c => c?.code === found.defaultCoaCode);
      setForm(prev => ({
        ...prev,
        department: found.department,
        category: found.category,
        purpose: found.defaultPurpose || prev.purpose,
        chart_of_account_id: coa ? coa.id : (prev.chart_of_account_id || ''),
      }));
    } else {
      setForm(prev => ({ ...prev, department: deptName }));
    }
  };

  const openAllocateModal = (prefillDept?: string, mode: 'SET' | 'ADD' = 'SET') => {
    setModalError(null);
    setModalSuccess(null);
    setFormAttachment(null);
    const targetDept = prefillDept || form.department || departmentPresets[0]?.department || 'Human Resources (HRMS)';
    handleDepartmentSelect(targetDept);
    setForm(prev => ({
      ...prev,
      period: selectedPeriod !== 'ALL' ? selectedPeriod : '2026-10',
      allocation_mode: mode,
      allocated_amount: '',
      notes: mode === 'ADD' ? 'Budget top-up granted by Finance Management' : 'Department operational budget allocation',
    }));
    setIsModalOpen(true);
  };

  const openAdjustModal = (b: Budget) => {
    setSelectedBudgetForAdjust(b);
    setAdjustForm({
      allocated_amount: b.allocated_amount.toString(),
      attachment_verified: b.attachment_verified !== false,
      adjustment_reason: b.adjustment_reason || '',
    });
    setAdjustAttachment(null);
    setAdjustError(null);
    setAdjustSuccess(null);
    setIsAdjustModalOpen(true);
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
      const fd = new FormData();
      fd.append('department', form.department);
      fd.append('category', form.category);
      fd.append('purpose', form.purpose);
      fd.append('period_type', form.period_type);
      fd.append('fiscal_year', form.fiscal_year.toString());
      fd.append('period', form.period);
      fd.append('allocation_mode', form.allocation_mode);
      fd.append('allocated_amount', amountNum.toString());
      if (form.chart_of_account_id) {
        fd.append('chart_of_account_id', form.chart_of_account_id);
      }
      if (form.notes) {
        fd.append('notes', form.notes);
      }
      if (formAttachment) {
        fd.append('attachment', formAttachment);
      }

      const res = await budgetService.createBudget(fd);

      setModalSuccess(res.message || 'Department budget allocated successfully.');
      setForm(prev => ({
        ...prev,
        allocated_amount: '',
        notes: '',
      }));
      setFormAttachment(null);

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

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBudgetForAdjust) return;
    setAdjustError(null);
    setAdjustSuccess(null);

    const amountNum = parseFloat(adjustForm.allocated_amount);
    if (isNaN(amountNum) || amountNum < 0) {
      setAdjustError('Please enter a valid adjusted amount (0 or higher).');
      return;
    }
    if (!adjustForm.adjustment_reason.trim()) {
      setAdjustError('Please specify the justification or why the attachment was flagged.');
      return;
    }

    try {
      setAdjustSubmitting(true);
      const fd = new FormData();
      fd.append('allocated_amount', amountNum.toString());
      fd.append('attachment_verified', adjustForm.attachment_verified ? '1' : '0');
      fd.append('adjustment_reason', adjustForm.adjustment_reason);
      if (adjustAttachment) {
        fd.append('attachment', adjustAttachment);
      }

      const res = await budgetService.adjustBudget(selectedBudgetForAdjust.id, fd);
      setAdjustSuccess(res.message || 'Budget adjusted successfully.');
      await Promise.all([fetchActiveBudgets(), fetchHistoryData()]);

      setTimeout(() => {
        setIsAdjustModalOpen(false);
        setAdjustSuccess(null);
        setSelectedBudgetForAdjust(null);
      }, 1500);
    } catch (err: any) {
      setAdjustError(err.response?.data?.message || 'Failed to adjust budget.');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // Filtered Archive Items
  const safeHistory = Array.isArray(historyItems) ? historyItems : [];
  const filteredHistory = safeHistory.filter(item => {
    const s = (historySearch || '').toLowerCase();
    const dept = (item.department || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();
    const notes = (item.notes || '').toLowerCase();
    const per = (item.period || '').toLowerCase();
    return dept.includes(s) || cat.includes(s) || notes.includes(s) || per.includes(s);
  });

  if (loading) return <SkeletonLoader />;

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            Corporate Budget Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Departmental spending limits, budget utilization, and fiscal archives.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Year Selector */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 shadow-xs">
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
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => openAllocateModal()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all cursor-pointer"
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
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 cursor-pointer ${
            activeTab === 'active'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Active Department Budgets
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300">
            {budgets.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('archive')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 cursor-pointer ${
            activeTab === 'archive'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Archive className="w-4 h-4" />
          Monthly Budget History & Archive
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
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
          {/* Controls Bar: Period Filter + Cadence Filter + Info Notice */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3.5 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Period Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Fiscal Period:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {availablePeriods.map(period => (
                    <button
                      key={period}
                      onClick={() => setSelectedPeriod(period)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedPeriod === period
                          ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/20'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {period === '2026-10' ? 'October 2026' : period === 'FY2026' ? 'FY2026 (Annual)' : period}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cadence Filter: Yearly, Monthly, Weekly */}
              <div className="flex items-center gap-1.5 pt-2 sm:pt-0 sm:pl-3 sm:border-l border-slate-200 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Cadence:
                </span>
                {(['ALL', 'YEARLY', 'MONTHLY', 'WEEKLY'] as const).map(cadence => (
                  <button
                    key={cadence}
                    onClick={() => setSelectedCadence(cadence)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedCadence === cadence
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {cadence === 'ALL' ? 'All Cadences' : cadence}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 self-start md:self-auto">
              <HelpCircle className="w-3.5 h-3.5 text-purple-500" />
              <span>Real-time GL deduction & multi-cadence burn tracking</span>
            </div>
          </div>

          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title={`Allocated Budget (${selectedPeriod})`}
              value={`₱${(summary?.total_allocated ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              accentColor="bg-purple-600"
              subtitle={`Total across ${summary?.budget_count ?? budgets.length} departments`}
            />
            <StatCard
              title="Actual Spent / Consumed"
              value={`₱${(summary?.total_spent ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              accentColor="bg-rose-500"
              isPositive={false}
              subtitle="From General Ledger & disbursements"
            />
            <StatCard
              title="Available Remaining Budget"
              value={`₱${(summary?.total_remaining ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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
              const hasAttachment = b.attachments && b.attachments.length > 0;
              const firstAttach = hasAttachment ? b.attachments![0] : null;

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
                    {/* Header Row: Badges, Department Name & Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-sans font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200/50">
                            {b.period}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {b.period_type || 'MONTHLY'} CADENCE
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {b.category}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base mt-2">
                          {b.department}
                        </h3>
                        {b.account_code && (
                          <p className="text-xs text-purple-600 dark:text-purple-400 font-sans tabular-nums mt-0.5 flex items-center gap-1">
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

                        <div className="flex items-center gap-1 mt-1">
                          <button
                            onClick={() => openAllocateModal(b.department, 'ADD')}
                            className="text-[10px] font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                            title="Top-up budget allotment"
                          >
                            <Plus className="w-2.5 h-2.5" /> Top Up
                          </button>
                          <button
                            onClick={() => openAdjustModal(b)}
                            className="text-[10px] font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                            title="Adjust budget or rectify attachment"
                          >
                            <Sliders className="w-2.5 h-2.5" /> Adjust
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Scope / Purpose (Kung para saan gagamitin ang budget) */}
                    <div className="mt-3 p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                        <Building className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                        <span>Scope & Purpose (Kung Para Saan Gagamitin)</span>
                      </div>
                      <p className="text-xs text-slate-800 dark:text-slate-200 font-medium mt-1 leading-relaxed">
                        {b.purpose || b.notes || 'Department operational spending allotment'}
                      </p>
                    </div>

                    {/* Cadence Forecast / AI Prediction Message */}
                    {b.forecast_message && (
                      <div className={`mt-2 p-2 rounded-xl text-xs flex items-center gap-2 border ${
                        isOver
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                          : isWarning
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
                      }`}>
                        <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-semibold">{b.forecast_message}</span>
                      </div>
                    )}

                    {/* Attachment & Verification Strip */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2 flex-wrap text-xs">
                      <div className="flex items-center gap-2">
                        {hasAttachment && firstAttach ? (
                          <button
                            onClick={() => setPreviewDoc({
                              isOpen: true,
                              url: firstAttach.file_url,
                              name: firstAttach.file_name,
                              mime: firstAttach.mime_type,
                              type: 'BUDGET_PROPOSAL'
                            })}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 transition-colors"
                            title="Click to view supporting budget proposal / quotation"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>Attachment: {firstAttach.file_name}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 italic flex items-center gap-1">
                            <Paperclip className="w-3 h-3" /> No proposal attached
                          </span>
                        )}

                        {b.attachment_verified === false ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            <AlertTriangle className="w-3 h-3 text-rose-500" />
                            Discrepancy Flagged
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <ShieldCheck className="w-3 h-3 text-emerald-500" />
                            Attachment Verified
                          </span>
                        )}
                      </div>
                    </div>

                    {b.adjustment_reason && (
                      <div className="mt-2 p-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-[11px] text-amber-800 dark:text-amber-300">
                        <span className="font-bold">Audit Adjustment Reason:</span> {b.adjustment_reason}
                      </div>
                    )}

                    {/* Progress Bar Section */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Budget Burn Rate
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                          {b.utilization_rate.toFixed(1)}%
                        </span>
                      </div>
                      <ProgressBar value={b.spent_amount} max={b.allocated_amount} size="md" />
                    </div>
                  </div>

                  {/* Financial Metrics Strip */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">Allocated Limit</p>
                      <p className="font-semibold text-slate-900 dark:text-white truncate tabular-nums">
                        ₱{b.allocated_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">Actual Spent</p>
                      <p className="font-semibold text-rose-600 dark:text-rose-400 truncate tabular-nums">
                        ₱{b.spent_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">Available Funds</p>
                      <p className={`font-semibold truncate tabular-nums ${
                        isOver ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        ₱{b.remaining_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                            <span className="font-semibold px-2.5 py-1 rounded-lg text-[11px] bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50">
                              {item.period_label || item.period}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {item.department}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {item.category}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold text-slate-900 dark:text-white whitespace-nowrap tabular-nums">
                            ₱{item.allocated_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap tabular-nums">
                            ₱{item.spent_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`py-3.5 px-4 text-right font-semibold whitespace-nowrap tabular-nums ${
                            isOver ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            ₱{item.remaining_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5 font-semibold text-xs tabular-nums">
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
                          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                            {log.period}
                          </span>
                        </div>
                          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                            {log.notes || 'Allocated by management'} &bull; Authorized by <span className="font-semibold">{log.allocated_by}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-semibold text-sm text-slate-900 dark:text-white tabular-nums">
                          +₱{log.allocated_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
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
      {/* ========================================================================= */}
      {/* ALLOCATE BUDGET MODAL                                                     */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 !mt-0 z-[999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Sticky Modal Header */}
            <div className="shrink-0 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
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
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                &times;
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="allocate-budget-form" onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Compact Purpose Helper Alert */}
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-xs text-purple-800 dark:text-purple-300 flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
                <div>
                  <span className="font-bold">What does "Allocate Budget" do?</span>
                  <p className="mt-0.5 leading-relaxed text-[11px] text-purple-700 dark:text-purple-300">
                    Grants or tops up the authorized spending ceiling for this department. Approved payroll, supplier bills, and vouchers automatically consume this allotment.
                  </p>
                </div>
              </div>

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

              {/* 2-Column Grid: Department & Expense Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              </div>

              {/* Cadence and Purpose */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Budget Cadence (Timeline) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.period_type}
                    onChange={(e) => setForm({ ...form, period_type: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="MONTHLY">Monthly Cadence (Standard)</option>
                    <option value="YEARLY">Yearly Cadence (Annual Master)</option>
                    <option value="WEEKLY">Weekly Cadence (Short-term OpEx)</option>
                  </select>
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

              {/* Purpose / Scope of Use (Kung para saan gagamitin ang budget) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Budget Purpose & Scope (Kung Para Saan Gagamitin) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Authorized funds for warehouse restocking, raw cement bags purchase, delivery fuel, and contractor labor."
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                />
              </div>

              {/* Amount Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {form.allocation_mode === 'ADD' ? 'Top-Up Amount (₱)' : 'Total Budget Amount (₱)'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="0.00"
                    value={form.allocated_amount}
                    onChange={(e) => setForm({ ...form, allocated_amount: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Supporting Proposal / Quotation Attachment
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.xlsx,.docx"
                    onChange={(e) => setFormAttachment(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-50 dark:file:bg-purple-950 file:text-purple-700 dark:file:text-purple-300 hover:file:bg-purple-100 cursor-pointer"
                  />
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
                  {(Array.isArray(chartOfAccounts) ? chartOfAccounts : []).map((coa) => (
                    <option key={coa.id} value={coa.id}>
                      {coa.code} &mdash; {coa.name} {coa.type ? `(${coa.type})` : ''}
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
            </form>

            {/* Sticky Modal Footer */}
            <div className="shrink-0 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-6 py-3.5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="allocate-budget-form"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-sm disabled:opacity-50 transition-all cursor-pointer"
              >
                {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Confirm Budget Allocation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADJUST DEPARTMENT BUDGET & ATTACHMENT AUDIT                      */}
      {/* ========================================================================= */}
      {isAdjustModalOpen && selectedBudgetForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="shrink-0 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Adjust Department Budget & Audit Attachment
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedBudgetForAdjust.department} &mdash; {selectedBudgetForAdjust.period}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                &times;
              </button>
            </div>

            {/* Form Body */}
            <form id="adjust-budget-form" onSubmit={handleAdjustSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Context Summary Box */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Current Allotment:</span>
                  <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                    ₱{selectedBudgetForAdjust.allocated_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Spent to Date:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    ₱{selectedBudgetForAdjust.spent_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Purpose / Scope:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[300px]">
                    {selectedBudgetForAdjust.purpose || selectedBudgetForAdjust.notes || 'OpEx Allotment'}
                  </span>
                </div>
              </div>

              {adjustError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{adjustError}</span>
                </div>
              )}

              {adjustSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{adjustSuccess}</span>
                </div>
              )}

              {/* New Adjusted Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Adjusted Budget Limit (₱) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={adjustForm.allocated_amount}
                  onChange={(e) => setAdjustForm({ ...adjustForm, allocated_amount: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 tabular-nums"
                />
                <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                  You can increase, decrease, or freeze this department's authorized ceiling.
                </span>
              </div>

              {/* Attachment Verification Decision (If attachment is wrong / discrepancy) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Attachment Audit & Document Verification <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustForm({ ...adjustForm, attachment_verified: true })}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      adjustForm.attachment_verified
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Attachment Verified</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Proposal & quotations match legitimate company expenses.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustForm({ ...adjustForm, attachment_verified: false })}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      !adjustForm.attachment_verified
                        ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-900 dark:text-rose-200 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span>Attachment Wrong / Discrepancy</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Flag incorrect estimate, forged document, or wrong amount.
                    </p>
                  </button>
                </div>
              </div>

              {/* Adjustment Reason & Audit Justification (Mandatory) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Adjustment / Attachment Correction <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this budget is being adjusted or what was wrong in the attachment (e.g. Quotation overrun, wrong supplier attached, re-allocation granted)..."
                  value={adjustForm.adjustment_reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, adjustment_reason: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Upload Corrected Attachment */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Upload Corrected Supporting Proposal / Quotation (Optional)
                </label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.xlsx,.docx"
                  onChange={(e) => setAdjustAttachment(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-50 dark:file:bg-amber-950 file:text-amber-800 dark:file:text-amber-300 hover:file:bg-amber-100 cursor-pointer"
                />
                <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                  Replaces or updates the audit attachment on record with the corrected file.
                </span>
              </div>
            </form>

            {/* Footer */}
            <div className="shrink-0 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-6 py-3.5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="adjust-budget-form"
                disabled={adjustSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-sm disabled:opacity-50 transition-all cursor-pointer"
              >
                {adjustSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sliders className="w-3.5 h-3.5" />}
                Confirm Budget Adjustment
              </button>
            </div>
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
        documentType={previewDoc.type || 'BUDGET_DOCUMENT'}
      />
    </div>
  );
};

export default BudgetPage;
