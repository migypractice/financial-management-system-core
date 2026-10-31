import { apiClient } from './apiClient';

export interface PurchaseOrderLineItem {
  id: string;
  purchase_order_id: string;
  source_po_line_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
}

export interface InboundPurchaseOrder {
  id: string;
  financial_reference: string;
  source_system: string;
  message_id: string;
  external_reference_id: string;
  idempotency_key: string;
  category_type: string;
  currency: string;
  total_amount: number;
  supplier_id: string | null;
  supplier_code: string | null;
  supplier_name: string;
  receipt_status: string;
  processing_status: string;
  received_at: string;
  metadata?: Record<string, unknown> | null;
  lines?: PurchaseOrderLineItem[];
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderListResponse {
  success: boolean;
  data: InboundPurchaseOrder[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface PurchaseOrderFilterParams {
  search?: string;
  receipt_status?: string;
  processing_status?: string;
  source_system?: string;
  page?: number;
  per_page?: number;
}

export const purchaseOrderService = {
  async getPurchaseOrders(params?: PurchaseOrderFilterParams): Promise<PurchaseOrderListResponse> {
    const res = await apiClient.get<PurchaseOrderListResponse>('/dashboard/purchase-orders', {
      params,
    });
    return res.data;
  },

  async getPurchaseOrder(id: string): Promise<InboundPurchaseOrder> {
    const res = await apiClient.get<{ success: boolean; data: InboundPurchaseOrder }>(
      `/dashboard/purchase-orders/${id}`
    );
    return res.data.data;
  },

  async forwardToDisbursement(id: string): Promise<{
    success: boolean;
    message: string;
    data: {
      voucher_number: string;
      payment_request_id: string;
      ap_bill_number?: string;
      amount: number;
      payee_name: string;
      status: string;
    };
  }> {
    const res = await apiClient.post(`/dashboard/purchase-orders/${id}/forward-disbursement`);
    return res.data;
  },
};

export default purchaseOrderService;

