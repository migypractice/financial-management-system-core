<?php

namespace App\Services\AIService;

use App\Models\ApBill;
use App\Models\ArInvoice;
use App\Models\BankAccount;
use App\Models\Budget;
use App\Models\JournalEntryLine;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Transaction Core AI Service — 3-Pillar Financial AI Suite.
 *
 * Pillar 1 — AI Smart Bookkeeper: Auto-GL & BIR Tax Classification
 * Pillar 2 — AI Internal Audit Guard: Duplicate Bill, Budget Overrun & Spend Spike Detection
 * Pillar 3 — AI Cash Flow & Liquidity Forecaster
 *
 * Classification: Deterministic Expert System / Decision Support System.
 * This service does NOT use Machine Learning or LLM integration.
 */
class AIService
{
    protected float $confidenceThreshold;
    protected float $highValueThreshold;
    protected array $anomalyKeywords;
    protected array $glMappings;
    protected array $glFallback;

    public function __construct(
        ?float $confidenceThreshold = null,
        ?float $highValueThreshold = null
    ) {
        $this->confidenceThreshold = $confidenceThreshold ?? config('ai.confidence_threshold', 0.85);
        $this->highValueThreshold  = $highValueThreshold  ?? config('ai.high_value_threshold', 500_000.00);
        $this->anomalyKeywords     = config('ai.risk_keywords', []);
        $this->glMappings          = config('ai.gl_mappings', []);
        $this->glFallback          = config('ai.gl_fallback', [
            'gl_code'                => '5999-EXP',
            'gl_name'                => 'Unallocated Operational Expense',
            'confidence'             => 0.40,
            'requires_manual_review' => true,
        ]);
    }

    /**
     * Evaluate a raw transaction payload from an external microservice.
     */
    public function evaluateTransaction(array $payload): array
    {
        $description = strtoupper(trim($payload['description'] ?? ''));
        $amount      = (float) ($payload['amount'] ?? 0);
        $module      = $payload['external_module'] ?? 'UNKNOWN';
        $category    = $payload['category_type'] ?? 'GENERAL';

        Log::info('AI evaluation started', [
            'module'   => $module,
            'category' => $category,
            'amount'   => $amount,
        ]);

        // 1. Keyword-based risk detection
        $anomaly = $this->detectKeywordAnomaly($description);

        // 2. High-value threshold check
        if (!$anomaly['detected'] && $amount > $this->highValueThreshold) {
            $anomaly = [
                'detected' => true,
                'reason'   => sprintf(
                    'High-value transaction (PHP %s) exceeds threshold of PHP %s. Requires mandatory human review.',
                    number_format($amount, 2),
                    number_format($this->highValueThreshold, 2)
                ),
            ];
        }

        // 3. GL account categorization
        $categorization  = $this->predictGLCategory($category, $description, $module);
        $confidenceScore = $categorization['confidence'];

        if (!empty($categorization['requires_manual_review'])) {
            if (!$anomaly['detected']) {
                $anomaly = [
                    'detected' => true,
                    'reason'   => "Transaction category '{$category}' is unrecognized. Forced manual review required.",
                ];
            }
        }

        // 4. Determine Maker-Checker status
        $status = 'pending_approval';

        if ($anomaly['detected']) {
            $confidenceScore = min($confidenceScore, 0.45);
        }

        if ($anomaly['detected'] || $confidenceScore < $this->confidenceThreshold) {
            $status = 'ai_flagged';

            if (!$anomaly['detected']) {
                $anomaly['detected'] = true;
                $anomaly['reason'] = sprintf(
                    'AI confidence (%.1f%%) is below the required threshold (%.0f%%).',
                    $confidenceScore * 100,
                    $this->confidenceThreshold * 100
                );
            }
        }

        Log::info('AI evaluation complete', [
            'module'     => $module,
            'category'   => $category,
            'status'     => $status,
            'confidence' => $confidenceScore,
            'anomaly'    => $anomaly['detected'],
        ]);

        return [
            'status'               => $status,
            'ai_confidence_score'  => round($confidenceScore, 4),
            'ai_suggested_gl_code' => $categorization['gl_code'],
            'ai_suggested_gl_name' => $categorization['gl_name'],
            'ai_anomaly_flag'      => $anomaly['detected'],
            'ai_anomaly_reason'    => $anomaly['reason'],
            'evaluated_at'         => now()->toIso8601String(),
        ];
    }

    // ═══════════════════════════════════════════════════════════════════
    //  PILLAR 1 — AI Smart Bookkeeper (Auto-GL & BIR Tax Classifier)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Recommend GL account and BIR tax classification based on category and description.
     */
    public function smartBookkeeper(string $categoryType, string $description, string $module = 'ACCOUNTS_PAYABLE'): array
    {
        $glResult = $this->predictGLCategory($categoryType, strtoupper($description), $module);

        // Determine BIR Tax Classification
        $taxClassification = $this->classifyBIRTax($categoryType, $module);

        return [
            'gl_code'            => $glResult['gl_code'],
            'gl_name'            => $glResult['gl_name'],
            'confidence'         => round($glResult['confidence'], 4),
            'tax_classification' => $taxClassification,
        ];
    }

    /**
     * BIR Tax Classification Engine.
     * Maps transaction categories to Philippine BIR tax treatment.
     */
    private function classifyBIRTax(string $categoryType, string $module): array
    {
        // AR Sales → Output VAT
        if (in_array($module, ['ACCOUNTS_RECEIVABLE', 'SALES'])) {
            return [
                'vat_type'     => 'OUTPUT',
                'vat_rate'     => 12.0,
                'ewt_code'     => null,
                'ewt_rate'     => 0,
                'ewt_desc'     => null,
                'bir_form'     => 'BIR 2550M/2550Q',
                'description'  => '12% Output VAT on Sales Revenue',
            ];
        }

        // AP Purchases → Input VAT + EWT
        if (in_array($categoryType, ['PAYROLL_BENEFITS', 'PAYROLL_SALARY', 'EMPLOYEE_CLAIM'])) {
            return [
                'vat_type'     => 'EXEMPT',
                'vat_rate'     => 0.0,
                'ewt_code'     => 'EXEMPT-1601C',
                'ewt_rate'     => 0.0,
                'ewt_desc'     => 'Exempt from EWT (BIR Form 1601-C Compensation)',
                'bir_form'     => 'BIR 1601-C',
                'description'  => 'Compensation Income Exempt from VAT & EWT (BIR 1601-C)',
            ];
        }

        $ewtMap = match ($categoryType) {
            'INVENTORY_PURCHASE', 'SUPPLIER_INVOICE' => [
                'ewt_code' => 'WC158',
                'ewt_rate' => 1.0,
                'ewt_desc' => '1% EWT on Goods (WC158)',
            ],
            'UTILITIES_BILL', 'FREIGHT_SHIPPING', 'OFFICE_SUPPLIES', 'EQUIPMENT_REPAIR' => [
                'ewt_code' => 'WC160',
                'ewt_rate' => 2.0,
                'ewt_desc' => '2% EWT on Services (WC160)',
            ],
            'FACILITY_RENT' => [
                'ewt_code' => 'WC100',
                'ewt_rate' => 5.0,
                'ewt_desc' => '5% EWT on Rent (WC100)',
            ],
            default => [
                'ewt_code' => 'WC160',
                'ewt_rate' => 2.0,
                'ewt_desc' => '2% EWT on Services (WC160)',
            ],
        };

        return [
            'vat_type'     => 'INPUT',
            'vat_rate'     => 12.0,
            'ewt_code'     => $ewtMap['ewt_code'],
            'ewt_rate'     => $ewtMap['ewt_rate'],
            'ewt_desc'     => $ewtMap['ewt_desc'],
            'bir_form'     => 'BIR 1601-EQ',
            'description'  => "12% Input VAT + {$ewtMap['ewt_desc']}",
        ];
    }

    /**
     * Compute a live VAT & EWT tax breakdown for a given gross amount.
     */
    public function computeTaxBreakdown(float $grossAmount, string $categoryType, string $module): array
    {
        $tax = $this->classifyBIRTax($categoryType, $module);

        if ($tax['vat_rate'] <= 0) {
            $vatableBase = $grossAmount;
            $vatAmount   = 0.00;
        } else {
            $vatableBase = round($grossAmount / 1.12, 2);
            $vatAmount   = round($grossAmount - $vatableBase, 2);
        }

        $ewtAmount   = ($tax['ewt_rate'] > 0) ? round($vatableBase * ($tax['ewt_rate'] / 100), 2) : 0.00;
        $netPayable  = round($grossAmount - $ewtAmount, 2);

        return [
            'gross_amount'  => $grossAmount,
            'vatable_base'  => $vatableBase,
            'vat_rate'      => $tax['vat_rate'],
            'vat_amount'    => $vatAmount,
            'vat_type'      => $tax['vat_type'],
            'ewt_code'      => $tax['ewt_code'],
            'ewt_rate'      => $tax['ewt_rate'],
            'ewt_amount'    => $ewtAmount,
            'ewt_desc'      => $tax['ewt_desc'],
            'net_payable'   => $netPayable,
            'bir_form'      => $tax['bir_form'],
        ];
    }

    // ═══════════════════════════════════════════════════════════════════
    //  PILLAR 2 — AI Internal Audit Guard
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Run all audit guard checks against real database records.
     * Returns an array of audit findings (warnings/alerts).
     */
    public function auditGuard(array $payload): array
    {
        $findings = [];

        // Check 1: Duplicate Invoice / Double-Billing Risk
        if (!empty($payload['supplier_id']) && !empty($payload['bill_number'])) {
            $dupByNumber = ApBill::where('supplier_id', $payload['supplier_id'])
                ->where('bill_number', $payload['bill_number'])
                ->exists();

            if ($dupByNumber) {
                $findings[] = [
                    'type'     => 'ALERT',
                    'code'     => 'DUPLICATE_BILL_NUMBER',
                    'severity' => 'CRITICAL',
                    'message'  => "Potential Duplicate: Bill #{$payload['bill_number']} already exists for this supplier.",
                    'icon'     => 'shield-alert',
                ];
            }
        }

        if (!empty($payload['supplier_id']) && !empty($payload['amount'])) {
            $dupByAmount = ApBill::where('supplier_id', $payload['supplier_id'])
                ->where('total_amount', $payload['amount'])
                ->where('created_at', '>=', now()->subDays(30))
                ->count();

            if ($dupByAmount > 0) {
                $findings[] = [
                    'type'     => 'WARNING',
                    'code'     => 'DUPLICATE_AMOUNT_RECENT',
                    'severity' => 'HIGH',
                    'message'  => "Same supplier + same amount (PHP " . number_format($payload['amount'], 2) . ") was recorded within the last 30 days ({$dupByAmount} match" . ($dupByAmount > 1 ? 'es' : '') . "). Verify this is not a duplicate bill.",
                    'icon'     => 'alert-triangle',
                ];
            }
        }

        // Check 2: Department Budget Ceiling Guard
        if (!empty($payload['department']) && !empty($payload['amount'])) {
            $budget = Budget::where('department', $payload['department'])
                ->where('fiscal_year', now()->format('Y'))
                ->first();

            if ($budget) {
                $spentAmount = JournalEntryLine::whereHas('journalEntry', function ($q) {
                    $q->whereYear('entry_date', now()->year);
                })
                    ->whereHas('chartOfAccount', fn ($q) => $q->where('type', 'EXPENSE'))
                    ->sum('debit');

                $remainingBudget = (float) $budget->allocated_amount - $spentAmount;

                if ($payload['amount'] > $remainingBudget) {
                    $findings[] = [
                        'type'     => 'ALERT',
                        'code'     => 'BUDGET_OVERRUN',
                        'severity' => 'HIGH',
                        'message'  => sprintf(
                            "Department '%s' budget overrun! This voucher (PHP %s) exceeds remaining budget (PHP %s of PHP %s allocated).",
                            $payload['department'],
                            number_format($payload['amount'], 2),
                            number_format(max(0, $remainingBudget), 2),
                            number_format($budget->allocated_amount, 2)
                        ),
                        'icon'     => 'alert-triangle',
                    ];
                }
            }
        }

        // Check 3: Abnormal Spend Spike (> 2x 90-day average for this supplier)
        if (!empty($payload['supplier_id']) && !empty($payload['amount'])) {
            $avg90d = ApBill::where('supplier_id', $payload['supplier_id'])
                ->where('created_at', '>=', now()->subDays(90))
                ->avg('total_amount') ?? 0;

            if ($avg90d > 0 && $payload['amount'] > ($avg90d * 2)) {
                $findings[] = [
                    'type'     => 'WARNING',
                    'code'     => 'SPEND_SPIKE',
                    'severity' => 'MEDIUM',
                    'message'  => sprintf(
                        "Abnormal Spend Spike: This amount (PHP %s) is %.1fx the 90-day average (PHP %s) for this supplier.",
                        number_format($payload['amount'], 2),
                        $payload['amount'] / $avg90d,
                        number_format($avg90d, 2)
                    ),
                    'icon'     => 'trending-up',
                ];
            }
        }

        // If no findings, return a clean audit badge
        if (empty($findings)) {
            $findings[] = [
                'type'     => 'VERIFIED',
                'code'     => 'AI_VERIFIED',
                'severity' => 'OK',
                'message'  => 'AI Verified: Within Budget & No Duplicate Detected.',
                'icon'     => 'check-circle',
            ];
        }

        return $findings;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  PILLAR 3 — AI Cash Flow & Liquidity Forecaster
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Generate dynamic, data-driven executive insights from live financial data.
     */
    public function cashFlowForecast(): array
    {
        // Live Bank Cash
        $totalBankCash = BankAccount::sum('current_balance');

        // Collectible AR (outstanding invoices)
        $collectibleAR = ArInvoice::where('status', '!=', 'PAID')->sum('balance');

        // Unpaid AP Obligations
        $unpaidAP = ApBill::where('status', '!=', 'PAID')->sum('balance');

        // Budget Utilization (current fiscal year)
        $totalAllocated = Budget::where('fiscal_year', now()->format('Y'))->sum('allocated_amount');
        $totalExpenses  = JournalEntryLine::whereHas('chartOfAccount', fn ($q) => $q->where('type', 'EXPENSE'))
            ->whereHas('journalEntry', fn ($q) => $q->whereYear('entry_date', now()->year))
            ->sum('debit');

        $budgetBurnRate = $totalAllocated > 0
            ? round(($totalExpenses / $totalAllocated) * 100, 1)
            : 0;

        // Net Working Capital
        $netWorkingCapital = ($totalBankCash + $collectibleAR) - $unpaidAP;

        // Liquidity Runway (months)
        $monthlyAvgExpense = $totalExpenses > 0
            ? $totalExpenses / max(1, now()->month)
            : 1;
        $liquidityRunway = $monthlyAvgExpense > 0
            ? round($totalBankCash / $monthlyAvgExpense, 1)
            : 99;

        // Generate executive insights
        $insights = [];

        if ($netWorkingCapital > 0) {
            $insights[] = [
                'type'    => 'positive',
                'title'   => 'Healthy Working Capital',
                'message' => sprintf(
                    'Net Working Capital is positive at PHP %s. Cash + Collectibles (PHP %s) exceeds AP Obligations (PHP %s).',
                    number_format($netWorkingCapital, 2),
                    number_format($totalBankCash + $collectibleAR, 2),
                    number_format($unpaidAP, 2)
                ),
            ];
        } else {
            $insights[] = [
                'type'    => 'critical',
                'title'   => 'Negative Working Capital',
                'message' => sprintf(
                    'Warning: AP Obligations (PHP %s) exceed Cash + Collectibles (PHP %s). Net deficit: PHP %s.',
                    number_format($unpaidAP, 2),
                    number_format($totalBankCash + $collectibleAR, 2),
                    number_format(abs($netWorkingCapital), 2)
                ),
            ];
        }

        $insights[] = [
            'type'    => $liquidityRunway >= 3 ? 'positive' : ($liquidityRunway >= 1 ? 'warning' : 'critical'),
            'title'   => 'Cash Runway',
            'message' => sprintf(
                'Current bank reserves (PHP %s) can sustain %.1f months of operating expenses at current burn rate.',
                number_format($totalBankCash, 2),
                $liquidityRunway
            ),
        ];

        if ($budgetBurnRate > 80) {
            $insights[] = [
                'type'    => 'warning',
                'title'   => 'Budget Utilization Alert',
                'message' => sprintf(
                    'Overall budget burn rate is at %.1f%% (PHP %s spent of PHP %s allocated). Monitor closely.',
                    $budgetBurnRate,
                    number_format($totalExpenses, 2),
                    number_format($totalAllocated, 2)
                ),
            ];
        } else {
            $insights[] = [
                'type'    => 'positive',
                'title'   => 'Budget On Track',
                'message' => sprintf(
                    'Overall budget utilization is at %.1f%% (PHP %s of PHP %s allocated).',
                    $budgetBurnRate,
                    number_format($totalExpenses, 2),
                    number_format($totalAllocated, 2)
                ),
            ];
        }

        return [
            'bank_cash'           => round($totalBankCash, 2),
            'collectible_ar'      => round($collectibleAR, 2),
            'unpaid_ap'           => round($unpaidAP, 2),
            'net_working_capital' => round($netWorkingCapital, 2),
            'liquidity_runway_months' => $liquidityRunway,
            'budget_burn_rate'    => $budgetBurnRate,
            'total_allocated'     => round($totalAllocated, 2),
            'total_expenses'      => round($totalExpenses, 2),
            'insights'            => $insights,
        ];
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Private Helpers (existing, preserved)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Scan the description for known risk rules.
     */
    private function detectKeywordAnomaly(string $description): array
    {
        foreach ($this->anomalyKeywords as $ruleCode => $rule) {
            $severity = $rule['severity'] ?? 'REVIEW';
            $allOf    = array_map('strtoupper', $rule['all_of'] ?? []);
            $anyOf    = array_map('strtoupper', $rule['any_of'] ?? []);
            $matched  = [];

            $allSatisfied = true;
            foreach ($allOf as $term) {
                if (str_contains($description, $term)) {
                    $matched[] = $term;
                } else {
                    $allSatisfied = false;
                    break;
                }
            }
            if (!$allSatisfied) {
                continue;
            }

            $anySatisfied = empty($anyOf);
            foreach ($anyOf as $term) {
                if (str_contains($description, $term)) {
                    $matched[] = $term;
                    $anySatisfied = true;
                    break;
                }
            }
            if (!$anySatisfied) {
                continue;
            }

            Log::warning('Risk keyword rule matched', [
                'rule'          => $ruleCode,
                'severity'      => $severity,
                'matched_terms' => $matched,
                'description'   => substr($description, 0, 200),
            ]);

            return [
                'detected' => true,
                'reason'   => sprintf(
                    "[%s] Risk rule '%s' triggered by term(s) %s in transaction description.",
                    $severity,
                    $ruleCode,
                    implode(', ', $matched)
                ),
            ];
        }

        return ['detected' => false, 'reason' => null];
    }

    /**
     * Config-driven GL category prediction.
     */
    protected function predictGLCategory(string $categoryType, string $description, string $module): array
    {
        if (isset($this->glMappings[$categoryType])) {
            return $this->glMappings[$categoryType];
        }

        Log::notice('No GL mapping found for category, using fallback', [
            'category' => $categoryType,
            'module'   => $module,
        ]);

        return $this->glFallback;
    }
}
