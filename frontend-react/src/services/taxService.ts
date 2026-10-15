import apiClient from './apiClient';

export interface TaxLedgerRow {
  id: string;
  reference: string;
  counterparty: string;
  date: string;
  gross_amount: number;
  vatable_base: number;
  vat_amount: number;
  vat_type: 'OUTPUT' | 'INPUT';
  ewt_code: string | null;
  ewt_rate: number;
  ewt_amount: number;
  status: string;
  module: 'AR' | 'AP';
}

export interface WhtSummaryItem {
  code: string;
  description: string;
  rate: number;
  tax_base: number;
  amount: number;
}

export interface TaxSummaryResponse {
  vat_summary: {
    output_vat: number;
    output_vat_base: number;
    input_vat: number;
    input_vat_base: number;
    net_vat_payable: number;
    excess_input_tax: number;
  };
  ewt_summary: WhtSummaryItem[];
  total_ewt: number;
  tax_ledger: TaxLedgerRow[];
  period: {
    label: string;
    year: string;
    month: string;
  };
}

export const taxService = {
  async getTaxSummary(): Promise<TaxSummaryResponse> {
    const res = await apiClient.get('/tax/summary');
    return res.data.data;
  },
};

export default taxService;
