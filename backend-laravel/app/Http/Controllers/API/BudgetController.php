<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\BudgetAllocation;
use App\Models\ChartOfAccount;
use App\Models\JournalEntryLine;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

class BudgetController extends Controller
{
    /**
     * List departmental budgets with real consumption calculated from General Ledger and Subledgers.
     */
    public function index(Request $request): JsonResponse
    {
        $fiscalYear = $request->query('fiscal_year', 2026);
        $period = $request->query('period', '2026-10'); // Default to active monthly period

        $query = Budget::where('fiscal_year', $fiscalYear)
            ->with(['chartOfAccount', 'creator'])
            ->orderBy('department');

        if ($period && $period !== 'ALL') {
            $query->where('period', $period);
        }

        $budgets = $query->get()->map(function (Budget $b) {
            $actualSpent = $this->calculateSpentAmount($b);
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

        // If no budgets found for the selected period, fall back to FY2026 or all periods
        if ($budgets->isEmpty() && $period !== 'ALL') {
            $budgets = Budget::where('fiscal_year', $fiscalYear)
                ->with(['chartOfAccount', 'creator'])
                ->orderBy('department')
                ->get()
                ->map(function (Budget $b) {
                    $actualSpent = $this->calculateSpentAmount($b);
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
        }

        $totalAllocated = $budgets->sum('allocated_amount');
        $totalSpent = $budgets->sum('spent_amount');
        $totalRemaining = $budgets->sum('remaining_amount');

        $availablePeriods = Budget::distinct()->orderByDesc('period')->pluck('period');

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
            'meta'    => [
                'current_period'    => $period,
                'available_periods' => $availablePeriods,
            ],
        ]);
    }

    /**
     * Monthly Budget Archive & History.
     * Displays all previous months' department budget allocations, actual spending, and audit logs.
     */
    public function history(Request $request): JsonResponse
    {
        $fiscalYear = $request->query('fiscal_year', 2026);
        $department = $request->query('department');
        $period = $request->query('period');

        $query = Budget::with(['chartOfAccount', 'creator'])
            ->where('fiscal_year', $fiscalYear)
            ->orderByDesc('period')
            ->orderBy('department');

        if ($department && $department !== 'ALL') {
            $query->where('department', $department);
        }

        if ($period && $period !== 'ALL') {
            $query->where('period', $period);
        }

        $allBudgets = $query->get()->map(function (Budget $b) {
            $spent = $this->calculateSpentAmount($b);
            $allocated = (float) $b->allocated_amount;
            $remaining = max(0, $allocated - $spent);
            $utilization = $allocated > 0 ? round(($spent / $allocated) * 100, 1) : 0;

            $status = 'ON_TRACK';
            if ($utilization > 100) {
                $status = 'OVER_BUDGET';
            } elseif ($utilization >= 85) {
                $status = 'NEAR_LIMIT';
            }

            // Human-readable period label
            $label = $b->period;
            if (preg_match('/^(\d{4})-(\d{2})$/', $b->period, $matches)) {
                $date = Carbon::createFromDate((int) $matches[1], (int) $matches[2], 1);
                $label = $date->format('F Y');
            } elseif ($b->period === 'FY2026') {
                $label = 'Full Fiscal Year 2026';
            }

            return [
                'id'               => $b->id,
                'period'           => $b->period,
                'period_label'     => $label,
                'department'       => $b->department,
                'category'         => $b->category,
                'fiscal_year'      => $b->fiscal_year,
                'allocated_amount' => $allocated,
                'spent_amount'     => $spent,
                'remaining_amount' => $remaining,
                'utilization_rate' => $utilization,
                'status'           => $status,
                'account_name'     => $b->chartOfAccount?->name ?? 'General Operational Fund',
                'allocated_by'     => $b->creator?->name ?? 'Executive Finance Management',
                'notes'            => $b->notes,
                'updated_at'       => $b->updated_at?->toIso8601String(),
            ];
        });

        // Historical Allocation Audit Trail
        $allocationLogs = BudgetAllocation::with('allocator')
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(fn ($log) => [
                'id'               => $log->id,
                'department'       => $log->department,
                'category'         => $log->category,
                'period'           => $log->period,
                'allocated_amount' => (float) $log->allocated_amount,
                'action_type'      => $log->action_type,
                'notes'            => $log->notes,
                'allocated_by'     => $log->allocator?->name ?? 'Finance Director',
                'created_at'       => $log->created_at?->toIso8601String(),
            ]);

        $availablePeriods = Budget::distinct()->orderByDesc('period')->pluck('period');
        $availableDepartments = Budget::distinct()->pluck('department');

        return response()->json([
            'success' => true,
            'data'    => [
                'history'               => $allBudgets,
                'allocation_logs'       => $allocationLogs,
                'available_periods'     => $availablePeriods,
                'available_departments' => $availableDepartments,
            ],
        ]);
    }

    /**
     * Allocate or Top-up Departmental Budget for a period.
     * Upserts safely and logs to budget_allocations history.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'department'          => 'required|string|max:100',
            'category'            => 'required|string|max:100',
            'fiscal_year'         => 'required|integer|min:2020|max:2030',
            'period'              => 'required|string|max:20',
            'allocated_amount'    => 'required|numeric|min:0.01',
            'allocation_mode'     => 'nullable|string|in:SET,ADD',
            'chart_of_account_id' => 'nullable|exists:chart_of_accounts,id',
            'notes'               => 'nullable|string|max:500',
        ]);

        $mode = $request->input('allocation_mode', 'SET');
        $inputAmount = (float) $validated['allocated_amount'];

        $existing = Budget::where('department', $validated['department'])
            ->where('category', $validated['category'])
            ->where('period', $validated['period'])
            ->first();

        $finalAmount = $inputAmount;
        if ($existing && $mode === 'ADD') {
            $finalAmount = (float) $existing->allocated_amount + $inputAmount;
        }

        // Upsert without triggering duplicate key violation
        $budget = Budget::updateOrCreate(
            [
                'department' => $validated['department'],
                'category'   => $validated['category'],
                'period'     => $validated['period'],
            ],
            [
                'fiscal_year'         => $validated['fiscal_year'],
                'allocated_amount'    => $finalAmount,
                'chart_of_account_id' => $validated['chart_of_account_id'] ?? $existing?->chart_of_account_id,
                'notes'               => $validated['notes'] ?? $existing?->notes,
                'created_by'          => $request->user()?->id,
            ]
        );

        // Record in the Budget History / Allocation Audit Log
        BudgetAllocation::create([
            'budget_id'        => $budget->id,
            'department'       => $budget->department,
            'category'         => $budget->category,
            'fiscal_year'      => $budget->fiscal_year,
            'period'           => $budget->period,
            'allocated_amount' => $inputAmount,
            'action_type'      => ($mode === 'ADD') ? 'TOP_UP' : ($existing ? 'REVISION' : 'MONTHLY_GRANT'),
            'notes'            => $validated['notes'] ?? 'Monthly department budget granted by Finance Management',
            'allocated_by'     => $request->user()?->id,
        ]);

        $actionDesc = ($mode === 'ADD') ? 'topped up by' : 'set to';

        return response()->json([
            'success' => true,
            'message' => "Budget for {$budget->department} ({$budget->period}) {$actionDesc} PHP " . number_format($finalAmount, 2) . " successfully.",
            'data'    => $budget->load('chartOfAccount'),
        ], 201);
    }

    /**
     * Compute real spent amount against this budget from GL journal lines or transactions.
     */
    private function calculateSpentAmount(Budget $b): float
    {
        $actualSpent = 0;

        // 1. Calculate from posted General Ledger lines
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

        if ($b->chart_of_account_id) {
            $actualSpent = (float) (clone $jeQuery)->where('chart_of_account_id', $b->chart_of_account_id)->sum('debit');
        }

        // 2. If 0 or fallback, capture from posted Transactions mapped to this department module
        if ($actualSpent <= 0) {
            $mappedModules = match ($b->department) {
                'Human Resources (HRMS)'       => ['HRMS'],
                'Supply Chain & Procurement'   => ['SUPPLY_CHAIN'],
                'Fleet & Logistics'            => ['FLEET'],
                'Facilities & Operations'      => ['FACILITIES_LEGAL'],
                'IT & Infrastructure'          => ['IT'],
                'E-Commerce Marketing'         => ['ECOMMERCE_CORE'],
                default                        => [],
            };

            $txnQuery = Transaction::query()
                ->where('status', 'posted')
                ->where('type', 'EXPENSE')
                ->where(function ($q) use ($b, $mappedModules) {
                    $q->where('category_type', $b->category);
                    if (!empty($mappedModules)) {
                        $q->orWhereIn('source_module', $mappedModules);
                    }
                });

            if ($b->period && preg_match('/^\d{4}-\d{2}$/', $b->period)) {
                [$y, $m] = explode('-', $b->period);
                $txnQuery->whereYear('created_at', (int) $y)->whereMonth('created_at', (int) $m);
            } else {
                $txnQuery->whereYear('created_at', (int) $b->fiscal_year);
            }

            $actualSpent = (float) $txnQuery->sum('amount');
        }

        return $actualSpent;
    }
}
