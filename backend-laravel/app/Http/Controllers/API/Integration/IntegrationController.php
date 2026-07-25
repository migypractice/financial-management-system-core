<?php

namespace App\Http\Controllers\API\Integration;

use App\Http\Controllers\Controller;
use App\Services\AIService\AIService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

/**
 * Universal M2M API Controller for External Subsystem Integrations.
 * Protected by ApiKeyMiddleware.
 */
class IntegrationController extends Controller
{
    protected AIService $aiService;

    public function __construct(AIService $aiService)
    {
        $this->aiService = $aiService;
    }

    /**
     * Inbound Revenue API endpoint (Sales Revenue, Customer Receipts, Taxes)
     * POST /api/v1/integration/inbound-revenue
     */
    public function inboundRevenue(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'external_module' => 'required|string',
            'external_reference_id' => 'required|string',
            'category_type' => 'required|string',
            'amount' => 'required|numeric|min:0.01',
            'currency' => 'nullable|string',
            'description' => 'required|string',
            'metadata' => 'nullable|array',
        ]);

        $aiEvaluation = $this->aiService->evaluateTransaction($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Inbound revenue transaction ingested successfully into Maker-Checker approval pipeline.',
            'transaction_code' => 'TXN-REV-' . strtoupper(uniqid()),
            'workflow_status' => $aiEvaluation['status'],
            'ai_evaluation' => $aiEvaluation,
        ], 202);
    }

    /**
     * Outbound Disbursement Request API endpoint (HR, Fleet, Supply Chain, Facilities)
     * POST /api/v1/integration/request-disbursement
     */
    public function requestDisbursement(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'external_module' => 'required|string',
            'external_reference_id' => 'required|string',
            'category_type' => 'required|string',
            'amount' => 'required|numeric|min:0.01',
            'currency' => 'nullable|string',
            'payee_info' => 'required|array',
            'description' => 'required|string',
            'metadata' => 'nullable|array',
        ]);

        $aiEvaluation = $this->aiService->evaluateTransaction($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Outbound disbursement request received and evaluated by AI Maker.',
            'transaction_code' => 'TXN-DISB-' . strtoupper(uniqid()),
            'workflow_status' => $aiEvaluation['status'],
            'ai_evaluation' => $aiEvaluation,
        ], 202);
    }
}
