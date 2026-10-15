<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\ApBill;
use App\Models\ArInvoice;
use App\Models\BankAccount;
use App\Models\Budget;
use App\Models\JournalEntryLine;
use App\Services\AIService\AIService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportsController extends Controller
{
    public function __construct(
        protected AIService $aiService
    ) {}

    /**
     * GET /api/v1/reports/financial-statements
     * 100% Live Financial Statements — Income Statement, Balance Sheet, Ratios & AI Insights.
     */
    public function financialStatements(Request $request): JsonResponse
    {
        // ═══ INCOME STATEMENT (P&L) — from actual journal_entry_lines ═══

        // Revenue accounts (4xxx)
        $revenueLines = JournalEntryLine::whereHas('chartOfAccount', function ($q) {
            $q->where('type', 'REVENUE');
        })->whereHas('journalEntry', function ($q) {
            $q->whereYear('entry_date', now()->year)
              ->where('status', 'POSTED');
        })->get();

        $totalRevenue = $revenueLines->sum('credit') - $revenueLines->sum('debit');

        // Detailed revenue breakdown
        $revenueByAccount = $revenueLines->groupBy(fn ($line) => $line->chartOfAccount->code ?? 'OTHER')
            ->map(fn ($lines, $code) => [
                'code'   => $code,
                'name'   => $lines->first()->chartOfAccount->name ?? 'Revenue',
                'amount' => $lines->sum('credit') - $lines->sum('debit'),
            ])->values();

        // COGS (5000-COGS from actual journal lines)
        $cogsLines = JournalEntryLine::whereHas('chartOfAccount', function ($q) {
            $q->where('code', 'LIKE', '5000%');
        })->whereHas('journalEntry', function ($q) {
            $q->whereYear('entry_date', now()->year)->where('status', 'POSTED');
        })->get();
        $totalCOGS = $cogsLines->sum('debit') - $cogsLines->sum('credit');

        // If no explicit COGS entries, compute from inventory purchases (1200-INV debits)
        if ($totalCOGS == 0) {
            $invDebits = JournalEntryLine::whereHas('chartOfAccount', function ($q) {
                $q->where('code', 'LIKE', '1200%');
            })->whereHas('journalEntry', function ($q) {
                $q->whereYear('entry_date', now()->year)->where('status', 'POSTED');
            })->sum('debit');
            $totalCOGS = $invDebits;
        }

        $grossProfit = $totalRevenue - $totalCOGS;

        // Operating Expenses (5xxx except COGS)
        $expenseLines = JournalEntryLine::whereHas('chartOfAccount', function ($q) {
            $q->where('type', 'EXPENSE')
              ->where('code', 'NOT LIKE', '5000%');
        })->whereHas('journalEntry', function ($q) {
            $q->whereYear('entry_date', now()->year)->where('status', 'POSTED');
        })->get();

        $totalExpenses = $expenseLines->sum('debit') - $expenseLines->sum('credit');

        // Detailed expense breakdown
        $expenseByAccount = $expenseLines->groupBy(fn ($line) => $line->chartOfAccount->code ?? 'OTHER')
            ->map(fn ($lines, $code) => [
                'code'   => $code,
                'name'   => $lines->first()->chartOfAccount->name ?? 'Expense',
                'amount' => $lines->sum('debit') - $lines->sum('credit'),
            ])->values();

        $netIncome = $grossProfit - $totalExpenses;

        // ═══ BALANCE SHEET — from live data ═══

        // Cash & Cash Equivalents
        $totalCash = (float) BankAccount::sum('current_balance');

        // Accounts Receivable (unpaid AR invoices)
        $totalAR = (float) ArInvoice::where('status', '!=', 'PAID')->sum('balance');

        // Merchandise Inventory (net of 1200-INV entries)
        $invDebit = JournalEntryLine::whereHas('chartOfAccount', fn ($q) =>
            $q->where('code', 'LIKE', '1200%')
        )->sum('debit');
        $invCredit = JournalEntryLine::whereHas('chartOfAccount', fn ($q) =>
            $q->where('code', 'LIKE', '1200%')
        )->sum('credit');
        $merchandiseInventory = max(0, $invDebit - $invCredit);

        $totalCurrentAssets = $totalCash + $totalAR + $merchandiseInventory;

        // Accounts Payable (unpaid AP bills)
        $totalAP = (float) ApBill::where('status', '!=', 'PAID')->sum('balance');

        // Tax Payable (estimate from net VAT)
        $outputVAT = ArInvoice::all()->sum(fn ($inv) => round((float)$inv->total_amount - ((float)$inv->total_amount / 1.12), 2));
        $inputVAT = ApBill::all()->sum(fn ($bill) => round((float)$bill->total_amount - ((float)$bill->total_amount / 1.12), 2));
        $taxPayable = max(0, round($outputVAT - $inputVAT, 2));

        $totalCurrentLiabilities = $totalAP + $taxPayable;

        // Equity = Assets - Liabilities (derived)
        $totalEquity = $totalCurrentAssets - $totalCurrentLiabilities;
        $retainedEarnings = $netIncome;

        // ═══ FINANCIAL RATIOS ═══
        $currentRatio = $totalCurrentLiabilities > 0
            ? round($totalCurrentAssets / $totalCurrentLiabilities, 2) : 0;
        $quickRatio = $totalCurrentLiabilities > 0
            ? round(($totalCash + $totalAR) / $totalCurrentLiabilities, 2) : 0;
        $netProfitMargin = $totalRevenue > 0
            ? round(($netIncome / $totalRevenue) * 100, 1) : 0;

        // Budget Burn Rate
        $totalAllocated = (float) Budget::where('fiscal_year', now()->format('Y'))->sum('allocated_amount');
        $allExpenseDebits = (float) JournalEntryLine::whereHas('chartOfAccount', fn ($q) => $q->where('type', 'EXPENSE'))
            ->whereHas('journalEntry', fn ($q) => $q->whereYear('entry_date', now()->year))
            ->sum('debit');
        $budgetBurnRate = $totalAllocated > 0
            ? round(($allExpenseDebits / $totalAllocated) * 100, 1) : 0;

        // ═══ AI Cash Flow Insights (Pillar 3) ═══
        $aiInsights = $this->aiService->cashFlowForecast();

        return response()->json([
            'success' => true,
            'data'    => [
                'income_statement' => [
                    'period'         => now()->format('F Y'),
                    'total_revenue'  => round($totalRevenue, 2),
                    'revenue_detail' => $revenueByAccount,
                    'total_cogs'     => round($totalCOGS, 2),
                    'gross_profit'   => round($grossProfit, 2),
                    'total_expenses' => round($totalExpenses, 2),
                    'expense_detail' => $expenseByAccount,
                    'net_income'     => round($netIncome, 2),
                ],
                'balance_sheet' => [
                    'assets' => [
                        'cash_and_equivalents'  => round($totalCash, 2),
                        'accounts_receivable'   => round($totalAR, 2),
                        'merchandise_inventory' => round($merchandiseInventory, 2),
                        'total_current_assets'  => round($totalCurrentAssets, 2),
                    ],
                    'liabilities' => [
                        'accounts_payable'          => round($totalAP, 2),
                        'tax_payable'               => round($taxPayable, 2),
                        'total_current_liabilities' => round($totalCurrentLiabilities, 2),
                    ],
                    'equity' => [
                        'retained_earnings' => round($retainedEarnings, 2),
                        'total_equity'      => round($totalEquity, 2),
                    ],
                ],
                'ratios' => [
                    'current_ratio'     => $currentRatio,
                    'quick_ratio'       => $quickRatio,
                    'net_profit_margin' => $netProfitMargin,
                    'budget_burn_rate'  => $budgetBurnRate,
                ],
                'ai_insights' => $aiInsights['insights'] ?? [],
            ],
        ]);
    }
}
