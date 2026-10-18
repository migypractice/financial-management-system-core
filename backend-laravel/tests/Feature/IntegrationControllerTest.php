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

    public function test_api_key_accepted_via_query_parameter_and_bearer_token(): void
    {
        // 1. Query parameter fallback (?api_key=...)
        $queryRes = $this->getJson('/api/v1/integration/financial-summary?api_key=test-integration-api-key');
        $queryRes->assertStatus(200)
            ->assertJsonPath('success', true);

        // 2. Authorization: Bearer <key>
        $bearerRes = $this->getJson('/api/v1/integration/financial-summary', [
            'Authorization' => 'Bearer test-integration-api-key',
        ]);
        $bearerRes->assertStatus(200)
            ->assertJsonPath('success', true);
    }

    public function test_esfa_seller_subscription_inbound_revenue_with_flexible_aliases(): void
    {
        $payload = [
            'order_id'            => 'SUB-ESFA-2026-001',
            'seller_name'         => 'TopSteel Hardware Merchant',
            'category_type'       => 'SELLER_SUBSCRIPTION',
            'amount'              => 5000,
            'subscription_amount' => 5000,
            'gateway_fee'         => 150,
            'status'              => 'PAID',
            'notes'               => 'Annual Merchant Gold Tier Subscription',
        ];

        $response = $this->postJson('/api/v1/integration/inbound-revenue', $payload, [
            'X-API-KEY' => 'test-integration-api-key',
        ]);

        $response->assertStatus(202)
            ->assertJsonPath('core_records.category_type', 'SELLER_SUBSCRIPTION');

        $invoiceId = $response->json('core_records.ar_invoice_id');
        $collectionId = $response->json('core_records.collection_id');
        $netDeposit = $response->json('core_records.net_bank_deposit');

        $this->assertNotNull($invoiceId);
        $this->assertNotNull($collectionId);
        $this->assertEquals(4850, $netDeposit); // 5000 - 150 fee

        $this->assertDatabaseHas('ar_invoices', [
            'id'            => $invoiceId,
            'category_type' => 'SELLER_SUBSCRIPTION',
            'status'        => 'PAID',
        ]);

        $this->assertDatabaseHas('collections', [
            'id'     => $collectionId,
            'amount' => 5000,
        ]);
    }

    public function test_esfa_seller_settlement_and_customer_refund_disbursements(): void
    {
        // 1. ESFA Seller Settlement Payout
        $settleRes = $this->postJson('/api/v1/integration/request-disbursement', [
            'settlement_id' => 'SETTLE-ESFA-888',
            'seller_name'   => 'PowerTools MegaMerchant',
            'category_type' => 'SELLER_SETTLEMENT',
            'amount'        => 45000,
            'notes'         => 'Bi-weekly marketplace net payout',
        ], ['X-API-KEY' => 'test-integration-api-key']);

        $settleRes->assertStatus(202);
        $billId = $settleRes->json('core_records.ap_bill_id');
        $prId = $settleRes->json('core_records.payment_request_id');

        $this->assertDatabaseHas('ap_bills', [
            'id'            => $billId,
            'category_type' => 'SELLER_SETTLEMENT',
            'status'        => 'UNPAID',
        ]);

        $this->assertDatabaseHas('payment_requests', [
            'id'     => $prId,
            'status' => 'PENDING_APPROVAL',
        ]);

        // 2. Customer Refund (Returns & Claims)
        $refundRes = $this->postJson('/api/v1/integration/request-disbursement', [
            'refund_id'     => 'REFUND-ORD-5544',
            'customer_name' => 'Maria Santos',
            'category_type' => 'CUSTOMER_REFUND',
            'amount'        => 2400,
            'notes'         => 'Damaged drill bit return and refund',
        ], ['X-API-KEY' => 'test-integration-api-key']);

        $refundRes->assertStatus(202);
        $refundBillId = $refundRes->json('core_records.ap_bill_id');

        $this->assertDatabaseHas('ap_bills', [
            'id'            => $refundBillId,
            'category_type' => 'CUSTOMER_REFUND',
        ]);
    }

    public function test_esfa_analytics_summary_and_tax_summary_endpoints(): void
    {
        // Ingest revenue first to have non-zero metrics
        $this->postJson('/api/v1/integration/inbound-revenue', [
            'order_id'            => 'ORD-ANALYTICS-01',
            'customer_name'       => 'Metro Construction Corp',
            'category_type'       => 'PLATFORM_COMMISSION',
            'amount'              => 12000,
            'commission_amount'   => 12000,
            'gateway_fee'         => 200,
            'status'              => 'PAID',
        ], ['X-API-KEY' => 'test-integration-api-key']);

        // 1. Financial Summary for Group 3 ESFA Dashboard
        $summaryRes = $this->getJson('/api/v1/integration/financial-summary', [
            'X-API-KEY' => 'test-integration-api-key',
        ]);

        $summaryRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'success',
                'as_of',
                'gross_sales',
                'net_revenue',
                'commission_income',
                'subscription_income',
                'total_refunds',
                'gateway_fees',
                'total_collections',
                'total_disbursements',
                'liquid_cash_balance',
            ]);

        $this->assertGreaterThan(0, $summaryRes->json('gross_sales'));
        $this->assertGreaterThan(0, $summaryRes->json('commission_income'));

        // 2. Tax Summary for Group 3 ESFA Tax Sync
        $taxRes = $this->getJson('/api/v1/integration/tax-summary', [
            'X-API-KEY' => 'test-integration-api-key',
        ]);

        $taxRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'success',
                'output_vat_12',
                'input_vat_12',
                'net_vat_payable',
                'withholding_tax_ewt',
                'commission_tax_base',
                'subscription_tax_base',
                'recent_taxable_records',
            ]);

        $this->assertGreaterThan(0, $taxRes->json('output_vat_12'));
    }

    public function test_group4_facilities_archiving_feed(): void
    {
        $response = $this->getJson('/api/v1/integration/archiving-records', [
            'X-API-KEY' => 'test-integration-api-key',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'success',
                'as_of',
                'retention_policy',
                'counts' => [
                    'official_receipts',
                    'supplier_bills',
                    'sales_invoices',
                    'audit_logs',
                ],
                'official_receipts',
                'supplier_seller_bills',
                'sales_subscription_invoices',
                'audit_logs',
            ]);
    }

    public function test_hrms_batch_payroll_disbursement_with_centavos_and_bearer_token(): void
    {
        $payload = [
            'records' => [
                [
                    'employee_name'    => 'Juan Dela Cruz',
                    'employee_code'    => 'EMP-001',
                    'payroll_run_id'   => 'PR-2026-10A',
                    'period'           => '2026-10-15',
                    'net_pay_centavos' => 2500000, // 25,000.00 PHP
                    'department'       => 'Engineering',
                ],
                [
                    'employee_name'    => 'Maria Santos',
                    'employee_code'    => 'EMP-002',
                    'payroll_run_id'   => 'PR-2026-10A',
                    'period'           => '2026-10-15',
                    'net_pay_centavos' => 3500000, // 35,000.00 PHP
                    'department'       => 'Marketing',
                ],
            ],
        ];

        $response = $this->postJson('/api/integrations/hr4/payroll', $payload, [
            'Authorization' => 'Bearer test-integration-api-key',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'accepted')
            ->assertJsonPath('accepted', 2)
            ->assertJsonCount(0, 'rejected');

        $this->assertDatabaseHas('ap_bills', [
            'category_type' => 'PAYROLL_SALARY',
            'total_amount'  => 25000,
        ]);

        $this->assertDatabaseHas('ap_bills', [
            'category_type' => 'PAYROLL_SALARY',
            'total_amount'  => 35000,
        ]);
    }

    public function test_hrms_batch_partial_rejection_reports_row_index_and_reason(): void
    {
        $payload = [
            'records' => [
                [
                    'employee_name'    => 'Valid Employee',
                    'employee_code'    => 'EMP-101',
                    'payroll_run_id'   => 'PR-2026-10B',
                    'net_pay_centavos' => 1500000,
                ],
                [
                    'employee_name'    => '', // invalid payee name
                    'employee_code'    => 'EMP-102',
                    'payroll_run_id'   => 'PR-2026-10B',
                    'amount'           => -500, // invalid negative amount
                ],
            ],
        ];

        $response = $this->postJson('/api/integrations/hr4/payroll', $payload, [
            'X-API-KEY' => 'test-integration-api-key',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('accepted', 1)
            ->assertJsonCount(1, 'rejected')
            ->assertJsonPath('rejected.0.row', 1);
    }

    public function test_hrms_batch_idempotent_deduplication(): void
    {
        $payload = [
            'records' => [
                [
                    'employee_name'    => 'Pedro Penduko',
                    'employee_code'    => 'EMP-303',
                    'payroll_run_id'   => 'PR-IDEM-01',
                    'period'           => '2026-10-15',
                    'net_pay_centavos' => 4000000,
                ],
            ],
        ];

        $headers = ['X-API-KEY' => 'test-integration-api-key'];

        $first = $this->postJson('/api/integrations/hr4/payroll', $payload, $headers);
        $first->assertStatus(200)->assertJsonPath('accepted', 1);

        $second = $this->postJson('/api/integrations/hr4/payroll', $payload, $headers);
        $second->assertStatus(200)->assertJsonPath('accepted', 1);

        // Only one transaction created, not duplicated
        $this->assertDatabaseCount('transactions', 1);
    }

    public function test_wildcard_integrations_adapter_revenue_and_disbursements(): void
    {
        $headers = ['X-API-KEY' => 'test-integration-api-key'];

        // 1. Wildcard revenue: POST /api/integrations/esfa/sales
        $revRes = $this->postJson('/api/integrations/esfa/sales', [
            'reference_id'  => 'ESFA-SALE-991',
            'customer_name' => 'Acme Corporation',
            'total_amount'  => 8500,
            'notes'         => 'Wholesale power tool order',
        ], $headers);

        $revRes->assertStatus(202)
            ->assertJsonPath('status', 'accepted');
        $this->assertContains($revRes->json('workflow_status'), ['pending_approval', 'ai_flagged']);

        // 2. Wildcard disbursement: POST /api/integrations/hr3/claims
        $claimRes = $this->postJson('/api/integrations/hr3/claims', [
            'reference_id'  => 'HR3-CLAIM-101',
            'employee_name' => 'Dr. Anna Gomez',
            'amount'        => 4500,
            'purpose'       => 'Technical training certification sponsorship',
            'claim_type'    => 'TRAINING_SPONSORSHIP',
        ], $headers);

        $claimRes->assertStatus(202);
    }

    public function test_batch_exceeding_max_limit_is_rejected(): void
    {
        $records = [];
        for ($i = 0; $i < 501; $i++) {
            $records[] = [
                'employee_name' => "Emp {$i}",
                'amount'        => 100,
            ];
        }

        $response = $this->postJson('/api/integrations/hr4/payroll', ['records' => $records], [
            'X-API-KEY' => 'test-integration-api-key',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('accepted', 0);
    }

    public function test_read_only_aliases_on_integrations_prefix(): void
    {
        $headers = ['X-API-KEY' => 'test-integration-api-key'];

        $this->getJson('/api/integrations/financial-summary', $headers)
            ->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->getJson('/api/integrations/tax-summary', $headers)
            ->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->getJson('/api/integrations/budget-status', $headers)
            ->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->getJson('/api/integrations/archiving-records', $headers)
            ->assertStatus(200)
            ->assertJsonPath('success', true);
    }
}
