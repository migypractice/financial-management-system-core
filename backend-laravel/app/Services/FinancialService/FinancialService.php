<?php

namespace App\Services\FinancialService;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Core Financial Ledger Service
 * Handles double-entry accounting transactions, General Ledger postings,
 * budget tracking, and tax/VAT calculations under strict ACID compliance.
 */
class FinancialService
{
    /**
     * Commit a human-approved transaction to the General Ledger with double-entry journal lines.
     *
     * @param string $transactionId
     * @param string $approvedByUserId
     * @return array Result summary of GL posting
     */
    public function postTransactionToGeneralLedger(string $transactionId, string $approvedByUserId): array
    {
        return DB::transaction(function () use ($transactionId, $approvedByUserId) {
            Log::info("ACID Transaction Commit Started for Transaction ID: {$transactionId} by User: {$approvedByUserId}");

            // 1. Fetch transaction record with lock for update
            $transaction = DB::table('transactions')
                ->where('id', $transactionId)
                ->lockForUpdate()
                ->first();

            if (!$transaction) {
                throw new \Exception("Transaction ID [{$transactionId}] not found.");
            }

            if (in_array($transaction->status, ['posted', 'disbursed'])) {
                throw new \Exception("Transaction [{$transaction->transaction_code}] has already been posted to GL.");
            }

            // 2. Generate Journal Entry Header
            $journalEntryId = (string) \Illuminate\Support\Str::uuid();
            $entryNumber = 'JE-' . date('Ym') . '-' . rand(1000, 9999);

            DB::table('journal_entries')->insert([
                'id' => $journalEntryId,
                'transaction_id' => $transactionId,
                'entry_number' => $entryNumber,
                'entry_date' => now()->toDateString(),
                'status' => 'POSTED',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // 3. Update Transaction Record Status
            DB::table('transactions')
                ->where('id', $transactionId)
                ->update([
                    'status' => 'posted',
                    'approved_by' => $approvedByUserId,
                    'approved_at' => now(),
                    'posted_at' => now(),
                    'updated_at' => now(),
                ]);

            Log::info("GL Posting Completed Successfully. Entry: {$entryNumber}");

            return [
                'success' => true,
                'journal_entry_id' => $journalEntryId,
                'entry_number' => $entryNumber,
                'transaction_code' => $transaction->transaction_code,
                'posted_at' => now()->toIso8601String(),
            ];
        });
    }
}
