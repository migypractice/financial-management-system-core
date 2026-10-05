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

export interface CreateBudgetPayload {
  department: string;
  category: string;
  fiscal_year: number;
  period: string;
  allocated_amount: number;
  chart_of_account_id?: string;
  notes?: string;
}

export const budgetService = {
  async getBudgets(fiscalYear: number = 2026): Promise<{ data: Budget[]; summary: BudgetSummary }> {
    const res = await apiClient.get('/budgets', { params: { fiscal_year: fiscalYear } });
    return {
      data: res.data.data,
      summary: res.data.summary,
    };
  },

  async createBudget(payload: CreateBudgetPayload): Promise<{ message: string; data: Budget }> {
    const res = await apiClient.post('/budgets', payload);
    return res.data;
  },
};

export default budgetService;
