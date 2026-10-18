# Group 10: Financial Management System (Transaction Core) — Integration Specification

> **Owner:** Group 10 — Financial Management System (Transaction Core)
> **Version:** 2.0 — HRMS Cluster Protocol + Enterprise Integration
> **Last Updated:** 2026-10-18

---

## 1. System Overview

Group 10 serves as the **Financial Core** of the Archon Nell Incorporated Enterprise Cluster. All money-in (revenue, collections, subscriptions) and money-out (payroll, payouts, refunds, procurement) transactions from every enterprise group flow through our APIs.

### Core Modules

| # | Module | Scope |
|---|--------|-------|
| 1 | Transaction Core | AI risk evaluation, maker-checker approval, audit trail |
| 2 | Accounts Receivable (AR) | Customer invoices, sales revenue |
| 3 | Collections | Payment receipts, cash-at-bank deposits |
| 4 | Accounts Payable (AP) | Supplier bills, vendor invoices |
| 5 | Disbursement Management | Payment request vouchers, check/bank releases |
| 6 | General Ledger (GL) | Double-entry journal entries, trial balance |
| 7 | Budget Management | Department allocations, utilization tracking |
| 8 | Cash & Bank Management | Multi-bank balances, inter-bank transfers |
| 9 | Tax Management | VAT (Output/Input), EWT, BIR compliance |

---

## 2. Authentication

All integration endpoints accept authentication via **any** of the following methods:

| Method | Example |
|--------|---------|
| `X-API-KEY` header | `X-API-KEY: hw-integration-secret-2026` |
| `Authorization: Bearer` header | `Authorization: Bearer hw-integration-secret-2026` |
| Query parameter | `?api_key=hw-integration-secret-2026` or `?X-API-KEY=hw-integration-secret-2026` |

---

## 3. Two Supported Protocols

### Protocol A: Single-Object REST (ESFA & Enterprise Groups)

**Base Path:** `POST /api/v1/integration/...`

Send a single JSON object per request. Response includes `status`, `transaction_id`, `core_records`.

### Protocol B: Batch Upsert (HRMS HR1–HR4)

**Base Path:** `POST /api/integrations/<sender>/<resource>`

Send `{ "records": [ ... ] }` (up to 500 rows per call). Each row is validated independently. Response includes `accepted` count and `rejected` array with row-level error details.

**Rate Limit:** 120 requests per minute.

**Idempotent Upserts:** Keyed by `reference_id`, `payroll_run_id + employee_code`, or `period + employee_code`. Resending the same batch never creates duplicate bills or GL entries.

**Centavos Support:** If `amount` is not provided, the system automatically computes it from `amount_centavos / 100`, `net_pay_centavos / 100`, or `gross_pay_centavos / 100`.

---

## 4. Endpoint Reference

### 4.1 Money In — Inbound Revenue

| Protocol | Endpoint |
|----------|----------|
| Single | `POST /api/v1/integration/inbound-revenue` |
| Batch | `POST /api/integrations/esfa/revenue` |
| Wildcard | `POST /api/integrations/{sender}/revenue` |
| Wildcard | `POST /api/integrations/{sender}/sales` |
| Wildcard | `POST /api/integrations/{sender}/collections` |
| Wildcard | `POST /api/integrations/{sender}/subscriptions` |
| Wildcard | `POST /api/integrations/{sender}/commissions` |

**Supported `category_type` values:**
`SALES_REVENUE`, `ORDER_PAYMENT`, `CAPTURED_PAYMENT`, `COD_COLLECTION`,
`SELLER_SUBSCRIPTION`, `PLATFORM_COMMISSION`, `GATEWAY_SETTLEMENT`,
`ADVERTISING_FEE`, `SERVICE_FEE`

**Flexible Field Aliases (any of these will be auto-resolved):**

| Standard Field | Accepted Aliases |
|---|---|
| `external_reference_id` | `reference_id`, `order_id`, `transaction_id`, `invoice_number` |
| `customer_name` | `seller_name`, `merchant_name`, `payer_name`, `payee_name` |
| `category_type` | `transaction_type`, `type` |
| `amount` | `total_amount`, `grand_total`, `net_amount`, `amount_centavos/100` |
| `description` | `purpose`, `notes` |
| `external_module` | `source_module` |

### 4.2 Money Out — Disbursement Requests

| Protocol | Endpoint |
|----------|----------|
| Single | `POST /api/v1/integration/request-disbursement` |
| Batch (HR4 Payroll) | `POST /api/integrations/hr4/payroll` |
| Batch (HR4 Disbursements) | `POST /api/integrations/hr4/disbursements` |
| Batch (HR4 Claims) | `POST /api/integrations/hr4/claims` |
| Batch (HR3 Claims) | `POST /api/integrations/hr3/claims` |
| Batch (ESFA) | `POST /api/integrations/esfa/disbursements` |
| Wildcard | `POST /api/integrations/{sender}/payroll` |
| Wildcard | `POST /api/integrations/{sender}/disbursements` |
| Wildcard | `POST /api/integrations/{sender}/claims` |
| Wildcard | `POST /api/integrations/{sender}/bills` |
| Wildcard | `POST /api/integrations/{sender}/vouchers` |
| Wildcard | `POST /api/integrations/{sender}/payouts` |
| Wildcard | `POST /api/integrations/{sender}/refunds` |

**Supported `category_type` values:**
`PAYROLL_SALARY`, `PAYROLL_BENEFITS`, `EMPLOYEE_CLAIM`, `EMPLOYEE_REIMBURSEMENT`,
`SELLER_PAYOUT`, `SELLER_SETTLEMENT`, `CUSTOMER_REFUND`,
`INVENTORY_PURCHASE`, `SUPPLIER_INVOICE`,
`FLEET_FUEL`, `FLEET_MAINTENANCE`, `FREIGHT_SHIPPING`,
`FACILITY_RENT`, `UTILITIES_BILL`, `CONTRACT_LEASE`, `LEGAL_BILLING`

**HR-Specific Fields (auto-resolved for HR4 payroll batches):**

| Field | Description |
|---|---|
| `employee_code` | Unique employee identifier |
| `employee_name` | Auto-mapped to `payee_name` |
| `department` / `department_code` | Stored in metadata |
| `period` | e.g., `"2026-10-A"` or `"2026-10"` |
| `payroll_run_id` | Payroll batch identifier |
| `claim_type` | e.g., `"HMO"`, `"REIMBURSEMENT"`, `"TRAINING"` |
| `net_pay_centavos` | Integer centavos, auto-divided by 100 |
| `gross_pay_centavos` | Integer centavos, auto-divided by 100 |
| `amount_centavos` | Integer centavos, auto-divided by 100 |

### 4.3 Read-Only Lookup Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/integration/budget-status` | Department budget allocations & utilization |
| `GET /api/v1/integration/voucher-status/{reference}` | Status of bill, voucher, or invoice by reference |
| `GET /api/v1/integration/financial-summary` | Live financial analytics (revenue, cash, disbursements) |
| `GET /api/v1/integration/tax-summary` | VAT & EWT breakdown |
| `GET /api/v1/integration/archiving-records` | Document archiving feed for compliance |
| `GET /api/integrations/financial-summary` | Alias |
| `GET /api/integrations/analytics/summary` | Alias |
| `GET /api/integrations/tax-summary` | Alias |
| `GET /api/integrations/budget-status` | Alias |
| `GET /api/integrations/voucher-status/{reference}` | Alias |
| `GET /api/integrations/archiving-records` | Alias |

---

## 5. Response Formats

### Single-Object Response (Protocol A)

```json
{
  "status": "accepted",
  "message": "Transaction received and queued for human approval.",
  "transaction_id": "uuid",
  "transaction_code": "TXN-20261018-ABCDEF",
  "workflow_status": "pending_approval",
  "ai_evaluation": {
    "confidence_score": 0.94,
    "suggested_gl_code": "5100-EXP-SALARY",
    "anomaly_detected": false
  },
  "core_records": {
    "ap_bill_id": "uuid",
    "bill_number": "BILL-202610-XXXXX",
    "payment_request_id": "uuid",
    "voucher_number": "PR-202610-0001"
  }
}
```

### Batch Response (Protocol B)

```json
{
  "status": "accepted",
  "message": "Batch processed: 2 accepted, 0 rejected.",
  "accepted": 2,
  "rejected": [],
  "data": [ ... ]
}
```

### Batch with Partial Rejection

```json
{
  "status": "accepted",
  "message": "Batch processed: 1 accepted, 1 rejected.",
  "accepted": 1,
  "rejected": [
    { "row": 1, "reason": "The amount field is required." }
  ],
  "data": [ ... ]
}
```

---

## 6. Copy-Paste Examples per Group

### Group 2: E-Commerce Core — Online Order Payment

```bash
curl -X POST http://localhost:8000/api/v1/integration/inbound-revenue \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: hw-integration-secret-2026" \
  -d '{
    "order_id": "ORD-ECOM-2026-001",
    "customer_name": "Juan Dela Cruz",
    "category_type": "ORDER_PAYMENT",
    "amount": 3500.00,
    "source_module": "ECOMMERCE_CORE",
    "description": "Power drill + accessories order",
    "metadata": { "payment_status": "PAID" }
  }'
```

### Group 3: ESFA — Seller Subscription

```bash
curl -X POST http://localhost:8000/api/v1/integration/inbound-revenue \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: hw-integration-secret-2026" \
  -d '{
    "order_id": "SUB-ESFA-2026-001",
    "seller_name": "TopSteel Hardware Merchant",
    "category_type": "SELLER_SUBSCRIPTION",
    "amount": 5000.00,
    "gateway_fee": 150.00,
    "status": "PAID",
    "notes": "Annual Premium Tier Subscription"
  }'
```

### Group 3: ESFA — Seller Payout / Settlement

```bash
curl -X POST http://localhost:8000/api/v1/integration/request-disbursement \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: hw-integration-secret-2026" \
  -d '{
    "settlement_id": "SETTLE-ESFA-888",
    "seller_name": "PowerTools MegaMerchant",
    "category_type": "SELLER_SETTLEMENT",
    "amount": 45000.00,
    "notes": "Bi-weekly marketplace net payout"
  }'
```

### Groups 1/5/8/9 (HR1–HR4): Payroll Batch (HRMS Protocol)

```bash
curl -X POST http://localhost:8000/api/integrations/hr4/payroll \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: hw-integration-secret-2026" \
  -d '{
    "records": [
      {
        "employee_code": "EMP-001",
        "employee_name": "Juan Dela Cruz",
        "department": "Engineering",
        "period": "2026-10-A",
        "payroll_run_id": "PR-RUN-2026-10A",
        "net_pay_centavos": 3500000,
        "description": "Oct 1-15 salary"
      },
      {
        "employee_code": "EMP-002",
        "employee_name": "Maria Santos",
        "department": "Marketing",
        "period": "2026-10-A",
        "payroll_run_id": "PR-RUN-2026-10A",
        "net_pay_centavos": 2800000,
        "description": "Oct 1-15 salary"
      }
    ]
  }'
```

### Groups 1/5/8/9 (HR3): Employee Claims & Training Costs

```bash
curl -X POST http://localhost:8000/api/integrations/hr3/claims \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: hw-integration-secret-2026" \
  -d '{
    "records": [
      {
        "employee_code": "EMP-005",
        "employee_name": "Ana Reyes",
        "claim_type": "TRAINING",
        "amount": 15000.00,
        "department": "Sales",
        "description": "AWS Cloud Certification training fee"
      }
    ]
  }'
```

### Group 6: Fleet & Transportation — Fuel Purchase

```bash
curl -X POST http://localhost:8000/api/integrations/fleet/disbursements \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: hw-integration-secret-2026" \
  -d '{
    "reference_id": "FUEL-2026-OCT-001",
    "payee_name": "Shell Philippines",
    "category_type": "FLEET_FUEL",
    "amount": 8500.00,
    "description": "Delivery truck diesel refuel — Truck #T-007"
  }'
```

### Group 7: Supply Chain & Inventory — Purchase Order

```bash
curl -X POST http://localhost:8000/api/integrations/supply-chain/bills \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: hw-integration-secret-2026" \
  -d '{
    "po_number": "PO-SC-2026-0451",
    "supplier_name": "Holcim Philippines Inc.",
    "category_type": "INVENTORY_PURCHASE",
    "amount": 125000.00,
    "description": "Bulk cement order — 500 bags @ P250"
  }'
```

### Group 4: Facilities & Admin — Utility Bill

```bash
curl -X POST http://localhost:8000/api/integrations/facilities/bills \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: hw-integration-secret-2026" \
  -d '{
    "reference_id": "MERALCO-2026-OCT",
    "payee_name": "Meralco Commercial Power",
    "category_type": "UTILITIES_BILL",
    "amount": 45000.00,
    "description": "October 2026 warehouse electricity bill"
  }'
```

---

## 7. Idempotency

All write endpoints support idempotent upserts:

| Method | Key Source |
|--------|-----------|
| `Idempotency-Key` header | Explicit key in HTTP header |
| `idempotency_key` body field | Explicit key in JSON body |
| HR4 auto-key | `HR4-{period}-{employee_code}` |
| HR4 auto-key | `HR4-{payroll_run_id}-{employee_code}` |
| Reference auto-key | `HREF-md5({reference_id})` |

**Behavior:** Resending the same payload with the same key returns the original transaction (HTTP 200). Sending a *different* payload with the same key returns HTTP 409 Conflict.

---

## 8. Connecting Groups Summary

| Group | Name | Direction | Primary Endpoint |
|-------|------|-----------|------------------|
| 2 | E-Commerce Core | Money In | `POST /api/v1/integration/inbound-revenue` |
| 3 | ESFA | Money In + Out | Both endpoints |
| 4 | Facilities & Admin | Money Out | `POST /api/integrations/facilities/bills` |
| 6 | Fleet & Transportation | Money Out | `POST /api/integrations/fleet/disbursements` |
| 7 | Supply Chain & Inventory | Money Out | `POST /api/integrations/supply-chain/bills` |
| 1 | PDMS (HR3) | Money Out | `POST /api/integrations/hr3/claims` |
| 5 | Core HR (HR1) | Read-Only | `GET /api/integrations/budget-status` |
| 8 | Workforce (HR2) | Read-Only | `GET /api/integrations/voucher-status/{ref}` |
| 9 | Payroll & Benefits (HR4) | Money Out | `POST /api/integrations/hr4/payroll` |
