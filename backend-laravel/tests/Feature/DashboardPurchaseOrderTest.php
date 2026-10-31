<?php

namespace Tests\Feature;

use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderLine;
use App\Models\Role;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class DashboardPurchaseOrderTest extends TestCase
{
    use RefreshDatabase;

    protected function makeUserWithRole(string $roleSlug): User
    {
        $role = Role::firstOrCreate(['slug' => $roleSlug], [
            'name'        => ucfirst($roleSlug),
            'description' => "Role for {$roleSlug}",
        ]);

        return User::factory()->create([
            'role_id' => $role->id,
        ]);
    }

    protected function createSamplePurchaseOrder(array $attributes = []): PurchaseOrder
    {
        $code = $attributes['supplier_code'] ?? 'SUP-007';
        $supplier = Supplier::firstOrCreate(
            ['supplier_code' => $code],
            [
                'name'               => $attributes['supplier_name'] ?? 'Joey',
                'company_name'       => 'Joey Construction & Industrial Supplies',
                'payment_terms_days' => 30,
            ]
        );

        $po = PurchaseOrder::create(array_merge([
            'financial_reference'   => 'FIN-PO-0001',
            'source_system'         => 'SMARTCHAIN',
            'message_id'            => (string) Str::uuid(),
            'external_reference_id' => 'PO-2026-0003',
            'idempotency_key'       => (string) Str::uuid(),
            'category_type'         => 'INVENTORY_PURCHASE',
            'currency'              => 'PHP',
            'total_amount'          => 2000.00,
            'supplier_id'           => $supplier->id,
            'supplier_code'         => $supplier->supplier_code,
            'supplier_name'         => $supplier->name,
            'receipt_status'        => 'RECEIVED',
            'processing_status'     => 'PENDING_REVIEW',
            'payload_hash'          => hash('sha256', 'sample'),
            'raw_payload'           => ['sample' => true],
            'received_at'           => now(),
        ], $attributes));

        PurchaseOrderLine::create([
            'purchase_order_id' => $po->id,
            'source_po_line_id' => '66',
            'product_id'        => '185',
            'product_name'      => 'Thermal Ceramics Tri-Mor Insulite',
            'quantity'          => 10,
            'unit'              => 'SACK',
            'unit_price'        => 200.00,
            'line_total'        => 2000.00,
        ]);

        return $po;
    }

    /**
     * 1. Unauthenticated request is rejected with 401.
     */
    public function test_unauthenticated_user_cannot_access_dashboard_purchase_orders(): void
    {
        $response = $this->getJson('/api/v1/dashboard/purchase-orders');
        $response->assertStatus(401);
    }

    /**
     * 2. Authorized financial roles can list Purchase Orders.
     */
    public function test_authorized_roles_can_list_incoming_purchase_orders(): void
    {
        $this->createSamplePurchaseOrder();

        $authorizedRoles = ['super_admin', 'finance_manager', 'accountant', 'auditor'];

        foreach ($authorizedRoles as $roleSlug) {
            $user = $this->makeUserWithRole($roleSlug);

            $response = $this->actingAs($user, 'sanctum')
                ->getJson('/api/v1/dashboard/purchase-orders');

            $response->assertStatus(200)
                ->assertJsonPath('success', true)
                ->assertJsonCount(1, 'data')
                ->assertJsonPath('data.0.financial_reference', 'FIN-PO-0001')
                ->assertJsonPath('data.0.external_reference_id', 'PO-2026-0003')
                ->assertJsonPath('data.0.supplier_name', 'Joey')
                ->assertJsonPath('data.0.total_amount', 2000)
                ->assertJsonPath('data.0.receipt_status', 'RECEIVED')
                ->assertJsonPath('data.0.processing_status', 'PENDING_REVIEW')
                ->assertJsonPath('summary.total_orders', 1)
                ->assertJsonPath('summary.pending_review', 1);
        }
    }

    /**
     * 3. PENDING_REVIEW records are included by default.
     */
    public function test_pending_review_records_included_by_default(): void
    {
        $this->createSamplePurchaseOrder(['processing_status' => 'PENDING_REVIEW']);

        $user = $this->makeUserWithRole('finance_manager');

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/dashboard/purchase-orders');

        $response->assertStatus(200)
            ->assertJsonPath('data.0.processing_status', 'PENDING_REVIEW');
    }

    /**
     * 4. Search by financial_reference works.
     */
    public function test_search_by_financial_reference(): void
    {
        $this->createSamplePurchaseOrder(['financial_reference' => 'FIN-PO-0001']);
        $this->createSamplePurchaseOrder([
            'financial_reference'   => 'FIN-PO-0002',
            'external_reference_id' => 'PO-2026-9999',
            'message_id'            => (string) Str::uuid(),
        ]);

        $user = $this->makeUserWithRole('finance_manager');

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/dashboard/purchase-orders?search=FIN-PO-0001');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.financial_reference', 'FIN-PO-0001');
    }

    /**
     * 5. Search by SmartChain PO number works.
     */
    public function test_search_by_smartchain_po_number(): void
    {
        $this->createSamplePurchaseOrder(['external_reference_id' => 'PO-2026-0003']);
        $this->createSamplePurchaseOrder([
            'financial_reference'   => 'FIN-PO-0002',
            'external_reference_id' => 'PO-2026-8888',
            'message_id'            => (string) Str::uuid(),
        ]);

        $user = $this->makeUserWithRole('accountant');

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/dashboard/purchase-orders?search=PO-2026-0003');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.external_reference_id', 'PO-2026-0003');
    }

    /**
     * 6. Detail endpoint returns itemized lines and accurate line totals.
     */
    public function test_show_endpoint_returns_itemized_lines(): void
    {
        $this->createSamplePurchaseOrder();

        $user = $this->makeUserWithRole('finance_manager');

        // Lookup by financial_reference
        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/dashboard/purchase-orders/FIN-PO-0001');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.financial_reference', 'FIN-PO-0001')
            ->assertJsonPath('data.external_reference_id', 'PO-2026-0003')
            ->assertJsonPath('data.items.0.product_name', 'Thermal Ceramics Tri-Mor Insulite')
            ->assertJsonPath('data.items.0.quantity', 10)
            ->assertJsonPath('data.items.0.unit', 'SACK')
            ->assertJsonPath('data.items.0.unit_price', 200)
            ->assertJsonPath('data.items.0.line_total', 2000);
    }

    /**
     * 7. Viewing or listing POs strictly creates NO AP bills or journal entries.
     */
    public function test_viewing_po_does_not_create_ap_bills_or_journal_entries(): void
    {
        $this->createSamplePurchaseOrder();

        $user = $this->makeUserWithRole('finance_manager');

        $this->actingAs($user, 'sanctum')->getJson('/api/v1/dashboard/purchase-orders');
        $this->actingAs($user, 'sanctum')->getJson('/api/v1/dashboard/purchase-orders/FIN-PO-0001');

        // Verify strict accounting separation
        $this->assertDatabaseCount('ap_bills', 0);
        $this->assertDatabaseCount('payment_requests', 0);
        $this->assertDatabaseCount('journal_entries', 0);
        $this->assertDatabaseCount('disbursements', 0);
    }

    /**
     * 8. Explicit user forwardToDisbursement creates ApBill and PaymentRequest voucher.
     */
    public function test_forward_to_disbursement_creates_payment_request_voucher(): void
    {
        $this->createSamplePurchaseOrder();

        $user = $this->makeUserWithRole('finance_manager');

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/dashboard/purchase-orders/FIN-PO-0001/forward-disbursement');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'PENDING_APPROVAL')
            ->assertJsonPath('data.amount', 2000)
            ->assertJsonPath('data.payee_name', 'Joey');

        $this->assertDatabaseCount('payment_requests', 1);
        $this->assertDatabaseHas('payment_requests', [
            'status'     => 'PENDING_APPROVAL',
            'amount'     => 2000,
            'payee_name' => 'Joey',
        ]);

        // Calling again does not duplicate
        $second = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/dashboard/purchase-orders/FIN-PO-0001/forward-disbursement');
        $second->assertStatus(200);
        $this->assertDatabaseCount('payment_requests', 1);
    }
}

