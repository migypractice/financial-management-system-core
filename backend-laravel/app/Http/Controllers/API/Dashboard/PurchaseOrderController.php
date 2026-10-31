<?php

namespace App\Http\Controllers\API\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\ApBill;
use App\Models\ChartOfAccount;
use App\Models\PaymentRequest;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderLine;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PurchaseOrderController extends Controller
{
    /**
     * Authenticated internal listing API for incoming SmartChain Purchase Orders.
     * Accessible by: super_admin, finance_manager, accountant, auditor.
     *
     * Route: GET /api/v1/dashboard/purchase-orders
     */
    public function index(Request $request): JsonResponse
    {
        $query = PurchaseOrder::with(['items', 'supplier'])
            ->orderByDesc('received_at')
            ->orderByDesc('created_at');

        // 1. Search by Financial Reference, SmartChain PO number, or Supplier
        if ($search = trim($request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('financial_reference', 'like', "%{$search}%")
                  ->orWhere('external_reference_id', 'like', "%{$search}%")
                  ->orWhere('supplier_name', 'like', "%{$search}%")
                  ->orWhere('supplier_code', 'like', "%{$search}%")
                  ->orWhereHas('items', function ($itemQuery) use ($search) {
                      $itemQuery->where('product_name', 'like', "%{$search}%")
                                ->orWhere('product_id', 'like', "%{$search}%");
                  });
            });
        }

        // 2. Status filtering (PENDING_REVIEW included by default when 'ALL' or omitted)
        if ($status = $request->query('status')) {
            if (strtoupper($status) !== 'ALL') {
                $query->where(function ($q) use ($status) {
                    $q->where('processing_status', strtoupper($status))
                      ->orWhere('receipt_status', strtoupper($status));
                });
            }
        }

        // 3. Source system filter (optional)
        if ($source = $request->query('source_system')) {
            if (strtoupper($source) !== 'ALL') {
                $query->where('source_system', strtoupper($source));
            }
        }

        $allOrders = $query->get();

        $data = $allOrders->map(function (PurchaseOrder $po) {
            return [
                'id'                    => $po->id,
                'financial_reference'   => $po->financial_reference,
                'external_reference_id' => $po->external_reference_id,
                'source_system'         => $po->source_system,
                'supplier_name'         => $po->supplier_name,
                'supplier_code'         => $po->supplier_code ?? $po->supplier?->supplier_code,
                'total_amount'          => (float) $po->total_amount,
                'currency'              => $po->currency,
                'receipt_status'        => $po->receipt_status,
                'processing_status'     => $po->processing_status,
                'category_type'         => $po->category_type,
                'items_count'           => $po->items->count(),
                'received_at'           => $po->received_at?->toIso8601String() ?? $po->created_at->toIso8601String(),
                'created_at'            => $po->created_at->toIso8601String(),
                'items'                 => $po->items->map(fn (PurchaseOrderLine $line) => [
                    'id'                => $line->id,
                    'source_po_line_id' => $line->source_po_line_id,
                    'product_id'        => $line->product_id,
                    'product_name'      => $line->product_name,
                    'quantity'          => (float) $line->quantity,
                    'unit'              => $line->unit,
                    'unit_price'        => (float) $line->unit_price,
                    'line_total'        => (float) $line->line_total,
                ]),
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Purchase orders retrieved successfully.',
            'count'   => $data->count(),
            'summary' => [
                'total_orders'    => $allOrders->count(),
                'pending_review'  => $allOrders->where('processing_status', 'PENDING_REVIEW')->count(),
                'total_amount'    => (float) $allOrders->sum('total_amount'),
            ],
            'data'    => $data,
        ], 200);
    }

    /**
     * Authenticated internal detail API for a single Purchase Order.
     *
     * Route: GET /api/v1/dashboard/purchase-orders/{reference}
     */
    public function show(string $reference): JsonResponse
    {
        $ref = trim($reference);

        $query = PurchaseOrder::with(['items', 'supplier'])
            ->where(function ($q) use ($ref) {
                $q->where('financial_reference', $ref)
                  ->orWhere('external_reference_id', $ref);

                if (Str::isUuid($ref)) {
                    $q->orWhere('id', $ref);
                }
            });

        $po = $query->first();

        if (!$po) {
            return response()->json([
                'success' => false,
                'message' => "Purchase order not found for reference '{$ref}'.",
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'id'                    => $po->id,
                'financial_reference'   => $po->financial_reference,
                'external_reference_id' => $po->external_reference_id,
                'source_system'         => $po->source_system,
                'supplier_name'         => $po->supplier_name,
                'supplier_code'         => $po->supplier_code ?? $po->supplier?->supplier_code,
                'total_amount'          => (float) $po->total_amount,
                'currency'              => $po->currency,
                'receipt_status'        => $po->receipt_status,
                'processing_status'     => $po->processing_status,
                'category_type'         => $po->category_type,
                'received_at'           => $po->received_at?->toIso8601String() ?? $po->created_at->toIso8601String(),
                'created_at'            => $po->created_at->toIso8601String(),
                'metadata'              => $po->metadata,
                'items'                 => $po->items->map(fn (PurchaseOrderLine $line) => [
                    'id'                => $line->id,
                    'source_po_line_id' => $line->source_po_line_id,
                    'product_id'        => $line->product_id,
                    'product_name'      => $line->product_name,
                    'quantity'          => (float) $line->quantity,
                    'unit'              => $line->unit,
                    'unit_price'        => (float) $line->unit_price,
                    'line_total'        => (float) $line->line_total,
                ]),
            ],
        ], 200);
    }

    /**
     * Forward an approved Purchase Order intake to Disbursement Management as a Payment Request voucher.
     *
     * Route: POST /api/v1/dashboard/purchase-orders/{reference}/forward-disbursement
     */
    public function forwardToDisbursement(string $reference, Request $request): JsonResponse
    {
        $ref = trim($reference);

        $query = PurchaseOrder::with(['items', 'supplier'])
            ->where(function ($q) use ($ref) {
                $q->where('financial_reference', $ref)
                  ->orWhere('external_reference_id', $ref);

                if (Str::isUuid($ref)) {
                    $q->orWhere('id', $ref);
                }
            });

        $po = $query->first();

        if (!$po) {
            return response()->json([
                'success' => false,
                'message' => "Purchase order not found for reference '{$ref}'.",
            ], 404);
        }

        // Check if already forwarded or existing PaymentRequest found
        $existingPr = PaymentRequest::where('purpose', 'like', "%{$po->external_reference_id}%")
            ->orWhere('purpose', 'like', "%{$po->financial_reference}%")
            ->first();

        if ($existingPr) {
            return response()->json([
                'success' => true,
                'message' => "Purchase order is already forwarded to Disbursement Management as Voucher {$existingPr->request_number}.",
                'data'    => [
                    'voucher_number'     => $existingPr->request_number,
                    'payment_request_id' => $existingPr->id,
                    'amount'             => (float) $existingPr->amount,
                    'payee_name'         => $existingPr->payee_name,
                    'status'             => $existingPr->status,
                ],
            ], 200);
        }

        return DB::transaction(function () use ($po) {
            // 1. Resolve Supplier
            $supplier = $po->supplier;
            if (!$supplier) {
                $supplier = Supplier::where('supplier_code', $po->supplier_code)
                    ->orWhere('name', 'like', "%{$po->supplier_name}%")
                    ->first();
            }

            if (!$supplier) {
                $supplier = Supplier::create([
                    'supplier_code'      => $po->supplier_code ?? ('SUP-' . strtoupper(Str::random(4))),
                    'name'               => $po->supplier_name ?? 'SmartChain Supplier',
                    'company_name'       => $po->supplier_name ?? 'SmartChain Supplier',
                    'payment_terms_days' => 30,
                ]);
            }

            // 2. Resolve Chart of Accounts
            $coa = ChartOfAccount::where('code', '1200-INV')->first()
                ?? ChartOfAccount::where('code', '5500-EXP-SUPPLIES')->first()
                ?? ChartOfAccount::first();

            // 3. Create real ApBill for the purchase order obligation
            $billNumber = 'BILL-' . now()->format('Ym') . '-' . strtoupper(Str::random(5));
            while (ApBill::where('bill_number', $billNumber)->exists()) {
                $billNumber = 'BILL-' . now()->format('Ym') . '-' . strtoupper(Str::random(5));
            }

            $userId = auth()->id() ?? User::first()?->id;

            $bill = ApBill::create([
                'bill_number'         => $billNumber,
                'supplier_id'         => $supplier->id,
                'chart_of_account_id' => $coa?->id,
                'bill_date'           => now()->toDateString(),
                'due_date'            => now()->addDays(15)->toDateString(),
                'total_amount'        => $po->total_amount,
                'paid_amount'         => 0.00,
                'balance'             => $po->total_amount,
                'category_type'       => $po->category_type ?? 'INVENTORY_PURCHASE',
                'description'         => "Supplier Bill for SmartChain PO [{$po->external_reference_id}] ({$po->financial_reference}) - {$supplier->name}",
                'status'              => 'UNPAID',
                'created_by'          => $userId,
            ]);

            // 4. Create Payment Request (Disbursement Voucher) in PENDING_APPROVAL
            $prCount = DB::table('payment_requests')->count() + 1;
            $prNumber = sprintf('PR-%s-%04d', now()->format('Ym'), $prCount);
            while (PaymentRequest::where('request_number', $prNumber)->exists()) {
                $prCount++;
                $prNumber = sprintf('PR-%s-%04d', now()->format('Ym'), $prCount);
            }

            $pr = PaymentRequest::create([
                'request_number'      => $prNumber,
                'ap_bill_id'          => $bill->id,
                'payee_name'          => $supplier->name,
                'amount'              => $po->total_amount,
                'purpose'             => "Payment Voucher for SmartChain PO [{$po->external_reference_id}] ({$po->financial_reference}) - {$supplier->name}",
                'requested_by'        => $userId,
                'status'              => 'PENDING_APPROVAL',
                'ai_confidence_score' => 0.9850,
                'ai_anomaly_flag'     => false,
            ]);

            // 5. Update Purchase Order status
            $po->processing_status = 'FORWARDED_TO_DISBURSEMENT';
            $meta = is_array($po->metadata) ? $po->metadata : [];
            $meta['payment_request_id'] = $pr->id;
            $meta['voucher_number'] = $prNumber;
            $meta['ap_bill_number'] = $billNumber;
            $meta['forwarded_at'] = now()->toIso8601String();
            $po->metadata = $meta;
            $po->save();

            return response()->json([
                'success' => true,
                'message' => "Purchase order [{$po->financial_reference}] successfully forwarded to Disbursement Management as Voucher {$prNumber}.",
                'data'    => [
                    'voucher_number'     => $pr->request_number,
                    'payment_request_id' => $pr->id,
                    'ap_bill_number'     => $billNumber,
                    'amount'             => (float) $pr->amount,
                    'payee_name'         => $pr->payee_name,
                    'status'             => $pr->status,
                ],
            ], 200);
        });
    }
}

