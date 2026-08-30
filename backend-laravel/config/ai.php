<?php

return [

    /*
    |--------------------------------------------------------------------------
    | AI Confidence Threshold
    |--------------------------------------------------------------------------
    |
    | Transactions with a confidence score below this value will be
    | automatically flagged for mandatory human review (Maker-Checker).
    | Value must be between 0.0 and 1.0.
    |
    */
    'confidence_threshold' => env('AI_CONFIDENCE_THRESHOLD', 0.85),

    /*
    |--------------------------------------------------------------------------
    | High-Value Transaction Threshold (PHP)
    |--------------------------------------------------------------------------
    |
    | Any transaction exceeding this amount (in PHP) will be flagged for
    | mandatory human review regardless of AI confidence score.
    |
    */
    'high_value_threshold' => env('AI_HIGH_VALUE_THRESHOLD', 500000.00),

    /*
    |--------------------------------------------------------------------------
    | Risk Keywords
    |--------------------------------------------------------------------------
    |
    | Each rule fires against the uppercased transaction description using
    | two optional term groups, both matched as case-insensitive substrings
    | (so plurals, "-ed"/"-ing" forms, and British spellings are covered by
    | the same stem for free):
    |
    |   'all_of' — every term in this list must be present (AND). Use this to
    |               require two concepts to co-occur, e.g. "duplicate" AND
    |               "invoice", so realistic free-text phrasing like "possible
    |               duplicate invoice from the vendor" still triggers the
    |               rule, without a fragile exact-phrase match.
    |   'any_of' — at least one term in this list must be present (OR). Use
    |               this for interchangeable synonyms, e.g. "vendor" or
    |               "supplier".
    |
    | A rule with only 'all_of' containing one term behaves like the original
    | single-keyword match. This is still a deterministic, config-driven,
    | rule-based match — no ML/LLM involved.
    |
    */
    'risk_keywords' => [
        // Critical Risk - Fraud or Compliance Violations
        'DUPLICATE_INVOICE' => [
            'severity' => 'CRITICAL',
            'all_of'   => ['DUPLICAT', 'INVOIC'],
        ],
        'INVALID_SUPPLIER' => [
            'severity' => 'CRITICAL',
            'all_of'   => ['INVALID'],
            'any_of'   => ['SUPPLIER', 'VENDOR'],
        ],
        'UNAUTHORIZED_PURCHASE_ORDER' => [
            'severity' => 'CRITICAL',
            'all_of'   => ['UNAUTHORI', 'PURCHASE'],
        ],
        'OFFSHORE' => [
            'severity' => 'CRITICAL',
            'all_of'   => ['OFFSHORE'],
        ],

        // High Risk - Financial Impact or Major Errors
        'NEGATIVE_INVENTORY' => [
            'severity' => 'HIGH',
            'all_of'   => ['NEGATIVE', 'INVENTORY'],
        ],
        'INVENTORY_VARIANCE' => [
            'severity' => 'HIGH',
            'all_of'   => ['INVENTORY', 'VARIANC'],
        ],
        'DUPLICATE_PAYMENT' => [
            'severity' => 'HIGH',
            'all_of'   => ['DUPLICAT', 'PAYMENT'],
        ],
        'UNKNOWN_VEND' => [
            'severity' => 'HIGH',
            'all_of'   => ['UNKNOWN'],
            'any_of'   => ['VENDOR', 'SUPPLIER'],
        ],

        // Medium Risk - Operational Anomalies
        'UNAUTHORIZED_DISCOUNT' => [
            'severity' => 'MEDIUM',
            'all_of'   => ['UNAUTHORI', 'DISCOUNT'],
        ],
        'PURCHASE_PRICE_VARIANCE' => [
            'severity' => 'MEDIUM',
            'all_of'   => ['PRICE', 'VARIANC'],
        ],
        'INVENTORY_COUNT_MISMATCH' => [
            'severity' => 'MEDIUM',
            'all_of'   => ['INVENTORY', 'MISMATCH'],
        ],
        'EXCEEDS_BUDGET_LIMIT' => [
            'severity' => 'MEDIUM',
            'all_of'   => ['BUDGET'],
            'any_of'   => ['EXCEED', 'OVER BUDGET', 'OVER LIMIT'],
        ],

        // Review - Needs Human Verification
        'GHOST_EMPLOYEE' => [
            'severity' => 'REVIEW',
            'all_of'   => ['GHOST', 'EMPLOYEE'],
        ],
        'BACKDATED_TRANSACTION' => [
            'severity' => 'REVIEW',
            'all_of'   => ['BACKDAT'],
        ],
        'UNVERIFIED_ACCOUNT' => [
            'severity' => 'REVIEW',
            'all_of'   => ['UNVERIFI', 'ACCOUNT'],
        ],
        'SUSPICIOUS' => [
            'severity' => 'REVIEW',
            'all_of'   => ['SUSPICIOUS'],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | GL Account Mappings
    |--------------------------------------------------------------------------
    |
    | Maps transaction category types to their General Ledger account code,
    | account name, and base confidence score. Finance admins can update
    | these mappings without modifying the AIService source code.
    |
    */
    'gl_mappings' => [

        // ── Revenue Accounts ──────────────────────────────────────────
        'SALES_REVENUE' => [
            'gl_code'    => '4000-REV',
            'gl_name'    => 'Sales Revenue',
            'confidence' => 0.9850,
        ],
        'CUSTOMER_REFUND' => [
            'gl_code'    => '4100-REF',
            'gl_name'    => 'Customer Refunds and Returns',
            'confidence' => 0.9300,
        ],

        // ── Cost of Goods Sold ────────────────────────────────────────
        'COST_OF_GOODS_SOLD' => [
            'gl_code'    => '5000-COGS',
            'gl_name'    => 'Cost of Goods Sold',
            'confidence' => 0.9500,
        ],

        // ── HR / Payroll Expenses ─────────────────────────────────────
        'PAYROLL_SALARY' => [
            'gl_code'    => '5100-EXP',
            'gl_name'    => 'Salaries and Compensation Expense',
            'confidence' => 0.9620,
        ],
        'EMPLOYEE_CLAIM' => [
            'gl_code'    => '5120-EXP',
            'gl_name'    => 'Employee Reimbursement Claims',
            'confidence' => 0.9100,
        ],

        // ── Inventory & Supply Chain ──────────────────────────────────
        'SUPPLIER_INVOICE' => [
            'gl_code'    => '2100-AP',
            'gl_name'    => 'Accounts Payable — Trade Suppliers',
            'confidence' => 0.9410,
        ],
        'INVENTORY_PURCHASE' => [
            'gl_code'    => '1200-INV',
            'gl_name'    => 'Merchandise Inventory',
            'confidence' => 0.9400,
        ],
        'INVENTORY_ADJUSTMENT' => [
            'gl_code'    => '1200-ADJ',
            'gl_name'    => 'Inventory Adjustment',
            'confidence' => 0.8800,
        ],
        'INVENTORY_SHRINKAGE' => [
            'gl_code'    => '5050-SHRK',
            'gl_name'    => 'Inventory Shrinkage Loss',
            'confidence' => 0.8700,
        ],
        'PURCHASE_RETURN' => [
            'gl_code'    => '2100-RET',
            'gl_name'    => 'Purchase Returns and Allowances',
            'confidence' => 0.9200,
        ],
        'SALES_RETURN' => [
            'gl_code'    => '4100-RET',
            'gl_name'    => 'Sales Returns and Allowances',
            'confidence' => 0.9200,
        ],

        // ── Fleet Expenses ────────────────────────────────────────────
        'FLEET_FUEL' => [
            'gl_code'    => '5300-EXP',
            'gl_name'    => 'Transportation and Logistics Expense',
            'confidence' => 0.9100,
        ],
        'FLEET_MAINTENANCE' => [
            'gl_code'    => '5310-EXP',
            'gl_name'    => 'Fleet Maintenance and Repairs',
            'confidence' => 0.8950,
        ],

        // ── Facilities & Legal ────────────────────────────────────────
        'FACILITY_RENT' => [
            'gl_code'    => '5400-EXP',
            'gl_name'    => 'Occupancy and Facility Lease Expense',
            'confidence' => 0.9550,
        ],
        'LEGAL_BILLING' => [
            'gl_code'    => '5500-EXP',
            'gl_name'    => 'Legal and Professional Services',
            'confidence' => 0.9200,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Default Fallback GL Account
    |--------------------------------------------------------------------------
    |
    | When no mapping matches the transaction category, this fallback is used.
    | We explicitly require manual review for unknown categories, rather than
    | relying purely on an artificial 0.0 confidence score.
    |
    */
    'gl_fallback' => [
        'gl_code'                => '5999-EXP',
        'gl_name'                => 'Unallocated Operational Expense',
        'confidence'             => 0.40,
        'requires_manual_review' => true,
    ],

];
