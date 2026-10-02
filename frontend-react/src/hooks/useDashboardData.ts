import { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { Transaction } from '../types/financial';

export const useDashboardData = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        // Fetch ALL transactions (not just pending) so modules can use approved/posted data
        const response = await apiClient.get('/dashboard/transactions', {
          params: { status: 'all', per_page: 200 }
        });
        const rows: any[] = response.data?.data ?? [];

        // Map snake_case backend response to camelCase frontend types
        const mapped: Transaction[] = rows.map((row: any) => ({
          id: row.id,
          transactionCode: row.transaction_code,
          flowType: row.type === 'INCOME' ? 'INBOUND' : 'OUTBOUND',
          categoryType: row.type,
          externalModule: row.source_module,
          externalReferenceId: row.external_reference_id,
          amount: Number(row.amount),
          taxAmount: Number(row.tax_amount ?? 0),
          feeAmount: Number(row.fee_amount ?? 0),
          netAmount: Number(row.net_amount ?? 0),
          currency: row.currency,
          description: row.description,
          status: row.status,
          aiConfidenceScore: Number(row.ai_confidence_score ?? 0),
          aiSuggestedGlAccountId: row.ai_suggested_gl_code,
          aiSuggestedGlAccountName: row.ai_suggested_gl_name,
          aiAnomalyFlag: !!row.ai_anomaly_flag,
          aiAnomalyReason: row.ai_anomaly_reason,
          approvedBy: row.approved_by,
          approvedAt: row.approved_at,
          postedAt: row.posted_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          createdBy: row.created_by,
        }));

        setTransactions(mapped);
      } catch (error) {
        console.error('Failed to fetch transactions for modules:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  return { transactions, loading };
};
