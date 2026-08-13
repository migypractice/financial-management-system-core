<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IntegrationControllerTest extends TestCase
{
    use RefreshDatabase;

    private function validRevenuePayload(array $overrides = []): array
    {
        return array_merge([
            'external_module'       => 'ECOMMERCE_CORE',
            'external_reference_id' => 'ORD-TEST-001',
            'category_type'         => 'SALES_REVENUE',
            'amount'                => 5000,
            'description'           => 'Test online order settlement',
        ], $overrides);
    }

    public function test_request_without_api_key_is_rejected(): void
    {
        $response = $this->postJson('/api/v1/integration/inbound-revenue', $this->validRevenuePayload());

        $response->assertStatus(401);
    }

    public function test_request_with_wrong_api_key_is_rejected(): void
    {
        $response = $this->postJson('/api/v1/integration/inbound-revenue', $this->validRevenuePayload(), [
            'X-API-KEY' => 'wrong-key',
        ]);

        $response->assertStatus(401);
    }

    public function test_valid_request_creates_transaction_and_audit_log(): void
    {
        $response = $this->postJson('/api/v1/integration/inbound-revenue', $this->validRevenuePayload(), [
            'X-API-KEY' => 'test-integration-api-key',
        ]);

        $response->assertStatus(202)
            ->assertJsonPath('workflow_status', 'pending_approval');

        $transactionId = $response->json('transaction_id');

        $this->assertDatabaseHas('transactions', [
            'id'                    => $transactionId,
            'external_reference_id' => 'ORD-TEST-001',
            'type'                  => 'INCOME',
        ]);

        $this->assertDatabaseHas('ai_logs', [
            'transaction_id' => $transactionId,
        ]);
    }

    public function test_created_by_is_populated_from_the_system_user(): void
    {
        $role = Role::where('slug', 'super_admin')->firstOrFail();
        $systemUser = User::create([
            'name'     => 'System Integration',
            'email'    => 'system@hw.com',
            'password' => 'irrelevant',
            'role_id'  => $role->id,
        ]);

        $response = $this->postJson('/api/v1/integration/inbound-revenue', $this->validRevenuePayload(), [
            'X-API-KEY' => 'test-integration-api-key',
        ]);

        $this->assertDatabaseHas('transactions', [
            'id'         => $response->json('transaction_id'),
            'created_by' => $systemUser->id,
        ]);
    }

    public function test_duplicate_idempotency_key_returns_the_original_transaction_without_reprocessing(): void
    {
        $headers = ['X-API-KEY' => 'test-integration-api-key', 'Idempotency-Key' => 'idem-test-key-1'];
        $payload = $this->validRevenuePayload();

        $first = $this->postJson('/api/v1/integration/inbound-revenue', $payload, $headers);
        $first->assertStatus(202);

        $second = $this->postJson('/api/v1/integration/inbound-revenue', $payload, $headers);
        $second->assertStatus(200)
            ->assertJsonPath('transaction_id', $first->json('transaction_id'))
            ->assertJsonPath('message', 'Duplicate request detected. Returning existing transaction.');

        $this->assertDatabaseCount('transactions', 1);
    }

    public function test_missing_required_field_is_rejected_with_validation_error(): void
    {
        $payload = $this->validRevenuePayload();
        unset($payload['amount']);

        $response = $this->postJson('/api/v1/integration/inbound-revenue', $payload, [
            'X-API-KEY' => 'test-integration-api-key',
        ]);

        $response->assertStatus(422);
    }

    public function test_high_value_disbursement_is_flagged_for_review(): void
    {
        $response = $this->postJson('/api/v1/integration/request-disbursement', [
            'external_module'       => 'HRMS',
            'external_reference_id' => 'PAYROLL-TEST-001',
            'category_type'         => 'PAYROLL_SALARY',
            'amount'                => 750000,
            'description'           => 'Large payroll batch',
        ], ['X-API-KEY' => 'test-integration-api-key']);

        $response->assertStatus(202)
            ->assertJsonPath('workflow_status', 'ai_flagged')
            ->assertJsonPath('ai_evaluation.anomaly_detected', true);
    }
}
