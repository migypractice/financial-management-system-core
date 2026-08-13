# Hardware System — Financial Management System (Transaction Core)

A Laravel 13 + React 18/TypeScript capstone implementing the **Transaction Core** of a
financial management system: machine-to-machine transaction ingestion, a rule-based AI
risk engine, a Maker-Checker approval workflow, and General Ledger posting.

> Other modules shown in the sidebar (Accounts Payable, Accounts Receivable, Disbursement,
> Collection, Budget, Cash Management, Financial Reports, Tax Management) are owned by
> other teams and are UI placeholders in this repo. This project's scope is the
> **Transaction Core**: ingestion → risk evaluation → approval → posting → audit.

## Architecture

```
 External subsystem            Laravel API (backend-laravel)              React SPA (frontend-react)
 (ERP, HRMS, e-commerce, …)     ─────────────────────────────              ───────────────────────────
        │                                                                          │
        │  POST /api/v1/integration/*                                             │
        │  header: X-API-KEY                                                      │
        ▼                                                                          │
 ┌─────────────────────┐   idempotency check   ┌──────────────┐                    │
 │ IntegrationController├──────────────────────►│ transactions │                   │
 └──────────┬───────────┘                       │    table     │                   │
            │ evaluate()                        └──────┬───────┘                   │
            ▼                                           │                          │
     ┌─────────────┐   rule-based risk scoring          │                          │
     │  AIService   │───────────────────────────────────┘                          │
     └─────────────┘   writes ai_logs (audit trail)                                │
            │                                                                       │
            ▼ status = pending_approval | ai_flagged                                │
 ┌───────────────────────────┐   GET /api/v1/dashboard/transactions    ◄────────────┘
 │  Maker-Checker Approval    │   POST .../{id}/approve | /reject
 │  (TransactionController +  │───────────────────────────────────────►  Approvals page
 │   TransactionPolicy)       │
 └──────────────┬─────────────┘
                │ approve()
                ▼
 ┌───────────────────────────┐   GET /api/v1/dashboard/gl
 │     FinancialService       │───────────────────────────────────────►  General Ledger page
 │  (DB transaction + row     │
 │   lock, journal_entries)   │   GET /api/v1/dashboard/audit-logs
 └─────────────────────────────►────────────────────────────────────►  Audit Trail page
```

## Workflow

1. **Ingestion** — an external subsystem POSTs to `/api/v1/integration/inbound-revenue`
   (income) or `/api/v1/integration/request-disbursement` (expense), authenticated with a
   shared `X-API-KEY` header (`ApiKeyMiddleware`).
2. **Idempotency** — an optional `Idempotency-Key` header (or `idempotency_key` body field)
   is checked against a unique DB constraint; a duplicate request returns the original
   transaction instead of creating a second one, even under a concurrent race.
3. **Risk evaluation** — `AIService` (a deterministic **rule-based expert system**, not
   machine learning — see its docblock) scores the transaction against configurable
   keyword rules and a high-value threshold (`config/ai.php`), and suggests a GL account.
4. **Pending / Flagged** — the transaction lands in `pending_approval` or `ai_flagged`
   status and is written to `ai_logs` (the audit trail).
5. **Maker-Checker approval** — a `finance_manager` or `super_admin` reviews it in the
   Approvals page. `TransactionPolicy` blocks self-approval (a maker can never check their
   own transaction) in addition to `FinancialService`'s own DB-level guard.
6. **GL posting** — approving a transaction atomically (`DB::transaction` + `lockForUpdate`)
   creates a sequentially-numbered `journal_entries` row and marks the transaction
   `posted`. On PostgreSQL, posted journal entries are immutable at the DB trigger level.
7. **Audit trail** — every AI evaluation is queryable via `/api/v1/dashboard/audit-logs`
   and the Audit Trail page.

## Tech stack

| Layer | Tech |
|---|---|
| Backend | Laravel 13 (PHP 8.3+), Sanctum token auth, PostgreSQL |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Testing | PHPUnit (Feature tests, SQLite in-memory) |

## Local setup

### Backend (`backend-laravel/`)

```bash
composer install
cp .env.example .env
php artisan key:generate
# set DB_CONNECTION / DB_HOST / DB_DATABASE / DB_USERNAME / DB_PASSWORD in .env
# set INTEGRATION_API_KEY to a secret of your choice
php artisan migrate --seed
php artisan serve
```

The API is served at `http://localhost:8000/api/v1`.

### Frontend (`frontend-react/`)

```bash
npm install
npm run dev
```

Set `VITE_API_BASE_URL` (e.g. in `.env.local`) if the backend isn't at
`http://localhost:8000/api/v1`. The app runs at `http://localhost:3000`.

### Test accounts (seeded by `DatabaseSeeder`)

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@hw.com | password123 |
| Finance Manager | manager@hw.com | password123 |
| Department Viewer | staff@hw.com | password123 |

## Running tests

```bash
cd backend-laravel
php artisan test
```

Feature tests cover `AIService` (risk scoring), `FinancialService` (approve / reject /
post, self-approval prevention, sequential journal numbering), `IntegrationController`
(API key enforcement, idempotency, validation), and RBAC (`RoleMiddleware` +
`TransactionPolicy`). They run against an in-memory SQLite database and never touch your
local Postgres data.

## Key environment variables

| Variable | Purpose |
|---|---|
| `INTEGRATION_API_KEY` | Shared secret required in the `X-API-KEY` header on `/api/v1/integration/*` |
| `FRONTEND_URL` | Comma-separated list of origins allowed by CORS (`config/cors.php`) |
| `SANCTUM_TOKEN_EXPIRATION` | Minutes until an issued API token expires (default 480) |
| `AI_CONFIDENCE_THRESHOLD`, `AI_HIGH_VALUE_THRESHOLD` | Tunables for `AIService` (see `config/ai.php`) |

## Known limitations

- The GL representation is a simplified single-line-per-transaction model (debit *or*
  credit derived from transaction type), not full double-entry line items.
- Journal entry immutability is enforced via a DB trigger that only exists on PostgreSQL —
  it's a no-op on SQLite/MySQL.
- Modules outside the Transaction Core (AP, AR, Disbursement, Collection, Budget, Cash,
  Reports, Tax) are frontend placeholders pending integration by other teams.
