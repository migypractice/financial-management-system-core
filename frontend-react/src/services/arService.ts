import { apiClient } from './apiClient';
import { AttachmentItem, BankAccountItem, ChartOfAccountItem } from './apService';

export interface Customer {
  id: string;
  customer_code: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  credit_limit: number;
  payment_terms_days: number;
  unpaid_invoices_count?: number;
  total_outstanding?: number;
}

export interface ArInvoiceItem {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  company_name: string;
  account_name: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  days_past_due: number;
  description: string;
  attachments: AttachmentItem[];
  collections_count: number;
}

export interface ArInvoiceSummary {
  total_receivable: number;
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_90_plus: number;
  total_invoices: number;
  unpaid_count: number;
}

export interface CollectionItem {
  id: string;
  collection_number: string;
  ar_invoice_id: string;
  invoice_number?: string;
  customer_name: string;
  bank_account_id: string;
  bank_name: string;
  account_name: string;
  amount: number;
  collection_date: string;
  payment_method: string;
  reference_number: string | null;
  collected_by_name?: string;
  attachments: AttachmentItem[];
}

export interface CollectionSummary {
  total_collected: number;
  count: number;
}

export const arService = {
  // Customers
  getCustomers: async () => {
    const res = await apiClient.get('/customers');
    return res.data;
  },

  createCustomer: async (payload: Partial<Customer>) => {
    const res = await apiClient.post('/customers', payload);
    return res.data;
  },

  // AR Invoices
  getArInvoices: async (params?: { status?: string; customer_id?: string }) => {
    const res = await apiClient.get('/ar-invoices', { params });
    return res.data;
  },

  createArInvoice: async (formData: FormData) => {
    const res = await apiClient.post('/ar-invoices', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  // Collections (Money In)
  getCollections: async () => {
    const res = await apiClient.get('/collections');
    return res.data;
  },

  collectInvoice: async (invoiceId: string, formData: FormData) => {
    const res = await apiClient.post(`/ar-invoices/${invoiceId}/collect`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  // Bank Accounts & COA
  getBankAccounts: async () => {
    const res = await apiClient.get('/bank-accounts');
    return res.data;
  },

  getChartOfAccounts: async (type?: string) => {
    const res = await apiClient.get('/chart-of-accounts', { params: { type } });
    return res.data;
  },
};
