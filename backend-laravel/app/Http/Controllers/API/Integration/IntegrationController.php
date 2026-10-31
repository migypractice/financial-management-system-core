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
     * Inbound revenue ingestion (E-Commerce Online Sales, Customer Payments, Gateway Receipts, ESFA Subscriptions).
     * Automatically creates real ArInvoice in /ar, posts GL, and creates Collection in /collections & /cash if paid.
     */
    public function inboundRevenue(Request $request): JsonResponse
    {
        // 1. Resolve Flexible Reference Aliases
        $ref = $request->input('external_reference_id')
            ?? $request->input('reference_id')
            ?? $request->input('order_id')
            ?? $request->input('transaction_id')
            ?? $request->input('invoice_number')
            ?? ('REV-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6)));

        // 2. Resolve Flexible Counterparty Aliases
        $counterparty = $request->input('customer_name')
            ?? $request->input('seller_name')
            ?? $request->input('merchant_name')
            ?? $request->input('payer_name')
            ?? $request->input('payee_name')
            ?? 'E-Commerce Customer / Seller';

        // 3. Resolve Flexible Category / Type Aliases
        $category = strtoupper(
            $request->input('category_type')
            ?? $request->input('transaction_type')
            ?? $request->input('type')
            ?? 'ORDER_PAYMENT'
        );

        // 4. Resolve External Module
        $externalModule = $request->input('external_module')
            ?? $request->input('source_module')
            ?? (in_array($category, ['SELLER_SUBSCRIPTION', 'PLATFORM_COMMISSION', 'GATEWAY_SETTLEMENT']) ? 'ESFA_GROUP3' : 'ECOMMERCE_CORE');

        // 5. Resolve Fees and Breakdown Fields
        $feeAmount = (float) (
            $request->input('fee_amount')
            ?? $request->input('gateway_fee')
            ?? 0
        );

        $description = $request->input('description')
            ?? $request->input('purpose')
            ?? $request->input('notes')
            ?? "Inbound {$category} from {$counterparty}";

        // 6. Resolve Payment Status (PAID default for online/captured payments, gateway settlements, and COD)
        $paymentStatus = strtoupper(
            $request->input('payment_status')
            ?? $request->input('status')
            ?? (in_array($category, ['ORDER_PAYMENT', 'CAPTURED_PAYMENT', 'COD_COLLECTION', 'GATEWAY_SETTLEMENT', 'SELLER_SUBSCRIPTION', 'PLATFORM_COMMISSION', 'SALES_REVENUE']) ? 'PAID' : 'PAID')
        );
        if (!in_array($paymentStatus, ['PAID', 'UNPAID'])) {
            $paymentStatus = 'PAID';
        }

        $existingMeta = $request->input('metadata') ?? [];
        if (!is_array($existingMeta)) {
            $existingMeta = [];
        }

        $meta = array_merge([
            'customer_name'       => $counterparty,
            'payer_name'          => $counterparty,
            'payment_status'      => $paymentStatus,
            'gateway_fee'         => $feeAmount,
            'commission_amount'   => (float) ($request->input('commission_amount') ?? 0),
            'subscription_amount' => (float) ($request->input('subscription_amount') ?? 0),
        ], $existingMeta);

        $amount = $request->input('amount')
            ?? $request->input('total_amount')
            ?? $request->input('grand_total')
            ?? $request->input('net_amount');

        $taxAmount = $request->input('tax_amount');
        if ($taxAmount === null && $amount !== null && is_numeric($amount)) {
            // Compute 12% output VAT component standard in PH PFRS
            $taxAmount = round((float)$amount - ((float)$amount / 1.12), 2);
        }

        $request->merge([
            'external_module'       => $externalModule,
            'external_reference_id' => $ref,
            'category_type'         => $category,
            'amount'                => $amount,
            'tax_amount'            => $taxAmount,
            'fee_amount'            => $feeAmount,
            'description'           => $description,
            'metadata'              => $meta,
        ]);

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
     * Outbound disbursement request (Payroll, Supplier POs, Fleet Fuel, Facilities Rent, ESFA Seller Payouts, Refunds).
     * Automatically creates real ApBill in /ap, posts GL, and queues PaymentRequest voucher in /disbursements.
     */
    public function requestDisbursement(Request $request): JsonResponse
    {
        // 1. Resolve Flexible Reference Aliases
        $ref = $request->input('external_reference_id')
            ?? $request->input('reference_id')
            ?? $request->input('voucher_id')
            ?? $request->input('settlement_id')
            ?? $request->input('refund_id')
            ?? $request->input('po_number')
            ?? ('DISB-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6)));

        // 2. Resolve Flexible Category Aliases
        $category = strtoupper(
            $request->input('category_type')
            ?? $request->input('transaction_type')
            ?? $request->input('type')
            ?? $request->input('category')
            ?? 'SUPPLIER_INVOICE'
        );

        // 3. Resolve External Module
        $externalModule = $request->input('external_module')
            ?? $request->input('source_module');

        if (!$externalModule) {
            $externalModule = match ($category) {
                'SELLER_PAYOUT', 'SELLER_SETTLEMENT', 'CUSTOMER_REFUND' => 'ESFA_GROUP3',
                'INVENTORY_PURCHASE'                                    => 'SUPPLY_CHAIN',
                'FREIGHT_SHIPPING', 'FUEL_MANAGEMENT', 'FLEET_FUEL', 'FLEET_MAINTENANCE' => 'FLEET',
                'UTILITIES_BILL', 'CONTRACT_LEASE', 'FACILITY_RENT', 'LEGAL_BILLING'     => 'FACILITIES_LEGAL',
                'PAYROLL_BENEFITS', 'EMPLOYEE_REIMBURSEMENT', 'PAYROLL_SALARY', 'EMPLOYEE_CLAIM' => 'HRMS',
                default                                                 => 'ENTERPRISE_INTEGRATION',
            };
        }

        // 4. Resolve Payee Info Aliases
        $payeeAlias = $request->input('payee_name')
            ?? $request->input('seller_name')
            ?? $request->input('supplier_name')
            ?? $request->input('vendor_name')
            ?? $request->input('employee_name')
            ?? $request->input('customer_name');

        $payeeInfo = $request->input('payee_info');

        if (is_string($payeeInfo)) {
            $payeeInfo = ['name' => $payeeInfo];
        } elseif (is_array($payeeInfo)) {
            if (empty($payeeInfo['name']) && $payeeAlias) {
                $payeeInfo['name'] = $payeeAlias;
            }
        } elseif ($payeeAlias) {
            $payeeInfo = ['name' => $payeeAlias];
        }

        // If payee_info is provided and contains "Simulator", sanitize with realistic enterprise name
        if (is_array($payeeInfo) && !empty($payeeInfo['name']) && stripos($payeeInfo['name'], 'simulator') !== false) {
            $payeeInfo['name'] = match ($externalModule) {
                'HRMS'                          => 'HRMS Payroll Batch',
                'SUPPLY_CHAIN'                  => 'Supply Chain Vendor',
                'ESFA_GROUP3', 'ECOMMERCE_CORE' => 'ESFA Marketplace Partner',
                'FLEET'                         => 'Fleet Logistics Vendor',
                'FACILITIES_LEGAL'              => 'Corporate Facilities Partner',
                default                         => 'Corporate Commercial Payee',
            };
        }

        $description = $request->input('description')
            ?? $request->input('purpose')
            ?? $request->input('notes');

        if (!$description) {
            $pName = $payeeInfo['name'] ?? 'Payee';
            $description = "Disbursement request ({$category}) for {$pName}";
        }

        $amount = $request->input('amount')
            ?? $request->input('total_amount')
            ?? $request->input('disbursement_amount')
            ?? $request->input('net_amount');

        $request->merge([
            'external_module'       => $externalModule,
            'external_reference_id' => $ref,
            'category_type'         => $category,
            'amount'                => $amount,
            'payee_info'            => $payeeInfo,
            'description'           => $description,
        ]);

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

        // 4. Check Purchase Order (SmartChain Procurement Intake)
        $po = \App\Models\PurchaseOrder::with('supplier')
            ->where('financial_reference', $ref)
            ->orWhere('external_reference_id', $ref)
            ->orWhere('id', $ref)
            ->first();

        if ($po) {
            return response()->json([
                'success'               => true,
                'reference'             => $ref,
                'record_type'           => 'PURCHASE_ORDER',
                'status'                => $po->processing_status,
                'receipt_status'        => $po->receipt_status,
                'processing_status'     => $po->processing_status,
                'financial_reference'   => $po->financial_reference,
                'external_reference_id' => $po->external_reference_id,
                'source_system'         => $po->source_system,
                'supplier_name'         => $po->supplier_name,
                'total_amount'          => (float) $po->total_amount,
                'currency'              => $po->currency,
                'created_at'            => $po->created_at->toIso8601String(),
            ], 200);
        }

        // 5. Fallback: Check Transactions Table
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
                    // INBOUND REVENUE: E-Commerce / ESFA Group 3 -> AR Invoices & Collections
                    // =========================================================================
                    $custName = $validated['metadata']['customer_name']
                        ?? $validated['metadata']['payer_name']
                        ?? $validated['metadata']['seller_name']
                        ?? 'E-Commerce Online Customers';

                    $customer = Customer::firstOrCreate(
                        ['name' => $custName],
                        [
                            'customer_code'      => 'CUST-' . strtoupper(Str::random(5)),
                            'company_name'       => $custName,
                            'email'              => 'ecommerce@hardware.ph',
                            'phone'              => '+63 917 888 2000',
                            'address'            => 'Metro Manila, Philippines',
                            'credit_limit'       => 1000000.00,
                            'payment_terms_days' => 0,
                        ]
                    );

                    $category = $validated['category_type'] ?? 'ORDER_PAYMENT';

                    // Revenue Account: 4100-REV-SERVICE for Subscriptions / Commissions, 4000-REV for Sales
                    if (in_array($category, ['SELLER_SUBSCRIPTION', 'PLATFORM_COMMISSION', 'SERVICE_FEE'])) {
                        $revAccount = ChartOfAccount::where('code', '4100-REV-SERVICE')->first()
                                   ?? ChartOfAccount::where('code', '4000-REV')->first()
                                   ?? ChartOfAccount::create(['code' => '4100-REV-SERVICE', 'name' => 'Delivery & Platform Service Revenue', 'type' => 'REVENUE', 'normal_balance' => 'CREDIT']);
                    } else {
                        $revAccount = ChartOfAccount::where('code', '4000-REV')->first()
                                   ?? ChartOfAccount::create(['code' => '4000-REV', 'name' => 'Sales Revenue', 'type' => 'REVENUE', 'normal_balance' => 'CREDIT']);
                    }

                    $arAccount = ChartOfAccount::where('code', '1020-AR')->first()
                              ?? ChartOfAccount::create(['code' => '1020-AR', 'name' => 'Accounts Receivable', 'type' => 'ASSET', 'normal_balance' => 'DEBIT']);
                    $cashAccount = ChartOfAccount::where('code', '1010-CASH')->first()
                                ?? ChartOfAccount::create(['code' => '1010-CASH', 'name' => 'Cash and Cash Equivalents', 'type' => 'ASSET', 'normal_balance' => 'DEBIT']);
                    $taxAccount = ChartOfAccount::where('code', '2020-TAX')->first();
                    $feeExpenseAccount = ChartOfAccount::where('code', '5500-EXP-SUPPLIES')->first()
                                      ?? ChartOfAccount::create(['code' => '5500-EXP-SUPPLIES', 'name' => 'Store & Office Supplies Expense', 'type' => 'EXPENSE', 'normal_balance' => 'DEBIT']);

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
                        'category_type'       => $category,
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
                        'description'         => "Invoice #{$invNumber} [{$category}] - {$customer->name}",
                    ]);

                    $netRev = max(0, $amount - $taxAmount);
                    // Credit 4000-REV or 4100-REV-SERVICE ($netRev)
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

                    $coreRecords['ar_invoice_id']  = $invoice->id;
                    $coreRecords['invoice_number'] = $invNumber;
                    $coreRecords['category_type']  = $category;

                    // If paid at checkout, create Collection and credit bank balance (net of gateway fees)
                    if ($isPaid) {
                        $bank = BankAccount::where('bank_name', 'like', '%BDO%')
                             ->orWhere('account_name', 'like', '%Receivable%')
                             ->orWhere('account_name', 'like', '%Main%')
                             ->first()
                             ?? BankAccount::first()
                             ?? BankAccount::create([
                                 'account_number'  => '1001-BDO-MAIN',
                                 'account_name'    => 'BDO Main Operating Cash',
                                 'bank_name'       => 'Banco de Oro (BDO)',
                                 'account_type'    => 'Operating',
                                 'currency'        => 'PHP',
                                 'current_balance' => 0.00,
                             ]);

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

                            $payMethod = ($category === 'COD_COLLECTION') ? 'COD' : 'ONLINE';

                            $collection = Collection::create([
                                'collection_number' => $colNumber,
                                'ar_invoice_id'     => $invoice->id,
                                'bank_account_id'   => $bank->id,
                                'amount'            => $amount,
                                'collection_date'   => now()->toDateString(),
                                'payment_method'    => $payMethod,
                                'reference_number'  => $validated['external_reference_id'],
                                'collected_by'      => $systemUser->id,
                                'journal_entry_id'  => $jeCol->id,
                            ]);

                            $netCash = max(0, $amount - $feeAmount);

                            // Debit 1010-CASH (Net Cash in Bank)
                            JournalEntryLine::create([
                                'journal_entry_id'    => $jeCol->id,
                                'chart_of_account_id' => $cashAccount->id,
                                'debit'               => $netCash,
                                'credit'              => 0.00,
                                'description'         => "Online Collection #{$colNumber} - {$bank->account_name}",
                            ]);

                            // Debit 5500-EXP-SUPPLIES if gateway fee > 0
                            if ($feeAmount > 0) {
                                JournalEntryLine::create([
                                    'journal_entry_id'    => $jeCol->id,
                                    'chart_of_account_id' => $feeExpenseAccount->id,
                                    'debit'               => $feeAmount,
                                    'credit'              => 0.00,
                                    'description'         => "Gateway processing fee on #{$colNumber}",
                                ]);
                            }

                            // Credit 1020-AR ($amount)
                            JournalEntryLine::create([
                                'journal_entry_id'    => $jeCol->id,
                                'chart_of_account_id' => $arAccount->id,
                                'debit'               => 0.00,
                                'credit'              => $amount,
                                'description'         => "Settlement of Invoice #{$invNumber}",
                            ]);

                            $bank->increment('current_balance', $netCash);

                            $coreRecords['collection_id']     = $collection->id;
                            $coreRecords['collection_number'] = $colNumber;
                            $coreRecords['net_bank_deposit']  = $netCash;
                        }
                    }

                } else {
                    // =========================================================================
                    // OUTBOUND EXPENSE: HRMS, Fleet, Facilities, Supply Chain, ESFA -> AP & PRs
                    // =========================================================================
                    $payeeName = $validated['metadata']['payee_info']['name'] 
                        ?? $validated['metadata']['seller_name']
                        ?? $validated['metadata']['supplier_name']
                        ?? $validated['metadata']['vendor_name']
                        ?? null;

                    if (!$payeeName || stripos($payeeName, 'simulator') !== false) {
                        $payeeName = match ($validated['external_module']) {
                            'HRMS'                          => 'BDO Corporate Payroll (HR4 Bi-Monthly Batch)',
                            'FLEET'                         => 'Shell Fleet & Logistics',
                            'FACILITIES_LEGAL'              => 'Meralco Commercial Power',
                            'SUPPLY_CHAIN'                  => 'Puyat Steel Corporation (Supply Chain PO)',
                            'ESFA_GROUP3', 'ECOMMERCE_CORE' => 'ESFA Marketplace Partner',
                            default                         => 'Corporate Commercial Payee',
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
                        'SELLER_PAYOUT', 'SELLER_SETTLEMENT'                                     => '5000-COGS',
                        'PAYROLL_BENEFITS', 'PAYROLL_SALARY', 'EMPLOYEE_CLAIM', 'EMPLOYEE_REIMBURSEMENT' => '5100-EXP-SALARY',
                        'FLEET_FUEL', 'FLEET_MAINTENANCE', 'FREIGHT_SHIPPING', 'FUEL_MANAGEMENT' => '5400-EXP-LOGISTICS',
                        'FACILITY_RENT', 'CONTRACT_LEASE'                                        => '5300-EXP-RENT',
                        'UTILITIES_BILL', 'LEGAL_BILLING'                                        => '5200-EXP-UTIL',
                        'CUSTOMER_REFUND', 'SALES_RETURN', 'OFFICE_SUPPLIES', 'EQUIPMENT_REPAIR' => '5500-EXP-SUPPLIES',
                        'INVENTORY_PURCHASE', 'SUPPLIER_INVOICE'                                 => '1200-INV',
                        default                                                                  => '5500-EXP-SUPPLIES',
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
     * Live Financial & Analytics Summary for Group 3 (ESFA Analytics & Admin Dashboard).
     */
    public function financialSummary(Request $request): JsonResponse
    {
        $grossSales = (float) ArInvoice::sum('total_amount');

        $revCoaIds = ChartOfAccount::where('type', 'REVENUE')->pluck('id');
        $revCredits = (float) JournalEntryLine::whereIn('chart_of_account_id', $revCoaIds)->sum('credit');
        $revDebits = (float) JournalEntryLine::whereIn('chart_of_account_id', $revCoaIds)->sum('debit');
        $netRevenue = max(0, $revCredits - $revDebits);
        if ($netRevenue == 0 && $grossSales > 0) {
            $netRevenue = round($grossSales / 1.12, 2);
        }

        $commissionIncome = (float) ArInvoice::where('category_type', 'PLATFORM_COMMISSION')->sum('total_amount');
        if ($commissionIncome == 0) {
            $commissionIncome = (float) Transaction::where('category_type', 'PLATFORM_COMMISSION')->sum('amount');
        }

        $subscriptionIncome = (float) ArInvoice::where('category_type', 'SELLER_SUBSCRIPTION')->sum('total_amount');
        if ($subscriptionIncome == 0) {
            $subscriptionIncome = (float) Transaction::where('category_type', 'SELLER_SUBSCRIPTION')->sum('amount');
        }

        $totalRefunds = (float) ApBill::where('category_type', 'CUSTOMER_REFUND')->sum('total_amount');
        if ($totalRefunds == 0) {
            $totalRefunds = (float) Transaction::where('category_type', 'CUSTOMER_REFUND')->sum('amount');
        }

        $gatewayFees = (float) Transaction::where('type', 'INCOME')->sum('fee_amount');
        $totalCollections = (float) Collection::sum('amount');

        $totalDisbursements = (float) PaymentRequest::where('status', 'DISBURSED')->sum('amount');
        if ($totalDisbursements == 0) {
            $totalDisbursements = (float) ApBill::sum('paid_amount');
        }

        $liquidCashBalance = (float) BankAccount::sum('current_balance');

        $payload = [
            'gross_sales'         => round($grossSales, 2),
            'net_revenue'         => round($netRevenue, 2),
            'commission_income'   => round($commissionIncome, 2),
            'subscription_income' => round($subscriptionIncome, 2),
            'total_refunds'       => round($totalRefunds, 2),
            'gateway_fees'        => round($gatewayFees, 2),
            'total_collections'   => round($totalCollections, 2),
            'total_disbursements' => round($totalDisbursements, 2),
            'liquid_cash_balance' => round($liquidCashBalance, 2),
        ];

        return response()->json(array_merge([
            'success'  => true,
            'as_of'    => now()->toIso8601String(),
            'currency' => 'PHP',
            'data'     => $payload,
        ], $payload), 200);
    }

    /**
     * Live Tax Summary for Group 3 (ESFA Payment & Subscription Tax Sync).
     */
    public function taxSummary(Request $request): JsonResponse
    {
        $arInvoices = ArInvoice::with('customer')->orderByDesc('invoice_date')->get();
        $outputVat12 = 0.0;
        $commissionTaxBase = 0.0;
        $subscriptionTaxBase = 0.0;
        $recentRecords = [];

        foreach ($arInvoices as $inv) {
            $gross = (float) $inv->total_amount;
            $vatableBase = round($gross / 1.12, 2);
            $vat = round($gross - $vatableBase, 2);
            $outputVat12 += $vat;

            $cat = $inv->category_type ?? 'SALES_REVENUE';
            if ($cat === 'PLATFORM_COMMISSION') {
                $commissionTaxBase += $vatableBase;
            } elseif ($cat === 'SELLER_SUBSCRIPTION') {
                $subscriptionTaxBase += $vatableBase;
            }

            if (count($recentRecords) < 15) {
                $recentRecords[] = [
                    'type'         => 'OUTPUT_VAT',
                    'reference'    => $inv->invoice_number,
                    'counterparty' => $inv->customer?->name ?? 'Online Client',
                    'category'     => $cat,
                    'gross_amount' => $gross,
                    'tax_base'     => $vatableBase,
                    'vat_amount'   => $vat,
                    'rate'         => 0.12,
                    'date'         => $inv->invoice_date?->toDateString() ?? now()->toDateString(),
                ];
            }
        }

        $apBills = ApBill::with('supplier')->orderByDesc('bill_date')->get();
        $inputVat12 = 0.0;
        $withholdingTaxEwt = 0.0;

        foreach ($apBills as $bill) {
            $gross = (float) $bill->total_amount;
            $cat = $bill->category_type ?? 'SUPPLIER_INVOICE';
            $tax = $this->aiService->computeTaxBreakdown($gross, $cat, 'ACCOUNTS_PAYABLE');

            $inputVat12 += $tax['vat_amount'];
            $withholdingTaxEwt += $tax['ewt_amount'];

            if (count($recentRecords) < 30) {
                $recentRecords[] = [
                    'type'         => 'INPUT_VAT',
                    'reference'    => $bill->bill_number,
                    'counterparty' => $bill->supplier?->name ?? 'External Vendor',
                    'category'     => $cat,
                    'gross_amount' => $gross,
                    'tax_base'     => $tax['vatable_base'],
                    'vat_amount'   => $tax['vat_amount'],
                    'ewt_code'     => $tax['ewt_code'],
                    'ewt_rate'     => $tax['ewt_rate'],
                    'ewt_amount'   => $tax['ewt_amount'],
                    'rate'         => $tax['vat_rate'],
                    'date'         => $bill->bill_date?->toDateString() ?? now()->toDateString(),
                ];
            }
        }

        $netVatPayable = max(0, round($outputVat12 - $inputVat12, 2));

        $payload = [
            'output_vat_12'          => round($outputVat12, 2),
            'input_vat_12'           => round($inputVat12, 2),
            'net_vat_payable'        => $netVatPayable,
            'withholding_tax_ewt'    => round($withholdingTaxEwt, 2),
            'commission_tax_base'    => round($commissionTaxBase, 2),
            'subscription_tax_base'  => round($subscriptionTaxBase, 2),
            'recent_taxable_records' => $recentRecords,
        ];

        return response()->json(array_merge([
            'success' => true,
            'as_of'   => now()->toIso8601String(),
            'data'    => $payload,
        ], $payload), 200);
    }

    /**
     * Clean JSON feed for Group 4 (Facilities & Admin: Document Management Archiving & Records Retention).
     */
    public function archivingRecords(Request $request): JsonResponse
    {
        $limit = min(200, (int) $request->query('limit', 50));

        // 1. Official Receipts (Collections)
        $receipts = Collection::with(['arInvoice.customer', 'bankAccount'])
            ->orderByDesc('collection_date')
            ->limit($limit)
            ->get()
            ->map(fn($c) => [
                'id'                => $c->id,
                'collection_number' => $c->collection_number,
                'invoice_number'    => $c->arInvoice?->invoice_number,
                'customer_name'     => $c->arInvoice?->customer?->name ?? 'Walk-in / Online Client',
                'amount'            => (float) $c->amount,
                'collection_date'   => $c->collection_date ? (is_string($c->collection_date) ? $c->collection_date : $c->collection_date->toDateString()) : null,
                'payment_method'    => $c->payment_method,
                'reference_number'  => $c->reference_number,
                'bank_account'      => $c->bankAccount?->account_name,
                'created_at'        => $c->created_at->toIso8601String(),
            ]);

        // 2. Supplier / Seller Bills (AP Bills)
        $bills = ApBill::with(['supplier'])
            ->orderByDesc('bill_date')
            ->limit($limit)
            ->get()
            ->map(fn($b) => [
                'id'            => $b->id,
                'bill_number'   => $b->bill_number,
                'supplier_name' => $b->supplier?->name ?? 'External Vendor',
                'category_type' => $b->category_type,
                'total_amount'  => (float) $b->total_amount,
                'paid_amount'   => (float) $b->paid_amount,
                'balance'       => (float) $b->balance,
                'status'        => $b->status,
                'bill_date'     => $b->bill_date ? (is_string($b->bill_date) ? $b->bill_date : $b->bill_date->toDateString()) : null,
                'due_date'      => $b->due_date ? (is_string($b->due_date) ? $b->due_date : $b->due_date->toDateString()) : null,
                'description'   => $b->description,
                'created_at'    => $b->created_at->toIso8601String(),
            ]);

        // 3. Sales / Subscription Invoices (AR Invoices)
        $invoices = ArInvoice::with(['customer'])
            ->orderByDesc('invoice_date')
            ->limit($limit)
            ->get()
            ->map(fn($i) => [
                'id'             => $i->id,
                'invoice_number' => $i->invoice_number,
                'customer_name'  => $i->customer?->name ?? 'Online Client',
                'category_type'  => $i->category_type ?? 'SALES_REVENUE',
                'total_amount'   => (float) $i->total_amount,
                'paid_amount'    => (float) $i->paid_amount,
                'balance'        => (float) $i->balance,
                'status'         => $i->status,
                'invoice_date'   => $i->invoice_date ? (is_string($i->invoice_date) ? $i->invoice_date : $i->invoice_date->toDateString()) : null,
                'due_date'       => $i->due_date ? (is_string($i->due_date) ? $i->due_date : $i->due_date->toDateString()) : null,
                'description'    => $i->description,
                'created_at'     => $i->created_at->toIso8601String(),
            ]);

        // 4. Audit Logs (Transactions & AI decision trail)
        $auditLogs = DB::table('ai_logs')
            ->join('transactions', 'transactions.id', '=', 'ai_logs.transaction_id')
            ->leftJoin('users', 'users.id', '=', 'transactions.created_by')
            ->select([
                'ai_logs.id',
                'transactions.transaction_code',
                'transactions.external_reference_id',
                'transactions.source_module',
                'transactions.category_type',
                'transactions.type',
                'transactions.amount',
                'ai_logs.ai_decision',
                'ai_logs.flag_reason',
                'ai_logs.anomaly_score',
                'users.name as created_by_user',
                'ai_logs.created_at',
            ])
            ->orderByDesc('ai_logs.created_at')
            ->limit($limit)
            ->get();

        return response()->json([
            'success'                     => true,
            'as_of'                       => now()->toIso8601String(),
            'retention_policy'            => 'PFRS / BIR 10-Year Archiving Compliance',
            'counts'                      => [
                'official_receipts'           => $receipts->count(),
                'supplier_bills'              => $bills->count(),
                'supplier_seller_bills'       => $bills->count(),
                'sales_invoices'              => $invoices->count(),
                'sales_subscription_invoices' => $invoices->count(),
                'audit_logs'                  => $auditLogs->count(),
            ],
            'official_receipts'           => $receipts,
            'supplier_seller_bills'       => $bills,
            'sales_subscription_invoices' => $invoices,
            'audit_logs'                  => $auditLogs,
            'data'                        => [
                'official_receipts'           => $receipts,
                'supplier_seller_bills'       => $bills,
                'sales_subscription_invoices' => $invoices,
                'audit_logs'                  => $auditLogs,
            ],
        ], 200);
    }

    private function resolveSubsystemSlug(string $categoryType): string
    {
        return match ($categoryType) {
            'SALES_REVENUE', 'CUSTOMER_REFUND', 'SALES_RETURN',
            'ORDER_PAYMENT', 'CAPTURED_PAYMENT', 'COD_COLLECTION',
            'SELLER_SUBSCRIPTION', 'PLATFORM_COMMISSION', 'GATEWAY_SETTLEMENT' => 'accounts-receivable',

            'SUPPLIER_INVOICE', 'PURCHASE_RETURN', 'SELLER_PAYOUT', 'SELLER_SETTLEMENT' => 'accounts-payable',

            'PAYROLL_BENEFITS', 'PAYROLL_SALARY', 'EMPLOYEE_CLAIM', 'EMPLOYEE_REIMBURSEMENT',
            'FLEET_FUEL', 'FLEET_MAINTENANCE', 'FREIGHT_SHIPPING', 'FUEL_MANAGEMENT',
            'FACILITY_RENT', 'CONTRACT_LEASE', 'LEGAL_BILLING', 'UTILITIES_BILL' => 'disbursement-management',

            'INVENTORY_PURCHASE', 'INVENTORY_ADJUSTMENT',
            'INVENTORY_SHRINKAGE', 'COST_OF_GOODS_SOLD' => 'general-ledger',
            default => 'general-ledger',
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HRMS CLUSTER PROTOCOL — BATCH / SINGLE DUAL-MODE ADAPTER METHODS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Wildcard adapter: POST /api/integrations/{sender}/{resource}
     * Dynamically routes to batchRevenue or batchDisbursement based on resource slug.
     */
    public function wildcardAdapter(Request $request, string $sender, string $resource): JsonResponse
    {
        $revenueResources = ['revenue', 'sales', 'collections', 'subscriptions', 'commissions'];
        $expenseResources = ['payroll', 'disbursements', 'claims', 'bills', 'vouchers', 'payouts', 'refunds'];

        $normalizedResource = strtolower($resource);

        // Inject sender as source_module hint if not provided
        if (!$request->has('external_module') && !$request->has('source_module')) {
            $senderMap = [
                'hr4'          => 'HRMS',
                'hr3'          => 'HRMS',
                'hr2'          => 'HRMS',
                'hr1'          => 'HRMS',
                'esfa'         => 'ESFA_GROUP3',
                'ecommerce'    => 'ECOMMERCE_CORE',
                'supply-chain' => 'SUPPLY_CHAIN',
                'fleet'        => 'FLEET',
                'facilities'   => 'FACILITIES_LEGAL',
            ];
            $request->merge(['source_module' => $senderMap[strtolower($sender)] ?? 'ENTERPRISE_INTEGRATION']);
        }

        if (in_array($normalizedResource, $revenueResources)) {
            return $this->batchRevenue($request);
        }

        if (in_array($normalizedResource, $expenseResources)) {
            return $this->batchDisbursement($request);
        }

        return response()->json([
            'status'   => 'error',
            'message'  => "Unknown resource '{$resource}'. Use one of: " . implode(', ', array_merge($revenueResources, $expenseResources)),
            'accepted' => 0,
            'rejected' => [],
        ], 400);
    }

    /**
     * Batch-capable inbound revenue: supports { "records": [...] } (max 500) or single object.
     * Returns HRMS-compatible { accepted, rejected } alongside standard fields.
     */
    public function batchRevenue(Request $request): JsonResponse
    {
        return $this->processBatch($request, 'revenue');
    }

    /**
     * Batch-capable disbursement request: supports { "records": [...] } (max 500) or single object.
     * Returns HRMS-compatible { accepted, rejected } alongside standard fields.
     */
    public function batchDisbursement(Request $request): JsonResponse
    {
        return $this->processBatch($request, 'disbursement');
    }

    /**
     * Core batch/single processing engine.
     * - Detects batch (records array, max 500) vs single-object payload
     * - Resolves centavos fields (amount_centavos, net_pay_centavos, gross_pay_centavos)
     * - Builds deterministic idempotency keys from HR fields (period + employee_code)
     * - Processes each row independently (one row's failure doesn't fail the batch)
     * - Returns HRMS-compatible { accepted, rejected } response
     */
    private function processBatch(Request $request, string $mode): JsonResponse
    {
        $records = $request->input('records');
        $isBatch = is_array($records) && count($records) > 0;

        if ($isBatch && count($records) > 500) {
            return response()->json([
                'status'   => 'error',
                'message'  => 'Batch size exceeds maximum of 500 records.',
                'accepted' => 0,
                'rejected' => [['row' => 0, 'reason' => 'Batch contains ' . count($records) . ' records, max is 500.']],
            ], 422);
        }

        // Single-object → wrap in array of 1
        if (!$isBatch) {
            $records = [$request->all()];
        }

        $accepted = 0;
        $rejected = [];
        $results  = [];

        foreach ($records as $index => $row) {
            if (!is_array($row)) {
                $rejected[] = ['row' => $index, 'reason' => 'Record must be a JSON object.'];
                continue;
            }

            try {
                // Resolve centavos → decimal amount
                $row = $this->resolveCentavos($row);

                // Resolve HR-specific deterministic idempotency key
                $row = $this->resolveHrIdempotencyKey($row);

                // Resolve HR-specific field aliases
                $row = $this->resolveHrFieldAliases($row);

                // Build a synthetic Request for the underlying single-record method
                $syntheticRequest = Request::create(
                    $request->url(),
                    'POST',
                    $row,
                    [], [], [],
                    json_encode($row)
                );
                $syntheticRequest->headers->set('Content-Type', 'application/json');
                $syntheticRequest->headers->set('Accept', 'application/json');

                // Copy idempotency key header if present in original or row
                $idemKey = $row['idempotency_key']
                    ?? $row['Idempotency-Key']
                    ?? null;
                if ($idemKey) {
                    $syntheticRequest->headers->set('Idempotency-Key', $idemKey);
                }

                /** @var JsonResponse $response */
                if ($mode === 'revenue') {
                    $response = $this->inboundRevenue($syntheticRequest);
                } else {
                    $response = $this->requestDisbursement($syntheticRequest);
                }

                $statusCode = $response->getStatusCode();
                $body = json_decode($response->getContent(), true);

                if ($statusCode >= 200 && $statusCode < 300) {
                    $accepted++;
                    $results[] = $body;
                } elseif ($statusCode === 200 && ($body['message'] ?? '') === 'Duplicate request detected. Returning existing transaction.') {
                    // Idempotent duplicate — still counts as accepted
                    $accepted++;
                    $results[] = $body;
                } else {
                    $reason = $body['message'] ?? 'Validation or processing error.';
                    if (isset($body['errors'])) {
                        $reason = collect($body['errors'])->flatten()->implode('; ');
                    }
                    $rejected[] = ['row' => $index, 'reason' => $reason];
                }

                // Log to audit_logs for compliance
                $this->logBatchAudit($row, $mode, $statusCode, $body);

            } catch (\Illuminate\Validation\ValidationException $ve) {
                $reason = collect($ve->errors())->flatten()->implode('; ');
                $rejected[] = ['row' => $index, 'reason' => $reason];
                $this->logBatchAudit($row, $mode, 422, ['error' => $reason]);
            } catch (\Throwable $e) {
                $rejected[] = ['row' => $index, 'reason' => $e->getMessage()];
                $this->logBatchAudit($row, $mode, 500, ['error' => $e->getMessage()]);
            }
        }

        $httpStatus = ($accepted > 0) ? ($isBatch ? 200 : 202) : 422;
        // If single-object and accepted, use 202 to match existing convention
        if (!$isBatch && $accepted === 1 && count($results) === 1) {
            return response()->json(array_merge($results[0], [
                'accepted' => 1,
                'rejected' => [],
            ]), 202);
        }

        return response()->json([
            'status'   => $accepted > 0 ? 'accepted' : 'error',
            'message'  => $accepted > 0
                ? "Batch processed: {$accepted} accepted, " . count($rejected) . " rejected."
                : 'All records were rejected.',
            'accepted' => $accepted,
            'rejected' => $rejected,
            'data'     => $results,
        ], $httpStatus);
    }

    /**
     * Resolve centavos fields to decimal amounts (HRMS spec: integer centavos / 100).
     */
    private function resolveCentavos(array $row): array
    {
        if (isset($row['amount']) && is_numeric($row['amount'])) {
            return $row;
        }

        $centavoFields = ['amount_centavos', 'net_pay_centavos', 'gross_pay_centavos'];
        foreach ($centavoFields as $field) {
            if (isset($row[$field]) && is_numeric($row[$field])) {
                $row['amount'] = round((int) $row[$field] / 100, 2);
                return $row;
            }
        }

        // Fallback to other amount aliases
        $amountAliases = ['net_pay', 'gross_pay', 'total_amount', 'disbursement_amount', 'net_amount'];
        foreach ($amountAliases as $alias) {
            if (isset($row[$alias]) && is_numeric($row[$alias])) {
                $row['amount'] = (float) $row[$alias];
                return $row;
            }
        }

        return $row;
    }

    /**
     * Build deterministic idempotency key from HR4 payroll fields so resending
     * the same batch never creates duplicate bills/vouchers.
     * Key pattern: HR4-{period}-{employee_code} or HR4-{payroll_run_id}
     */
    private function resolveHrIdempotencyKey(array $row): array
    {
        // If idempotency_key or Idempotency-Key already set, use it
        if (!empty($row['idempotency_key']) || !empty($row['Idempotency-Key'])) {
            return $row;
        }

        // Build from reference_id if present
        if (!empty($row['reference_id']) || !empty($row['external_reference_id'])) {
            $ref = $row['reference_id'] ?? $row['external_reference_id'];
            $row['idempotency_key'] = 'HREF-' . md5($ref);
            return $row;
        }

        // Build from payroll_run_id + employee_code
        if (!empty($row['payroll_run_id'])) {
            $empCode = $row['employee_code'] ?? 'ALL';
            $row['idempotency_key'] = 'HR4-' . $row['payroll_run_id'] . '-' . $empCode;
            return $row;
        }

        // Build from period + employee_code
        if (!empty($row['period']) && !empty($row['employee_code'])) {
            $row['idempotency_key'] = 'HR4-' . $row['period'] . '-' . $row['employee_code'];
            return $row;
        }

        return $row;
    }

    /**
     * Map HR-specific field names to our standard integration fields.
     */
    private function resolveHrFieldAliases(array $row): array
    {
        // employee_name → payee_name
        if (!isset($row['payee_name']) && isset($row['employee_name'])) {
            $row['payee_name'] = $row['employee_name'];
        }

        // department / department_code → metadata
        if (isset($row['department']) || isset($row['department_code'])) {
            $row['metadata'] = array_merge($row['metadata'] ?? [], [
                'department'      => $row['department'] ?? null,
                'department_code' => $row['department_code'] ?? null,
                'employee_code'   => $row['employee_code'] ?? null,
                'period'          => $row['period'] ?? null,
                'payroll_run_id'  => $row['payroll_run_id'] ?? null,
                'claim_type'      => $row['claim_type'] ?? null,
            ]);
        }

        // Default category_type for payroll if not specified
        if (!isset($row['category_type']) && !isset($row['transaction_type']) && !isset($row['type'])) {
            if (isset($row['payroll_run_id']) || isset($row['period'])) {
                $row['category_type'] = 'PAYROLL_SALARY';
            } elseif (isset($row['claim_type'])) {
                $row['category_type'] = 'EMPLOYEE_CLAIM';
            }
        }

        // Default external_reference_id from HR identifiers if missing
        if (!isset($row['external_reference_id']) && !isset($row['reference_id'])) {
            if (!empty($row['payroll_run_id'])) {
                $empCode = $row['employee_code'] ?? 'EMP';
                $row['external_reference_id'] = $row['payroll_run_id'] . '-' . $empCode;
            } elseif (!empty($row['period']) && !empty($row['employee_code'])) {
                $row['external_reference_id'] = 'HR4-' . $row['period'] . '-' . $row['employee_code'];
            }
        }

        // Default external_module for HR
        if (!isset($row['external_module']) && !isset($row['source_module'])) {
            $row['source_module'] = 'HRMS';
            $row['external_module'] = 'HRMS';
        }

        // Default description from HR fields
        if (!isset($row['description']) && !isset($row['purpose']) && !isset($row['notes'])) {
            $empName = $row['employee_name'] ?? $row['payee_name'] ?? 'Employee';
            $period  = $row['period'] ?? now()->format('Y-m');
            $cat     = $row['category_type'] ?? $row['claim_type'] ?? 'PAYROLL';
            $row['description'] = "{$cat} for {$empName} ({$period})";
        }

        return $row;
    }

    /**
     * Log batch audit entry for compliance traceability.
     */
    private function logBatchAudit(array $row, string $mode, int $statusCode, array $response): void
    {
        try {
            DB::table('ai_logs')->insert([
                'id'             => (string) Str::uuid(),
                'transaction_id' => $response['transaction_id'] ?? null,
                'anomaly_score'  => 0,
                'ai_decision'    => $statusCode < 300 ? 'BATCH_ACCEPTED' : 'BATCH_REJECTED',
                'flag_reason'    => json_encode([
                    'mode'         => $mode,
                    'sender'       => $row['source_module'] ?? $row['external_module'] ?? 'UNKNOWN',
                    'reference'    => $row['external_reference_id'] ?? $row['reference_id'] ?? null,
                    'status_code'  => $statusCode,
                    'employee_code'=> $row['employee_code'] ?? null,
                    'period'       => $row['period'] ?? null,
                ]),
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);
        } catch (\Throwable $e) {
            // Non-critical: don't let audit logging failure break the batch
        }
    }
}

