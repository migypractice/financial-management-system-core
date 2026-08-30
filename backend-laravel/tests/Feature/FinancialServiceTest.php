<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\Transaction;
use App\Models\User;
use App\Services\FinancialService\FinancialService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class FinancialServiceTest extends TestCase
{
    use RefreshDatabase;

    private FinancialService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new FinancialService();
    }

    private function makeUser(string $roleSlug): User
    {
        $role = Role::where('slug', $roleSlug)->firstOrFail();

        return User::create([
            'name'     => ucfirst($roleSlug) . ' Tester',
            'email'    => Str::uuid() . '@test.hw.com',
            'password' => 'irrelevant',
            'role_id'  => $role->id,
        ]);
    }

    private function makeTransaction(array $overrides = []): Transaction
    {
        $subsystemId = DB::table('subsystems')->value('id');

        return Transaction::create(array_merge([
            'transaction_code'      => 'TXN-TEST-' . strtoupper(Str::random(6)),
            'subsystem_id'          => $subsystemId,
            'source_module'         => 'TEST',
            'external_reference_id' => 'REF-' . Str::random(6),
            'type'                  => 'EXPENSE',
            'amount'                => 1000,
            'net_amount'            => 1000,
            'currency'              => 'PHP',
            'description'           => 'Test transaction',
            'status'                => 'pending_approval',
            'ai_confidence_score'   => 0.9,
            'ai_anomaly_flag'       => false,
        ], $overrides));
    }

    public function test_approve_transitions_pending_approval_to_approved(): void
    {
        $checker = $this->makeUser('finance_manager');
        $transaction = $this->makeTransaction();

        $result = $this->service->approveTransaction($transaction->id, $checker->id);

        $this->assertTrue($result['success']);
        $this->assertSame('approved', $result['new_status']);
        $this->assertSame('approved', $transaction->fresh()->status);
        $this->assertSame($checker->id, $transaction->fresh()->approved_by);
    }

    public function test_approve_rejects_a_transaction_that_is_not_awaiting_approval(): void
    {
        $checker = $this->makeUser('finance_manager');
        $transaction = $this->makeTransaction(['status' => 'approved']);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('is not awaiting approval');

        $this->service->approveTransaction($transaction->id, $checker->id);
    }

    public function test_maker_cannot_approve_their_own_transaction(): void
    {
        $maker = $this->makeUser('finance_manager');
        $transaction = $this->makeTransaction(['created_by' => $maker->id]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Maker cannot be Checker');

        $this->service->approveTransaction($transaction->id, $maker->id);
    }

    public function test_reject_transitions_to_rejected_and_does_not_post_to_gl(): void
    {
        $checker = $this->makeUser('finance_manager');
        $transaction = $this->makeTransaction();

        $result = $this->service->rejectTransaction($transaction->id, $checker->id, 'Not a valid claim');

        $this->assertTrue($result['success']);
        $this->assertSame('rejected', $result['new_status']);
        $this->assertSame('rejected', $transaction->fresh()->status);
        $this->assertDatabaseCount('journal_entries', 0);
    }

    public function test_maker_cannot_reject_their_own_transaction(): void
    {
        $maker = $this->makeUser('finance_manager');
        $transaction = $this->makeTransaction(['created_by' => $maker->id]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Maker cannot be Checker');

        $this->service->rejectTransaction($transaction->id, $maker->id);
    }

    public function test_posting_an_approved_transaction_creates_a_sequential_journal_entry(): void
    {
        $checker = $this->makeUser('finance_manager');
        $transaction = $this->makeTransaction(['status' => 'approved']);

        $result = $this->service->postTransactionToGeneralLedger($transaction->id, $checker->id);

        $this->assertTrue($result['success']);
        $this->assertStringStartsWith('JE-' . date('Ym') . '-', $result['entry_number']);
        $this->assertSame('posted', $transaction->fresh()->status);
        $this->assertDatabaseHas('journal_entries', [
            'transaction_id' => $transaction->id,
            'entry_number'   => $result['entry_number'],
            'status'         => 'POSTED',
        ]);

        // A second transaction posted in the same period should increment the sequence.
        $secondChecker = $this->makeUser('finance_manager');
        $secondTransaction = $this->makeTransaction(['status' => 'approved']);
        $secondResult = $this->service->postTransactionToGeneralLedger($secondTransaction->id, $secondChecker->id);

        $this->assertNotSame($result['entry_number'], $secondResult['entry_number']);
    }

    public function test_cannot_post_a_transaction_that_has_not_been_approved(): void
    {
        $checker = $this->makeUser('finance_manager');
        $transaction = $this->makeTransaction(['status' => 'pending_approval']);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('cannot be posted');

        $this->service->postTransactionToGeneralLedger($transaction->id, $checker->id);
    }

    public function test_approving_the_same_transaction_twice_fails_on_the_second_attempt(): void
    {
        $checker = $this->makeUser('finance_manager');
        $transaction = $this->makeTransaction();

        $this->service->approveTransaction($transaction->id, $checker->id);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('is not awaiting approval');

        $this->service->approveTransaction($transaction->id, $checker->id);
    }

    public function test_approve_and_post_transitions_pending_approval_all_the_way_to_posted(): void
    {
        $checker = $this->makeUser('finance_manager');
        $transaction = $this->makeTransaction();

        $result = $this->service->approveAndPost($transaction->id, $checker->id);

        $this->assertTrue($result['success']);
        $this->assertSame('posted', $transaction->fresh()->status);
        $this->assertDatabaseHas('journal_entries', [
            'transaction_id' => $transaction->id,
            'entry_number'   => $result['entry_number'],
            'status'         => 'POSTED',
        ]);
    }

    public function test_journal_entry_numbers_increment_sequentially_via_the_locked_counter(): void
    {
        $checker = $this->makeUser('finance_manager');
        $numbers = [];

        for ($i = 0; $i < 3; $i++) {
            $transaction = $this->makeTransaction(['status' => 'approved']);
            $result = $this->service->postTransactionToGeneralLedger($transaction->id, $checker->id);
            $numbers[] = $result['entry_number'];
        }

        $period = date('Ym');
        $this->assertSame([
            "JE-{$period}-0001",
            "JE-{$period}-0002",
            "JE-{$period}-0003",
        ], $numbers);
    }

    /**
     * Regression test for the audit's atomicity finding: approveTransaction()
     * and postTransactionToGeneralLedger() used to run as two independent
     * DB transactions, so a journal-numbering collision during posting left
     * the transaction stranded at status=approved with no journal entry.
     * approveAndPost() now wraps both in one outer transaction; this proves
     * a posting failure rolls the approval back too, deterministically
     * forcing the exact collision a real concurrent-approval race would
     * produce (two callers computing the same next sequence number).
     */
    public function test_approve_and_post_rolls_back_the_approval_when_journal_numbering_collides(): void
    {
        $checker = $this->makeUser('finance_manager');
        $transaction = $this->makeTransaction();
        $originalStatus = $transaction->status;
        $period = date('Ym');

        // Pre-seed the sequence counter at 0 so nextJournalEntryNumber() will
        // compute sequence 1 == "0001". Then pre-occupy that exact entry
        // number so the INSERT into journal_entries collides on the unique
        // constraint — exactly what two simultaneous approvals racing for the
        // same sequence number would produce.
        DB::table('journal_entry_sequences')->insert([
            'period'        => $period,
            'last_sequence' => 0,
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        $bystander = $this->makeTransaction(['status' => 'posted']);
        DB::table('journal_entries')->insert([
            'id'             => (string) Str::uuid(),
            'transaction_id' => $bystander->id,
            'entry_number'   => "JE-{$period}-0001",
            'entry_date'     => now()->toDateString(),
            'status'         => 'POSTED',
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);

        $threw = false;
        try {
            $this->service->approveAndPost($transaction->id, $checker->id);
        } catch (\Throwable $e) {
            $threw = true;
        }

        $this->assertTrue($threw, 'Expected the journal-number collision to throw.');
        $this->assertSame(
            $originalStatus,
            $transaction->fresh()->status,
            'A failed journal-entry creation must not leave the transaction stranded in "approved" status.'
        );
        $this->assertDatabaseCount('journal_entries', 1); // only the pre-seeded bystander row
    }
}
