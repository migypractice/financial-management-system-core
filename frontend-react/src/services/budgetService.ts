import apiClient from './apiClient';
import { AttachmentItem } from './apService';

export interface Budget {
  id: string;
  department: string;
  category: string;
  purpose?: string;
  fiscal_year: number | string;
  period: string;
  period_type?: 'YEARLY' | 'MONTHLY' | 'WEEKLY';
  allocated_amount: number;
  spent_amount: number;
  remaining_amount: number;
  utilization_rate: number;
  status: 'ON_TRACK' | 'NEAR_LIMIT' | 'OVER_BUDGET';
  forecast_message?: string;
  attachment_verified?: boolean;
  adjustment_reason?: string | null;
  account_code?: string | null;
  account_name?: string | null;
  notes?: string | null;
  attachments?: AttachmentItem[];
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
  purpose?: string;
  period_type?: 'YEARLY' | 'MONTHLY' | 'WEEKLY';
  fiscal_year: number;
  period: string;
  allocated_amount: number;
  allocation_mode?: 'SET' | 'ADD';
  chart_of_account_id?: string;
  notes?: string;
  attachment?: File;
}

export const budgetService = {
  async getBudgets(fiscalYear: number = 2026, period: string = '2026-10', periodType?: string): Promise<{ 
    data: Budget[]; 
    summary: BudgetSummary;
    meta?: { current_period: string; available_periods: string[] };
  }> {
    const params: Record<string, any> = {
      fiscal_year: fiscalYear,
      period: period
    };
    if (periodType && periodType !== 'ALL') {
      params.period_type = periodType;
    }
    const res = await apiClient.get('/budgets', { params });
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

  async createBudget(payload: CreateBudgetPayload | FormData): Promise<{ message: string; data: Budget }> {
    const config = payload instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;
    const res = await apiClient.post('/budgets', payload, config);
    return res.data;
  },

  async adjustBudget(id: string, payload: FormData): Promise<{ message: string; data: Budget }> {
    const res = await apiClient.post(`/budgets/${id}/adjust`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};

export default budgetService;
