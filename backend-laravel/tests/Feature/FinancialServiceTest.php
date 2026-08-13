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
}
