<?php

namespace App\Services\AIService;

use Illuminate\Support\Facades\Log;

/**
 * Transaction Core AI Service.
 *
 * Evaluates inbound/outbound transaction payloads and produces:
 *   - A suggested GL account code and name
 *   - A confidence score (0.0 – 1.0)
 *   - An anomaly flag with a human-readable reason
 *   - A Maker-Checker status recommendation (pending_approval or ai_flagged)
 */
class AIService
{
    /** Below this score, the AI automatically flags the transaction for human review. */
    protected float $confidenceThreshold;

    /** Transactions exceeding this PHP amount trigger mandatory human review. */
    protected float $highValueThreshold;

    /** Keywords in the description that trigger an instant anomaly flag. */
    protected array $anomalyKeywords = [
        'OFFSHORE',
        'UNKNOWN_VEND',
        'CASH_WITHDRAWAL',
        'UNVERIFIED_ACCOUNT',
        'DUPLICATE_CLAIM',
        'SUSPICIOUS',
        'EXCEEDS_BUDGET_LIMIT',
    ];

    public function __construct(
        float $confidenceThreshold = 0.85,
        float $highValueThreshold = 500_000.00
    ) {
        $this->confidenceThreshold = $confidenceThreshold;
        $this->highValueThreshold  = $highValueThreshold;
    }

    /**
     * Evaluate a raw transaction payload from an external microservice.
     *
     * @param array $payload Must contain 'description', 'amount', 'external_module', 'category_type'
     * @return array AI recommendation result
     */
    public function evaluateTransaction(array $payload): array
    {
        $description = strtoupper($payload['description'] ?? '');
        $amount      = (float) ($payload['amount'] ?? 0);
        $module      = $payload['external_module'] ?? 'UNKNOWN';
        $category    = $payload['category_type'] ?? 'GENERAL';

        Log::info("AI evaluation started", [
            'module'   => $module,
            'category' => $category,
            'amount'   => $amount,
        ]);

        // 1. Keyword-based risk detection
        $anomaly = $this->detectKeywordAnomaly($description);

        // 2. High-value threshold check
        if (!$anomaly['detected'] && $amount > $this->highValueThreshold) {
            $anomaly = [
                'detected' => true,
                'reason'   => sprintf(
                    'High-value transaction (PHP %s) exceeds threshold of PHP %s. Requires mandatory human review.',
                    number_format($amount, 2),
                    number_format($this->highValueThreshold, 2)
                ),
            ];
        }

        // 3. GL account categorization
        $categorization  = $this->predictGLCategory($category, $description, $module);
        $confidenceScore = $categorization['confidence'];

        // 4. Determine Maker-Checker status
        $status = 'pending_approval';
        if ($anomaly['detected'] || $confidenceScore < $this->confidenceThreshold) {
            $status = 'ai_flagged';

            if (!$anomaly['detected']) {
                $anomaly['detected'] = false;
                $anomaly['reason'] = sprintf(
                    'AI confidence (%.1f%%) is below the required threshold (%.0f%%).',
                    $confidenceScore * 100,
                    $this->confidenceThreshold * 100
                );
            }
        }

        return [
            'status'               => $status,
            'ai_confidence_score'  => round($confidenceScore, 4),
            'ai_suggested_gl_code' => $categorization['gl_code'],
            'ai_suggested_gl_name' => $categorization['gl_name'],
            'ai_anomaly_flag'      => $anomaly['detected'],
            'ai_anomaly_reason'    => $anomaly['reason'],
            'evaluated_at'         => now()->toIso8601String(),
        ];
    }

    /**
     * Scan the description for known risk keywords.
     */
    private function detectKeywordAnomaly(string $description): array
    {
        foreach ($this->anomalyKeywords as $keyword) {
            if (str_contains($description, $keyword)) {
                return [
                    'detected' => true,
                    'reason'   => "Risk keyword detected in description: '{$keyword}'.",
                ];
            }
        }

        return ['detected' => false, 'reason' => null];
    }

    /**
     * Rule-based GL category prediction.
     *
     * In production this would call an ML model endpoint.
     * The stub returns deterministic mappings with realistic confidence scores.
     */
    protected function predictGLCategory(string $categoryType, string $description, string $module): array
    {
        return match ($categoryType) {
            'SALES_REVENUE' => [
                'gl_code'    => '4000-REV',
                'gl_name'    => 'E-Commerce Sales Revenue',
                'confidence' => 0.9850,
            ],
            'CUSTOMER_REFUND' => [
                'gl_code'    => '4100-REF',
                'gl_name'    => 'Customer Refunds and Returns',
                'confidence' => 0.9300,
            ],
            'PAYROLL_SALARY' => [
                'gl_code'    => '5100-EXP',
                'gl_name'    => 'Salaries and Compensation Expense',
                'confidence' => 0.9620,
            ],
            'EMPLOYEE_CLAIM' => [
                'gl_code'    => '5120-EXP',
                'gl_name'    => 'Employee Reimbursement Claims',
                'confidence' => 0.9100,
            ],
            'SUPPLIER_INVOICE' => [
                'gl_code'    => '2100-AP',
                'gl_name'    => 'Accounts Payable — Trade Suppliers',
                'confidence' => 0.9410,
            ],
            'FLEET_FUEL' => [
                'gl_code'    => '5300-EXP',
                'gl_name'    => 'Transportation and Logistics Expense',
                'confidence' => 0.9100,
            ],
            'FLEET_MAINTENANCE' => [
                'gl_code'    => '5310-EXP',
                'gl_name'    => 'Fleet Maintenance and Repairs',
                'confidence' => 0.8950,
            ],
            'FACILITY_RENT' => [
                'gl_code'    => '5400-EXP',
                'gl_name'    => 'Occupancy and Facility Lease Expense',
                'confidence' => 0.9550,
            ],
            'LEGAL_BILLING' => [
                'gl_code'    => '5500-EXP',
                'gl_name'    => 'Legal and Professional Services',
                'confidence' => 0.9200,
            ],
            default => [
                'gl_code'    => '5999-EXP',
                'gl_name'    => 'Unallocated Operational Expense',
                'confidence' => 0.7200,
            ],
        };
    }
}
