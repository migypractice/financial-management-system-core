<?php

namespace App\Http\Controllers\API\Integration;

use App\Http\Controllers\Controller;
use App\Services\AIService\AIService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Handles machine-to-machine (M2M) transaction ingestion from external modules.
 * Protected by ApiKeyMiddleware — only verified system API keys can reach these endpoints.
 *
 * Routes:
 *   POST /api/v1/integration/inbound-revenue
 *   POST /api/v1/integration/request-disbursement
 */
class IntegrationController extends Controller
{
    public function __construct(
        protected AIService $aiService
    ) {}

    /**
     * Inbound revenue ingestion (Sales Revenue, Customer Receipts, Gateway Fees, VAT).
     */
    public function inboundRevenue(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'external_module'       => 'required|string|in:ECOMMERCE_CORE',
            'external_reference_id' => 'required|string|max:255',
            'category_type'         => 'required|string|max:100',
            'amount'                => 'required|numeric|min:0.01',
            'tax_amount'            => 'nullable|numeric|min:0',
            'fee_amount'            => 'nullable|numeric|min:0',
            'currency'              => 'nullable|string|size:3',
            'description'           => 'required|string|max:1000',
            'metadata'              => 'nullable|array',
        ]);

        $validated['type'] = 'INCOME';

        $idempotencyKey = $request->header('Idempotency-Key') ?? $request->input('idempotency_key');
        return $this->processAndPersist($validated, $idempotencyKey);
    }

    /**
     * Outbound disbursement request (Payroll, Supplier Payouts, Fleet, Facilities, Refunds).
     */
    public function requestDisbursement(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'external_module'       => 'required|string|in:HRMS,SUPPLY_CHAIN,FLEET,FACILITIES_LEGAL,ECOMMERCE_CORE',
            'external_reference_id' => 'required|string|max:255',
            'category_type'         => 'required|string|max:100',
            'amount'                => 'required|numeric|min:0.01',
            'tax_amount'            => 'nullable|numeric|min:0',
            'fee_amount'            => 'nullable|numeric|min:0',
            'currency'              => 'nullable|string|size:3',
            'payee_info'            => 'required|array',
            'description'           => 'required|string|max:1000',
            'metadata'              => 'nullable|array',
        ]);

        $validated['type'] = 'EXPENSE';

        // Merge payee_info into metadata
        $validated['metadata'] = array_merge(
            $validated['metadata'] ?? [],
            ['payee_info' => $validated['payee_info']]
        );
        unset($validated['payee_info']);

        $idempotencyKey = $request->header('Idempotency-Key') ?? $request->input('idempotency_key');
        return $this->processAndPersist($validated, $idempotencyKey);
    }

    /**
     * Core processing pipeline: AI evaluation → DB persist → response.
     */
    private function processAndPersist(array $validated, ?string $idempotencyKey = null): JsonResponse
    {
        // 0. Check Idempotency Key
        if ($idempotencyKey) {
            $existing = DB::table('transactions')
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existing) {
                // Return existing transaction without reprocessing
                return response()->json([
                    'status'           => 'accepted',
                    'message'          => 'Duplicate request detected. Returning existing transaction.',
                    'transaction_id'   => $existing->id,
                    'transaction_code' => $existing->transaction_code,
                    'workflow_status'  => $existing->status,
                    'ai_evaluation'    => [
                        'confidence_score'   => $existing->ai_confidence_score,
                        'suggested_gl_code'  => $existing->ai_suggested_gl_code,
                        'anomaly_detected'   => $existing->ai_anomaly_flag,
                    ],
                ], 200); // 200 OK since it's already processed
            }
        }

        // 1. Run AI evaluation
        $aiResult = $this->aiService->evaluateTransaction($validated);

        // 2. Resolve subsystem ID (default to general-ledger)
        $subsystem = DB::table('subsystems')
            ->where('slug', $this->resolveSubsystemSlug($validated['category_type']))
            ->first();

        $subsystemId = $subsystem?->id ?? DB::table('subsystems')->where('slug', 'general-ledger')->value('id');

        // 3. Calculate net amount
        $amount    = (float) $validated['amount'];
        $taxAmount = (float) ($validated['tax_amount'] ?? 0);
        $feeAmount = (float) ($validated['fee_amount'] ?? 0);
        $netAmount = $amount - $taxAmount - $feeAmount;

        // 4. Persist inside a DB transaction for ACID compliance
        $transactionCode = 'TXN-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6));

        $transactionId = DB::transaction(function () use (
            $validated, $aiResult, $subsystemId, $transactionCode, $amount, $taxAmount, $feeAmount, $netAmount, $idempotencyKey
        ) {
            $id = (string) Str::uuid();

            DB::table('transactions')->insert([
                'id'                    => $id,
                'transaction_code'      => $transactionCode,
                'idempotency_key'       => $idempotencyKey,
                'subsystem_id'          => $subsystemId,
                'source_module'         => $validated['external_module'],
                'external_reference_id' => $validated['external_reference_id'],
                'type'                  => $validated['type'],
                'amount'                => $amount,
                'tax_amount'            => $taxAmount,
                'fee_amount'            => $feeAmount,
                'net_amount'            => $netAmount,
                'currency'              => $validated['currency'] ?? 'PHP',
                'description'           => $validated['description'],
                'metadata'              => json_encode($validated['metadata'] ?? []),
                'status'                => $aiResult['status'],
                'ai_confidence_score'   => $aiResult['ai_confidence_score'],
                'ai_suggested_gl_code'  => $aiResult['ai_suggested_gl_code'],
                'ai_suggested_gl_name'  => $aiResult['ai_suggested_gl_name'],
                'ai_anomaly_flag'       => $aiResult['ai_anomaly_flag'],
                'ai_anomaly_reason'     => $aiResult['ai_anomaly_reason'],
                'created_at'            => now(),
                'updated_at'            => now(),
            ]);

            // Also log in ai_logs for audit trail
            DB::table('ai_logs')->insert([
                'id'             => (string) Str::uuid(),
                'transaction_id' => $id,
                'anomaly_score'  => $aiResult['ai_confidence_score'] * 100,
                'ai_decision'    => $aiResult['ai_anomaly_flag'] ? 'FLAGGED' : 'PASSED',
                'flag_reason'    => $aiResult['ai_anomaly_reason'],
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);

            return $id;
        });

        return response()->json([
            'status'           => 'accepted',
            'message'          => 'Transaction received and queued for human approval.',
            'transaction_id'   => $transactionId,
            'transaction_code' => $transactionCode,
            'workflow_status'  => $aiResult['status'],
            'ai_evaluation'    => [
                'confidence_score'   => $aiResult['ai_confidence_score'],
                'suggested_gl_code'  => $aiResult['ai_suggested_gl_code'],
                'anomaly_detected'   => $aiResult['ai_anomaly_flag'],
            ],
        ], 202);
    }

    /**
     * Map category_type to the appropriate internal subsystem slug.
     */
    private function resolveSubsystemSlug(string $categoryType): string
    {
        return match ($categoryType) {
            'SALES_REVENUE', 'CUSTOMER_REFUND', 'SALES_RETURN'          => 'accounts-receivable',
            'SUPPLIER_INVOICE', 'PURCHASE_RETURN'                       => 'accounts-payable',
            'PAYROLL_SALARY', 'EMPLOYEE_CLAIM'                          => 'disbursement-management',
            'FLEET_FUEL', 'FLEET_MAINTENANCE'                           => 'disbursement-management',
            'FACILITY_RENT', 'LEGAL_BILLING'                            => 'disbursement-management',
            'INVENTORY_PURCHASE', 'INVENTORY_ADJUSTMENT',
            'INVENTORY_SHRINKAGE', 'COST_OF_GOODS_SOLD'                 => 'general-ledger',
            default                                                     => 'general-ledger',
        };
    }
}
