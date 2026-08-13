# Hardware System — Backend (Laravel)

This is the API backend for the **Transaction Core** of the Hardware System Financial
Management System. For architecture, the full workflow, setup for both the backend and
frontend, and test accounts, see the [project README](../README.md) at the repo root.

## Quick start

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

## Tests

```bash
php artisan test
```

## Key source locations

| Concern | Location |
|---|---|
| M2M ingestion | `app/Http/Controllers/API/Integration/IntegrationController.php` |
| Risk evaluation (rule-based, not ML) | `app/Services/AIService/AIService.php`, `config/ai.php` |
| Maker-Checker + GL posting | `app/Services/FinancialService/FinancialService.php` |
| Approval authorization | `app/Policies/TransactionPolicy.php` |
| API key middleware | `app/Http/Middleware/ApiKeyMiddleware.php` |
| Role-based access | `app/Http/Middleware/RoleMiddleware.php` |
| Routes | `routes/api.php` |
