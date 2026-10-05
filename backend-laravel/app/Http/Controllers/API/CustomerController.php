<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(): JsonResponse
    {
        $customers = Customer::where('is_active', true)
            ->withCount(['invoices as unpaid_invoices_count' => fn ($q) => $q->whereIn('status', ['UNPAID', 'PARTIAL', 'OVERDUE'])])
            ->withSum(['invoices as total_outstanding' => fn ($q) => $q->whereIn('status', ['UNPAID', 'PARTIAL', 'OVERDUE'])], 'balance')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $customers,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_code'      => 'required|string|max:30|unique:customers,customer_code',
            'name'               => 'required|string|max:150',
            'company_name'       => 'nullable|string|max:150',
            'email'              => 'nullable|email|max:100',
            'phone'              => 'nullable|string|max:30',
            'address'            => 'nullable|string|max:500',
            'credit_limit'       => 'nullable|numeric|min:0',
            'payment_terms_days' => 'nullable|integer|min:0|max:180',
        ]);

        $customer = Customer::create($validated);

        return response()->json([
            'success' => true,
            'message' => "Customer {$customer->name} created successfully.",
            'data'    => $customer,
        ], 201);
    }
}
