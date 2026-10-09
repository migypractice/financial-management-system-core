<?php

namespace App\Services\FinancialService;

use App\Models\BankAccount;
use App\Models\ChartOfAccount;
use App\Models\Customer;
use App\Models\Supplier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Handles the "Checker" side of the Maker-Checker workflow.
 *
 * When a Finance Manager or Super Admin approves a transaction in the React
 * dashboard, this service commits the double-entry journal record to the
 * General Ledger under strict ACID guarantees, synchronizes the relevant
 * subledger (AR Invoices & Collections for Inbound; AP Bills & Disbursements for Outbound),
 * and updates real-time Cash Management bank account balances.
 */
class FinancialService
{
    /**
     * Post an approved transaction to the General Ledger and synchronize subledgers.
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

            // 4. Synchronize Subledgers (AR/Collections or AP/Disbursements), update Cash Management, and post GL lines
            $this->syncSubledgersAndLedgerLines($transaction, $journalEntryId, $approvedByUserId);

            // 5. Update the transaction to posted
            DB::table('transactions')
                ->where('id', $transactionId)
                ->update([
                    'status'      => 'posted',
                    'approved_by' => $approvedByUserId,
                    'approved_at' => now(),
                    'posted_at'   => now(),
                    'updated_at'  => now(),
                ]);

            Log::info("GL posted: {$entryNumber} for transaction {$transaction->transaction_code} (Subledgers & Cash synchronized)");

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

            if (!$transaction->created_by) {
                throw new \RuntimeException("Orphaned transaction lacks a Maker identity.");
            }

            if ($transaction->created_by === $approvedByUserId) {
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

            if (!$transaction->created_by) {
                throw new \RuntimeException("Orphaned transaction lacks a Maker identity.");
            }

            if ($transaction->created_by === $rejectedByUserId) {
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

    /**
     * Synchronize subledgers (AP/AR/Cash/Disbursements) and create balanced double-entry GL lines.
     */
    private function syncSubledgersAndLedgerLines(object $transaction, string $journalEntryId, string $approvedByUserId): void
    {
        $metadata = is_string($transaction->metadata) ? json_decode($transaction->metadata, true) : (array) ($transaction->metadata ?? []);
        $amount = (float) $transaction->amount;
        $taxAmount = (float) ($transaction->tax_amount ?? 0);
        $now = now();
        $dateStr = $now->toDateString();

        $cashCoa = $this->resolveChartOfAccount('1010-CASH', 'Cash and Cash Equivalents', 'ASSET', 'DEBIT');

        if ($transaction->type === 'INCOME') {
            // =========================================================================
            // INBOUND REVENUE PIPELINE: AR Invoice -> Collection -> Cash Inflow -> GL
            // =========================================================================

            // 1. Resolve Customer
            $customerName = $metadata['customer_name'] ?? 'E-Commerce Online Customers';
            $customer = Customer::firstOrCreate(
                ['customer_code' => 'CUST-ECOM'],
                [
                    'name'               => $customerName,
                    'company_name'       => 'Online Store Retail Clients',
                    'email'              => 'ecommerce@hardware.ph',
                    'phone'              => '+63 917 888 2000',
                    'address'            => 'Metro Manila, Philippines',
                    'credit_limit'       => 1000000.00,
                    'payment_terms_days' => 0,
                ]
            );

            // 2. Resolve Revenue Account & Tax Account
            $revCoa = $this->resolveChartOfAccount('4000-REV', 'Sales Revenue — Hardware & E-Commerce', 'REVENUE', 'CREDIT');
            $taxCoa = $this->resolveChartOfAccount('2020-TAX', 'Value Added Tax Payable (VAT)', 'LIABILITY', 'CREDIT');

            // 3. Resolve Destination Bank Account (Cash Management)
            $funding = $metadata['funding_account'] ?? '';
            $bankAccount = $this->resolveBankAccount($funding, 'Receivables');

            // 4. Create AR Invoice (Displays in Accounts Receivable module)
            $invNumber = 'INV-' . $now->format('Ym') . '-' . strtoupper(Str::random(5));
            $invoiceId = (string) Str::uuid();

            DB::table('ar_invoices')->insert([
                'id'                  => $invoiceId,
                'invoice_number'      => $invNumber,
                'customer_id'         => $customer->id,
                'chart_of_account_id' => $revCoa->id,
                'invoice_date'        => $dateStr,
                'due_date'            => $dateStr,
                'total_amount'        => $amount,
                'paid_amount'         => $amount,
                'balance'             => 0.00,
                'description'         => $transaction->description,
                'status'              => 'PAID',
                'created_by'          => $transaction->created_by ?? $approvedByUserId,
                'created_at'          => $now,
                'updated_at'          => $now,
            ]);

            // 5. Create Collection (Displays in Cash & Collections)
            $colNumber = 'CR-' . $now->format('Ym') . '-' . strtoupper(Str::random(5));
            $collectionId = (string) Str::uuid();

            DB::table('collections')->insert([
                'id'                => $collectionId,
                'collection_number' => $colNumber,
                'ar_invoice_id'     => $invoiceId,
                'bank_account_id'   => $bankAccount->id,
                'amount'            => $amount,
                'collection_date'   => $dateStr,
                'payment_method'    => 'BANK_TRANSFER',
                'reference_number'  => $transaction->external_reference_id ?? $transaction->transaction_code,
                'collected_by'      => $approvedByUserId,
                'journal_entry_id'  => $journalEntryId,
                'created_at'        => $now,
                'updated_at'        => $now,
            ]);

            // 6. CASH MANAGEMENT: Real Inflow to Bank Account Balance
            $bankAccount->increment('current_balance', $amount);

            // 7. Balanced Double-Entry Journal Lines (GL)
            // DEBIT: 1010-CASH (Cash at Bank Asset increases)
            DB::table('journal_entry_lines')->insert([
                'id'                  => (string) Str::uuid(),
                'journal_entry_id'    => $journalEntryId,
                'chart_of_account_id' => $cashCoa->id,
                'debit'               => $amount,
                'credit'              => 0.00,
                'description'         => "Collection #{$colNumber} - Inflow to {$bankAccount->account_name}",
                'created_at'          => $now,
                'updated_at'          => $now,
            ]);

            $netRevAmount = max(0, $amount - $taxAmount);
            // CREDIT: 4000-REV (Revenue increases)
            DB::table('journal_entry_lines')->insert([
                'id'                  => (string) Str::uuid(),
                'journal_entry_id'    => $journalEntryId,
                'chart_of_account_id' => $revCoa->id,
                'debit'               => 0.00,
                'credit'              => $netRevAmount,
                'description'         => "Revenue: {$transaction->description}",
                'created_at'          => $now,
                'updated_at'          => $now,
            ]);

            // CREDIT: 2020-TAX (Output VAT Liability if applicable)
            if ($taxAmount > 0) {
                DB::table('journal_entry_lines')->insert([
                    'id'                  => (string) Str::uuid(),
                    'journal_entry_id'    => $journalEntryId,
                    'chart_of_account_id' => $taxCoa->id,
                    'debit'               => 0.00,
                    'credit'              => $taxAmount,
                    'description'         => "12% Output VAT on {$invNumber}",
                    'created_at'          => $now,
                    'updated_at'          => $now,
                ]);
            }

        } else {
            // =========================================================================
            // OUTBOUND EXPENSE PIPELINE: AP Bill -> PR -> Disbursement -> Cash Outflow -> GL
            // =========================================================================

            // 1. Resolve Payee / Supplier
            $payeeInfo = $metadata['payee_info'] ?? [];
            $payeeName = $payeeInfo['name'] ?? null;
            if (!$payeeName) {
                $payeeName = match ($transaction->source_module) {
                    'HRMS'             => 'Corporate Staff Payroll',
                    'FLEET'            => 'Shell Fleet & Logistics',
                    'FACILITIES_LEGAL' => 'Meralco Commercial Power',
                    'SUPPLY_CHAIN'     => 'Holcim Philippines Inc.',
                    default            => 'Corporate Commercial Payee',
                };
            }

            $supplier = Supplier::where('name', 'like', "%{$payeeName}%")->first();
            if (!$supplier) {
                $supplier = Supplier::create([
                    'supplier_code'      => 'SUPP-' . strtoupper(Str::random(4)),
                    'name'               => $payeeName,
                    'company_name'       => $payeeName,
                    'email'              => 'vendor@smartchain.ph',
                    'phone'              => '+63 2 8222 3333',
                    'address'            => 'Metro Manila, Philippines',
                    'payment_terms_days' => 15,
                ]);
            }

            // 2. Resolve Expense Account
            $coaCode = match ($transaction->source_module) {
                'HRMS'             => '5100-EXP-SALARY',
                'SUPPLY_CHAIN'     => '1200-INV',
                'FLEET'            => '5400-EXP-LOGISTICS',
                'FACILITIES_LEGAL' => '5200-EXP-UTIL',
                default            => '5500-EXP-SUPPLIES',
            };
            if (!empty($transaction->ai_suggested_gl_code)) {
                $found = ChartOfAccount::where('code', $transaction->ai_suggested_gl_code)->first();
                if ($found) $coaCode = $found->code;
            }
            $expenseCoa = $this->resolveChartOfAccount($coaCode, 'Department Operating Expense', 'EXPENSE', 'DEBIT');

            // 3. Resolve Funding Bank Account (Cash Management)
            $funding = $metadata['funding_account'] ?? '';
            $bankAccount = $this->resolveBankAccount($funding, 'Disbursement');

            // 4. Create AP Bill (Displays in Accounts Payable module)
            $billNumber = 'BILL-' . $now->format('Ym') . '-' . strtoupper(Str::random(5));
            $billId = (string) Str::uuid();

            DB::table('ap_bills')->insert([
                'id'                  => $billId,
                'bill_number'         => $billNumber,
                'supplier_id'         => $supplier->id,
                'chart_of_account_id' => $expenseCoa->id,
                'bill_date'           => $dateStr,
                'due_date'            => $dateStr,
                'total_amount'        => $amount,
                'paid_amount'         => $amount,
                'balance'             => 0.00,
                'category_type'       => $transaction->category_type ?? 'SUPPLIER_INVOICE',
                'description'         => $transaction->description,
                'status'              => 'PAID',
                'created_by'          => $transaction->created_by ?? $approvedByUserId,
                'journal_entry_id'    => $journalEntryId,
                'created_at'          => $now,
                'updated_at'          => $now,
            ]);

            // 5. Create Payment Request (Approved voucher tracking)
            $reqNumber = 'PR-' . $now->format('Ym') . '-' . strtoupper(Str::random(5));
            $requestId = (string) Str::uuid();

            DB::table('payment_requests')->insert([
                'id'             => $requestId,
                'request_number' => $reqNumber,
                'ap_bill_id'     => $billId,
                'payee_name'     => $payeeName,
                'amount'         => $amount,
                'purpose'        => $transaction->description,
                'requested_by'   => $transaction->created_by ?? $approvedByUserId,
                'status'         => 'DISBURSED',
                'approved_by'    => $approvedByUserId,
                'approved_at'    => $now,
                'transaction_id' => $transaction->id,
                'created_at'     => $now,
                'updated_at'     => $now,
            ]);

            // 6. Create Disbursement Record (Displays in Disbursements module)
            $disbNumber = 'DISB-' . $now->format('Ym') . '-' . strtoupper(Str::random(5));
            $disbId = (string) Str::uuid();

            DB::table('disbursements')->insert([
                'id'                  => $disbId,
                'disbursement_number' => $disbNumber,
                'payment_request_id'  => $requestId,
                'bank_account_id'     => $bankAccount->id,
                'amount'              => $amount,
                'disbursement_date'   => $dateStr,
                'payment_method'      => 'BANK_TRANSFER',
                'reference_number'    => $transaction->external_reference_id ?? $transaction->transaction_code,
                'disbursed_by'        => $approvedByUserId,
                'journal_entry_id'    => $journalEntryId,
                'created_at'          => $now,
                'updated_at'          => $now,
            ]);

            // 7. CASH MANAGEMENT: Real Outflow from Bank Account Balance
            $bankAccount->decrement('current_balance', $amount);

            // 8. Balanced Double-Entry Journal Lines (GL)
            // DEBIT: Expense Account (Increases departmental expense)
            DB::table('journal_entry_lines')->insert([
                'id'                  => (string) Str::uuid(),
                'journal_entry_id'    => $journalEntryId,
                'chart_of_account_id' => $expenseCoa->id,
                'debit'               => $amount,
                'credit'              => 0.00,
                'description'         => "Disbursement #{$disbNumber} - {$transaction->description}",
                'created_at'          => $now,
                'updated_at'          => $now,
            ]);

            // CREDIT: 1010-CASH (Cash at Bank Asset decreases)
            DB::table('journal_entry_lines')->insert([
                'id'                  => (string) Str::uuid(),
                'journal_entry_id'    => $journalEntryId,
                'chart_of_account_id' => $cashCoa->id,
                'debit'               => 0.00,
                'credit'              => $amount,
                'description'         => "Disbursed via {$bankAccount->account_name}",
                'created_at'          => $now,
                'updated_at'          => $now,
            ]);
        }
    }

    private function resolveBankAccount(?string $funding, string $defaultType = 'Operating'): BankAccount
    {
        $bankAccount = null;
        if ($funding) {
            $bankAccount = BankAccount::where('account_name', 'like', "%{$funding}%")
                ->orWhere('bank_name', 'like', "%{$funding}%")
                ->orWhere('account_number', 'like', "%{$funding}%")
                ->first();
        }

        if (!$bankAccount) {
            $bankAccount = BankAccount::where('account_type', $defaultType)->first()
                ?? BankAccount::first();
        }

        if (!$bankAccount) {
            $bankAccount = BankAccount::create([
                'id'                => (string) Str::uuid(),
                'account_name'      => 'BDO Corporate Operating',
                'bank_name'         => 'Banco De Oro (BDO)',
                'account_number'    => '1092-8821-4401',
                'account_type'      => 'Operating',
                'beginning_balance' => 2500000.00,
                'current_balance'   => 2500000.00,
                'currency'          => 'PHP',
                'is_active'         => true,
            ]);
        }

        return $bankAccount;
    }

    private function resolveChartOfAccount(string $code, string $name, string $type, string $normalBalance = 'DEBIT'): ChartOfAccount
    {
        return ChartOfAccount::firstOrCreate(
            ['code' => $code],
            [
                'name'           => $name,
                'type'           => $type,
                'normal_balance' => $normalBalance,
                'description'    => "System chart of account for {$name}",
            ]
        );
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
