<?php

namespace Tests\Feature;

use App\Services\AIService\AIService;
use Tests\TestCase;

class AIServiceTest extends TestCase
{
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'external_module' => 'ECOMMERCE_CORE',
            'category_type'   => 'SALES_REVENUE',
            'amount'          => 10000,
            'description'     => 'Routine online order settlement',
        ], $overrides);
    }

    public function test_clean_transaction_is_pending_approval_with_mapped_gl_account(): void
    {
        $ai = new AIService();
        $result = $ai->evaluateTransaction($this->payload());

        $this->assertSame('pending_approval', $result['status']);
        $this->assertFalse($result['ai_anomaly_flag']);
        $this->assertSame('4000-REV', $result['ai_suggested_gl_code']);
        $this->assertEqualsWithDelta(0.985, $result['ai_confidence_score'], 0.0001);
    }

    public function test_risk_keyword_in_description_flags_the_transaction(): void
    {
        $ai = new AIService();
        $result = $ai->evaluateTransaction($this->payload([
            'description' => 'SUSPICIOUS unverified reimbursement claim',
        ]));

        $this->assertSame('ai_flagged', $result['status']);
        $this->assertTrue($result['ai_anomaly_flag']);
        $this->assertStringContainsString('SUSPICIOUS', $result['ai_anomaly_reason']);
    }

    public function test_amount_over_high_value_threshold_is_flagged(): void
    {
        $ai = new AIService(0.85, 500000.00);
        $result = $ai->evaluateTransaction($this->payload([
            'amount' => 750000,
        ]));

        $this->assertSame('ai_flagged', $result['status']);
        $this->assertTrue($result['ai_anomaly_flag']);
        $this->assertStringContainsString('High-value transaction', $result['ai_anomaly_reason']);
    }

    public function test_unrecognized_category_falls_back_and_forces_manual_review(): void
    {
        $ai = new AIService();
        $result = $ai->evaluateTransaction($this->payload([
            'category_type' => 'SOME_UNKNOWN_CATEGORY',
        ]));

        $this->assertSame('ai_flagged', $result['status']);
        $this->assertTrue($result['ai_anomaly_flag']);
        $this->assertSame('5999-EXP', $result['ai_suggested_gl_code']);
    }

    public function test_amount_at_exactly_the_threshold_is_not_flagged_for_value(): void
    {
        $ai = new AIService(0.85, 500000.00);
        $result = $ai->evaluateTransaction($this->payload([
            'amount' => 500000.00,
        ]));

        // Strictly greater-than threshold triggers the flag; exactly-at should not.
        $this->assertStringNotContainsString('High-value transaction', $result['ai_anomaly_reason'] ?? '');
    }
}
