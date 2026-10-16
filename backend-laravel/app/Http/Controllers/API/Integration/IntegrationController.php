<?php

namespace App\Http\Controllers\API\Integration;

use App\Http\Controllers\Controller;
use App\Models\ApBill;
use App\Models\ArInvoice;
use App\Models\BankAccount;
use App\Models\Budget;
use App\Models\ChartOfAccount;
use App\Models\Collection;
use App\Models\Customer;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\PaymentRequest;
use App\Models\Role;
use App\Models\Supplier;
use App\Models\Transaction;
use App\Models\User;
use App\Services\AIService\AIService;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Handles machine-to-machine (M2M) transaction ingestion from external enterprise departments:
 * - HRMS / Payroll & Benefits
 * - Supply Chain & Inventory
 * - Fleet & Transportation
 * - Facilities & Administrative
 * - E-Commerce Marketplace
 *
 * Protected by ApiKeyMiddleware (X-API-KEY).
 *
 * Routes:
 *   POST /api/v1/integration/inbound-revenue
 *   POST /api/v1/integration/request-disbursement
 *   GET  /api/v1/integration/budget-status
 *   GET  /api/v1/integration/voucher-status/{reference}
 */
class IntegrationController extends Controller
{
    public function __construct(
        protected AIService $aiService
    ) {}

    /**
     * Inbound revenue ingestion (E-Commerce Online Sales, Customer Payments, Gateway Receipts).
     * Automatically creates real ArInvoice, posts GL, and creates Collection if paid.
     */
    public function inboundRevenue(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'external_module'       => 'required|string',
            'external_reference_id' => 'required|string|max:255',
            'category_type'         => 'required|string|max:100',
            'amount'                => 'required|numeric|min:0.01',
            'tax_amount'            => 'nullable|numeric|min:0',
            'fee_amount'            => 'nullable|numeric|min:0',
            'currency'              => 'nullable|string|size:3',
            'description'           => 'required|string|max:1000',
            'metadata'              => 'nullable|array',
        ]);

        $validated['type'] = 'INCOME';

        $idempotencyKey = $request->header('Idempotency-Key') ?? $request->input('idempotency_key');
        return $this->processAndPersist($validated, $idempotencyKey);
    }

    /**
     * Outbound disbursement request (Payroll, Supplier POs, Fleet Fuel, Facilities Rent, Refunds).
     * Automatically creates real ApBill, posts GL, and queues PaymentRequest voucher in /disbursements.
     */
    public function requestDisbursement(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'external_module'       => 'required|string',
            'external_reference_id' => 'required|string|max:255',
            'category_type'         => 'required|string|max:100',
            'amount'                => 'required|numeric|min:0.01',
            'tax_amount'            => 'nullable|numeric|min:0',
            'fee_amount'            => 'nullable|numeric|min:0',
            'currency'              => 'nullable|string|size:3',
            'payee_info'            => 'required|array',
            'payee_info.name'       => 'required|string|max:255',
            'payee_info.account'    => 'nullable|string|max:255',
            'payee_info.bank'       => 'nullable|string|max:255',
            'description'           => 'required|string|max:1000',
            'metadata'              => 'nullable|array',
        ]);

        $validated['type'] = 'EXPENSE';

        // Merge payee_info into metadata
        $validated['metadata'] = array_merge(
            $validated['metadata'] ?? [],
            ['payee_info' => $validated['payee_info'] ?? null]
        );
        unset($validated['payee_info']);

        $idempotencyKey = $request->header('Idempotency-Key') ?? $request->input('idempotency_key');
        return $this->processAndPersist($validated, $idempotencyKey);
    }

    /**
     * Live department budget balances for external systems (HRMS, Fleet, Facilities, Supply Chain).
     */
    public function budgetStatus(Request $request): JsonResponse
    {
        $fiscalYear = (int) $request->query('fiscal_year', 2026);
        $department = $request->query('department');

        $query = Budget::where('fiscal_year', $fiscalYear)
            ->with(['chartOfAccount'])
            ->orderBy('department');

        if ($department) {
            $query->where(function ($q) use ($department) {
                $q->where('department', 'like', "%{$department}%")
                  ->orWhere('category', 'like', "%{$department}%");
            });
        }

        $budgets = $query->get()->map(function (Budget $b) {
            $spent = 0.0;
            $jeQuery = JournalEntryLine::query()
                ->whereHas('journalEntry', function ($je) use ($b) {
                    $je->where('status', 'POSTED');
                    if ($b->period && preg_match('/^\d{4}-\d{2}$/', $b->period)) {
                        [$y, $m] = explode('-', $b->period);
                        $je->whereYear('entry_date', (int) $y)->whereMonth('entry_date', (int) $m);
                    } else {
                        $je->whereYear('entry_date', (int) $b->fiscal_year);
                    }
                });

            $targetCoaId = $b->chart_of_account_id;
            if (!$targetCoaId) {
                $defaultCoaCode = match ($b->department) {
                    'Human Resources (HRMS)'     => '5100-EXP-SALARY',
                    'Supply Chain & Procurement' => '1200-INV',
                    'Fleet & Logistics'          => '5400-EXP-LOGISTICS',
                    'Facilities & Operations'    => '5200-EXP-UTIL',
                    'IT & Infrastructure', 'E-Commerce Marketing' => '5500-EXP-SUPPLIES',
                    default                      => null,
                };
                if ($defaultCoaCode) {
                    $targetCoaId = ChartOfAccount::where('code', $defaultCoaCode)->value('id');
                }
            }

            if ($targetCoaId) {
                $spent = (float) (clone $jeQuery)->where('chart_of_account_id', $targetCoaId)->sum('debit');
            }

            $allocated = (float) $b->allocated_amount;
            $remaining = max(0, $allocated - $spent);
            $utilization = $allocated > 0 ? round(($spent / $allocated) * 100, 1) : 0;

            return [
                'department'       => $b->department,
                'category'         => $b->category,
                'fiscal_year'      => $b->fiscal_year,
                'period'           => $b->period,
                'allocated_amount' => $allocated,
                'spent_amount'     => $spent,
                'remaining'        => $remaining,
                'utilization_rate' => $utilization,
                'status'           => $utilization > 100 ? 'OVER_BUDGET' : ($utilization >= 85 ? 'NEAR_LIMIT' : 'ON_TRACK'),
                'account_code'     => $b->chartOfAccount?->code,
                'account_name'     => $b->chartOfAccount?->name,
            ];
        });

        $totalAllocated = $budgets->sum('allocated_amount');
        $totalSpent = $budgets->sum('spent_amount');
        $totalRemaining = $budgets->sum('remaining');
        $overallUtilization = $totalAllocated > 0 ? round(($totalSpent / $totalAllocated) * 100, 1) : 0;

        return response()->json([
            'success'     => true,
            'fiscal_year' => $fiscalYear,
            'as_of'       => now()->toIso8601String(),
            'count'       => $budgets->count(),
            'summary'     => [
                'total_allocated'          => (float) $totalAllocated,
                'total_spent'              => (float) $totalSpent,
                'total_remaining'          => (float) $totalRemaining,
                'overall_utilization_rate' => (float) $overallUtilization,
            ],
            'departments' => $budgets,
            'data'        => $budgets,
        ], 200);
    }

    /**
     * Live status check for external departments to query submitted bills, vouchers, or invoices.
     */
    public function voucherStatus(string $reference): JsonResponse
    {
        $ref = trim($reference);

        // 1. Check Payment Request
        $pr = PaymentRequest::with(['bill', 'attachments'])
            ->where('request_number', $ref)
            ->orWhere('id', $ref)
            ->first();

        if ($pr) {
            return response()->json([
                'success'          => true,
                'reference'        => $ref,
                'record_type'      => 'PAYMENT_REQUEST',
                'status'           => $pr->status, // PENDING_APPROVAL, APPROVED, DISBURSED, REJECTED
                'request_number'   => $pr->request_number,
                'bill_number'      => $pr->bill?->bill_number,
                'payee_name'       => $pr->payee_name,
                'amount'           => (float) $pr->amount,
                'purpose'          => $pr->purpose,
                'approved_at'      => $pr->approved_at?->toIso8601String(),
                'rejection_reason' => $pr->rejection_reason,
                'created_at'       => $pr->created_at->toIso8601String(),
            ], 200);
        }

        // 2. Check AP Bill
        $bill = ApBill::with(['supplier', 'paymentRequests'])
            ->where('bill_number', $ref)
            ->orWhere('id', $ref)
            ->first();

        if ($bill) {
            return response()->json([
                'success'          => true,
                'reference'        => $ref,
                'record_type'      => 'AP_BILL',
                'status'           => $bill->status, // UNPAID, PARTIAL, PAID, OVERDUE
                'bill_number'      => $bill->bill_number,
                'supplier_name'    => $bill->supplier?->name,
                'total_amount'     => (float) $bill->total_amount,
                'paid_amount'      => (float) $bill->paid_amount,
                'balance'          => (float) $bill->balance,
                'category_type'    => $bill->category_type,
                'payment_requests' => $bill->paymentRequests->map(fn($p) => [
                    'request_number' => $p->request_number,
                    'status'         => $p->status,
                    'amount'         => (float) $p->amount,
                ]),
                'created_at'       => $bill->created_at->toIso8601String(),
            ], 200);
        }

        // 3. Check AR Invoice
        $inv = ArInvoice::with(['customer', 'collections'])
            ->where('invoice_number', $ref)
            ->orWhere('id', $ref)
            ->first();

        if ($inv) {
            return response()->json([
                'success'          => true,
                'reference'        => $ref,
                'record_type'      => 'AR_INVOICE',
                'status'           => $inv->status, // UNPAID, PARTIAL, PAID, OVERDUE
                'invoice_number'   => $inv->invoice_number,
                'customer_name'    => $inv->customer?->name,
                'total_amount'     => (float) $inv->total_amount,
                'paid_amount'      => (float) $inv->paid_amount,
                'balance'          => (float) $inv->balance,
                'collections'      => $inv->collections->map(fn($c) => [
                    'collection_number' => $c->collection_number,
                    'amount'            => (float) $c->amount,
                    'collection_date'   => $c->collection_date,
                ]),
                'created_at'       => $inv->created_at->toIso8601String(),
            ], 200);
        }

        // 4. Fallback: Check Transactions Table
        $tx = Transaction::where('external_reference_id', $ref)
            ->orWhere('transaction_code', $ref)
            ->orWhere('id', $ref)
            ->first();

        if ($tx) {
            return response()->json([
                'success'               => true,
                'reference'             => $ref,
                'record_type'           => 'TRANSACTION',
                'status'                => strtoupper($tx->status),
                'transaction_code'      => $tx->transaction_code,
                'external_reference_id' => $tx->external_reference_id,
                'source_module'         => $tx->source_module,
                'type'                  => $tx->type,
                'amount'                => (float) $tx->amount,
                'created_at'            => $tx->created_at ? (is_string($tx->created_at) ? $tx->created_at : $tx->created_at->toIso8601String()) : null,
            ], 200);
        }

        return response()->json([
            'success' => false,
            'message' => "No record found for reference '{$ref}'.",
        ], 404);
    }

    /**
     * Core processing pipeline: AI evaluation → Direct Core Integration → ACID Commit → Response.
     */
    private function processAndPersist(array $validated, ?string $idempotencyKey = null): JsonResponse
    {
        // 0. Check Idempotency Key
        if ($idempotencyKey) {
            $existing = DB::table('transactions')
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existing) {
                return $this->payloadMatchesExisting($existing, $validated)
                    ? $this->duplicateResponse($existing)
                    : $this->idempotencyConflictResponse($existing);
            }
        }

        // 1. Run AI evaluation
        $aiResult = $this->aiService->evaluateTransaction($validated);

        // 2. Resolve subsystem ID
        $subsystem = DB::table('subsystems')
            ->where('slug', $this->resolveSubsystemSlug($validated['category_type']))
            ->first();

        $subsystemId = $subsystem?->id ?? DB::table('subsystems')->where('slug', 'general-ledger')->value('id');

        // 3. Calculate net amount
        $amount    = (float) $validated['amount'];
        $taxAmount = (float) ($validated['tax_amount'] ?? 0);
        $feeAmount = (float) ($validated['fee_amount'] ?? 0);
        $netAmount = $amount - $taxAmount - $feeAmount;

        // 4. Resolve machine integration user (privilege-free Maker identity)
        $systemUser = User::where('email', 'system@hw.com')->first() ?? User::first();
        if (!$systemUser) {
            $role = Role::firstOrCreate(['slug' => 'system_integration'], ['name' => 'System Integration', 'description' => 'System Integration']);
            $systemUser = User::create([
                'name'     => 'System Integration',
                'username' => 'system_integration_bot',
                'email'    => 'system@hw.com',
                'password' => \Illuminate\Support\Facades\Hash::make(Str::random(32)),
                'role_id'  => $role->id,
            ]);
        }

        $transactionCode = 'TXN-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6));

        try {
            $resultData = DB::transaction(function () use (
                $validated, $aiResult, $subsystemId, $transactionCode, $amount, $taxAmount, $feeAmount, $netAmount, $idempotencyKey, $systemUser
            ) {
                $id = (string) Str::uuid();

                // Insert into transactions table for central audit and compliance
                DB::table('transactions')->insert([
                    'id'                    => $id,
                    'transaction_code'      => $transactionCode,
                    'idempotency_key'       => $idempotencyKey,
                    'subsystem_id'          => $subsystemId,
                    'created_by'            => $systemUser->id,
                    'source_module'         => $validated['external_module'],
                    'category_type'         => $validated['category_type'] ?? null,
                    'external_reference_id' => $validated['external_reference_id'],
                    'type'                  => $validated['type'],
                    'amount'                => $amount,
                    'tax_amount'            => $taxAmount,
                    'fee_amount'            => $feeAmount,
                    'net_amount'            => $netAmount,
                    'currency'              => $validated['currency'] ?? 'PHP',
                    'description'           => $validated['description'],
                    'metadata'              => json_encode($validated['metadata'] ?? []),
                    'status'                => $aiResult['status'],
                    'ai_confidence_score'   => $aiResult['ai_confidence_score'],
                    'ai_suggested_gl_code'  => $aiResult['ai_suggested_gl_code'],
                    'ai_suggested_gl_name'  => $aiResult['ai_suggested_gl_name'],
                    'ai_anomaly_flag'       => $aiResult['ai_anomaly_flag'],
                    'ai_anomaly_reason'     => $aiResult['ai_anomaly_reason'],
                    'created_at'            => now(),
                    'updated_at'            => now(),
                ]);

                // Insert into ai_logs
                DB::table('ai_logs')->insert([
                    'id'             => (string) Str::uuid(),
                    'transaction_id' => $id,
                    'anomaly_score'  => $aiResult['ai_confidence_score'] * 100,
                    'ai_decision'    => $aiResult['ai_anomaly_flag'] ? 'FLAGGED' : 'PASSED',
                    'flag_reason'    => $aiResult['ai_anomaly_reason'],
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]);

                $coreRecords = [];

                if ($validated['type'] === 'INCOME') {
                    // =========================================================================
                    // INBOUND REVENUE: E-Commerce Marketplace -> AR Invoices & Collections
                    // =========================================================================
                    $custName = $validated['metadata']['customer_name'] ?? 'E-Commerce Online Customers';
                    $customer = Customer::firstOrCreate(
                        ['customer_code' => 'CUST-ECOM'],
                        [
                            'name'               => $custName,
                            'company_name'       => 'Online Store Retail Clients',
                            'email'              => 'ecommerce@hardware.ph',
                            'phone'              => '+63 917 888 2000',
                            'address'            => 'Metro Manila, Philippines',
                            'credit_limit'       => 1000000.00,
                            'payment_terms_days' => 0,
                        ]
                    );

                    $arAccount = ChartOfAccount::where('code', '1020-AR')->first()
                              ?? ChartOfAccount::create(['code' => '1020-AR', 'name' => 'Accounts Receivable', 'type' => 'ASSET', 'normal_balance' => 'DEBIT']);
                    $revAccount = ChartOfAccount::where('code', '4000-REV')->first()
                               ?? ChartOfAccount::create(['code' => '4000-REV', 'name' => 'Sales Revenue', 'type' => 'REVENUE', 'normal_balance' => 'CREDIT']);
                    $cashAccount = ChartOfAccount::where('code', '1010-CASH')->first()
                                ?? ChartOfAccount::create(['code' => '1010-CASH', 'name' => 'Cash and Cash Equivalents', 'type' => 'ASSET', 'normal_balance' => 'DEBIT']);
                    $taxAccount = ChartOfAccount::where('code', '2020-TAX')->first();

                    $invNumber = 'INV-' . now()->format('Ym') . '-' . strtoupper(Str::random(5));
                    while (ArInvoice::where('invoice_number', $invNumber)->exists()) {
                        $invNumber = 'INV-' . now()->format('Ym') . '-' . strtoupper(Str::random(5));
                    }

                    $paymentStatus = strtoupper($validated['metadata']['payment_status'] ?? 'PAID');
                    $isPaid = ($paymentStatus === 'PAID');

                    $invoice = ArInvoice::create([
                        'invoice_number'      => $invNumber,
                        'customer_id'         => $customer->id,
                        'chart_of_account_id' => $revAccount->id,
                        'invoice_date'        => now()->toDateString(),
                        'due_date'            => now()->toDateString(),
                        'total_amount'        => $amount,
                        'paid_amount'         => $isPaid ? $amount : 0.00,
                        'balance'             => $isPaid ? 0.00 : $amount,
                        'description'         => $validated['description'],
                        'status'              => $isPaid ? 'PAID' : 'UNPAID',
                        'created_by'          => $systemUser->id,
                    ]);

                    $jeInvNumber = sprintf('JE-%s-AR%s', now()->format('Ym'), strtoupper(Str::random(4)));
                    $jeInv = JournalEntry::create([
                        'transaction_id' => $id,
                        'entry_number'   => $jeInvNumber,
                        'entry_date'     => now()->toDateString(),
                        'status'         => 'POSTED',
                    ]);
                    $invoice->journal_entry_id = $jeInv->id;
                    $invoice->save();

                    // Debit 1020-AR ($amount)
                    JournalEntryLine::create([
                        'journal_entry_id'    => $jeInv->id,
                        'chart_of_account_id' => $arAccount->id,
                        'debit'               => $amount,
                        'credit'              => 0.00,
                        'description'         => "Invoice #{$invNumber} - {$customer->name}",
                    ]);

                    $netRev = max(0, $amount - $taxAmount);
                    // Credit 4000-REV ($netRev)
                    JournalEntryLine::create([
                        'journal_entry_id'    => $jeInv->id,
                        'chart_of_account_id' => $revAccount->id,
                        'debit'               => 0.00,
                        'credit'              => $netRev,
                        'description'         => "Revenue: {$validated['description']}",
                    ]);

                    if ($taxAmount > 0 && $taxAccount) {
                        JournalEntryLine::create([
                            'journal_entry_id'    => $jeInv->id,
                            'chart_of_account_id' => $taxAccount->id,
                            'debit'               => 0.00,
                            'credit'              => $taxAmount,
                            'description'         => "12% Output VAT on {$invNumber}",
                        ]);
                    }

                    $coreRecords['ar_invoice_id'] = $invoice->id;
                    $coreRecords['invoice_number'] = $invNumber;

                    // If paid at checkout, create Collection and credit bank balance
                    if ($isPaid) {
                        $bank = BankAccount::where('bank_name', 'like', '%BDO%')
                             ->orWhere('account_name', 'like', '%Receivable%')
                             ->orWhere('account_name', 'like', '%Main%')
                             ->first()
                             ?? BankAccount::first();

                        if ($bank) {
                            $colCount = DB::table('collections')->count() + 1;
                            $colNumber = sprintf('CR-%s-%04d', now()->format('Ym'), $colCount);
                            while (Collection::where('collection_number', $colNumber)->exists()) {
                                $colCount++;
                                $colNumber = sprintf('CR-%s-%04d', now()->format('Ym'), $colCount);
                            }

                            $jeColNumber = sprintf('CR-%s-JE%s', now()->format('Ym'), strtoupper(Str::random(4)));
                            $jeCol = JournalEntry::create([
                                'transaction_id' => $id,
                                'entry_number'   => $jeColNumber,
                                'entry_date'     => now()->toDateString(),
                                'status'         => 'POSTED',
                            ]);

                            $collection = Collection::create([
                                'collection_number' => $colNumber,
                                'ar_invoice_id'     => $invoice->id,
                                'bank_account_id'   => $bank->id,
                                'amount'            => $amount,
                                'collection_date'   => now()->toDateString(),
                                'payment_method'    => 'ONLINE',
                                'reference_number'  => $validated['external_reference_id'],
                                'collected_by'      => $systemUser->id,
                                'journal_entry_id'  => $jeCol->id,
                            ]);

                            JournalEntryLine::create([
                                'journal_entry_id'    => $jeCol->id,
                                'chart_of_account_id' => $cashAccount->id,
                                'debit'               => $amount,
                                'credit'              => 0.00,
                                'description'         => "Online Collection #{$colNumber} - {$bank->account_name}",
                            ]);
                            JournalEntryLine::create([
                                'journal_entry_id'    => $jeCol->id,
                                'chart_of_account_id' => $arAccount->id,
                                'debit'               => 0.00,
                                'credit'              => $amount,
                                'description'         => "Settlement of Invoice #{$invNumber}",
                            ]);

                            $bank->increment('current_balance', $amount);

                            $coreRecords['collection_id'] = $collection->id;
                            $coreRecords['collection_number'] = $colNumber;
                        }
                    }

                } else {
                    // =========================================================================
                    // OUTBOUND EXPENSE: HRMS, Fleet, Facilities, Supply Chain -> AP Bills & PRs
                    // =========================================================================
                    $payeeName = $validated['metadata']['payee_info']['name'] ?? null;
                    if (!$payeeName) {
                        $payeeName = match ($validated['external_module']) {
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

                    $category = $validated['category_type'] ?? 'SUPPLIER_INVOICE';
                    $defaultCoaCode = match ($category) {
                        'PAYROLL_BENEFITS', 'PAYROLL_SALARY', 'EMPLOYEE_CLAIM' => '5100-EXP-SALARY',
                        'FLEET_FUEL', 'FLEET_MAINTENANCE', 'FREIGHT_SHIPPING'  => '5400-EXP-LOGISTICS',
                        'FACILITY_RENT', 'UTILITIES_BILL', 'LEGAL_BILLING'     => '5200-EXP-UTIL',
                        'OFFICE_SUPPLIES', 'EQUIPMENT_REPAIR', 'CUSTOMER_REFUND'=> '5500-EXP-SUPPLIES',
                        'INVENTORY_PURCHASE', 'SUPPLIER_INVOICE'               => '1200-INV',
                        default                                                => '5500-EXP-SUPPLIES',
                    };

                    $expenseCoa = ChartOfAccount::where('code', $defaultCoaCode)->first()
                               ?? ChartOfAccount::where('code', '5500-EXP-SUPPLIES')->first()
                               ?? ChartOfAccount::where('code', '1200-INV')->first()
                               ?? ChartOfAccount::create(['code' => '5500-EXP-SUPPLIES', 'name' => 'General Operating Expense', 'type' => 'EXPENSE', 'normal_balance' => 'DEBIT']);

                    $apCoa = ChartOfAccount::where('code', '2010-AP')->first()
                          ?? ChartOfAccount::create(['code' => '2010-AP', 'name' => 'Accounts Payable', 'type' => 'LIABILITY', 'normal_balance' => 'CREDIT']);

                    $billNumber = 'BILL-' . now()->format('Ym') . '-' . strtoupper(Str::random(5));
                    while (ApBill::where('bill_number', $billNumber)->exists()) {
                        $billNumber = 'BILL-' . now()->format('Ym') . '-' . strtoupper(Str::random(5));
                    }

                    $bill = ApBill::create([
                        'bill_number'         => $billNumber,
                        'supplier_id'         => $supplier->id,
                        'chart_of_account_id' => $expenseCoa->id,
                        'bill_date'           => now()->toDateString(),
                        'due_date'            => now()->addDays(15)->toDateString(),
                        'total_amount'        => $amount,
                        'paid_amount'         => 0.00,
                        'balance'             => $amount,
                        'category_type'       => $validated['category_type'],
                        'description'         => $validated['description'],
                        'status'              => 'UNPAID',
                        'created_by'          => $systemUser->id,
                    ]);

                    $jeBillNumber = sprintf('JE-%s-AP%s', now()->format('Ym'), strtoupper(Str::random(4)));
                    $jeBill = JournalEntry::create([
                        'transaction_id' => $id,
                        'entry_number'   => $jeBillNumber,
                        'entry_date'     => now()->toDateString(),
                        'status'         => 'POSTED',
                    ]);
                    $bill->journal_entry_id = $jeBill->id;
                    $bill->save();

                    JournalEntryLine::create([
                        'journal_entry_id'    => $jeBill->id,
                        'chart_of_account_id' => $expenseCoa->id,
                        'debit'               => $amount,
                        'credit'              => 0.00,
                        'description'         => "Bill #{$billNumber} - {$expenseCoa->name}",
                    ]);
                    JournalEntryLine::create([
                        'journal_entry_id'    => $jeBill->id,
                        'chart_of_account_id' => $apCoa->id,
                        'debit'               => 0.00,
                        'credit'              => $amount,
                        'description'         => "Bill #{$billNumber} - {$supplier->name}",
                    ]);

                    // Automatically queue Payment Request in Disbursement Management
                    $prCount = DB::table('payment_requests')->count() + 1;
                    $prNumber = sprintf('PR-%s-%04d', now()->format('Ym'), $prCount);
                    while (PaymentRequest::where('request_number', $prNumber)->exists()) {
                        $prCount++;
                        $prNumber = sprintf('PR-%s-%04d', now()->format('Ym'), $prCount);
                    }

                    $pr = PaymentRequest::create([
                        'request_number'      => $prNumber,
                        'ap_bill_id'          => $bill->id,
                        'payee_name'          => $payeeName,
                        'amount'              => $amount,
                        'purpose'             => $validated['description'],
                        'requested_by'        => $systemUser->id,
                        'status'              => 'PENDING_APPROVAL',
                        'ai_confidence_score' => $aiResult['ai_confidence_score'],
                        'ai_anomaly_flag'     => $aiResult['ai_anomaly_flag'],
                        'ai_anomaly_reason'   => $aiResult['ai_anomaly_reason'],
                        'transaction_id'      => $id,
                    ]);

                    // Attach verified electronic voucher
                    $pr->attachments()->create([
                        'file_name'     => "voucher-{$prNumber}.pdf",
                        'file_path'     => 'attachments/requests/pr_voucher_sample.pdf',
                        'mime_type'     => 'application/pdf',
                        'file_size'     => 2048,
                        'document_type' => 'BILLING_STATEMENT',
                        'uploaded_by'   => $systemUser->id,
                    ]);

                    $coreRecords['ap_bill_id'] = $bill->id;
                    $coreRecords['bill_number'] = $billNumber;
                    $coreRecords['payment_request_id'] = $pr->id;
                    $coreRecords['voucher_number'] = $prNumber;
                }

                return [
                    'transaction_id' => $id,
                    'core_records'   => $coreRecords,
                ];
            });
        } catch (QueryException $e) {
            if ($idempotencyKey && $e->getCode() === '23505') {
                $existing = DB::table('transactions')->where('idempotency_key', $idempotencyKey)->first();
                if ($existing) {
                    return $this->payloadMatchesExisting($existing, $validated)
                        ? $this->duplicateResponse($existing)
                        : $this->idempotencyConflictResponse($existing);
                }
            }
            throw $e;
        }

        return response()->json([
            'status'           => 'accepted',
            'message'          => 'Transaction received and queued for human approval.',
            'transaction_id'   => $resultData['transaction_id'],
            'transaction_code' => $transactionCode,
            'workflow_status'  => $aiResult['status'],
            'ai_evaluation'    => [
                'confidence_score'   => $aiResult['ai_confidence_score'],
                'suggested_gl_code'  => $aiResult['ai_suggested_gl_code'],
                'anomaly_detected'   => $aiResult['ai_anomaly_flag'],
            ],
            'core_records'     => $resultData['core_records'],
        ], 202);
    }

    /**
     * Response returned when an idempotency key matches an already-persisted transaction.
     */
    private function duplicateResponse(object $existing): JsonResponse
    {
        return response()->json([
            'status'           => 'accepted',
            'message'          => 'Duplicate request detected. Returning existing transaction.',
            'transaction_id'   => $existing->id,
            'transaction_code' => $existing->transaction_code,
            'workflow_status'  => $existing->status,
            'ai_evaluation'    => [
                'confidence_score'   => $existing->ai_confidence_score,
                'suggested_gl_code'  => $existing->ai_suggested_gl_code,
                'anomaly_detected'   => $existing->ai_anomaly_flag,
            ],
        ], 200);
    }

    /**
     * Compare the significant fields of a newly-submitted payload against an
     * already-persisted transaction sharing the same idempotency key.
     */
    private function payloadMatchesExisting(object $existing, array $validated): bool
    {
        $money = fn ($value) => number_format((float) ($value ?? 0), 2, '.', '');

        return (string) $existing->source_module === (string) ($validated['external_module'] ?? '')
            && (string) $existing->external_reference_id === (string) ($validated['external_reference_id'] ?? '')
            && (string) ($existing->category_type ?? '') === (string) ($validated['category_type'] ?? '')
            && (string) $existing->type === (string) ($validated['type'] ?? '')
            && $money($existing->amount) === $money($validated['amount'] ?? 0)
            && $money($existing->tax_amount) === $money($validated['tax_amount'] ?? 0)
            && $money($existing->fee_amount) === $money($validated['fee_amount'] ?? 0)
            && (string) $existing->currency === (string) ($validated['currency'] ?? 'PHP')
            && (string) $existing->description === (string) ($validated['description'] ?? '');
    }

    /**
     * Response returned when an idempotency key is reused with materially different request data.
     */
    private function idempotencyConflictResponse(object $existing): JsonResponse
    {
        return response()->json([
            'status'            => 'error',
            'message'           => 'Idempotency-Key conflict: this key was already used for a transaction with different request data. Use a new Idempotency-Key for a genuinely different transaction.',
            'transaction_id'    => $existing->id,
            'transaction_code'  => $existing->transaction_code,
        ], 409);
    }

    /**
     * Map category_type to the appropriate internal subsystem slug.
     */
    private function resolveSubsystemSlug(string $categoryType): string
    {
        return match ($categoryType) {
            'SALES_REVENUE', 'CUSTOMER_REFUND', 'SALES_RETURN'          => 'accounts-receivable',
            'SUPPLIER_INVOICE', 'PURCHASE_RETURN'                       => 'accounts-payable',
            'PAYROLL_BENEFITS', 'PAYROLL_SALARY', 'EMPLOYEE_CLAIM'      => 'disbursement-management',
            'FLEET_FUEL', 'FLEET_MAINTENANCE'                           => 'disbursement-management',
            'FACILITY_RENT', 'LEGAL_BILLING'                            => 'disbursement-management',
            'INVENTORY_PURCHASE', 'INVENTORY_ADJUSTMENT',
            'INVENTORY_SHRINKAGE', 'COST_OF_GOODS_SOLD'                 => 'general-ledger',
            default                                                     => 'general-ledger',
        };
    }
}
