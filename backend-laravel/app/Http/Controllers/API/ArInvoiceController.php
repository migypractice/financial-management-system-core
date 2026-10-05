<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\ArInvoice;
use App\Models\Attachment;
use App\Models\ChartOfAccount;
use App\Models\Customer;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\Subsystem;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ArInvoiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status');
        $customerId = $request->query('customer_id');

        $query = ArInvoice::with(['customer', 'chartOfAccount', 'attachments', 'collections.bankAccount'])
            ->orderByDesc('invoice_date')
            ->orderByDesc('created_at');

        if ($status && $status !== 'ALL') {
            $query->where('status', $status);
        }

        if ($customerId) {
            $query->where('customer_id', $customerId);
        }

        $invoices = $query->get()->map(function (ArInvoice $inv) {
            $daysPastDue = 0;
            if (in_array($inv->status, ['UNPAID', 'PARTIAL'])) {
                $due = \Carbon\Carbon::parse($inv->due_date);
                if (now()->gt($due)) {
                    $daysPastDue = now()->diffInDays($due);
                }
            }

            return [
                'id'             => $inv->id,
                'invoice_number' => $inv->invoice_number,
                'customer_id'    => $inv->customer_id,
                'customer_name'  => $inv->customer?->name ?? 'Unknown Customer',
                'company_name'   => $inv->customer?->company_name ?? '',
                'account_name'   => $inv->chartOfAccount?->name ?? 'Hardware Sales Revenue',
                'invoice_date'   => $inv->invoice_date->toDateString(),
                'due_date'       => $inv->due_date->toDateString(),
                'total_amount'   => (float) $inv->total_amount,
                'paid_amount'    => (float) $inv->paid_amount,
                'balance'        => (float) $inv->balance,
                'status'         => $inv->status,
                'days_past_due'  => $daysPastDue,
                'description'    => $inv->description,
                'attachments'    => $inv->attachments->map(fn ($a) => [
                    'id'            => $a->id,
                    'file_name'     => $a->file_name,
                    'file_url'      => asset('storage/' . $a->file_path),
                    'mime_type'     => $a->mime_type,
                    'file_size'     => $a->file_size,
                    'document_type' => $a->document_type,
                ]),
                'collections_count' => $inv->collections->count(),
            ];
        });

        // Compute Real Aging Summary directly from database rows
        $current = 0;
        $aging30 = 0;
        $aging60 = 0;
        $aging90Plus = 0;

        foreach ($invoices as $inv) {
            if ($inv['balance'] > 0) {
                $days = $inv['days_past_due'];
                if ($days <= 0) $current += $inv['balance'];
                elseif ($days <= 30) $aging30 += $inv['balance'];
                elseif ($days <= 60) $aging60 += $inv['balance'];
                else $aging90Plus += $inv['balance'];
            }
        }

        $totalReceivable = $invoices->sum('balance');

        return response()->json([
            'success' => true,
            'data'    => $invoices,
            'summary' => [
                'total_receivable' => (float) $totalReceivable,
                'current'          => (float) $current,
                'days_1_30'        => (float) $aging30,
                'days_31_60'       => (float) $aging60,
                'days_90_plus'     => (float) $aging90Plus,
                'total_invoices'   => $invoices->count(),
                'unpaid_count'     => $invoices->whereIn('status', ['UNPAID', 'PARTIAL', 'OVERDUE'])->count(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_id'         => 'required|exists:customers,id',
            'invoice_number'      => 'required|string|max:50|unique:ar_invoices,invoice_number',
            'invoice_date'        => 'required|date',
            'due_date'            => 'required|date|after_or_equal:invoice_date',
            'total_amount'        => 'required|numeric|min:0.01',
            'chart_of_account_id' => 'nullable|exists:chart_of_accounts,id',
            'description'         => 'required|string|max:1000',
            'attachment'          => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $user = $request->user();
            $arAccount = ChartOfAccount::where('code', '1020-AR')->firstOrFail();
            $creditAccount = !empty($validated['chart_of_account_id'])
                ? ChartOfAccount::findOrFail($validated['chart_of_account_id'])
                : ChartOfAccount::where('code', '4000-REV')->firstOrFail();

            $totalAmount = (float) $validated['total_amount'];

            // 1. Create AR Invoice Record
            $invoice = ArInvoice::create([
                'invoice_number'      => strtoupper(trim($validated['invoice_number'])),
                'customer_id'         => $validated['customer_id'],
                'chart_of_account_id' => $creditAccount->id,
                'invoice_date'        => $validated['invoice_date'],
                'due_date'            => $validated['due_date'],
                'total_amount'        => $totalAmount,
                'paid_amount'         => 0,
                'balance'             => $totalAmount,
                'description'         => $validated['description'],
                'status'              => 'UNPAID',
                'created_by'          => $user?->id,
            ]);

            // 2. Handle Attached Supporting Document (Sales Order / Delivery Receipt)
            if ($request->hasFile('attachment')) {
                $file = $request->file('attachment');
                $path = $file->store('attachments/invoices', 'public');

                $invoice->attachments()->create([
                    'file_name'     => $file->getClientOriginalName(),
                    'file_path'     => $path,
                    'mime_type'     => $file->getClientMimeType(),
                    'file_size'     => $file->getSize(),
                    'document_type' => 'SALES_ORDER',
                    'uploaded_by'   => $user?->id,
                ]);
            }

            // 3. Post Double-Entry Journal Entry: Debit Accounts Receivable, Credit Revenue
            $glModule = Subsystem::where('slug', 'accounts-receivable')->first()
                     ?? Subsystem::where('slug', 'general-ledger')->first();

            $txnCode = 'TXN-INV-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6));
            $customer = Customer::find($validated['customer_id']);

            $txn = Transaction::create([
                'id'                    => (string) Str::uuid(),
                'transaction_code'      => $txnCode,
                'subsystem_id'          => $glModule?->id ?? (string) Str::uuid(),
                'source_module'         => 'ACCOUNTS_RECEIVABLE',
                'category_type'         => 'HARDWARE_SALES',
                'external_reference_id' => $invoice->invoice_number,
                'type'                  => 'INCOME',
                'amount'                => $totalAmount,
                'net_amount'            => $totalAmount,
                'currency'              => 'PHP',
                'description'           => "Sales Invoice issued to {$customer->name}: {$invoice->description}",
                'status'                => 'posted',
                'ai_confidence_score'   => 0.9900,
                'ai_suggested_gl_code'  => $creditAccount->code,
                'ai_suggested_gl_name'  => $creditAccount->name,
                'ai_anomaly_flag'       => false,
                'created_by'            => $user?->id,
                'approved_by'           => $user?->id,
                'approved_at'           => now(),
                'posted_at'             => now(),
            ]);

            $entryNumber = sprintf('JE-%s-AR%s', now()->format('Ym'), strtoupper(Str::random(4)));
            $je = JournalEntry::create([
                'id'             => (string) Str::uuid(),
                'transaction_id' => $txn->id,
                'entry_number'   => $entryNumber,
                'entry_date'     => $invoice->invoice_date,
                'status'         => 'POSTED',
            ]);

            $invoice->journal_entry_id = $je->id;
            $invoice->save();

            // Debit Line: Accounts Receivable (Asset increases)
            JournalEntryLine::create([
                'journal_entry_id'    => $je->id,
                'chart_of_account_id' => $arAccount->id,
                'debit'               => $totalAmount,
                'credit'              => 0.00,
                'description'         => "Invoice #{$invoice->invoice_number} - {$customer->name}",
            ]);

            // Credit Line: Revenue (Equity/Income increases)
            JournalEntryLine::create([
                'journal_entry_id'    => $je->id,
                'chart_of_account_id' => $creditAccount->id,
                'debit'               => 0.00,
                'credit'              => $totalAmount,
                'description'         => "Invoice #{$invoice->invoice_number} - {$creditAccount->name}",
            ]);

            return response()->json([
                'success' => true,
                'message' => "AR Invoice #{$invoice->invoice_number} recorded and posted to General Ledger.",
                'data'    => $invoice->load(['customer', 'attachments']),
            ], 201);
        });
    }
}
