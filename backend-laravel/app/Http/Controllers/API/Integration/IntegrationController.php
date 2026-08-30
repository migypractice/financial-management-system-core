<?php

namespace App\Http\Controllers\API\Integration;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AIService\AIService;
use Illuminate\Database\QueryException;
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
            'external_module'       => 'required|string', // Tinanggal yung strict "in:HRMS..." para kahit anong module pwede
            'external_reference_id' => 'required|string|max:255',
            'category_type'         => 'required|string|max:100',
            'amount'                => 'required|numeric|min:0.01',
            'tax_amount'            => 'nullable|numeric|min:0',
            'fee_amount'            => 'nullable|numeric|min:0',
            'currency'              => 'nullable|string|size:3',
            // Required: an outbound disbursement must record who the money is going to.
            'payee_info'            => 'required|array',
            'payee_info.name'       => 'required|string|max:255',
            'payee_info.account'    => 'nullable|string|max:255',
            'payee_info.bank'       => 'nullable|string|max:255',
            'description'           => 'required|string|max:1000',
            'metadata'              => 'nullable|array',
        ]);

        $validated['type'] = 'EXPENSE';

        // Merge payee_info into metadata
        $validated['metadata'] = array_merge(
            $validated['metadata'] ?? [],
            ['payee_info' => $validated['payee_info'] ?? null]
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
                return $this->payloadMatchesExisting($existing, $validated)
                    ? $this->duplicateResponse($existing)
                    : $this->idempotencyConflictResponse($existing);
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
        $systemUser = User::where('email', 'system@hw.com')->first();

        try {
            $transactionId = DB::transaction(function () use (
                $validated, $aiResult, $subsystemId, $transactionCode, $amount, $taxAmount, $feeAmount, $netAmount, $idempotencyKey, $systemUser
            ) {
                $id = (string) Str::uuid();

                DB::table('transactions')->insert([
                    'id'                    => $id,
                    'transaction_code'      => $transactionCode,
                    'idempotency_key'       => $idempotencyKey,
                    'subsystem_id'          => $subsystemId,
                    'created_by'            => $systemUser?->id,
                    'source_module'         => $validated['external_module'],
                    'category_type'         => $validated['category_type'] ?? null,
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
        } catch (QueryException $e) {
            // Concurrent duplicate request: both passed the pre-check before either inserted.
            // The unique constraint on idempotency_key caught it — return the winning row instead of erroring.
            if ($idempotencyKey && $e->getCode() === '23505') {
                $existing = DB::table('transactions')->where('idempotency_key', $idempotencyKey)->first();
                if ($existing) {
                    return $this->payloadMatchesExisting($existing, $validated)
                        ? $this->duplicateResponse($existing)
                        : $this->idempotencyConflictResponse($existing);
                }
            }
            throw $e;
        }

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
     * Response returned when an idempotency key matches an already-persisted transaction.
     */
    private function duplicateResponse(object $existing): JsonResponse
    {
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
        ], 200);
    }

    /**
     * Compare the significant fields of a newly-submitted payload against an
     * already-persisted transaction sharing the same idempotency key.
     *
     * Money fields are compared as fixed 2-decimal strings (matching the
     * DECIMAL(15,2) column precision) to avoid spurious float-formatting
     * mismatches between the stored value and the freshly-validated one.
     */
    private function payloadMatchesExisting(object $existing, array $validated): bool
    {
        $money = fn ($value) => number_format((float) ($value ?? 0), 2, '.', '');

        return (string) $existing->source_module === (string) ($validated['external_module'] ?? '')
            && (string) $existing->external_reference_id === (string) ($validated['external_reference_id'] ?? '')
            && (string) ($existing->category_type ?? '') === (string) ($validated['category_type'] ?? '')
            && (string) $existing->type === (string) ($validated['type'] ?? '')
            && $money($existing->amount) === $money($validated['amount'] ?? 0)
            && $money($existing->tax_amount) === $money($validated['tax_amount'] ?? 0)
            && $money($existing->fee_amount) === $money($validated['fee_amount'] ?? 0)
            && (string) $existing->currency === (string) ($validated['currency'] ?? 'PHP')
            && (string) $existing->description === (string) ($validated['description'] ?? '');
    }

    /**
     * Response returned when an idempotency key is reused with materially
     * different request data. The original transaction is left untouched and
     * no new transaction is created — the caller must use a new key for a
     * genuinely different transaction.
     */
    private function idempotencyConflictResponse(object $existing): JsonResponse
    {
        return response()->json([
            'status'            => 'error',
            'message'           => 'Idempotency-Key conflict: this key was already used for a transaction with different request data. Use a new Idempotency-Key for a genuinely different transaction.',
            'transaction_id'    => $existing->id,
            'transaction_code'  => $existing->transaction_code,
        ], 409);
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
