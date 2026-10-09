import apiClient from './apiClient';

export interface Budget {
  id: string;
  department: string;
  category: string;
  fiscal_year: number | string;
  period: string;
  allocated_amount: number;
  spent_amount: number;
  remaining_amount: number;
  utilization_rate: number;
  status: 'ON_TRACK' | 'NEAR_LIMIT' | 'OVER_BUDGET';
  account_code?: string | null;
  account_name?: string | null;
  notes?: string | null;
}

export interface BudgetSummary {
  total_allocated: number;
  total_spent: number;
  total_remaining: number;
  avg_utilization: number;
  budget_count: number;
}

export interface BudgetHistoryItem {
  id: string;
  period: string;
  period_label: string;
  department: string;
  category: string;
  fiscal_year: string | number;
  allocated_amount: number;
  spent_amount: number;
  remaining_amount: number;
  utilization_rate: number;
  status: 'ON_TRACK' | 'NEAR_LIMIT' | 'OVER_BUDGET';
  account_name?: string | null;
  allocated_by?: string | null;
  notes?: string | null;
  updated_at?: string | null;
}

export interface BudgetAllocationLog {
  id: string;
  department: string;
  category: string;
  period: string;
  allocated_amount: number;
  action_type: string;
  notes?: string | null;
  allocated_by: string;
  created_at: string;
}

export interface CreateBudgetPayload {
  department: string;
  category: string;
  fiscal_year: number;
  period: string;
  allocated_amount: number;
  allocation_mode?: 'SET' | 'ADD';
  chart_of_account_id?: string;
  notes?: string;
}

export const budgetService = {
  async getBudgets(fiscalYear: number = 2026, period: string = '2026-10'): Promise<{ 
    data: Budget[]; 
    summary: BudgetSummary;
    meta?: { current_period: string; available_periods: string[] };
  }> {
    const res = await apiClient.get('/budgets', { 
      params: { 
        fiscal_year: fiscalYear,
        period: period 
      } 
    });
    return {
      data: res.data.data,
      summary: res.data.summary,
      meta: res.data.meta,
    };
  },

  async getBudgetHistory(params?: { fiscal_year?: number; department?: string; period?: string }): Promise<{
    history: BudgetHistoryItem[];
    allocation_logs: BudgetAllocationLog[];
    available_periods: string[];
    available_departments: string[];
  }> {
    const res = await apiClient.get('/budgets/history', { params });
    return res.data.data;
  },

  async createBudget(payload: CreateBudgetPayload): Promise<{ message: string; data: Budget }> {
    const res = await apiClient.post('/budgets', payload);
    return res.data;
  },
};

export default budgetService;
