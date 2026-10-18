<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CoreNineModulesRegressionTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected string $token;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        $this->superAdmin = User::whereHas('role', function ($q) {
            $q->where('slug', 'super_admin');
        })->first();

        $this->token = $this->superAdmin->createToken('test-token')->plainTextToken;
    }

    protected function authHeaders(): array
    {
        return [
            'Authorization' => 'Bearer ' . $this->token,
            'Accept'        => 'application/json',
        ];
    }

    public function test_module_1_general_ledger_endpoint(): void
    {
        $response = $this->getJson('/api/v1/dashboard/gl', $this->authHeaders());
        $response->assertStatus(200);

        $tb = $this->getJson('/api/v1/dashboard/gl/trial-balance', $this->authHeaders());
        $tb->assertStatus(200);
    }

    public function test_module_2_accounts_payable_endpoint(): void
    {
        $response = $this->getJson('/api/v1/ap-bills', $this->authHeaders());
        $response->assertStatus(200)
            ->assertJsonStructure(['success', 'data', 'summary']);
    }

    public function test_module_3_accounts_receivable_endpoint(): void
    {
        $response = $this->getJson('/api/v1/ar-invoices', $this->authHeaders());
        $response->assertStatus(200)
            ->assertJsonStructure(['success', 'data', 'summary']);
    }

    public function test_module_4_disbursements_endpoint(): void
    {
        $response = $this->getJson('/api/v1/payment-requests', $this->authHeaders());
        $response->assertStatus(200)
            ->assertJsonStructure(['success', 'data', 'summary']);

        $disbResponse = $this->getJson('/api/v1/disbursements', $this->authHeaders());
        $disbResponse->assertStatus(200);
    }

    public function test_module_5_collections_endpoint(): void
    {
        $response = $this->getJson('/api/v1/collections', $this->authHeaders());
        $response->assertStatus(200);
    }

    public function test_module_6_budget_endpoint(): void
    {
        $response = $this->getJson('/api/v1/budgets', $this->authHeaders());
        $response->assertStatus(200);
    }

    public function test_module_7_cash_management_endpoint(): void
    {
        $response = $this->getJson('/api/v1/bank-accounts', $this->authHeaders());
        $response->assertStatus(200);
    }

    public function test_module_8_financial_reports_endpoint(): void
    {
        $response = $this->getJson('/api/v1/reports/financial-statements', $this->authHeaders());
        $response->assertStatus(200);
    }

    public function test_module_9_tax_management_endpoint(): void
    {
        $response = $this->getJson('/api/v1/tax/summary', $this->authHeaders());
        $response->assertStatus(200);
    }

    public function test_core_dashboard_and_audit_logs_endpoints(): void
    {
        $dashResponse = $this->getJson('/api/v1/dashboard/transactions', $this->authHeaders());
        $dashResponse->assertStatus(200);

        $auditResponse = $this->getJson('/api/v1/dashboard/audit-logs', $this->authHeaders());
        $auditResponse->assertStatus(200);
    }

    public function test_prevent_duplicate_payment_request_for_same_ap_bill(): void
    {
        $bill = \App\Models\ApBill::where('status', 'UNPAID')->first();
        if (!$bill) {
            $this->markTestSkipped('No unpaid bill found in seeder.');
        }

        // Try to create first payment request
        $response1 = $this->postJson('/api/v1/payment-requests', [
            'ap_bill_id' => $bill->id,
            'payee_name' => $bill->supplier->name ?? 'Supplier Inc.',
            'amount'     => (float) $bill->balance,
            'purpose'    => "Payment voucher for {$bill->bill_number}",
            'attachment' => \Illuminate\Http\UploadedFile::fake()->create('invoice.pdf', 100, 'application/pdf'),
        ], $this->authHeaders());

        $this->assertTrue(in_array($response1->status(), [200, 201]));

        // Try to create duplicate payment request for same bill
        $response2 = $this->postJson('/api/v1/payment-requests', [
            'ap_bill_id' => $bill->id,
            'payee_name' => $bill->supplier->name ?? 'Supplier Inc.',
            'amount'     => (float) $bill->balance,
            'purpose'    => "Duplicate attempt for {$bill->bill_number}",
            'attachment' => \Illuminate\Http\UploadedFile::fake()->create('invoice2.pdf', 100, 'application/pdf'),
        ], $this->authHeaders());

        $response2->assertStatus(200)
            ->assertJsonPath('success', true);
        $this->assertStringContainsString('already queued', $response2->json('message'));
    }
}
