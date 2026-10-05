<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\ApBill;
use App\Models\BankAccount;
use App\Models\ChartOfAccount;
use App\Models\Disbursement;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\PaymentRequest;
use App\Models\Subsystem;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DisbursementController extends Controller
{
    public function index(): JsonResponse
    {
        $disbursements = Disbursement::with(['paymentRequest.bill.supplier', 'bankAccount', 'disburser', 'journalEntry.lines.chartOfAccount', 'paymentRequest.attachments'])
            ->orderByDesc('disbursement_date')
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Disbursement $d) {
                return [
                    'id'                  => $d->id,
                    'disbursement_number' => $d->disbursement_number,
                    'payment_request_id'  => $d->payment_request_id,
                    'request_number'      => $d->paymentRequest?->request_number,
                    'payee_name'          => $d->paymentRequest?->payee_name,
                    'purpose'             => $d->paymentRequest?->purpose,
                    'bill_number'         => $d->paymentRequest?->bill?->bill_number,
                    'bank_account_id'     => $d->bank_account_id,
                    'bank_name'           => $d->bankAccount?->bank_name,
                    'account_name'        => $d->bankAccount?->account_name,
                    'amount'              => (float) $d->amount,
                    'disbursement_date'   => $d->disbursement_date->toDateString(),
                    'payment_method'      => $d->payment_method,
                    'reference_number'    => $d->reference_number,
                    'disbursed_by_name'   => $d->disburser?->name,
                    'journal_entry_num'   => $d->journalEntry?->entry_number,
                    'attachments'         => $d->paymentRequest?->attachments->map(fn ($a) => [
                        'id'        => $a->id,
                        'file_name' => $a->file_name,
                        'file_url'  => asset('storage/' . $a->file_path),
                        'mime_type' => $a->mime_type,
                    ]),
                ];
            });

        $totalDisbursed = $disbursements->sum('amount');

        return response()->json([
            'success' => true,
            'data'    => $disbursements,
            'summary' => [
                'total_disbursed' => (float) $totalDisbursed,
                'count'           => $disbursements->count(),
            ],
        ]);
    }

    public function disburse(PaymentRequest $paymentRequest, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'bank_account_id'  => 'required|exists:bank_accounts,id',
            'payment_method'   => 'required|string|in:CHECK,BANK_TRANSFER,ONLINE,CASH',
            'reference_number' => 'nullable|string|max:100',
        ]);

        if ($paymentRequest->status !== 'APPROVED') {
            return response()->json([
                'success' => false,
                'message' => "Cannot disburse: Payment request status is '{$paymentRequest->status}' (Must be APPROVED by Manager first).",
            ], 422);
        }

        $bankAccount = BankAccount::findOrFail($validated['bank_account_id']);
        $amount = (float) $paymentRequest->amount;

        if ($bankAccount->current_balance < $amount) {
            throw ValidationException::withMessages([
                'bank_account_id' => [
                    "Insufficient bank funds. {$bankAccount->account_name} has PHP " . number_format($bankAccount->current_balance, 2) . ", required PHP " . number_format($amount, 2) . "."
                ],
            ]);
        }

        return DB::transaction(function () use ($paymentRequest, $validated, $bankAccount, $amount, $request) {
            $user = $request->user();
            $count = DB::table('disbursements')->count() + 1;
            $disbNumber = sprintf('DISB-%s-%04d', now()->format('Ym'), $count);

            // 1. Deduct real Cash from selected Bank Account
            $bankAccount->decrement('current_balance', $amount);

            // 2. Reduce AP Bill balance if linked
            if ($paymentRequest->ap_bill_id) {
                $bill = ApBill::lockForUpdate()->find($paymentRequest->ap_bill_id);
                if ($bill) {
                    $newPaid = $bill->paid_amount + $amount;
                    $newBalance = max(0, $bill->total_amount - $newPaid);
                    $newStatus = ($newBalance <= 0) ? 'PAID' : 'PARTIAL';

                    $bill->update([
                        'paid_amount' => $newPaid,
                        'balance'     => $newBalance,
                        'status'      => $newStatus,
                    ]);
                }
            }

            // 3. Create Balanced Double-Entry Journal Entry
            $cashCoa = ChartOfAccount::where('code', '1010-CASH')->firstOrFail();
            $apCoa   = ChartOfAccount::where('code', '2010-AP')->firstOrFail();

            $disbModule = Subsystem::where('slug', 'disbursement-management')->first()
                       ?? Subsystem::where('slug', 'general-ledger')->first();

            $txnCode = 'TXN-DISB-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6));

            $txn = Transaction::create([
                'id'                    => (string) Str::uuid(),
                'transaction_code'      => $txnCode,
                'subsystem_id'          => $disbModule?->id ?? (string) Str::uuid(),
                'source_module'         => 'DISBURSEMENT_MANAGEMENT',
                'category_type'         => 'SUPPLIER_PAYMENT',
                'external_reference_id' => $disbNumber,
                'type'                  => 'EXPENSE',
                'amount'                => $amount,
                'net_amount'            => $amount,
                'currency'              => 'PHP',
                'description'           => "Disbursement released for {$paymentRequest->payee_name} via {$bankAccount->account_name}: {$paymentRequest->purpose}",
                'status'                => 'posted',
                'ai_confidence_score'   => 0.9800,
                'ai_suggested_gl_code'  => $apCoa->code,
                'ai_suggested_gl_name'  => $apCoa->name,
                'ai_anomaly_flag'       => false,
                'created_by'            => $user->id,
                'approved_by'           => $user->id,
                'approved_at'           => now(),
                'posted_at'             => now(),
            ]);

            $entryNumber = sprintf('JE-%s-%04d', now()->format('Ym'), DB::table('journal_entries')->count() + 1);
            $je = JournalEntry::create([
                'id'             => (string) Str::uuid(),
                'transaction_id' => $txn->id,
                'entry_number'   => $entryNumber,
                'entry_date'     => now()->toDateString(),
                'status'         => 'POSTED',
            ]);

            // Balanced Double Entry Lines:
            // DEBIT: Accounts Payable (Liability decreases)
            JournalEntryLine::create([
                'journal_entry_id'    => $je->id,
                'chart_of_account_id' => $apCoa->id,
                'debit'               => $amount,
                'credit'              => 0.00,
                'description'         => "Disbursement #{$disbNumber} - AP settlement to {$paymentRequest->payee_name}",
            ]);

            // CREDIT: Cash in Bank (Asset decreases)
            JournalEntryLine::create([
                'journal_entry_id'    => $je->id,
                'chart_of_account_id' => $cashCoa->id,
                'debit'               => 0.00,
                'credit'              => $amount,
                'description'         => "Disbursement #{$disbNumber} - Drawn from {$bankAccount->account_name}",
            ]);

            // 4. Create Disbursement Record
            $disbursement = Disbursement::create([
                'disbursement_number' => $disbNumber,
                'payment_request_id'  => $paymentRequest->id,
                'bank_account_id'     => $bankAccount->id,
                'amount'              => $amount,
                'disbursement_date'   => now()->toDateString(),
                'payment_method'      => $validated['payment_method'],
                'reference_number'    => $validated['reference_number'] ?? null,
                'disbursed_by'        => $user->id,
                'journal_entry_id'    => $je->id,
            ]);

            // 5. Update Payment Request status
            $paymentRequest->update([
                'status' => 'DISBURSED',
            ]);

            return response()->json([
                'success' => true,
                'message' => "Payment #{$disbNumber} disbursed successfully. Cash deducted from {$bankAccount->account_name} and posted to General Ledger.",
                'data'    => $disbursement->load(['bankAccount', 'journalEntry']),
            ], 201);
        });
    }
}
