<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\ChartOfAccount;
use App\Models\JournalEntryLine;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BudgetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $fiscalYear = $request->query('fiscal_year', 2026);

        $budgets = Budget::where('fiscal_year', $fiscalYear)
            ->with(['chartOfAccount', 'creator'])
            ->orderBy('department')
            ->get()
            ->map(function (Budget $b) {
                // Calculate actual spent against this budget:
                // 1. By chart_of_account_id if assigned, sum debit journal lines
                // 2. Or by category_type in transactions
                $actualSpent = 0;

                if ($b->chart_of_account_id) {
                    $actualSpent = (float) JournalEntryLine::where('chart_of_account_id', $b->chart_of_account_id)
                        ->whereHas('journalEntry', fn ($je) => $je->where('status', 'POSTED'))
                        ->sum('debit');
                } else {
                    $actualSpent = (float) Transaction::where('category_type', $b->category)
                        ->where('status', 'posted')
                        ->sum('amount');
                }

                $allocated = (float) $b->allocated_amount;
                $remaining = max(0, $allocated - $actualSpent);
                $utilizationRate = $allocated > 0 ? round(($actualSpent / $allocated) * 100, 1) : 0;

                $status = 'ON_TRACK';
                if ($utilizationRate > 100) {
                    $status = 'OVER_BUDGET';
                } elseif ($utilizationRate >= 85) {
                    $status = 'NEAR_LIMIT';
                }

                return [
                    'id'               => $b->id,
                    'department'       => $b->department,
                    'category'         => $b->category,
                    'fiscal_year'      => $b->fiscal_year,
                    'period'           => $b->period,
                    'allocated_amount' => $allocated,
                    'spent_amount'     => $actualSpent,
                    'remaining_amount' => $remaining,
                    'utilization_rate' => $utilizationRate,
                    'status'           => $status,
                    'account_code'     => $b->chartOfAccount?->code,
                    'account_name'     => $b->chartOfAccount?->name,
                    'notes'            => $b->notes,
                ];
            });

        $totalAllocated = $budgets->sum('allocated_amount');
        $totalSpent = $budgets->sum('spent_amount');
        $totalRemaining = $budgets->sum('remaining_amount');

        return response()->json([
            'success' => true,
            'data'    => $budgets,
            'summary' => [
                'total_allocated' => (float) $totalAllocated,
                'total_spent'     => (float) $totalSpent,
                'total_remaining' => (float) $totalRemaining,
                'avg_utilization' => $totalAllocated > 0 ? round(($totalSpent / $totalAllocated) * 100, 1) : 0,
                'budget_count'    => $budgets->count(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'department'          => 'required|string|max:100',
            'category'            => 'required|string|max:100',
            'fiscal_year'         => 'required|integer|min:2020|max:2030',
            'period'              => 'required|string|max:20',
            'allocated_amount'    => 'required|numeric|min:0.01',
            'chart_of_account_id' => 'nullable|exists:chart_of_accounts,id',
            'notes'               => 'nullable|string|max:500',
        ]);

        $validated['created_by'] = $request->user()?->id;

        $budget = Budget::create($validated);

        return response()->json([
            'success' => true,
            'message' => "Budget for {$budget->department} ({$budget->category}) allocated successfully.",
            'data'    => $budget->load('chartOfAccount'),
        ], 201);
    }
}
