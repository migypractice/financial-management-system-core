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

            // 2. Generate a sequential journal entry number
            $lastEntry = DB::table('journal_entries')
                ->where('entry_number', 'like', 'JE-' . date('Ym') . '-%')
                ->orderByDesc('entry_number')
                ->value('entry_number');

            $sequence = 1;
            if ($lastEntry) {
                $parts = explode('-', $lastEntry);
                $sequence = ((int) end($parts)) + 1;
            }
            $entryNumber = sprintf('JE-%s-%04d', date('Ym'), $sequence);

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
}
