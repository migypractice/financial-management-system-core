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
    | Keywords found in a transaction description that instantly trigger
    | an anomaly flag. These are checked case-insensitively against the
    | uppercased description. Editable without code changes.
    |
    */
    'risk_keywords' => [
        // Critical Risk - Fraud or Compliance Violations
        'DUPLICATE_INVOICE'         => 'CRITICAL',
        'INVALID_SUPPLIER'          => 'CRITICAL',
        'UNAUTHORIZED_PURCHASE_ORDER' => 'CRITICAL',
        'OFFSHORE'                  => 'CRITICAL',

        // High Risk - Financial Impact or Major Errors
        'NEGATIVE_INVENTORY'        => 'HIGH',
        'INVENTORY_VARIANCE'        => 'HIGH',
        'DUPLICATE_PAYMENT'         => 'HIGH',
        'UNKNOWN_VEND'              => 'HIGH',

        // Medium Risk - Operational Anomalies
        'UNAUTHORIZED_DISCOUNT'     => 'MEDIUM',
        'PURCHASE_PRICE_VARIANCE'   => 'MEDIUM',
        'INVENTORY_COUNT_MISMATCH'  => 'MEDIUM',
        'EXCEEDS_BUDGET_LIMIT'      => 'MEDIUM',
        
        // Review - Needs Human Verification
        'GHOST_EMPLOYEE'            => 'REVIEW',
        'BACKDATED_TRANSACTION'     => 'REVIEW',
        'UNVERIFIED_ACCOUNT'        => 'REVIEW',
        'SUSPICIOUS'                => 'REVIEW',
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
