<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\ArInvoice;
use App\Models\Attachment;
use App\Models\BankAccount;
use App\Models\ChartOfAccount;
use App\Models\Collection;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\Subsystem;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CollectionController extends Controller
{
    public function index(): JsonResponse
    {
        $collections = Collection::with(['invoice.customer', 'bankAccount', 'collector', 'attachments'])
            ->orderByDesc('collection_date')
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Collection $c) {
                return [
                    'id'                => $c->id,
                    'collection_number' => $c->collection_number,
                    'ar_invoice_id'     => $c->ar_invoice_id,
                    'invoice_number'    => $c->invoice?->invoice_number,
                    'customer_name'     => $c->invoice?->customer?->name ?? 'Customer',
                    'bank_account_id'   => $c->bank_account_id,
                    'bank_name'         => $c->bankAccount?->bank_name,
                    'account_name'      => $c->bankAccount?->account_name,
                    'amount'            => (float) $c->amount,
                    'collection_date'   => $c->collection_date->toDateString(),
                    'payment_method'    => $c->payment_method,
                    'reference_number'  => $c->reference_number,
                    'collected_by_name' => $c->collector?->name,
                    'attachments'       => $c->attachments->map(fn ($a) => [
                        'id'            => $a->id,
                        'file_name'     => $a->file_name,
                        'file_url'      => asset('storage/' . $a->file_path),
                        'mime_type'     => $a->mime_type,
                        'document_type' => $a->document_type,
                    ]),
                ];
            });

        $totalCollected = $collections->sum('amount');

        return response()->json([
            'success' => true,
            'data'    => $collections,
            'summary' => [
                'total_collected' => (float) $totalCollected,
                'count'           => $collections->count(),
            ],
        ]);
    }

    public function collect(ArInvoice $arInvoice, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount'           => 'required|numeric|min:0.01',
            'bank_account_id'  => 'required|exists:bank_accounts,id',
            'payment_method'   => 'required|string|in:CASH,CHECK,BANK_TRANSFER,GCASH,ONLINE',
            'reference_number' => 'nullable|string|max:100',
            'collection_date'  => 'nullable|date',
            'attachment'       => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        $amount = (float) $validated['amount'];

        if ($arInvoice->balance <= 0) {
            throw ValidationException::withMessages([
                'amount' => ["Invoice #{$arInvoice->invoice_number} has already been fully paid."],
            ]);
        }

        if ($amount > (float) $arInvoice->balance) {
            throw ValidationException::withMessages([
                'amount' => ["Collection amount (PHP " . number_format($amount, 2) . ") exceeds invoice balance (PHP " . number_format($arInvoice->balance, 2) . ")."],
            ]);
        }

        return DB::transaction(function () use ($arInvoice, $validated, $amount, $request) {
            $user = $request->user();
            $bankAccount = BankAccount::findOrFail($validated['bank_account_id']);
            $arAccount = ChartOfAccount::where('code', '1020-AR')->firstOrFail();
            $cashAccount = ChartOfAccount::where('code', '1010-CASH')->firstOrFail();

            // 1. Generate Collection Number
            $count = DB::table('collections')->count() + 1;
            $collectionNumber = sprintf('CR-%s-%04d', now()->format('Ym'), $count);

            $collection = Collection::create([
                'collection_number' => $collectionNumber,
                'ar_invoice_id'     => $arInvoice->id,
                'bank_account_id'   => $bankAccount->id,
                'amount'            => $amount,
                'collection_date'   => $validated['collection_date'] ?? now()->toDateString(),
                'payment_method'    => $validated['payment_method'],
                'reference_number'  => $validated['reference_number'] ?? null,
                'collected_by'      => $user?->id,
            ]);

            // 2. Handle Attached Proof of Payment / Official Receipt
            if ($request->hasFile('attachment')) {
                $file = $request->file('attachment');
                $path = $file->store('attachments/collections', 'public');

                $collection->attachments()->create([
                    'file_name'     => $file->getClientOriginalName(),
                    'file_path'     => $path,
                    'mime_type'     => $file->getClientMimeType(),
                    'file_size'     => $file->getSize(),
                    'document_type' => 'OFFICIAL_RECEIPT',
                    'uploaded_by'   => $user?->id,
                ]);
            }

            // 3. Update Invoice Balance and Status
            $newPaid = (float) $arInvoice->paid_amount + $amount;
            $newBalance = max(0, (float) $arInvoice->balance - $amount);
            $newStatus = $newBalance <= 0 ? 'PAID' : 'PARTIAL';

            $arInvoice->update([
                'paid_amount' => $newPaid,
                'balance'     => $newBalance,
                'status'      => $newStatus,
            ]);

            // 4. Increment Bank Account Cash Balance
            $bankAccount->increment('current_balance', $amount);

            // 5. Post Balanced Double-Entry GL Journal Entry (Debit 1010-CASH, Credit 1110-AR)
            $glModule = Subsystem::where('slug', 'accounts-receivable')->first()
                     ?? Subsystem::where('slug', 'general-ledger')->first();

            $txnCode = 'TXN-COL-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6));

            $txn = Transaction::create([
                'id'                    => (string) Str::uuid(),
                'transaction_code'      => $txnCode,
                'subsystem_id'          => $glModule?->id ?? (string) Str::uuid(),
                'source_module'         => 'COLLECTIONS',
                'category_type'         => 'PAYMENT_COLLECTION',
                'external_reference_id' => $collectionNumber,
                'type'                  => 'INCOME',
                'amount'                => $amount,
                'net_amount'            => $amount,
                'currency'              => 'PHP',
                'description'           => "Customer Collection for Invoice #{$arInvoice->invoice_number} deposited to {$bankAccount->account_name}",
                'status'                => 'posted',
                'ai_confidence_score'   => 0.9950,
                'ai_suggested_gl_code'  => '1010-CASH',
                'ai_suggested_gl_name'  => 'Cash and Cash Equivalents',
                'ai_anomaly_flag'       => false,
                'created_by'            => $user?->id,
                'approved_by'           => $user?->id,
                'approved_at'           => now(),
                'posted_at'             => now(),
            ]);

            $entryNumber = sprintf('JE-%s-CR%s', now()->format('Ym'), strtoupper(Str::random(4)));
            $je = JournalEntry::create([
                'id'             => (string) Str::uuid(),
                'transaction_id' => $txn->id,
                'entry_number'   => $entryNumber,
                'entry_date'     => $collection->collection_date,
                'status'         => 'POSTED',
            ]);

            // Debit Line: Cash at Bank (Asset increases)
            JournalEntryLine::create([
                'journal_entry_id'    => $je->id,
                'chart_of_account_id' => $cashAccount->id,
                'debit'               => $amount,
                'credit'              => 0.00,
                'description'         => "Collection #{$collectionNumber} - Cash deposited in {$bankAccount->bank_name}",
            ]);

            // Credit Line: Accounts Receivable (Asset decreases)
            JournalEntryLine::create([
                'journal_entry_id'    => $je->id,
                'chart_of_account_id' => $arAccount->id,
                'debit'               => 0.00,
                'credit'              => $amount,
                'description'         => "Collection #{$collectionNumber} - Settle Invoice #{$arInvoice->invoice_number}",
            ]);

            return response()->json([
                'success' => true,
                'message' => "Collection of PHP " . number_format($amount, 2) . " recorded, bank account updated, and posted to General Ledger.",
                'data'    => $collection->load(['bankAccount', 'attachments']),
            ], 201);
        });
    }
}
