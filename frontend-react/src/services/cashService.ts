import apiClient from './apiClient';

export interface BankAccount {
  id: string;
  account_name: string;
  bank_name: string;
  account_number: string;
  account_type: string;
  beginning_balance: number;
  current_balance: number;
  total_inflows: number;
  total_outflows: number;
  currency: string;
  chart_of_account_code?: string;
  chart_of_account_name?: string;
  reconciliation_status: string;
  updated_at?: string;
}

export interface BankSummary {
  total_cash_in_bank: number;
  total_inflows: number;
  total_outflows: number;
  net_cash_flow: number;
  account_count: number;
}

export interface BankTransaction {
  id: string;
  flow_type: 'INFLOW' | 'OUTFLOW';
  type: string;
  date: string;
  reference_number: string;
  bank_id?: string;
  bank_name?: string;
  account_number?: string;
  party_name: string;
  description: string;
  amount: number;
  payment_method: string;
  status: string;
  attachment?: string | null;
}

export interface BankTransferPayload {
  from_bank_account_id: string;
  to_bank_account_id: string;
  amount: number;
  transfer_date: string;
  reference_number?: string;
  notes?: string;
}

export const cashService = {
  async getBankAccounts(): Promise<{ data: BankAccount[]; summary: BankSummary }> {
    const res = await apiClient.get('/bank-accounts');
    return {
      data: res.data.data,
      summary: res.data.summary,
    };
  },

  async getBankTransactions(bankAccountId?: string): Promise<{ data: BankTransaction[]; count: number }> {
    const params = bankAccountId ? { bank_account_id: bankAccountId } : {};
    const res = await apiClient.get('/bank-accounts/transactions', { params });
    return {
      data: res.data.data,
      count: res.data.count,
    };
  },

  async transferFunds(payload: BankTransferPayload): Promise<{ message: string; data: any }> {
    const res = await apiClient.post('/bank-accounts/transfer', payload);
    return res.data;
  },
};

export default cashService;
