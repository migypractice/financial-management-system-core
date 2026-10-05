<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use App\Models\ChartOfAccount;
use App\Models\Collection;
use App\Models\Disbursement;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BankAccountController extends Controller
{
    /**
     * List all active corporate bank accounts with calculated inflows and outflows.
     */
    public function index(): JsonResponse
    {
        $accounts = BankAccount::where('is_active', true)
            ->with('chartOfAccount')
            ->orderBy('bank_name')
            ->get()
            ->map(function (BankAccount $account) {
                $inflows = (float) $account->collections()->sum('amount');
                $outflows = (float) $account->disbursements()->sum('amount');

                return [
                    'id'                    => $account->id,
                    'account_name'          => $account->account_name,
                    'bank_name'             => $account->bank_name,
                    'account_number'        => $account->account_number,
                    'account_type'          => $account->account_type,
                    'beginning_balance'     => (float) $account->beginning_balance,
                    'current_balance'       => (float) $account->current_balance,
                    'total_inflows'         => $inflows,
                    'total_outflows'        => $outflows,
                    'currency'              => $account->currency,
                    'chart_of_account_code' => $account->chartOfAccount?->code,
                    'chart_of_account_name' => $account->chartOfAccount?->name,
                    'reconciliation_status' => 'Reconciled',
                    'updated_at'            => $account->updated_at?->toIso8601String(),
                ];
            });

        $totalBalance = $accounts->sum('current_balance');
        $totalInflows = (float) Collection::sum('amount');
        $totalOutflows = (float) Disbursement::sum('amount');

        return response()->json([
            'success' => true,
            'data'    => $accounts,
            'summary' => [
                'total_cash_in_bank' => (float) $totalBalance,
                'total_inflows'      => $totalInflows,
                'total_outflows'     => $totalOutflows,
                'net_cash_flow'      => $totalInflows - $totalOutflows,
                'account_count'      => $accounts->count(),
            ],
        ]);
    }

    /**
     * Unified Bank Transaction Ledger (Collections Inflow + Disbursements Outflow).
     */
    public function transactions(Request $request): JsonResponse
    {
        $bankAccountId = $request->query('bank_account_id');

        $disbursementsQuery = Disbursement::with(['paymentRequest.bill.supplier', 'bankAccount', 'attachments']);
        $collectionsQuery = Collection::with(['invoice.customer', 'bankAccount', 'attachments']);

        if ($bankAccountId) {
            $disbursementsQuery->where('bank_account_id', $bankAccountId);
            $collectionsQuery->where('bank_account_id', $bankAccountId);
        }

        $disbursements = $disbursementsQuery->get()->map(function ($d) {
            return [
                'id'               => $d->id,
                'flow_type'        => 'OUTFLOW',
                'type'             => 'Disbursement / Bill Payment',
                'date'             => $d->disbursement_date?->toDateString() ?? $d->created_at->toDateString(),
                'reference_number' => $d->reference_number ?? $d->disbursement_number,
                'bank_id'          => $d->bank_account_id,
                'bank_name'        => $d->bankAccount?->bank_name,
                'account_number'   => $d->bankAccount?->account_number,
                'party_name'       => $d->paymentRequest?->payee_name ?? $d->paymentRequest?->bill?->supplier?->name ?? 'Supplier Payee',
                'description'      => "Disbursement for {$d->paymentRequest?->purpose}",
                'amount'           => (float) $d->amount,
                'payment_method'   => $d->payment_method,
                'status'           => 'CLEARED',
                'attachment'       => $d->attachments->first()?->file_path ? asset('storage/' . $d->attachments->first()->file_path) : null,
            ];
        });

        $collections = $collectionsQuery->get()->map(function ($c) {
            return [
                'id'               => $c->id,
                'flow_type'        => 'INFLOW',
                'type'             => 'Receivable Collection',
                'date'             => $c->collection_date?->toDateString() ?? $c->created_at->toDateString(),
                'reference_number' => $c->reference_number ?? $c->collection_number,
                'bank_id'          => $c->bank_account_id,
                'bank_name'        => $c->bankAccount?->bank_name,
                'account_number'   => $c->bankAccount?->account_number,
                'party_name'       => $c->invoice?->customer?->name ?? 'Customer Client',
                'description'      => "Payment collection for Invoice #{$c->invoice?->invoice_number}",
                'amount'           => (float) $c->amount,
                'payment_method'   => $c->payment_method,
                'status'           => 'CLEARED',
                'attachment'       => $c->attachments->first()?->file_path ? asset('storage/' . $c->attachments->first()->file_path) : null,
            ];
        });

        $unified = $disbursements->concat($collections)->sortByDesc('date')->values();

        return response()->json([
            'success' => true,
            'data'    => $unified,
            'count'   => $unified->count(),
        ]);
    }

    /**
     * Inter-bank Fund Transfer (Double-entry Cash to Cash posting).
     */
    public function transfer(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from_bank_account_id' => 'required|uuid|different:to_bank_account_id|exists:bank_accounts,id',
            'to_bank_account_id'   => 'required|uuid|exists:bank_accounts,id',
            'amount'               => 'required|numeric|min:1',
            'transfer_date'        => 'required|date',
            'reference_number'     => 'nullable|string|max:100',
            'notes'                => 'nullable|string|max:500',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $fromAccount = BankAccount::lockForUpdate()->findOrFail($validated['from_bank_account_id']);
            $toAccount = BankAccount::lockForUpdate()->findOrFail($validated['to_bank_account_id']);

            if ((float) $fromAccount->current_balance < (float) $validated['amount']) {
                return response()->json([
                    'success' => false,
                    'message' => "Insufficient balance in {$fromAccount->bank_name}. Available: PHP " . number_format($fromAccount->current_balance, 2),
                ], 422);
            }

            $fromAccount->decrement('current_balance', $validated['amount']);
            $toAccount->increment('current_balance', $validated['amount']);

            $cashCoa = ChartOfAccount::where('code', '1010-CASH')->firstOrFail();

            $user = $request->user();
            $reference = $validated['reference_number'] ?? ('TRF-' . time());
            $notes = $validated['notes'] ?? '';
            $subsystem = \App\Models\Subsystem::first();

            $txn = Transaction::create([
                'id'                    => (string) Str::uuid(),
                'transaction_code'      => 'TXN-TRF-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6)),
                'subsystem_id'          => $subsystem?->id ?? (string) Str::uuid(),
                'source_module'         => 'CASH_MANAGEMENT',
                'category_type'         => 'BANK_TRANSFER',
                'external_reference_id' => $reference,
                'type'                  => 'EXPENSE',
                'amount'                => $validated['amount'],
                'net_amount'            => $validated['amount'],
                'currency'              => 'PHP',
                'description'           => "Inter-bank Transfer from {$fromAccount->bank_name} to {$toAccount->bank_name}. " . $notes,
                'status'                => 'posted',
                'ai_confidence_score'   => 1.0000,
                'ai_suggested_gl_code'  => $cashCoa->code,
                'ai_suggested_gl_name'  => $cashCoa->name,
                'ai_anomaly_flag'       => false,
                'created_by'            => $user?->id,
                'approved_by'           => $user?->id,
                'approved_at'           => now(),
                'posted_at'             => now(),
            ]);

            $entryNumber = sprintf('JE-TRF-%s-%04d', now()->format('Ym'), DB::table('journal_entries')->count() + 1);
            $journalEntry = JournalEntry::create([
                'id'             => (string) Str::uuid(),
                'transaction_id' => $txn->id,
                'entry_number'   => $entryNumber,
                'entry_date'     => $validated['transfer_date'],
                'status'         => 'POSTED',
            ]);

            // Debit destination bank cash
            JournalEntryLine::create([
                'journal_entry_id'    => $journalEntry->id,
                'chart_of_account_id' => $cashCoa->id,
                'debit'               => $validated['amount'],
                'credit'              => 0.00,
                'description'         => "Inter-bank Transfer Inflow to {$toAccount->bank_name} ({$toAccount->account_number})",
            ]);

            // Credit source bank cash
            JournalEntryLine::create([
                'journal_entry_id'    => $journalEntry->id,
                'chart_of_account_id' => $cashCoa->id,
                'debit'               => 0.00,
                'credit'              => $validated['amount'],
                'description'         => "Inter-bank Transfer Outflow from {$fromAccount->bank_name} ({$fromAccount->account_number})",
            ]);

            return response()->json([
                'success' => true,
                'message' => "Inter-bank transfer of PHP " . number_format($validated['amount'], 2) . " executed successfully.",
                'data'    => [
                    'from_account'  => $fromAccount->fresh(),
                    'to_account'    => $toAccount->fresh(),
                    'journal_entry' => $journalEntry->load('lines'),
                ],
            ]);
        });
    }
}
