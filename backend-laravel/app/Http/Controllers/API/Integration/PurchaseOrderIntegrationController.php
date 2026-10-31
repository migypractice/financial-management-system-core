<?php

namespace App\Http\Controllers\API\Integration;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderLine;
use App\Models\Supplier;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class PurchaseOrderIntegrationController extends Controller
{
    /**
     * Authorized external source systems.
     */
    protected const ALLOWED_SOURCE_SYSTEMS = [
        'SMARTCHAIN',
    ];

    /**
     * Accepted units of measure:
     * Current writable: PCS, SACK, DRUM
     * Historical: KG, L
     */
    protected const ALLOWED_UNITS = [
        'PCS',
        'SACK',
        'DRUM',
        'KG',
        'L',
    ];

    /**
     * Ingest an approved Purchase Order from SmartChain.
     *
     * Route: POST /api/v1/integration/purchase-orders
     * Header: X-API-KEY
     */
    public function store(Request $request): JsonResponse
    {
        // 1. Initial Structural & Type Validation
        $validator = Validator::make($request->all(), [
            'schema_version'        => 'nullable|string|max:10',
            'source_system'         => 'required|string|max:50',
            'message_id'            => 'required|string|max:255',
            'external_reference_id' => 'required|string|max:100',
            'category_type'         => 'nullable|string|max:100',
            'currency'              => 'required|string|size:3',
            'total_amount'          => 'required|numeric',
            'supplier'              => 'required|array',
            'supplier.name'         => 'required|string|max:255',
            'supplier.supplier_code'=> 'nullable|string|max:100',
            'items'                 => 'required|array|min:1',
            'items.*.source_po_line_id' => 'nullable|string|max:100',
            'items.*.product_id'        => 'required|string|max:100',
            'items.*.product_name'      => 'required|string|max:255',
            'items.*.quantity'          => 'required|numeric',
            'items.*.unit'              => 'required|string|max:20',
            'items.*.unit_price'        => 'required|numeric',
            'items.*.line_total'        => 'required|numeric',
            'metadata'                  => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $sourceSystem        = strtoupper(trim($request->input('source_system')));
        $messageId           = trim($request->input('message_id'));
        $externalReferenceId = trim($request->input('external_reference_id'));
        $categoryType        = strtoupper(trim($request->input('category_type', 'INVENTORY_PURCHASE')));
        $currency            = strtoupper(trim($request->input('currency')));
        $totalAmount         = (float) $request->input('total_amount');
        $idempotencyKey      = $request->header('Idempotency-Key') ?? $messageId;

        // 2. Trust Policy: Validate source system
        if (!in_array($sourceSystem, self::ALLOWED_SOURCE_SYSTEMS, true)) {
            return response()->json([
                'success' => false,
                'message' => "Unauthorized source system '{$sourceSystem}'. Only approved integration sources (SMARTCHAIN) are permitted.",
            ], 422);
        }

        // 3. Supported Currency Check
        if ($currency !== 'PHP') {
            return response()->json([
                'success' => false,
                'message' => "Unsupported currency '{$currency}'. The Financial Management System currently only accepts PHP transactions.",
            ], 422);
        }

        // 4. Financial Precision & Zero-Price Rule
        if ($totalAmount <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'Total amount must be greater than zero. Zero-priced or negative purchase orders cannot be accepted into financial processing.',
            ], 422);
        }

        $items = $request->input('items', []);
        $calculatedSumOfLines = 0.0;

        foreach ($items as $index => $item) {
            $unit = strtoupper(trim($item['unit'] ?? ''));
            $quantity = (float) ($item['quantity'] ?? 0);
            $unitPrice = (float) ($item['unit_price'] ?? 0);
            $lineTotal = (float) ($item['line_total'] ?? 0);
            $productName = $item['product_name'] ?? "Item #{$index}";

            // Unit validation
            if (!in_array($unit, self::ALLOWED_UNITS, true)) {
                return response()->json([
                    'success' => false,
                    'message' => "Unsupported unit '{$unit}' on item '{$productName}'. Accepted units: " . implode(', ', self::ALLOWED_UNITS) . '.',
                ], 422);
            }

            if ($quantity <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Quantity for item '{$productName}' must be greater than zero.",
                ], 422);
            }

            if ($unitPrice <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Unit price for item '{$productName}' must be greater than zero. Zero-priced lines are not permitted.",
                ], 422);
            }

            if ($lineTotal <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Line total for item '{$productName}' must be greater than zero.",
                ], 422);
            }

            // Line Arithmetic Check: line_total == quantity * unit_price (with 2 decimal precision tolerance 0.01)
            $expectedLineTotal = round($quantity * $unitPrice, 2);
            if (abs($lineTotal - $expectedLineTotal) > 0.01) {
                return response()->json([
                    'success' => false,
                    'message' => "Line total mismatch on item '{$productName}': expected {$expectedLineTotal} (quantity {$quantity} * unit price {$unitPrice}), but received {$lineTotal}.",
                ], 422);
            }

            $calculatedSumOfLines += $lineTotal;
        }

        // Header vs Sum of Lines Check
        $calculatedSumOfLines = round($calculatedSumOfLines, 2);
        $roundedHeaderTotal = round($totalAmount, 2);
        if (abs($roundedHeaderTotal - $calculatedSumOfLines) > 0.01) {
            return response()->json([
                'success' => false,
                'message' => "Total amount mismatch: header total_amount is {$roundedHeaderTotal}, but sum of item line totals is {$calculatedSumOfLines}.",
            ], 422);
        }

        // 5. Compute Canonical Payload Hash for Idempotency
        $incomingHash = self::computePayloadHash([
            'source_system'         => $sourceSystem,
            'external_reference_id' => $externalReferenceId,
            'category_type'         => $categoryType,
            'currency'              => $currency,
            'total_amount'          => $roundedHeaderTotal,
            'supplier'              => $request->input('supplier'),
            'items'                 => $items,
        ]);

        // 6. Idempotency & Conflict Check against existing records
        $existing = PurchaseOrder::where(function ($q) use ($sourceSystem, $externalReferenceId, $messageId, $idempotencyKey) {
            $q->where(function ($sub) use ($sourceSystem, $externalReferenceId) {
                $sub->where('source_system', $sourceSystem)
                    ->where('external_reference_id', $externalReferenceId);
            })->orWhere('message_id', $messageId);

            if ($idempotencyKey) {
                $q->orWhere('idempotency_key', $idempotencyKey);
            }
        })->first();

        if ($existing) {
            if ($existing->payload_hash === $incomingHash) {
                return response()->json([
                    'success' => true,
                    'message' => 'Duplicate request detected. Returning existing purchase order acknowledgment.',
                    'data'    => [
                        'source_system'         => $existing->source_system,
                        'external_reference_id' => $existing->external_reference_id,
                        'financial_reference'   => $existing->financial_reference,
                        'receipt_status'        => $existing->receipt_status,
                        'processing_status'     => $existing->processing_status,
                    ],
                ], 200);
            }

            // Conflicting payload
            return response()->json([
                'success' => false,
                'error'   => 'Idempotency conflict',
                'message' => "A purchase order with external_reference_id '{$existing->external_reference_id}' already exists with different payload content.",
                'data'    => [
                    'source_system'         => $existing->source_system,
                    'external_reference_id' => $existing->external_reference_id,
                    'financial_reference'   => $existing->financial_reference,
                ],
            ], 409);
        }

        // 7. Atomic Persistence & Safe Concurrency Handling
        try {
            $po = DB::transaction(function () use (
                $sourceSystem, $externalReferenceId, $messageId, $idempotencyKey,
                $categoryType, $currency, $roundedHeaderTotal, $incomingHash,
                $request, $items
            ) {
                // Generate sequential, concurrency-safe financial reference
                $financialReference = $this->generateFinancialReference();

                // Find or map supplier
                $supplierData = $request->input('supplier', []);
                $supplierCode = !empty($supplierData['supplier_code']) ? trim($supplierData['supplier_code']) : null;
                $supplierName = trim($supplierData['name']);

                $supplier = null;
                if ($supplierCode) {
                    $supplier = Supplier::where('supplier_code', $supplierCode)->first();
                }
                if (!$supplier) {
                    $supplier = Supplier::where('name', $supplierName)->first();
                }
                if (!$supplier) {
                    $supplier = Supplier::create([
                        'supplier_code'      => $supplierCode ?? ('SUPP-' . strtoupper(Str::random(5))),
                        'name'               => $supplierName,
                        'company_name'       => $supplierName,
                        'email'              => null,
                        'phone'              => null,
                        'address'            => null,
                        'payment_terms_days' => 30,
                        'bank_info'          => null, // Never generate imaginary bank info
                        'is_active'          => true,
                    ]);
                }

                $metadata = $request->input('metadata', []);
                if ($request->has('delivery_details')) {
                    $metadata['delivery_details'] = $request->input('delivery_details');
                }
                if ($request->has('schema_version')) {
                    $metadata['schema_version'] = $request->input('schema_version');
                }

                $createdPo = PurchaseOrder::create([
                    'financial_reference'   => $financialReference,
                    'source_system'         => $sourceSystem,
                    'message_id'            => $messageId,
                    'external_reference_id' => $externalReferenceId,
                    'idempotency_key'       => $idempotencyKey,
                    'category_type'         => $categoryType,
                    'currency'              => $currency,
                    'total_amount'          => $roundedHeaderTotal,
                    'supplier_id'           => $supplier->id,
                    'supplier_code'         => $supplier->supplier_code,
                    'supplier_name'         => $supplierName,
                    'receipt_status'        => 'RECEIVED',
                    'processing_status'     => 'PENDING_REVIEW',
                    'payload_hash'          => $incomingHash,
                    'raw_payload'           => $request->all(),
                    'metadata'              => !empty($metadata) ? $metadata : null,
                    'received_at'           => now(),
                ]);

                foreach ($items as $item) {
                    PurchaseOrderLine::create([
                        'purchase_order_id' => $createdPo->id,
                        'source_po_line_id' => !empty($item['source_po_line_id']) ? (string) $item['source_po_line_id'] : null,
                        'product_id'        => (string) $item['product_id'],
                        'product_name'      => trim($item['product_name']),
                        'quantity'          => (float) $item['quantity'],
                        'unit'              => strtoupper(trim($item['unit'])),
                        'unit_price'        => (float) $item['unit_price'],
                        'line_total'        => (float) $item['line_total'],
                    ]);
                }

                return $createdPo;
            });
        } catch (QueryException $e) {
            // Concurrent race condition handling
            $existingRace = PurchaseOrder::where(function ($q) use ($sourceSystem, $externalReferenceId, $messageId) {
                $q->where(function ($sub) use ($sourceSystem, $externalReferenceId) {
                    $sub->where('source_system', $sourceSystem)
                        ->where('external_reference_id', $externalReferenceId);
                })->orWhere('message_id', $messageId);
            })->first();

            if ($existingRace) {
                if ($existingRace->payload_hash === $incomingHash) {
                    return response()->json([
                        'success' => true,
                        'message' => 'Duplicate request detected. Returning existing purchase order acknowledgment.',
                        'data'    => [
                            'source_system'         => $existingRace->source_system,
                            'external_reference_id' => $existingRace->external_reference_id,
                            'financial_reference'   => $existingRace->financial_reference,
                            'receipt_status'        => $existingRace->receipt_status,
                            'processing_status'     => $existingRace->processing_status,
                        ],
                    ], 200);
                }

                return response()->json([
                    'success' => false,
                    'error'   => 'Idempotency conflict',
                    'message' => "A purchase order with external_reference_id '{$existingRace->external_reference_id}' already exists with different payload content.",
                    'data'    => [
                        'source_system'         => $existingRace->source_system,
                        'external_reference_id' => $existingRace->external_reference_id,
                        'financial_reference'   => $existingRace->financial_reference,
                    ],
                ], 409);
            }

            throw $e;
        }

        return response()->json([
            'success' => true,
            'message' => 'Purchase order received and queued for financial review.',
            'data'    => [
                'source_system'         => $po->source_system,
                'external_reference_id' => $po->external_reference_id,
                'financial_reference'   => $po->financial_reference,
                'receipt_status'        => 'RECEIVED',
                'processing_status'     => 'PENDING_REVIEW',
            ],
        ], 201);
    }

    /**
     * Look up a Purchase Order by financial_reference, external_reference_id, or UUID.
     *
     * Route: GET /api/v1/integration/purchase-orders/{reference}
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
                'source_system'         => $po->source_system,
                'external_reference_id' => $po->external_reference_id,
                'financial_reference'   => $po->financial_reference,
                'receipt_status'        => $po->receipt_status,
                'processing_status'     => $po->processing_status,
                'category_type'         => $po->category_type,
                'currency'              => $po->currency,
                'total_amount'          => (float) $po->total_amount,
                'received_at'           => $po->received_at?->toIso8601String(),
                'supplier'              => [
                    'supplier_code' => $po->supplier_code ?? $po->supplier?->supplier_code,
                    'name'          => $po->supplier_name,
                ],
                'items'                 => $po->items->map(fn (PurchaseOrderLine $item) => [
                    'source_po_line_id' => $item->source_po_line_id,
                    'product_id'        => $item->product_id,
                    'product_name'      => $item->product_name,
                    'quantity'          => (float) $item->quantity,
                    'unit'              => $item->unit,
                    'unit_price'        => (float) $item->unit_price,
                    'line_total'        => (float) $item->line_total,
                ]),
                'created_at'            => $po->created_at->toIso8601String(),
            ],
        ], 200);
    }

    /**
     * Query or list received Purchase Orders.
     *
     * Route: GET /api/v1/integration/purchase-orders
     */
    public function index(Request $request): JsonResponse
    {
        $query = PurchaseOrder::with(['items', 'supplier'])->orderByDesc('created_at');

        if ($request->has('source_system')) {
            $query->where('source_system', $request->query('source_system'));
        }

        if ($request->has('external_reference_id')) {
            $query->where('external_reference_id', $request->query('external_reference_id'));
        }

        if ($request->has('financial_reference')) {
            $query->where('financial_reference', $request->query('financial_reference'));
        }

        if ($request->has('receipt_status')) {
            $query->where('receipt_status', $request->query('receipt_status'));
        }

        if ($request->has('processing_status')) {
            $query->where('processing_status', $request->query('processing_status'));
        }

        $limit = min(200, (int) $request->query('limit', 50));
        $orders = $query->limit($limit)->get();

        return response()->json([
            'success' => true,
            'count'   => $orders->count(),
            'data'    => $orders->map(fn (PurchaseOrder $po) => [
                'source_system'         => $po->source_system,
                'external_reference_id' => $po->external_reference_id,
                'financial_reference'   => $po->financial_reference,
                'receipt_status'        => $po->receipt_status,
                'processing_status'     => $po->processing_status,
                'category_type'         => $po->category_type,
                'currency'              => $po->currency,
                'total_amount'          => (float) $po->total_amount,
                'supplier_name'         => $po->supplier_name,
                'items_count'           => $po->items->count(),
                'received_at'           => $po->received_at?->toIso8601String(),
                'created_at'            => $po->created_at->toIso8601String(),
            ]),
        ], 200);
    }

    /**
     * Concurrency-safe sequence generation for financial_reference.
     */
    protected function generateFinancialReference(): string
    {
        $prefix = 'FIN-PO';
        $seq = DB::table('purchase_order_sequences')->where('prefix', $prefix)->lockForUpdate()->first();

        if (!$seq) {
            DB::table('purchase_order_sequences')->insert([
                'prefix'        => $prefix,
                'last_sequence' => 1,
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);
            $next = 1;
        } else {
            $next = $seq->last_sequence + 1;
            DB::table('purchase_order_sequences')->where('prefix', $prefix)->update([
                'last_sequence' => $next,
                'updated_at'    => now(),
            ]);
        }

        $candidate = sprintf('FIN-PO-%04d', $next);

        while (PurchaseOrder::where('financial_reference', $candidate)->exists()) {
            $next++;
            $candidate = sprintf('FIN-PO-%04d', $next);
        }

        return $candidate;
    }

    /**
     * Computes a canonical SHA-256 hash of core payload fields to detect duplicates vs conflicts.
     */
    public static function computePayloadHash(array $payload): string
    {
        $items = $payload['items'] ?? [];
        usort($items, function ($a, $b) {
            return strcmp((string) ($a['product_id'] ?? ''), (string) ($b['product_id'] ?? ''));
        });

        $canonical = [
            'source_system'         => strtoupper(trim($payload['source_system'] ?? '')),
            'external_reference_id' => trim($payload['external_reference_id'] ?? ''),
            'category_type'         => strtoupper(trim($payload['category_type'] ?? 'INVENTORY_PURCHASE')),
            'currency'              => strtoupper(trim($payload['currency'] ?? 'PHP')),
            'total_amount'          => number_format((float) ($payload['total_amount'] ?? 0), 2, '.', ''),
            'supplier'              => [
                'supplier_code' => trim($payload['supplier']['supplier_code'] ?? ''),
                'name'          => trim($payload['supplier']['name'] ?? ''),
            ],
            'items'                 => array_map(function ($item) {
                return [
                    'source_po_line_id' => (string) ($item['source_po_line_id'] ?? ''),
                    'product_id'        => (string) ($item['product_id'] ?? ''),
                    'product_name'      => trim($item['product_name'] ?? ''),
                    'quantity'          => number_format((float) ($item['quantity'] ?? 0), 4, '.', ''),
                    'unit'              => strtoupper(trim($item['unit'] ?? '')),
                    'unit_price'        => number_format((float) ($item['unit_price'] ?? 0), 2, '.', ''),
                    'line_total'        => number_format((float) ($item['line_total'] ?? 0), 2, '.', ''),
                ];
            }, $items),
        ];

        return hash('sha256', json_encode($canonical));
    }
}

