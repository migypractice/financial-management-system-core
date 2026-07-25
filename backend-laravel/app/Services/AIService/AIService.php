<?php

namespace App\Services\AIService;

use Illuminate\Support\Facades\Log;

/**
 * Transaction Core AI Service
 * Responsible for automated transaction categorization, anomaly detection,
 * confidence scoring, and Maker-Checker status determination.
 */
class AIService
{
    /**
     * Confidence threshold for auto-approval candidate.
     * Below this score, transaction is automatically assigned 'ai_flagged_anomaly'.
     */
    protected float $confidenceThreshold = 0.85;

    /**
     * Known high-risk rules / keywords for instant anomaly flagging.
     */
    protected array $anomalyKeywords = [
        'OFFSHORE', 'UNKNOWN_VEND', 'CASH_WITHDRAWAL', 'UNVERIFIED_ACCOUNT',
        'DUPLICATE_CLAIM', 'SUSPICIOUS', 'EXCEEDS_BUDGET_LIMIT'
    ];

    /**
     * Process an incoming raw transaction payload from an external microservice.
     *
     * @param array $payload Inbound/Outbound payload
     * @return array AI recommendation result containing suggested GL account, confidence score, status, and anomaly flags
     */
    public function evaluateTransaction(array $payload): array
    {
        $description = strtoupper($payload['description'] ?? '');
        $amount = (float) ($payload['amount'] ?? 0);
        $module = $payload['external_module'] ?? 'UNKNOWN';
        $category = $payload['category_type'] ?? 'GENERAL';

        Log::info("AI Service Evaluating Transaction payload from [{$module}]", [
            'amount' => $amount,
            'category' => $category,
        ]);

        // 1. Check for hardcoded / keyword risk flags
        $anomalyReason = null;
        $isAnomaly = false;

        foreach ($this->anomalyKeywords as $keyword) {
            if (str_contains($description, $keyword)) {
                $isAnomaly = true;
                $anomalyReason = "Risk Keyword Detected in Description: '{$keyword}'";
                break;
            }
        }

        // 2. High amount anomaly threshold check (e.g., transactions exceeding PHP 500,000)
        if (!$isAnomaly && $amount > 500000.00) {
            $isAnomaly = true;
            $anomalyReason = "High-Value Transaction Threshold Exceeded (PHP " . number_format($amount, 2) . "). Requires mandatory Human Checker review.";
        }

        // 3. AI GL Account Categorization Mapping logic
        $categorization = $this->predictGLCategory($category, $description, $module);
        $confidenceScore = $categorization['confidence'];
        $suggestedGlCode = $categorization['gl_code'];
        $suggestedGlName = $categorization['gl_name'];

        // 4. Assign Maker-Checker Status
        // Maker (AI) sets status to 'ai_flagged_anomaly' or 'pending_approval'
        $status = ($isAnomaly || $confidenceScore < $this->confidenceThreshold) 
            ? 'ai_flagged_anomaly' 
            : 'pending_approval';

        if (!$isAnomaly && $status === 'ai_flagged_anomaly') {
            $anomalyReason = "AI Confidence Score (" . round($confidenceScore * 100, 1) . "%) below threshold (" . ($this->confidenceThreshold * 100) . "%).";
        }

        return [
            'status' => $status,
            'ai_confidence_score' => round($confidenceScore, 4),
            'ai_suggested_gl_code' => $suggestedGlCode,
            'ai_suggested_gl_name' => $suggestedGlName,
            'ai_anomaly_flag' => $isAnomaly,
            'ai_anomaly_reason' => $anomalyReason,
            'evaluated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * AI Natural Language & Categorization Predictor model stub.
     */
    protected function predictGLCategory(string $categoryType, string $description, string $module): array
    {
        return match ($categoryType) {
            'SALES_REVENUE' => [
                'gl_code' => '4000-REV',
                'gl_name' => 'E-Commerce Sales Revenue',
                'confidence' => 0.9850,
            ],
            'PAYROLL_SALARY' => [
                'gl_code' => '5100-EXP',
                'gl_name' => 'Salaries & Compensation Expense',
                'confidence' => 0.9620,
            ],
            'SUPPLIER_INVOICE' => [
                'gl_code' => '2100-AP',
                'gl_name' => 'Accounts Payable - Trade Suppliers',
                'confidence' => 0.9410,
            ],
            'FLEET_FUEL' => [
                'gl_code' => '5300-EXP',
                'gl_name' => 'Transportation & Logistics Operating Expense',
                'confidence' => 0.9100,
            ],
            'FACILITY_RENT' => [
                'gl_code' => '5400-EXP',
                'gl_name' => 'Occupancy & Facility Lease Expense',
                'confidence' => 0.9550,
            ],
            default => [
                'gl_code' => '5999-EXP',
                'gl_name' => 'Unallocated Operational Expense',
                'confidence' => 0.7200,
            ],
        };
    }
}
