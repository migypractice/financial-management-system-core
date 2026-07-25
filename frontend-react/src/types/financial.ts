/**
 * Financial Domain Types
 * Financial Management System — Transaction Core
 */

/** Workflow statuses aligned with the backend 'transactions.status' enum */
export type TransactionStatus =
  | 'pending_approval'
  | 'ai_flagged'
  | 'approved'
  | 'rejected'
  | 'posted'
  | 'disbursed';

/** Direction of money flow */
export type FlowType = 'INBOUND' | 'OUTBOUND';

/** Source modules that send transactions to the core */
export type ExternalModuleType =
  | 'ECOMMERCE_CORE'
  | 'HRMS'
  | 'SUPPLY_CHAIN'
  | 'FLEET'
  | 'FACILITIES_LEGAL';

export interface Transaction {
  id: string;
  transactionCode: string;
  flowType: FlowType;
  categoryType: string;
  externalModule: ExternalModuleType | string;
  externalReferenceId: string;
  amount: number;
  taxAmount: number;
  feeAmount: number;
  netAmount: number;
  currency: string;
  payeeAccount?: string;
  payerAccount?: string;
  description: string;
  status: TransactionStatus;
  aiConfidenceScore: number;
  aiSuggestedGlAccountId?: string;
  aiSuggestedGlAccountName: string;
  aiAnomalyFlag: boolean;
  aiAnomalyReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  postedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  subCategory?: string;
  balance: number;
  status: 'Active' | 'Inactive';
}

export interface JournalEntry {
  id: string;
  transactionId: string;
  entryNumber: string;
  entryDate: string;
  status: 'DRAFT' | 'POSTED' | 'REVERSED';
}
