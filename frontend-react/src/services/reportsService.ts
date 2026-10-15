import apiClient from './apiClient';

export interface RevenueDetail {
  code: string;
  name: string;
  amount: number;
}

export interface ExpenseDetail {
  code: string;
  name: string;
  amount: number;
}

export interface IncomeStatementData {
  period: string;
  total_revenue: number;
  revenue_detail: RevenueDetail[];
  total_cogs: number;
  gross_profit: number;
  total_expenses: number;
  expense_detail: ExpenseDetail[];
  net_income: number;
}

export interface BalanceSheetData {
  assets: {
    cash_and_equivalents: number;
    accounts_receivable: number;
    merchandise_inventory: number;
    total_current_assets: number;
  };
  liabilities: {
    accounts_payable: number;
    tax_payable: number;
    total_current_liabilities: number;
  };
  equity: {
    retained_earnings: number;
    total_equity: number;
  };
}

export interface FinancialRatiosData {
  current_ratio: number;
  quick_ratio: number;
  net_profit_margin: number;
  budget_burn_rate: number;
}

export interface AIInsightItem {
  type: 'healthy' | 'warning' | 'anomaly';
  title: string;
  desc: string;
}

export interface FinancialStatementsResponse {
  income_statement: IncomeStatementData;
  balance_sheet: BalanceSheetData;
  ratios: FinancialRatiosData;
  ai_insights: AIInsightItem[];
}

export const reportsService = {
  async getFinancialStatements(): Promise<FinancialStatementsResponse> {
    const res = await apiClient.get('/reports/financial-statements');
    return res.data.data;
  },
};

export default reportsService;
