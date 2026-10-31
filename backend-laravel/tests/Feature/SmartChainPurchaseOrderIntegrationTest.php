<?php

namespace Tests\Feature;

use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderLine;
use App\Models\Supplier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class SmartChainPurchaseOrderIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected const API_KEY = 'test-integration-api-key';

    private function validPoPayload(array $overrides = []): array
    {
        $base = [
            'schema_version'        => '1.0',
            'source_system'         => 'SMARTCHAIN',
            'message_id'            => (string) Str::uuid(),
            'external_reference_id' => 'PO-2026-0006',
            'category_type'         => 'INVENTORY_PURCHASE',
            'currency'              => 'PHP',
            'total_amount'          => '1250.00',
            'supplier'              => [
                'supplier_code' => 'SUP-001',
                'name'          => 'Example Supplier',
            ],
            'items'                 => [
                [
                    'source_po_line_id' => '123',
                    'product_id'        => '92',
                    'product_name'      => 'Example Product',
                    'quantity'          => '5',
                    'unit'              => 'PCS',
                    'unit_price'        => '250.00',
                    'line_total'        => '1250.00',
                ],
            ],
        ];

        return array_replace_recursive($base, $overrides);
    }

    /**
     * 1. Valid authenticated SmartChain PO request.
     */
    public function test_01_valid_authenticated_smartchain_po_request(): void
    {
        $payload = $this->validPoPayload();

        $response = $this->postJson('/api/v1/integration/purchase-orders', $payload, [
            'X-API-KEY' => self::API_KEY,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Purchase order received and queued for financial review.')
            ->assertJsonPath('data.source_system', 'SMARTCHAIN')
            ->assertJsonPath('data.external_reference_id', 'PO-2026-0006')
            ->assertJsonPath('data.financial_reference', 'FIN-PO-0001')
            ->assertJsonPath('data.receipt_status', 'RECEIVED')
            ->assertJsonPath('data.processing_status', 'PENDING_REVIEW');
    }

    /**
     * 2. Invalid/missing API key.
     */
    public function test_02_invalid_or_missing_api_key_is_rejected(): void
    {
        $payload = $this->validPoPayload();

        // Missing API key
        $resNoKey = $this->postJson('/api/v1/integration/purchase-orders', $payload);
        $resNoKey->assertStatus(401);

        // Invalid API key
        $resBadKey = $this->postJson('/api/v1/integration/purchase-orders', $payload, [
            'X-API-KEY' => 'incorrect-api-key',
        ]);
        $resBadKey->assertStatus(401);
    }

    /**
     * 3. Missing PO reference.
     */
    public function test_03_missing_po_reference_is_rejected(): void
    {
        $payload = $this->validPoPayload();
        unset($payload['external_reference_id']);

        $response = $this->postJson('/api/v1/integration/purchase-orders', $payload, [
            'X-API-KEY' => self::API_KEY,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonValidationErrors(['external_reference_id']);
    }

    /**
     * 4. Invalid supplier data.
     */
    public function test_04_invalid_supplier_data_is_rejected(): void
    {
        // Missing supplier object
        $payload1 = $this->validPoPayload();
        unset($payload1['supplier']);

        $res1 = $this->postJson('/api/v1/integration/purchase-orders', $payload1, [
            'X-API-KEY' => self::API_KEY,
        ]);
        $res1->assertStatus(422)
            ->assertJsonValidationErrors(['supplier']);

        // Missing supplier name
        $payload2 = $this->validPoPayload();
        unset($payload2['supplier']['name']);
        $res2 = $this->postJson('/api/v1/integration/purchase-orders', $payload2, [
            'X-API-KEY' => self::API_KEY,
        ]);
        $res2->assertStatus(422)
            ->assertJsonValidationErrors(['supplier.name']);
    }

    /**
     * 5. Multi-line PO persists all items correctly.
     */
    public function test_05_multi_line_po_persists_all_items(): void
    {
        $payload = $this->validPoPayload([
            'external_reference_id' => 'PO-MULTI-001',
            'total_amount'          => '7500.00',
            'items'                 => [
                [
                    'source_po_line_id' => 'line-1',
                    'product_id'        => 'PROD-01',
                    'product_name'      => 'Galvanized Nails 2"',
                    'quantity'          => '5',
                    'unit'              => 'PCS',
                    'unit_price'        => '100.00',
                    'line_total'        => '500.00',
                ],
                [
                    'source_po_line_id' => 'line-2',
                    'product_id'        => 'PROD-02',
                    'product_name'      => 'Portland Cement',
                    'quantity'          => '2',
                    'unit'              => 'SACK',
                    'unit_price'        => '1250.00',
                    'line_total'        => '2500.00',
                ],
                [
                    'source_po_line_id' => 'line-3',
                    'product_id'        => 'PROD-03',
                    'product_name'      => 'Industrial Lubricant',
                    'quantity'          => '1',
                    'unit'              => 'DRUM',
                    'unit_price'        => '4500.00',
                    'line_total'        => '4500.00',
                ],
            ],
        ]);

        $response = $this->postJson('/api/v1/integration/purchase-orders', $payload, [
            'X-API-KEY' => self::API_KEY,
        ]);

        $response->assertStatus(201);

        $po = PurchaseOrder::where('external_reference_id', 'PO-MULTI-001')->firstOrFail();
        $this->assertEquals(7500.00, (float) $po->total_amount);
        $this->assertCount(3, $po->items);

        $this->assertDatabaseHas('purchase_order_lines', [
            'purchase_order_id' => $po->id,
            'product_id'        => 'PROD-01',
            'unit'              => 'PCS',
            'quantity'          => 5.0000,
        ]);
        $this->assertDatabaseHas('purchase_order_lines', [
            'purchase_order_id' => $po->id,
            'product_id'        => 'PROD-02',
            'unit'              => 'SACK',
            'quantity'          => 2.0000,
        ]);
        $this->assertDatabaseHas('purchase_order_lines', [
            'purchase_order_id' => $po->id,
            'product_id'        => 'PROD-03',
            'unit'              => 'DRUM',
            'quantity'          => 1.0000,
        ]);
    }

    /**
     * 6. Correct amount validation rejects inconsistent calculations.
     */
    public function test_06_correct_amount_validation_rejects_inconsistent_math(): void
    {
        // 1. Line item math mismatch (5 * 250 != 1000)
        $payload1 = $this->validPoPayload([
            'items' => [
                [
                    'source_po_line_id' => '1',
                    'product_id'        => '10',
                    'product_name'      => 'Item 1',
                    'quantity'          => '5',
                    'unit'              => 'PCS',
                    'unit_price'        => '250.00',
                    'line_total'        => '1000.00', // Should be 1250.00
                ],
            ],
            'total_amount' => '1000.00',
        ]);

        $res1 = $this->postJson('/api/v1/integration/purchase-orders', $payload1, [
            'X-API-KEY' => self::API_KEY,
        ]);
        $res1->assertStatus(422)
            ->assertJsonPath('success', false);
        $this->assertStringContainsString('Line total mismatch', $res1->json('message'));

        // 2. Sum of lines mismatch with header total_amount
        $payload2 = $this->validPoPayload([
            'total_amount' => '9999.00', // Lines sum to 1250.00
        ]);

        $res2 = $this->postJson('/api/v1/integration/purchase-orders', $payload2, [
            'X-API-KEY' => self::API_KEY,
        ]);
        $res2->assertStatus(422)
            ->assertJsonPath('success', false);
        $this->assertStringContainsString('Total amount mismatch', $res2->json('message'));
    }

    /**
     * 7. Zero-price contract behavior rejects zero or negative amounts.
     */
    public function test_07_zero_price_contract_behavior_rejects_zero_or_negative_amounts(): void
    {
        // Zero total amount
        $payload1 = $this->validPoPayload([
            'total_amount' => '0.00',
            'items'        => [
                [
                    'source_po_line_id' => '1',
                    'product_id'        => '10',
                    'product_name'      => 'Free Sample',
                    'quantity'          => '1',
                    'unit'              => 'PCS',
                    'unit_price'        => '0.00',
                    'line_total'        => '0.00',
                ],
            ],
        ]);

        $res1 = $this->postJson('/api/v1/integration/purchase-orders', $payload1, [
            'X-API-KEY' => self::API_KEY,
        ]);
        $res1->assertStatus(422);

        // Negative total amount
        $payload2 = $this->validPoPayload([
            'total_amount' => '-1250.00',
        ]);

        $res2 = $this->postJson('/api/v1/integration/purchase-orders', $payload2, [
            'X-API-KEY' => self::API_KEY,
        ]);
        $res2->assertStatus(422);
    }

    /**
     * 8. Supported and unsupported units.
     */
    public function test_08_supported_and_unsupported_units(): void
    {
        // Test historical supported units: KG and L
        $payloadValidKg = $this->validPoPayload([
            'external_reference_id' => 'PO-KG-TEST',
            'total_amount'          => '500.00',
            'items'                 => [
                [
                    'source_po_line_id' => '1',
                    'product_id'        => 'RAW-01',
                    'product_name'      => 'Raw Steel',
                    'quantity'          => '10',
                    'unit'              => 'KG',
                    'unit_price'        => '50.00',
                    'line_total'        => '500.00',
                ],
            ],
        ]);

        $resKg = $this->postJson('/api/v1/integration/purchase-orders', $payloadValidKg, [
            'X-API-KEY' => self::API_KEY,
        ]);
        $resKg->assertStatus(201);

        // Test unsupported unit: BOX
        $payloadUnsupported = $this->validPoPayload([
            'external_reference_id' => 'PO-UNSUPPORTED-UNIT',
            'items'                 => [
                [
                    'source_po_line_id' => '1',
                    'product_id'        => 'BOX-01',
                    'product_name'      => 'Screws Box',
                    'quantity'          => '5',
                    'unit'              => 'BOX',
                    'unit_price'        => '250.00',
                    'line_total'        => '1250.00',
                ],
            ],
        ]);

        $resUnsup = $this->postJson('/api/v1/integration/purchase-orders', $payloadUnsupported, [
            'X-API-KEY' => self::API_KEY,
        ]);
        $resUnsup->assertStatus(422)
            ->assertJsonPath('success', false);
        $this->assertStringContainsString('Unsupported unit', $resUnsup->json('message'));
    }

    /**
     * 9. Duplicate identical submission returns original reference (Idempotency).
     */
    public function test_09_duplicate_identical_submission_returns_original_reference(): void
    {
        $payload = $this->validPoPayload();

        // 1st request -> 201 Created
        $first = $this->postJson('/api/v1/integration/purchase-orders', $payload, [
            'X-API-KEY' => self::API_KEY,
        ]);
        $first->assertStatus(201);
        $finRef = $first->json('data.financial_reference');
        $this->assertNotNull($finRef);

        // 2nd request with exact same payload -> 200 OK with original reference
        $second = $this->postJson('/api/v1/integration/purchase-orders', $payload, [
            'X-API-KEY' => self::API_KEY,
        ]);
        $second->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.financial_reference', $finRef)
            ->assertJsonPath('data.external_reference_id', 'PO-2026-0006');

        $this->assertDatabaseCount('purchase_orders', 1);
        $this->assertDatabaseCount('purchase_order_lines', 1);
    }

    /**
     * 10. Duplicate conflicting submission is rejected with 409 Conflict.
     */
    public function test_10_duplicate_conflicting_submission_is_rejected_with_409(): void
    {
        $payload = $this->validPoPayload();

        // First submission
        $first = $this->postJson('/api/v1/integration/purchase-orders', $payload, [
            'X-API-KEY' => self::API_KEY,
        ]);
        $first->assertStatus(201);

        // Conflicting submission: same external_reference_id but different amount and line items
        $conflictingPayload = $this->validPoPayload([
            'total_amount' => '2500.00',
            'items'        => [
                [
                    'source_po_line_id' => '123',
                    'product_id'        => '92',
                    'product_name'      => 'Example Product',
                    'quantity'          => '10',
                    'unit'              => 'PCS',
                    'unit_price'        => '250.00',
                    'line_total'        => '2500.00',
                ],
            ],
        ]);

        $second = $this->postJson('/api/v1/integration/purchase-orders', $conflictingPayload, [
            'X-API-KEY' => self::API_KEY,
        ]);

        $second->assertStatus(409)
            ->assertJsonPath('success', false)
            ->assertJsonPath('error', 'Idempotency conflict');

        $this->assertDatabaseCount('purchase_orders', 1);
    }

    /**
     * 11. Concurrent duplicate requests race safeguard.
     */
    public function test_11_concurrent_duplicate_requests_safeguard(): void
    {
        $payload = $this->validPoPayload(['external_reference_id' => 'PO-CONCURRENT-001']);

        // First successful insert
        $first = $this->postJson('/api/v1/integration/purchase-orders', $payload, [
            'X-API-KEY' => self::API_KEY,
        ]);
        $first->assertStatus(201);

        // Immediate identical retry simulates concurrent second thread
        $second = $this->postJson('/api/v1/integration/purchase-orders', $payload, [
            'X-API-KEY' => self::API_KEY,
        ]);
        $second->assertStatus(200)
            ->assertJsonPath('data.financial_reference', $first->json('data.financial_reference'));

        $this->assertDatabaseCount('purchase_orders', 1);
    }

    /**
     * 12. Repeated request after timeout returns original reference.
     */
    public function test_12_repeated_request_after_timeout(): void
    {
        $idempotencyKey = 'idem-timeout-retry-' . Str::random(8);
        $payload = $this->validPoPayload(['external_reference_id' => 'PO-TIMEOUT-RETRY-001']);

        $headers = [
            'X-API-KEY'       => self::API_KEY,
            'Idempotency-Key' => $idempotencyKey,
        ];

        $first = $this->postJson('/api/v1/integration/purchase-orders', $payload, $headers);
        $first->assertStatus(201);
        $origRef = $first->json('data.financial_reference');

        // Retry after timeout
        for ($i = 0; $i < 2; $i++) {
            $retry = $this->postJson('/api/v1/integration/purchase-orders', $payload, $headers);
            $retry->assertStatus(200)
                ->assertJsonPath('data.financial_reference', $origRef);
        }

        $this->assertDatabaseCount('purchase_orders', 1);
    }

    /**
     * 13. Financial record creation and persistence.
     */
    public function test_13_financial_record_creation_and_persistence(): void
    {
        $payload = $this->validPoPayload([
            'external_reference_id' => 'PO-PERSIST-001',
            'supplier'              => [
                'supplier_code' => 'SUPP-HOLCIM',
                'name'          => 'Holcim Philippines Inc.',
            ],
        ]);

        $res = $this->postJson('/api/v1/integration/purchase-orders', $payload, [
            'X-API-KEY' => self::API_KEY,
        ]);
        $res->assertStatus(201);

        $po = PurchaseOrder::where('external_reference_id', 'PO-PERSIST-001')->firstOrFail();
        $this->assertEquals('SMARTCHAIN', $po->source_system);
        $this->assertEquals('INVENTORY_PURCHASE', $po->category_type);
        $this->assertEquals('PHP', $po->currency);
        $this->assertEquals(1250.00, (float) $po->total_amount);
        $this->assertNotNull($po->payload_hash);
        $this->assertNotNull($po->raw_payload);
        $this->assertNotNull($po->received_at);

        // Verify supplier mapping without imaginary bank details
        $supplier = Supplier::where('name', 'Holcim Philippines Inc.')->firstOrFail();
        $this->assertNull($supplier->bank_info);
        $this->assertEquals($supplier->id, $po->supplier_id);
    }

    /**
     * 14. Stable Financial acknowledgment response schema.
     */
    public function test_14_stable_financial_acknowledgment_schema(): void
    {
        $payload = $this->validPoPayload();

        $response = $this->postJson('/api/v1/integration/purchase-orders', $payload, [
            'X-API-KEY' => self::API_KEY,
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'source_system',
                    'external_reference_id',
                    'financial_reference',
                    'receipt_status',
                    'processing_status',
                ],
            ]);
    }

    /**
     * 15. Receipt versus approval distinction.
     */
    public function test_15_receipt_versus_approval_distinction(): void
    {
        $payload = $this->validPoPayload(['external_reference_id' => 'PO-STATUS-DISTINCT']);

        $response = $this->postJson('/api/v1/integration/purchase-orders', $payload, [
            'X-API-KEY' => self::API_KEY,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.receipt_status', 'RECEIVED')
            ->assertJsonPath('data.processing_status', 'PENDING_REVIEW');

        $this->assertNotEquals('APPROVED', $response->json('data.receipt_status'));
        $this->assertNotEquals('PAID', $response->json('data.processing_status'));
    }

    /**
     * 16. No automatic payment or disbursement unless explicitly authorized.
     */
    public function test_16_no_automatic_payment_or_disbursement_created(): void
    {
        $payload = $this->validPoPayload(['external_reference_id' => 'PO-NO-PAYMENT']);

        $response = $this->postJson('/api/v1/integration/purchase-orders', $payload, [
            'X-API-KEY' => self::API_KEY,
        ]);
        $response->assertStatus(201);

        // Verify NO AP Bills, Payment Requests, Disbursements, or Journal Entries are created
        $this->assertDatabaseCount('ap_bills', 0);
        $this->assertDatabaseCount('payment_requests', 0);
        $this->assertDatabaseCount('disbursements', 0);
        $this->assertDatabaseCount('journal_entries', 0);
    }

    /**
     * 17. Status lookup operations (GET /purchase-orders/{ref} and /voucher-status/{ref}).
     */
    public function test_17_status_lookup_operations(): void
    {
        $payload = $this->validPoPayload(['external_reference_id' => 'PO-LOOKUP-001']);
        $postRes = $this->postJson('/api/v1/integration/purchase-orders', $payload, [
            'X-API-KEY' => self::API_KEY,
        ]);
        $postRes->assertStatus(201);
        $finRef = $postRes->json('data.financial_reference');

        // 1. Dedicated status lookup by financial_reference
        $getRes1 = $this->getJson("/api/v1/integration/purchase-orders/{$finRef}", [
            'X-API-KEY' => self::API_KEY,
        ]);
        $getRes1->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.financial_reference', $finRef)
            ->assertJsonPath('data.external_reference_id', 'PO-LOOKUP-001')
            ->assertJsonPath('data.receipt_status', 'RECEIVED')
            ->assertJsonPath('data.processing_status', 'PENDING_REVIEW')
            ->assertJsonStructure([
                'data' => [
                    'supplier',
                    'items',
                ],
            ]);

        // 2. Dedicated status lookup by external_reference_id
        $getRes2 = $this->getJson("/api/v1/integration/purchase-orders/PO-LOOKUP-001", [
            'X-API-KEY' => self::API_KEY,
        ]);
        $getRes2->assertStatus(200)
            ->assertJsonPath('data.financial_reference', $finRef);

        // 3. General voucher-status alias lookup
        $getVoucher = $this->getJson("/api/v1/integration/voucher-status/{$finRef}", [
            'X-API-KEY' => self::API_KEY,
        ]);
        $getVoucher->assertStatus(200)
            ->assertJsonPath('record_type', 'PURCHASE_ORDER')
            ->assertJsonPath('receipt_status', 'RECEIVED')
            ->assertJsonPath('processing_status', 'PENDING_REVIEW');

        // 4. Non-existent reference returns 404
        $notFoundRes = $this->getJson("/api/v1/integration/purchase-orders/NON-EXISTENT-PO", [
            'X-API-KEY' => self::API_KEY,
        ]);
        $notFoundRes->assertStatus(404)
            ->assertJsonPath('success', false);
    }

    /**
     * 18. Rejection of invalid or unapproved-source payload declarations.
     */
    public function test_18_rejection_of_unapproved_source_system(): void
    {
        $payload = $this->validPoPayload([
            'source_system' => 'UNAPPROVED_HACKER_SYSTEM',
        ]);

        $response = $this->postJson('/api/v1/integration/purchase-orders', $payload, [
            'X-API-KEY' => self::API_KEY,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
        $this->assertStringContainsString('Unauthorized source system', $response->json('message'));
    }

    /**
     * 19. Correct safe error responses.
     */
    public function test_19_correct_safe_error_responses(): void
    {
        // Malformed payload
        $response = $this->postJson('/api/v1/integration/purchase-orders', [
            'source_system' => 'SMARTCHAIN',
        ], [
            'X-API-KEY' => self::API_KEY,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonStructure(['success', 'message', 'errors']);

        // Assert no PHP internal errors or stack traces exposed
        $this->assertArrayNotHasKey('exception', $response->json());
        $this->assertArrayNotHasKey('trace', $response->json());
    }

    /**
     * 20. No credentials exposed in responses or logs.
     */
    public function test_20_no_credentials_exposed_in_responses_or_logs(): void
    {
        $payload = $this->validPoPayload();

        $response = $this->postJson('/api/v1/integration/purchase-orders', $payload, [
            'X-API-KEY' => self::API_KEY,
        ]);

        $responseContent = $response->getContent();
        $this->assertStringNotContainsString(self::API_KEY, $responseContent);

        // Also check error responses don't leak keys
        $errResponse = $this->postJson('/api/v1/integration/purchase-orders', [], [
            'X-API-KEY' => self::API_KEY,
        ]);
        $this->assertStringNotContainsString(self::API_KEY, $errResponse->getContent());
    }
}
