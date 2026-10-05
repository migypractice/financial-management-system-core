<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index(): JsonResponse
    {
        $suppliers = Supplier::where('is_active', true)
            ->withCount(['bills as unpaid_bills_count' => fn ($q) => $q->whereIn('status', ['UNPAID', 'PARTIAL', 'OVERDUE'])])
            ->withSum(['bills as total_outstanding' => fn ($q) => $q->whereIn('status', ['UNPAID', 'PARTIAL', 'OVERDUE'])], 'balance')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $suppliers,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_code'      => 'required|string|max:30|unique:suppliers,supplier_code',
            'name'               => 'required|string|max:150',
            'company_name'       => 'nullable|string|max:150',
            'email'              => 'nullable|email|max:100',
            'phone'              => 'nullable|string|max:30',
            'address'            => 'nullable|string|max:500',
            'payment_terms_days' => 'nullable|integer|min:0|max:180',
            'bank_info'          => 'nullable|array',
        ]);

        $supplier = Supplier::create($validated);

        return response()->json([
            'success' => true,
            'message' => "Supplier {$supplier->name} created successfully.",
            'data'    => $supplier,
        ], 201);
    }
}
