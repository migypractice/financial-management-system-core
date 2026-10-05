<?php

namespace App\Http\Controllers\API\Dashboard;

use App\Http\Controllers\Controller;
use App\Http\Resources\GeneralLedgerResource;
use App\Models\ApBill;
use App\Models\ArInvoice;
use App\Models\ChartOfAccount;
use App\Models\Customer;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\Supplier;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GeneralLedgerController extends Controller
{
    /**
     * Fetch General Ledger Journal Entries with balanced lines.
     */
    public function index(Request $request): JsonResponse
    {
        $query = JournalEntry::with(['transaction', 'lines.chartOfAccount'])
            ->where('status', 'POSTED');

        // Optional search filter
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('entry_number', 'like', "%{$search}%")
                  ->orWhereHas('transaction', function ($q2) use ($search) {
                      $q2->where('transaction_code', 'like', "%{$search}%")
                         ->orWhere('external_reference_id', 'like', "%{$search}%")
                         ->orWhere('description', 'like', "%{$search}%")
                         ->orWhere('source_module', 'like', "%{$search}%");
                  });
            });
        }

        // Calculate totals using SQL aggregation (honoring search filter)
        $summaryQuery = DB::table('journal_entries')
            ->join('transactions', 'journal_entries.transaction_id', '=', 'transactions.id')
            ->where('journal_entries.status', 'POSTED');

        if ($search) {
            $summaryQuery->where(function ($q) use ($search) {
                $q->where('journal_entries.entry_number', 'like', "%{$search}%")
                  ->orWhere('transactions.transaction_code', 'like', "%{$search}%")
                  ->orWhere('transactions.external_reference_id', 'like', "%{$search}%")
                  ->orWhere('transactions.description', 'like', "%{$search}%")
                  ->orWhere('transactions.source_module', 'like', "%{$search}%");
            });
        }

        $totals = $summaryQuery->selectRaw("
            COUNT(*) as total_entries,
            SUM(CASE WHEN transactions.type = 'EXPENSE' THEN transactions.amount ELSE 0 END) as total_debit,
            SUM(CASE WHEN transactions.type = 'INCOME' THEN transactions.amount ELSE 0 END) as total_credit
        ")->first();

        // Newest first sorting
        $query->orderByDesc('entry_date')
              ->orderByDesc('created_at');

        $paginated = $query->paginate(50);

        return response()->json([
            'success' => true,
            'message' => 'General ledger entries retrieved successfully.',
            'data'    => GeneralLedgerResource::collection($paginated->items()),
            'summary' => [
                'total_entries' => (int) $paginated->total(),
                'total_debit'   => (float) ($totals->total_debit ?? 0),
                'total_credit'  => (float) ($totals->total_credit ?? 0),
            ],
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page'    => $paginated->lastPage(),
                'total_pages'  => $paginated->lastPage(),
                'total_items'  => $paginated->total(),
            ]
        ]);
    }

    /**
     * Trial Balance: All chart of accounts with accumulated Debits, Credits, and Ending Balances.
     */
    public function trialBalance(): JsonResponse
    {
        $accounts = ChartOfAccount::where('is_active', true)
            ->with(['journalLines' => function ($q) {
                $q->whereHas('journalEntry', fn ($je) => $je->where('status', 'POSTED'));
            }])
            ->orderBy('code')
            ->get()
            ->map(function (ChartOfAccount $acc) {
                $totalDebit = (float) $acc->journalLines->sum('debit');
                $totalCredit = (float) $acc->journalLines->sum('credit');

                // Determine ending balance based on normal balance
                if ($acc->normal_balance === 'DEBIT') {
                    $endingDebit = max(0, $totalDebit - $totalCredit);
                    $endingCredit = max(0, $totalCredit - $totalDebit);
                } else {
                    $endingCredit = max(0, $totalCredit - $totalDebit);
                    $endingDebit = max(0, $totalDebit - $totalCredit);
                }

                return [
                    'id'             => $acc->id,
                    'code'           => $acc->code,
                    'name'           => $acc->name,
                    'type'           => $acc->type,
                    'normal_balance' => $acc->normal_balance,
                    'total_debit'    => $totalDebit,
                    'total_credit'   => $totalCredit,
                    'ending_debit'   => $endingDebit,
                    'ending_credit'  => $endingCredit,
                ];
            });

        $sumDebits = $accounts->sum('ending_debit');
        $sumCredits = $accounts->sum('ending_credit');

        return response()->json([
            'success' => true,
            'data'    => $accounts,
            'summary' => [
                'total_debits'  => (float) $sumDebits,
                'total_credits' => (float) $sumCredits,
                'difference'    => (float) abs($sumDebits - $sumCredits),
                'is_balanced'   => abs($sumDebits - $sumCredits) < 0.01,
            ],
        ]);
    }

    /**
     * Accounts Receivable Sub-ledger: Breakdown by customer.
     */
    public function arSubledger(): JsonResponse
    {
        $customers = Customer::where('is_active', true)
            ->with(['invoices' => fn ($q) => $q->orderByDesc('invoice_date')])
            ->get()
            ->map(function (Customer $c) {
                $totalInvoiced = (float) $c->invoices->sum('total_amount');
                $totalPaid = (float) $c->invoices->sum('paid_amount');
                $balance = (float) $c->invoices->sum('balance');

                return [
                    'customer_id'       => $c->id,
                    'customer_code'     => $c->customer_code,
                    'customer_name'     => $c->name,
                    'company_name'      => $c->company_name,
                    'total_invoiced'    => $totalInvoiced,
                    'total_collected'   => $totalPaid,
                    'balance_due'       => $balance,
                    'invoices_count'    => $c->invoices->count(),
                    'unpaid_count'      => $c->invoices->whereIn('status', ['UNPAID', 'PARTIAL', 'OVERDUE'])->count(),
                    'recent_invoices'   => $c->invoices->take(5)->map(fn ($inv) => [
                        'invoice_number' => $inv->invoice_number,
                        'invoice_date'   => $inv->invoice_date->toDateString(),
                        'due_date'       => $inv->due_date->toDateString(),
                        'total_amount'   => (float) $inv->total_amount,
                        'balance'        => (float) $inv->balance,
                        'status'         => $inv->status,
                    ]),
                ];
            });

        $totalReceivable = $customers->sum('balance_due');

        return response()->json([
            'success' => true,
            'data'    => $customers,
            'summary' => [
                'total_receivable' => (float) $totalReceivable,
                'customer_count'   => $customers->count(),
            ],
        ]);
    }

    /**
     * Accounts Payable Sub-ledger: Breakdown by supplier.
     */
    public function apSubledger(): JsonResponse
    {
        $suppliers = Supplier::where('is_active', true)
            ->with(['bills' => fn ($q) => $q->orderByDesc('bill_date')])
            ->get()
            ->map(function (Supplier $s) {
                $totalBilled = (float) $s->bills->sum('total_amount');
                $totalPaid = (float) $s->bills->sum('paid_amount');
                $balance = (float) $s->bills->sum('balance');

                return [
                    'supplier_id'      => $s->id,
                    'supplier_code'    => $s->supplier_code,
                    'supplier_name'    => $s->name,
                    'company_name'     => $s->company_name,
                    'total_billed'     => $totalBilled,
                    'total_paid'       => $totalPaid,
                    'balance_owed'     => $balance,
                    'bills_count'      => $s->bills->count(),
                    'unpaid_count'     => $s->bills->whereIn('status', ['UNPAID', 'PARTIAL', 'OVERDUE'])->count(),
                    'recent_bills'     => $s->bills->take(5)->map(fn ($b) => [
                        'bill_number'  => $b->bill_number,
                        'bill_date'    => $b->bill_date->toDateString(),
                        'due_date'     => $b->due_date->toDateString(),
                        'total_amount' => (float) $b->total_amount,
                        'balance'      => (float) $b->balance,
                        'status'       => $b->status,
                    ]),
                ];
            });

        $totalPayable = $suppliers->sum('balance_owed');

        return response()->json([
            'success' => true,
            'data'    => $suppliers,
            'summary' => [
                'total_payable'  => (float) $totalPayable,
                'supplier_count' => $suppliers->count(),
            ],
        ]);
    }

    /**
     * Payroll Sub-ledger: Record-only compensation register from HRMS.
     */
    public function payrollSubledger(): JsonResponse
    {
        $payrollTransactions = Transaction::where('source_module', 'HRMS')
            ->orWhere('category_type', 'like', '%PAYROLL%')
            ->with('journalEntry.lines.chartOfAccount')
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Transaction $t) {
                return [
                    'id'               => $t->id,
                    'reference'        => $t->transaction_code,
                    'batch_name'       => $t->description,
                    'amount'           => (float) $t->amount,
                    'date'             => $t->created_at->toDateString(),
                    'status'           => $t->status,
                    'journal_entry'    => $t->journalEntry?->entry_number,
                    'gl_account'       => '5100-EXP-SALARY (Salaries & Wages Expense)',
                ];
            });

        $totalPayroll = $payrollTransactions->sum('amount');

        return response()->json([
            'success' => true,
            'data'    => $payrollTransactions,
            'summary' => [
                'total_payroll_ytd' => (float) $totalPayroll,
                'batch_count'       => $payrollTransactions->count(),
            ],
        ]);
    }
}
