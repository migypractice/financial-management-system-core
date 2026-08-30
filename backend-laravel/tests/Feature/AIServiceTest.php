<?php

namespace Tests\Feature;

use App\Services\AIService\AIService;
use PHPUnit\Framework\Attributes\DataProvider;
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

    /**
     * Regression coverage for the audit finding that risk keywords written as
     * enum-style tokens (DUPLICATE_INVOICE) never matched realistic
     * free-text descriptions. detectKeywordAnomaly() now matches on
     * co-occurring term groups (all_of/any_of) instead of one exact phrase.
     */
    #[DataProvider('naturalLanguageRiskDescriptions')]
    public function test_natural_language_descriptions_trigger_the_intended_risk_rule(string $description, string $expectedRuleCode): void
    {
        $ai = new AIService();
        $result = $ai->evaluateTransaction($this->payload(['description' => $description]));

        $this->assertTrue($result['ai_anomaly_flag'], "Expected description to be flagged: {$description}");
        $this->assertSame('ai_flagged', $result['status']);
        $this->assertStringContainsString($expectedRuleCode, $result['ai_anomaly_reason']);
    }

    public static function naturalLanguageRiskDescriptions(): array
    {
        return [
            'duplicate invoice, natural phrasing' => [
                'This appears to be a duplicate invoice from the vendor.',
                'DUPLICATE_INVOICE',
            ],
            'possible duplicate invoice' => [
                'Possible duplicate invoice flagged by accounts payable.',
                'DUPLICATE_INVOICE',
            ],
            'inventory variance' => [
                'Inventory variance detected during the monthly stock count.',
                'INVENTORY_VARIANCE',
            ],
            'unauthorized discount' => [
                'Unauthorized discount applied at checkout without manager approval.',
                'UNAUTHORIZED_DISCOUNT',
            ],
        ];
    }

    public function test_mentioning_invoice_alone_does_not_trigger_the_duplicate_invoice_rule(): void
    {
        // "invoice" without "duplicate" must not false-positive under the
        // all_of(DUPLICAT, INVOIC) rule.
        $ai = new AIService();
        $result = $ai->evaluateTransaction($this->payload([
            'description' => 'Payment for invoice INV-2026-441 from National Hardware Supply',
        ]));

        $this->assertFalse($result['ai_anomaly_flag']);
        $this->assertSame('pending_approval', $result['status']);
    }
}
