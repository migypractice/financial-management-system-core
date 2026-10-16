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
        // system_integration is the privilege-free role machine-attribution
        // accounts use — see 2026_08_20_100200_add_system_integration_role.php.
        $role = Role::where('slug', 'system_integration')->firstOrFail();
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

    public function test_duplicate_idempotency_key_with_same_payload_returns_the_original_transaction_without_reprocessing(): void
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

    public function test_duplicate_idempotency_key_with_a_different_amount_is_rejected_as_a_conflict(): void
    {
        $headers = ['X-API-KEY' => 'test-integration-api-key', 'Idempotency-Key' => 'idem-conflict-amount'];

        $first = $this->postJson('/api/v1/integration/inbound-revenue', $this->validRevenuePayload(), $headers);
        $first->assertStatus(202);

        $second = $this->postJson('/api/v1/integration/inbound-revenue', $this->validRevenuePayload(['amount' => 99999]), $headers);
        $second->assertStatus(409);

        $this->assertDatabaseCount('transactions', 1);
    }

    public function test_duplicate_idempotency_key_with_a_different_category_is_rejected_as_a_conflict(): void
    {
        $headers = ['X-API-KEY' => 'test-integration-api-key', 'Idempotency-Key' => 'idem-conflict-category'];

        $first = $this->postJson('/api/v1/integration/inbound-revenue', $this->validRevenuePayload(), $headers);
        $first->assertStatus(202);

        $second = $this->postJson(
            '/api/v1/integration/inbound-revenue',
            $this->validRevenuePayload(['category_type' => 'CUSTOMER_REFUND']),
            $headers
        );
        $second->assertStatus(409);

        $this->assertDatabaseCount('transactions', 1);
    }

    /**
     * True simultaneous requests can't be produced inside a single-process,
     * single-connection PHPUnit test — this documents that limitation rather
     * than silently skipping it (see the audit's finding on this same gap).
     * What IS verified: once a row has committed under a given idempotency
     * key, every subsequent request against that key — whether it lands a
     * moment later (this test) or races in via the QueryException/23505
     * catch branch in processAndPersist() (code-reviewed, not exercised here)
     * — is judged by the same payload-comparison logic, so both paths agree.
     */
    public function test_repeated_requests_against_an_already_committed_key_never_create_a_second_row(): void
    {
        $headers = ['X-API-KEY' => 'test-integration-api-key', 'Idempotency-Key' => 'idem-repeat-key'];
        $payload = $this->validRevenuePayload();

        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/v1/integration/inbound-revenue', $payload, $headers);
        }

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
            'payee_info'            => ['name' => 'Payroll Batch Account'],
        ], ['X-API-KEY' => 'test-integration-api-key']);

        $response->assertStatus(202)
            ->assertJsonPath('workflow_status', 'ai_flagged')
            ->assertJsonPath('ai_evaluation.anomaly_detected', true);
    }

    public function test_disbursement_without_payee_info_is_rejected_with_a_validation_error(): void
    {
        $response = $this->postJson('/api/v1/integration/request-disbursement', [
            'external_module'       => 'HRMS',
            'external_reference_id' => 'PAYROLL-TEST-002',
            'category_type'         => 'PAYROLL_SALARY',
            'amount'                => 50000,
            'description'           => 'Payroll batch missing payee info',
        ], ['X-API-KEY' => 'test-integration-api-key']);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['payee_info']);
    }

    public function test_disbursement_with_payee_info_missing_a_name_is_rejected(): void
    {
        $response = $this->postJson('/api/v1/integration/request-disbursement', [
            'external_module'       => 'HRMS',
            'external_reference_id' => 'PAYROLL-TEST-003',
            'category_type'         => 'PAYROLL_SALARY',
            'amount'                => 50000,
            'description'           => 'Payroll batch with incomplete payee info',
            'payee_info'            => ['account' => 'ACC-001'],
        ], ['X-API-KEY' => 'test-integration-api-key']);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['payee_info.name']);
    }

    public function test_budget_status_returns_live_balances_with_api_key(): void
    {
        $response = $this->getJson('/api/v1/integration/budget-status', [
            'X-API-KEY' => 'test-integration-api-key',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'success',
                'fiscal_year',
                'as_of',
                'summary' => [
                    'total_allocated',
                    'total_spent',
                    'total_remaining',
                    'overall_utilization_rate',
                ],
                'departments',
            ]);
    }

    public function test_voucher_status_returns_live_payment_request_status(): void
    {
        // 1. Submit disbursement request to create bill & voucher
        $postRes = $this->postJson('/api/v1/integration/request-disbursement', [
            'external_module'       => 'SUPPLY_CHAIN',
            'external_reference_id' => 'PO-STATUS-TEST-001',
            'category_type'         => 'INVENTORY_PURCHASE',
            'amount'                => 15000,
            'description'           => 'Steel bars procurement',
            'payee_info'            => ['name' => 'Holcim Philippines'],
        ], ['X-API-KEY' => 'test-integration-api-key']);

        $postRes->assertStatus(202);
        $voucherNumber = $postRes->json('core_records.voucher_number');
        $this->assertNotNull($voucherNumber);

        // 2. Query live status via GET /voucher-status/{reference}
        $statusRes = $this->getJson("/api/v1/integration/voucher-status/{$voucherNumber}", [
            'X-API-KEY' => 'test-integration-api-key',
        ]);

        $statusRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('record_type', 'PAYMENT_REQUEST')
            ->assertJsonPath('status', 'PENDING_APPROVAL')
            ->assertJsonPath('request_number', $voucherNumber);
    }

    public function test_voucher_status_returns_live_invoice_status(): void
    {
        // 1. Submit revenue to create AR invoice
        $postRes = $this->postJson('/api/v1/integration/inbound-revenue', [
            'external_module'       => 'ECOMMERCE_CORE',
            'external_reference_id' => 'ORD-INV-TEST-002',
            'category_type'         => 'SALES_REVENUE',
            'amount'                => 8500,
            'description'           => 'Power tools order',
            'metadata'              => ['payment_status' => 'PAID'],
        ], ['X-API-KEY' => 'test-integration-api-key']);

        $postRes->assertStatus(202);
        $invoiceNumber = $postRes->json('core_records.invoice_number');
        $this->assertNotNull($invoiceNumber);

        // 2. Query live status via GET /voucher-status/{reference}
        $statusRes = $this->getJson("/api/v1/integration/voucher-status/{$invoiceNumber}", [
            'X-API-KEY' => 'test-integration-api-key',
        ]);

        $statusRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('record_type', 'AR_INVOICE')
            ->assertJsonPath('status', 'PAID')
            ->assertJsonPath('invoice_number', $invoiceNumber);
    }

    public function test_voucher_status_returns_404_when_reference_not_found(): void
    {
        $response = $this->getJson('/api/v1/integration/voucher-status/NON-EXISTENT-VOUCHER', [
            'X-API-KEY' => 'test-integration-api-key',
        ]);

        $response->assertStatus(404)
            ->assertJsonPath('success', false);
    }
}
