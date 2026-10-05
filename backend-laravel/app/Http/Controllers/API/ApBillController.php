<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\ApBill;
use App\Models\Attachment;
use App\Models\ChartOfAccount;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\Subsystem;
use App\Models\Supplier;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ApBillController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status');
        $supplierId = $request->query('supplier_id');

        $query = ApBill::with(['supplier', 'chartOfAccount', 'attachments', 'paymentRequests'])
            ->orderByDesc('bill_date')
            ->orderByDesc('created_at');

        if ($status && $status !== 'ALL') {
            $query->where('status', $status);
        }

        if ($supplierId) {
            $query->where('supplier_id', $supplierId);
        }

        $bills = $query->get()->map(function (ApBill $b) {
            $daysPastDue = 0;
            if (in_array($b->status, ['UNPAID', 'PARTIAL'])) {
                $due = \Carbon\Carbon::parse($b->due_date);
                if (now()->gt($due)) {
                    $daysPastDue = now()->diffInDays($due);
                }
            }

            return [
                'id'            => $b->id,
                'bill_number'   => $b->bill_number,
                'supplier_id'   => $b->supplier_id,
                'supplier_name' => $b->supplier->name ?? 'Unknown',
                'company_name'  => $b->supplier->company_name ?? '',
                'category_type' => $b->category_type,
                'account_name'  => $b->chartOfAccount->name ?? 'Merchandise Inventory',
                'bill_date'     => $b->bill_date->toDateString(),
                'due_date'      => $b->due_date->toDateString(),
                'total_amount'  => (float) $b->total_amount,
                'paid_amount'   => (float) $b->paid_amount,
                'balance'       => (float) $b->balance,
                'status'        => $b->status,
                'days_past_due' => $daysPastDue,
                'description'   => $b->description,
                'attachments'   => $b->attachments->map(fn ($a) => [
                    'id'            => $a->id,
                    'file_name'     => $a->file_name,
                    'file_url'      => asset('storage/' . $a->file_path),
                    'mime_type'     => $a->mime_type,
                    'file_size'     => $a->file_size,
                    'document_type' => $a->document_type,
                ]),
            ];
        });

        // Compute Real Aging Summary directly from database rows
        $current = 0;
        $aging30 = 0;
        $aging60 = 0;
        $aging90Plus = 0;

        foreach ($bills as $b) {
            if ($b['balance'] > 0) {
                $days = $b['days_past_due'];
                if ($days <= 0) $current += $b['balance'];
                elseif ($days <= 30) $aging30 += $b['balance'];
                elseif ($days <= 60) $aging60 += $b['balance'];
                else $aging90Plus += $b['balance'];
            }
        }

        $totalPayable = $bills->sum('balance');

        return response()->json([
            'success' => true,
            'data'    => $bills,
            'summary' => [
                'total_payable'  => (float) $totalPayable,
                'current'        => (float) $current,
                'days_1_30'      => (float) $aging30,
                'days_31_60'     => (float) $aging60,
                'days_90_plus'   => (float) $aging90Plus,
                'total_bills'    => $bills->count(),
                'unpaid_count'   => $bills->whereIn('status', ['UNPAID', 'PARTIAL', 'OVERDUE'])->count(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_id'         => 'required|exists:suppliers,id',
            'bill_number'         => 'required|string|max:50|unique:ap_bills,bill_number',
            'bill_date'           => 'required|date',
            'due_date'            => 'required|date|after_or_equal:bill_date',
            'total_amount'        => 'required|numeric|min:0.01',
            'category_type'       => 'nullable|string|max:100',
            'chart_of_account_id' => 'nullable|exists:chart_of_accounts,id',
            'description'         => 'required|string|max:1000',
            'attachment'          => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120', // max 5MB
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $user = $request->user();
            $apAccount = ChartOfAccount::where('code', '2010-AP')->firstOrFail();
            $debitAccount = !empty($validated['chart_of_account_id'])
                ? ChartOfAccount::findOrFail($validated['chart_of_account_id'])
                : ChartOfAccount::where('code', '1200-INV')->firstOrFail();

            $totalAmount = (float) $validated['total_amount'];

            // 1. Create AP Bill Record
            $bill = ApBill::create([
                'bill_number'         => strtoupper(trim($validated['bill_number'])),
                'supplier_id'         => $validated['supplier_id'],
                'chart_of_account_id' => $debitAccount->id,
                'bill_date'           => $validated['bill_date'],
                'due_date'            => $validated['due_date'],
                'total_amount'        => $totalAmount,
                'paid_amount'         => 0,
                'balance'             => $totalAmount,
                'category_type'       => $validated['category_type'] ?? 'SUPPLIER_INVOICE',
                'description'         => $validated['description'],
                'status'              => 'UNPAID',
                'created_by'          => $user?->id,
            ]);

            // 2. Handle Attached Supporting Document (if uploaded)
            if ($request->hasFile('attachment')) {
                $file = $request->file('attachment');
                $path = $file->store('attachments/bills', 'public');

                $bill->attachments()->create([
                    'file_name'     => $file->getClientOriginalName(),
                    'file_path'     => $path,
                    'mime_type'     => $file->getClientMimeType(),
                    'file_size'     => $file->getSize(),
                    'document_type' => 'SUPPLIER_INVOICE',
                    'uploaded_by'   => $user?->id,
                ]);
            }

            // 3. Post Double-Entry Journal Entry: Debit Inventory/Expense, Credit AP
            $glModule = Subsystem::where('slug', 'accounts-payable')->first()
                     ?? Subsystem::where('slug', 'general-ledger')->first();

            $txnCode = 'TXN-BILL-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6));
            $supplier = Supplier::find($validated['supplier_id']);

            $txn = Transaction::create([
                'id'                    => (string) Str::uuid(),
                'transaction_code'      => $txnCode,
                'subsystem_id'          => $glModule?->id ?? (string) Str::uuid(),
                'source_module'         => 'ACCOUNTS_PAYABLE',
                'category_type'         => $bill->category_type,
                'external_reference_id' => $bill->bill_number,
                'type'                  => 'EXPENSE',
                'amount'                => $totalAmount,
                'net_amount'            => $totalAmount,
                'currency'              => 'PHP',
                'description'           => "Supplier Bill received from {$supplier->name}: {$bill->description}",
                'status'                => 'posted',
                'ai_confidence_score'   => 0.9500,
                'ai_suggested_gl_code'  => $debitAccount->code,
                'ai_suggested_gl_name'  => $debitAccount->name,
                'ai_anomaly_flag'       => false,
                'created_by'            => $user?->id,
                'approved_by'           => $user?->id,
                'approved_at'           => now(),
                'posted_at'             => now(),
            ]);

            $entryNumber = sprintf('JE-%s-%04d', now()->format('Ym'), DB::table('journal_entries')->count() + 1);
            $je = JournalEntry::create([
                'id'             => (string) Str::uuid(),
                'transaction_id' => $txn->id,
                'entry_number'   => $entryNumber,
                'entry_date'     => $bill->bill_date,
                'status'         => 'POSTED',
            ]);

            $bill->journal_entry_id = $je->id;
            $bill->save();

            // Debit Line: Inventory or Expense
            JournalEntryLine::create([
                'journal_entry_id'    => $je->id,
                'chart_of_account_id' => $debitAccount->id,
                'debit'               => $totalAmount,
                'credit'              => 0.00,
                'description'         => "Bill #{$bill->bill_number} - {$debitAccount->name}",
            ]);

            // Credit Line: Accounts Payable (Liability increases)
            JournalEntryLine::create([
                'journal_entry_id'    => $je->id,
                'chart_of_account_id' => $apAccount->id,
                'debit'               => 0.00,
                'credit'              => $totalAmount,
                'description'         => "Bill #{$bill->bill_number} - {$supplier->name}",
            ]);

            return response()->json([
                'success' => true,
                'message' => "AP Bill #{$bill->bill_number} recorded and posted to General Ledger.",
                'data'    => $bill->load(['supplier', 'attachments']),
            ], 201);
        });
    }
}
