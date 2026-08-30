<?php

namespace App\Services\FinancialService;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Handles the "Checker" side of the Maker-Checker workflow.
 *
 * When a Finance Manager or Super Admin approves a transaction in the React
 * dashboard, this service commits the double-entry journal record to the
 * General Ledger under strict ACID guarantees.
 */
class FinancialService
{
    /**
     * Post an approved transaction to the General Ledger.
     *
     * @param string $transactionId   UUID of the transaction to post
     * @param string $approvedByUserId UUID of the approving user
     * @return array Summary of the GL posting result
     *
     * @throws \RuntimeException If the transaction is not found or not in an approvable state
     */
    public function postTransactionToGeneralLedger(string $transactionId, string $approvedByUserId): array
    {
        return DB::transaction(function () use ($transactionId, $approvedByUserId) {
            // 1. Lock the transaction row to prevent concurrent approval
            $transaction = DB::table('transactions')
                ->where('id', $transactionId)
                ->lockForUpdate()
                ->first();

            if (!$transaction) {
                throw new \RuntimeException("Transaction not found: {$transactionId}");
            }

            // Only allow posting from approved status
            $postableStatuses = ['approved'];
            if (!in_array($transaction->status, $postableStatuses)) {
                throw new \RuntimeException(
                    "Transaction {$transaction->transaction_code} cannot be posted (current status: {$transaction->status})."
                );
            }

            // 2. Generate a sequential journal entry number — concurrency-safe via a
            // locked per-period counter row (see journal_entry_sequences), so two
            // approvals racing in the same month can never compute the same number.
            $entryNumber = $this->nextJournalEntryNumber(now()->format('Ym'));

            // 3. Create the journal entry
            $journalEntryId = (string) Str::uuid();

            DB::table('journal_entries')->insert([
                'id'             => $journalEntryId,
                'transaction_id' => $transactionId,
                'entry_number'   => $entryNumber,
                'entry_date'     => now()->toDateString(),
                'status'         => 'POSTED',
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);

            // 4. Update the transaction to posted
            DB::table('transactions')
                ->where('id', $transactionId)
                ->update([
                    'status'      => 'posted',
                    'approved_by' => $approvedByUserId,
                    'approved_at' => now(),
                    'posted_at'   => now(),
                    'updated_at'  => now(),
                ]);

            Log::info("GL posted: {$entryNumber} for transaction {$transaction->transaction_code}");

            return [
                'success'          => true,
                'journal_entry_id' => $journalEntryId,
                'entry_number'     => $entryNumber,
                'transaction_code' => $transaction->transaction_code,
                'posted_at'        => now()->toIso8601String(),
            ];
        });
    }

    /**
     * Approve and post a transaction atomically.
     *
     * Approval and GL posting were previously two independent DB transactions
     * called back to back from the controller. If posting failed after
     * approval had already committed (e.g. a journal-number collision under
     * concurrency), the transaction was left stranded at status=approved with
     * no journal entry and no way back into the Approvals queue. Wrapping
     * both calls in one outer transaction makes Laravel run the inner
     * DB::transaction() calls as SAVEPOINTs: if posting throws, the whole
     * unit — including the approval — rolls back together.
     */
    public function approveAndPost(string $transactionId, string $approvedByUserId): array
    {
        return DB::transaction(function () use ($transactionId, $approvedByUserId) {
            $this->approveTransaction($transactionId, $approvedByUserId);

            return $this->postTransactionToGeneralLedger($transactionId, $approvedByUserId);
        });
    }

    /**
     * Approve a transaction (transition from pending_approval/ai_flagged → approved).
     * This is the step before GL posting.
     */
    public function approveTransaction(string $transactionId, string $approvedByUserId): array
    {
        return DB::transaction(function () use ($transactionId, $approvedByUserId) {
            $transaction = DB::table('transactions')
                ->where('id', $transactionId)
                ->lockForUpdate()
                ->first();

            if (!$transaction) {
                throw new \RuntimeException("Transaction not found: {$transactionId}");
            }

            $approvableStatuses = ['pending_approval', 'ai_flagged'];
            if (!in_array($transaction->status, $approvableStatuses)) {
                throw new \RuntimeException(
                    "Transaction {$transaction->transaction_code} is not awaiting approval (status: {$transaction->status})."
                );
            }

            if ($transaction->created_by && $transaction->created_by === $approvedByUserId) {
                throw new \RuntimeException("Maker cannot be Checker. You cannot approve a transaction you created.");
            }

            DB::table('transactions')
                ->where('id', $transactionId)
                ->update([
                    'status'      => 'approved',
                    'approved_by' => $approvedByUserId,
                    'approved_at' => now(),
                    'updated_at'  => now(),
                ]);

            Log::info("Transaction approved: {$transaction->transaction_code} by user {$approvedByUserId}");

            return [
                'success'          => true,
                'transaction_code' => $transaction->transaction_code,
                'previous_status'  => $transaction->status,
                'new_status'       => 'approved',
                'approved_at'      => now()->toIso8601String(),
            ];
        });
    }

    /**
     * Reject a transaction.
     */
    public function rejectTransaction(string $transactionId, string $rejectedByUserId, ?string $reason = null): array
    {
        return DB::transaction(function () use ($transactionId, $rejectedByUserId, $reason) {
            $transaction = DB::table('transactions')
                ->where('id', $transactionId)
                ->lockForUpdate()
                ->first();

            if (!$transaction) {
                throw new \RuntimeException("Transaction not found: {$transactionId}");
            }

            $rejectableStatuses = ['pending_approval', 'ai_flagged'];
            if (!in_array($transaction->status, $rejectableStatuses)) {
                throw new \RuntimeException(
                    "Transaction {$transaction->transaction_code} cannot be rejected (current status: {$transaction->status})."
                );
            }

            if ($transaction->created_by && $transaction->created_by === $rejectedByUserId) {
                throw new \RuntimeException("Maker cannot be Checker. You cannot reject a transaction you created.");
            }

            DB::table('transactions')
                ->where('id', $transactionId)
                ->update([
                    'status'     => 'rejected',
                    'updated_at' => now(),
                ]);

            Log::info("Transaction rejected: {$transaction->transaction_code} by user {$rejectedByUserId}");

            return [
                'success'          => true,
                'transaction_code' => $transaction->transaction_code,
                'new_status'       => 'rejected',
            ];
        });
    }

    private function nextJournalEntryNumber(string $period): string
    {
        $maxEntry = DB::table('journal_entries')
            ->where('entry_number', 'like', "JE-{$period}-%")
            ->orderBy('entry_number', 'desc')
            ->value('entry_number');

        $startSequence = 0;
        if ($maxEntry) {
            $parts = explode('-', $maxEntry);
            if (count($parts) === 3) {
                $startSequence = (int)$parts[2];
            }
        }

        DB::table('journal_entry_sequences')->insertOrIgnore([
            'period'        => $period,
            'last_sequence' => $startSequence,
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        $sequenceRow = DB::table('journal_entry_sequences')
            ->where('period', $period)
            ->lockForUpdate()
            ->first();

        $nextSequence = $sequenceRow->last_sequence + 1;

        DB::table('journal_entry_sequences')
            ->where('period', $period)
            ->update([
                'last_sequence' => $nextSequence,
                'updated_at'    => now(),
            ]);

        return sprintf('JE-%s-%04d', $period, $nextSequence);
    }
}
