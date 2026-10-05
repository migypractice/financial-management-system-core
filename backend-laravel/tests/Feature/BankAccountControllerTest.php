<?php

namespace Tests\Feature;

use App\Models\BankAccount;
use App\Models\ChartOfAccount;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BankAccountControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $manager;
    protected BankAccount $bdo;
    protected BankAccount $bpi;
    protected ChartOfAccount $cashCoa;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->manager = User::where('email', 'manager@hw.com')->firstOrFail();

        $this->cashCoa = ChartOfAccount::firstOrCreate(
            ['code' => '1010-CASH'],
            [
                'name'           => 'Cash and Cash Equivalents',
                'type'           => 'ASSET',
                'normal_balance' => 'DEBIT',
                'is_active'      => true,
            ]
        );

        $this->bdo = BankAccount::firstOrCreate(
            ['bank_name' => 'BDO Unibank'],
            [
                'account_name'        => 'BDO Main Operating',
                'account_number'      => '0012-3456-7890',
                'account_type'        => 'Operating',
                'beginning_balance'   => 1000000.00,
                'current_balance'     => 1000000.00,
                'currency'            => 'PHP',
                'chart_of_account_id' => $this->cashCoa->id,
                'is_active'           => true,
            ]
        );

        $this->bpi = BankAccount::firstOrCreate(
            ['bank_name' => 'Bank of the Philippine Islands (BPI)'],
            [
                'account_name'        => 'BPI Payroll Account',
                'account_number'      => '0098-7654-3210',
                'account_type'        => 'Payroll',
                'beginning_balance'   => 500000.00,
                'current_balance'     => 500000.00,
                'currency'            => 'PHP',
                'chart_of_account_id' => $this->cashCoa->id,
                'is_active'           => true,
            ]
        );
    }

    public function test_can_list_bank_accounts_with_summary(): void
    {
        $response = $this->actingAs($this->manager)
            ->getJson('/api/v1/bank-accounts');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'bank_name',
                        'account_number',
                        'account_type',
                        'beginning_balance',
                        'current_balance',
                        'total_inflows',
                        'total_outflows',
                        'reconciliation_status',
                    ],
                ],
                'summary' => [
                    'total_cash_in_bank',
                    'total_inflows',
                    'total_outflows',
                    'net_cash_flow',
                    'account_count',
                ],
            ]);
    }

    public function test_can_list_bank_transactions_ledger(): void
    {
        $response = $this->actingAs($this->manager)
            ->getJson('/api/v1/bank-accounts/transactions');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data',
                'count',
            ]);
    }

    public function test_inter_bank_transfer_updates_balances_and_posts_balanced_gl(): void
    {
        $initialBdo = (float) $this->bdo->current_balance;
        $initialBpi = (float) $this->bpi->current_balance;
        $transferAmount = 150000.00;

        $response = $this->actingAs($this->manager)
            ->postJson('/api/v1/bank-accounts/transfer', [
                'from_bank_account_id' => $this->bdo->id,
                'to_bank_account_id'   => $this->bpi->id,
                'amount'               => $transferAmount,
                'transfer_date'        => '2026-10-05',
                'reference_number'     => 'TRF-TEST-001',
                'notes'                => 'Funding Payroll Account for upcoming cutoff',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        // Verify balances in database
        $this->assertEquals($initialBdo - $transferAmount, (float) $this->bdo->fresh()->current_balance);
        $this->assertEquals($initialBpi + $transferAmount, (float) $this->bpi->fresh()->current_balance);

        // Verify Transaction and Journal Entry were created
        $this->assertDatabaseHas('transactions', [
            'external_reference_id' => 'TRF-TEST-001',
            'category_type'         => 'BANK_TRANSFER',
            'status'                => 'posted',
        ]);
        $this->assertDatabaseHas('journal_entries', [
            'status' => 'POSTED',
        ]);
    }

    public function test_inter_bank_transfer_prevents_overdraft(): void
    {
        $excessiveAmount = 99999999.00;

        $response = $this->actingAs($this->manager)
            ->postJson('/api/v1/bank-accounts/transfer', [
                'from_bank_account_id' => $this->bdo->id,
                'to_bank_account_id'   => $this->bpi->id,
                'amount'               => $excessiveAmount,
                'transfer_date'        => '2026-10-05',
                'reference_number'     => 'TRF-TEST-OVERDRAFT',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
    }
}
