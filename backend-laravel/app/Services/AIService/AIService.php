<?php

namespace App\Services\AIService;

use Illuminate\Support\Facades\Log;

/**
 * Transaction Core AI Service — Rule-Based Expert System.
 *
 * Evaluates inbound/outbound transaction payloads and produces:
 *   - A suggested GL account code and name
 *   - A confidence score (0.0 – 1.0)
 *   - An anomaly flag with a human-readable reason
 *   - A Maker-Checker status recommendation (pending_approval or ai_flagged)
 *
 * Classification: Expert System / Decision Support System.
 * This service does NOT use Machine Learning or LLM integration.
 * It applies deterministic rule-based logic for transaction evaluation.
 */
class AIService
{
    /** Below this score, the AI automatically flags the transaction for human review. */
    protected float $confidenceThreshold;

    /** Transactions exceeding this PHP amount trigger mandatory human review. */
    protected float $highValueThreshold;

    /** Keywords in the description that trigger an instant anomaly flag. */
    protected array $anomalyKeywords;

    /** GL account mappings loaded from configuration. */
    protected array $glMappings;

    /** Fallback GL account for unrecognized categories. */
    protected array $glFallback;

    public function __construct(
        ?float $confidenceThreshold = null,
        ?float $highValueThreshold = null
    ) {
        $this->confidenceThreshold = $confidenceThreshold ?? config('ai.confidence_threshold', 0.85);
        $this->highValueThreshold  = $highValueThreshold  ?? config('ai.high_value_threshold', 500_000.00);
        $this->anomalyKeywords     = config('ai.risk_keywords', []);
        $this->glMappings          = config('ai.gl_mappings', []);
        $this->glFallback          = config('ai.gl_fallback', [
            'gl_code'                => '5999-EXP',
            'gl_name'                => 'Unallocated Operational Expense',
            'confidence'             => 0.40,
            'requires_manual_review' => true,
        ]);
    }

    /**
     * Evaluate a raw transaction payload from an external microservice.
     *
     * @param array $payload Must contain 'description', 'amount', 'external_module', 'category_type'
     * @return array AI recommendation result
     */
    public function evaluateTransaction(array $payload): array
    {
        $description = strtoupper(trim($payload['description'] ?? ''));
        $amount      = (float) ($payload['amount'] ?? 0);
        $module      = $payload['external_module'] ?? 'UNKNOWN';
        $category    = $payload['category_type'] ?? 'GENERAL';

        Log::info('AI evaluation started', [
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

        // If the mapping explicitly requires manual review (e.g. unknown category fallback)
        if (!empty($categorization['requires_manual_review'])) {
            if (!$anomaly['detected']) {
                $anomaly = [
                    'detected' => true,
                    'reason'   => "Transaction category '{$category}' is unrecognized. Forced manual review required.",
                ];
            }
        }

        // 4. Determine Maker-Checker status
        $status = 'pending_approval';
        if ($anomaly['detected'] || $confidenceScore < $this->confidenceThreshold) {
            $status = 'ai_flagged';

            if (!$anomaly['detected']) {
                $anomaly['detected'] = true;
                $anomaly['reason'] = sprintf(
                    'AI confidence (%.1f%%) is below the required threshold (%.0f%%).',
                    $confidenceScore * 100,
                    $this->confidenceThreshold * 100
                );
            }
        }

        Log::info('AI evaluation complete', [
            'module'     => $module,
            'category'   => $category,
            'status'     => $status,
            'confidence' => $confidenceScore,
            'anomaly'    => $anomaly['detected'],
        ]);

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
     *
     * Keywords are loaded from config/ai.php and matched
     * case-insensitively against the uppercased description.
     */
    private function detectKeywordAnomaly(string $description): array
    {
        foreach ($this->anomalyKeywords as $keyword => $severity) {
            $normalizedKeyword = strtoupper(trim($keyword));

            if (str_contains($description, $normalizedKeyword)) {
                Log::warning('Risk keyword detected', [
                    'keyword'     => $keyword,
                    'severity'    => $severity,
                    'description' => substr($description, 0, 200),
                ]);

                return [
                    'detected' => true,
                    'reason'   => "[{$severity}] Risk keyword detected in description: '{$keyword}'.",
                ];
            }
        }

        return ['detected' => false, 'reason' => null];
    }

    /**
     * Config-driven GL category prediction.
     *
     * Mappings are loaded from config/ai.php → gl_mappings.
     * If no mapping matches, the fallback account is used with
     * confidence 0.0 to force mandatory human review.
     */
    protected function predictGLCategory(string $categoryType, string $description, string $module): array
    {
        if (isset($this->glMappings[$categoryType])) {
            return $this->glMappings[$categoryType];
        }

        Log::notice('No GL mapping found for category, using fallback', [
            'category' => $categoryType,
            'module'   => $module,
        ]);

        return $this->glFallback;
    }
}
