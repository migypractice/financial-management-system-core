<?php

namespace Tests\Feature;

use App\Models\ApBill;
use App\Models\ArInvoice;
use App\Models\BankAccount;
use App\Models\Budget;
use App\Models\BudgetAllocation;
use App\Models\Collection;
use App\Models\Disbursement;
use App\Models\Role;
use App\Models\Subsystem;
use App\Models\Transaction;
use App\Models\User;
use App\Services\FinancialService\FinancialService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountingPipelineTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $manager;
    private User $systemUser;
    private Subsystem $subsystem;
    private BankAccount $bankAccount;

    protected function setUp(): void
    {
        parent::setUp();

        $adminRole = Role::firstOrCreate(['slug' => 'super_admin'], ['name' => 'Super Admin']);
        $managerRole = Role::firstOrCreate(['slug' => 'finance_manager'], ['name' => 'Finance Manager']);
        $systemRole = Role::firstOrCreate(['slug' => 'system_integration'], ['name' => 'System Integration']);

        $this->admin = User::factory()->create(['role_id' => $adminRole->id]);
        $this->manager = User::factory()->create(['role_id' => $managerRole->id]);
        $this->systemUser = User::factory()->create(['role_id' => $systemRole->id]);

        $this->subsystem = Subsystem::firstOrCreate(
            ['slug' => 'general-ledger'],
            ['name' => 'General Ledger', 'is_active' => true]
        );

        $this->bankAccount = BankAccount::create([
            'account_name'      => 'BDO Corporate Operating',
            'bank_name'         => 'Banco De Oro (BDO)',
            'account_number'    => '1092-8821-4401',
            'account_type'      => 'Operating',
            'beginning_balance' => 1000000.00,
            'current_balance'   => 1000000.00,
            'currency'          => 'PHP',
            'is_active'         => true,
        ]);
    }

    public function test_inbound_transaction_approval_increases_cash_and_creates_ar(): void
    {
        $transaction = Transaction::create([
            'transaction_code'      => 'TXN-IN-TEST-001',
            'subsystem_id'          => $this->subsystem->id,
            'source_module'         => 'ECOMMERCE_CORE',
            'category_type'         => 'SALES_REVENUE',
            'external_reference_id' => 'ORD-1001',
            'type'                  => 'INCOME',
            'amount'                => 25000.00,
            'net_amount'            => 25000.00,
            'currency'              => 'PHP',
            'description'           => 'Online sales payment',
            'status'                => 'pending_approval',
            'created_by'            => $this->systemUser->id,
        ]);

        $response = $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/dashboard/transactions/{$transaction->id}/approve");

        $response->assertStatus(200);

        // Verify AR Invoice
        $this->assertDatabaseHas('ar_invoices', [
            'total_amount' => 25000.00,
            'status'       => 'PAID',
        ]);

        // Verify Collection
        $this->assertDatabaseHas('collections', [
            'amount' => 25000.00,
        ]);

        // Verify Bank Account increased
        $this->assertEquals(1025000.00, (float) $this->bankAccount->fresh()->current_balance);
    }

    public function test_outbound_transaction_approval_decreases_cash_creates_ap_and_updates_budget(): void
    {
        $budget = Budget::create([
            'department'       => 'Human Resources (HRMS)',
            'category'         => 'Payroll & Compensation',
            'fiscal_year'      => 2026,
            'period'           => '2026-10',
            'allocated_amount' => 500000.00,
        ]);

        $transaction = Transaction::create([
            'transaction_code'      => 'TXN-OUT-TEST-001',
            'subsystem_id'          => $this->subsystem->id,
            'source_module'         => 'HRMS',
            'category_type'         => 'PAYROLL_SALARY',
            'external_reference_id' => 'PAY-2001',
            'type'                  => 'EXPENSE',
            'amount'                => 60000.00,
            'net_amount'            => 60000.00,
            'currency'              => 'PHP',
            'description'           => 'Staff overtime payroll payout',
            'status'                => 'pending_approval',
            'created_by'            => $this->systemUser->id,
        ]);

        $response = $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/dashboard/transactions/{$transaction->id}/approve");

        $response->assertStatus(200);

        // Verify AP Bill
        $this->assertDatabaseHas('ap_bills', [
            'total_amount' => 60000.00,
            'status'       => 'PAID',
        ]);

        // Verify Disbursement
        $this->assertDatabaseHas('disbursements', [
            'amount' => 60000.00,
        ]);

        // Verify Bank Account decreased
        $this->assertEquals(940000.00, (float) $this->bankAccount->fresh()->current_balance);

        // Verify Budget consumption via BudgetController
        $budgetRes = $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/v1/budgets?period=2026-10');

        $budgetRes->assertStatus(200);
        $hrBudget = collect($budgetRes->json('data'))->firstWhere('department', 'Human Resources (HRMS)');
        $this->assertNotNull($hrBudget);
        $this->assertEquals(60000.00, $hrBudget['spent_amount']);
        $this->assertEquals(440000.00, $hrBudget['remaining_amount']);
    }

    public function test_budget_allocation_and_monthly_history(): void
    {
        // Allocate budget
        $payload = [
            'department'       => 'Fleet & Logistics',
            'category'         => 'Transportation & Maintenance',
            'fiscal_year'      => 2026,
            'period'           => '2026-10',
            'allocated_amount' => 300000.00,
            'allocation_mode'  => 'SET',
            'notes'            => 'October fuel allowance',
        ];

        $postRes = $this->actingAs($this->manager, 'sanctum')
            ->postJson('/api/v1/budgets', $payload);

        $postRes->assertStatus(201);

        $this->assertDatabaseHas('budgets', [
            'department'       => 'Fleet & Logistics',
            'period'           => '2026-10',
            'allocated_amount' => 300000.00,
        ]);

        $this->assertDatabaseHas('budget_allocations', [
            'department'       => 'Fleet & Logistics',
            'period'           => '2026-10',
            'allocated_amount' => 300000.00,
        ]);

        // Test Monthly Archive endpoint
        $historyRes = $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/v1/budgets/history');

        $historyRes->assertStatus(200);
        $this->assertTrue($historyRes->json('success'));
        $this->assertNotEmpty($historyRes->json('data.history'));
        $this->assertNotEmpty($historyRes->json('data.allocation_logs'));
    }
}
