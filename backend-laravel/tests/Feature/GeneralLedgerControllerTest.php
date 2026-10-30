<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\Transaction;
use App\Models\JournalEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class GeneralLedgerControllerTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $roleSlug): User
    {
        $role = Role::firstOrCreate(['slug' => $roleSlug], ['name' => ucfirst(str_replace('_', ' ', $roleSlug))]);

        return User::create([
            'name'     => ucfirst($roleSlug) . ' Tester',
            'email'    => Str::uuid() . '@test.hw.com',
            'password' => 'irrelevant',
            'role_id'  => $role->id,
        ]);
    }

    private function makePostedTransaction(array $overrides = []): Transaction
    {
        $subsystemId = DB::table('subsystems')->value('id');
        $systemUser = User::where('email', 'system@hw.com')->first();

        $transaction = Transaction::create(array_merge([
            'transaction_code'      => 'TXN-TEST-' . strtoupper(Str::random(6)),
            'subsystem_id'          => $subsystemId,
            'source_module'         => 'TEST',
            'external_reference_id' => 'REF-' . Str::random(6),
            'type'                  => 'EXPENSE',
            'amount'                => 100,
            'net_amount'            => 100,
            'currency'              => 'PHP',
            'description'           => 'Test transaction',
            'status'                => 'posted',
            'ai_confidence_score'   => 0.9,
            'ai_anomaly_flag'       => false,
            'created_by'            => $systemUser?->id,
        ], $overrides));

        static $seq = 1000;
        $seq++;
        JournalEntry::create([
            'transaction_id' => $transaction->id,
            'entry_number'   => 'JE-' . date('Ym') . '-' . $seq,
            'entry_date'     => now()->toDateString(),
            'status'         => 'POSTED',
        ]);

        return $transaction;
    }

    public function test_gl_endpoint_returns_paginated_entries_and_correct_sql_aggregations(): void
    {
        // Create 55 expenses of 100 (Total debit 5500)
        for ($i = 0; $i < 55; $i++) {
            $this->makePostedTransaction(['type' => 'EXPENSE', 'amount' => 100]);
        }
        
        // Create 5 incomes of 200 (Total credit 1000)
        for ($i = 0; $i < 5; $i++) {
            $this->makePostedTransaction(['type' => 'INCOME', 'amount' => 200]);
        }

        $admin = $this->makeUser('super_admin');

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/v1/dashboard/gl');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'message',
            'data',
            'summary' => [
                'total_entries',
                'total_debit',
                'total_credit'
            ],
            'meta' => [
                'current_page',
                'last_page',
                'total_pages',
                'total_items'
            ]
        ]);

        $json = $response->json();
        
        // Pagination assertions
        $this->assertCount(50, $json['data'], 'Expected exactly 50 records per page (pagination limit)');
        $this->assertEquals(60, $json['meta']['total_items'], 'Total items should be 60 across all pages');
        $this->assertEquals(2, $json['meta']['last_page'], 'There should be 2 pages');

        // Aggregation assertions
        $this->assertEquals(60, $json['summary']['total_entries']);
        $this->assertEquals(5500, $json['summary']['total_debit']);
        $this->assertEquals(1000, $json['summary']['total_credit']);
    }

    public function test_gl_endpoint_search_filters_both_results_and_aggregations(): void
    {
        $this->makePostedTransaction(['type' => 'EXPENSE', 'amount' => 100, 'description' => 'Target A']);
        $this->makePostedTransaction(['type' => 'EXPENSE', 'amount' => 200, 'description' => 'Target B']);
        $this->makePostedTransaction(['type' => 'EXPENSE', 'amount' => 300, 'description' => 'Ignore']);

        $admin = $this->makeUser('super_admin');

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/v1/dashboard/gl?search=Target');
        $json = $response->json();

        $this->assertCount(2, $json['data']);
        $this->assertEquals(2, $json['summary']['total_entries']);
        $this->assertEquals(300, $json['summary']['total_debit']); // 100 + 200
        $this->assertEquals(0, $json['summary']['total_credit']);
    }

    public function test_trial_balance_endpoint(): void
    {
        $admin = $this->makeUser('super_admin');

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/v1/dashboard/gl/trial-balance');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data', 'summary']);
    }

    public function test_ar_subledger_endpoint(): void
    {
        $admin = $this->makeUser('super_admin');

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/v1/dashboard/gl/ar-subledger');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data', 'summary']);
    }

    public function test_ap_subledger_endpoint(): void
    {
        $admin = $this->makeUser('super_admin');

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/v1/dashboard/gl/ap-subledger');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data', 'summary']);
    }

    public function test_payroll_subledger_endpoint(): void
    {
        $admin = $this->makeUser('super_admin');

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/v1/dashboard/gl/payroll-subledger');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data', 'summary']);
    }

    public function test_can_reverse_posted_journal_entry(): void
    {
        $admin = $this->makeUser('finance_manager');
        $transaction = $this->makePostedTransaction(['amount' => 5000]);
        $entry = JournalEntry::where('transaction_id', $transaction->id)->firstOrFail();

        // Add a line to the entry
        \App\Models\JournalEntryLine::create([
            'id'                  => (string) Str::uuid(),
            'journal_entry_id'    => $entry->id,
            'chart_of_account_id' => \App\Models\ChartOfAccount::first()->id,
            'debit'               => 5000,
            'credit'              => 0,
            'description'         => 'Office Supplies Expense',
        ]);
        \App\Models\JournalEntryLine::create([
            'id'                  => (string) Str::uuid(),
            'journal_entry_id'    => $entry->id,
            'chart_of_account_id' => \App\Models\ChartOfAccount::skip(1)->first()->id,
            'debit'               => 0,
            'credit'              => 5000,
            'description'         => 'Cash at Bank',
        ]);

        $response = $this->actingAs($admin, 'sanctum')->postJson("/api/v1/dashboard/gl/{$entry->id}/reverse", [
            'reason' => 'Vendor billing error duplicate voucher',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        // Verify reversal entry created with swapped lines
        $reversalEntry = JournalEntry::where('entry_number', '!=', $entry->entry_number)->latest()->first();
        $this->assertNotNull($reversalEntry);
        $this->assertStringContainsString("REVERSAL OF {$entry->entry_number}", $reversalEntry->transaction->description);

        $reversalLines = $reversalEntry->lines;
        $this->assertEquals(5000, (float) $reversalLines->firstWhere('credit', 5000)->credit);
        $this->assertEquals(5000, (float) $reversalLines->firstWhere('debit', 5000)->debit);

        // Verify cannot reverse twice
        $repeatResponse = $this->actingAs($admin, 'sanctum')->postJson("/api/v1/dashboard/gl/{$entry->id}/reverse", [
            'reason' => 'Attempting second reversal',
        ]);
        $repeatResponse->assertStatus(422);
    }

    public function test_accountant_cannot_reverse_entry_due_to_segregation_of_duties(): void
    {
        $accountant = $this->makeUser('accountant');
        $transaction = $this->makePostedTransaction();
        $entry = JournalEntry::where('transaction_id', $transaction->id)->firstOrFail();

        $response = $this->actingAs($accountant, 'sanctum')->postJson("/api/v1/dashboard/gl/{$entry->id}/reverse", [
            'reason' => 'Accountant attempting reversal',
        ]);

        $response->assertStatus(403);
    }
}

