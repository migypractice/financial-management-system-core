<?php

namespace App\Http\Controllers\API\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderLine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
}
