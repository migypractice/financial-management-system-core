import { apiClient } from './apiClient';

export interface Supplier {
  id: string;
  supplier_code: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  payment_terms_days: number;
  unpaid_bills_count?: number;
  total_outstanding?: number;
}

export interface AttachmentItem {
  id: string;
  file_name: string;
  file_url: string;
  mime_type: string;
  file_size?: number;
  document_type?: string;
}

export interface ApBillItem {
  id: string;
  bill_number: string;
  supplier_id: string;
  supplier_name: string;
  company_name: string;
  category_type: string;
  account_name: string;
  bill_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  days_past_due: number;
  description: string;
  attachments: AttachmentItem[];
}

export interface ApBillSummary {
  total_payable: number;
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_90_plus: number;
  total_bills: number;
  unpaid_count: number;
}

export interface PaymentRequestItem {
  id: string;
  request_number: string;
  ap_bill_id: string | null;
  bill_number?: string | null;
  payee_name: string;
  amount: number;
  purpose: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'DISBURSED';
  requested_by_id: string;
  requester_name: string;
  requester_dept: string;
  approved_by_id: string | null;
  approver_name: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  ai_confidence_score: number;
  ai_anomaly_flag: boolean;
  ai_anomaly_reason: string | null;
  created_at: string;
  attachments: AttachmentItem[];
  has_attachment: boolean;
}

export interface DisbursementItem {
  id: string;
  disbursement_number: string;
  payment_request_id: string;
  request_number: string;
  payee_name: string;
  purpose: string;
  bill_number?: string;
  bank_account_id: string;
  bank_name: string;
  account_name: string;
  amount: number;
  disbursement_date: string;
  payment_method: string;
  reference_number: string | null;
  disbursed_by_name: string;
  journal_entry_num?: string;
  attachments: AttachmentItem[];
}

export interface BankAccountItem {
  id: string;
  account_name: string;
  bank_name: string;
  account_number: string;
  account_type: string;
  current_balance: string | number;
  currency: string;
}

export interface ChartOfAccountItem {
  id: string;
  code: string;
  name: string;
  type: string;
}

export const apService = {
  // Suppliers
  getSuppliers: async () => {
    const res = await apiClient.get('/suppliers');
    return res.data;
  },

  createSupplier: async (payload: Partial<Supplier>) => {
    const res = await apiClient.post('/suppliers', payload);
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

  // AP Bills
  getApBills: async (params?: { status?: string; supplier_id?: string }) => {
    const res = await apiClient.get('/ap-bills', { params });
    return res.data;
  },

  createApBill: async (formData: FormData) => {
    const res = await apiClient.post('/ap-bills', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  // Payment Requests (Strict mandatory attachment)
  getPaymentRequests: async (params?: { status?: string }) => {
    const res = await apiClient.get('/payment-requests', { params });
    return res.data;
  },

  createPaymentRequest: async (formData: FormData) => {
    const res = await apiClient.post('/payment-requests', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  approvePaymentRequest: async (id: string) => {
    const res = await apiClient.post(`/payment-requests/${id}/approve`);
    return res.data;
  },

  rejectPaymentRequest: async (id: string, reason: string) => {
    const res = await apiClient.post(`/payment-requests/${id}/reject`, { reason });
    return res.data;
  },

  // Disbursements
  getDisbursements: async () => {
    const res = await apiClient.get('/disbursements');
    return res.data;
  },

  disbursePaymentRequest: async (
    paymentRequestId: string,
    payload: { bank_account_id: string; payment_method: string; reference_number?: string }
  ) => {
    const res = await apiClient.post(`/payment-requests/${paymentRequestId}/disburse`, payload);
    return res.data;
  },
};
