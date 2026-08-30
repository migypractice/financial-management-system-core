<?php

namespace App\Http\Controllers\API\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\JournalEntry;
use App\Http\Resources\GeneralLedgerResource;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class GeneralLedgerController extends Controller
{
    /**
     * Fetch the simplified general ledger representation.
     */
    public function index(Request $request): JsonResponse
    {
        $query = JournalEntry::with('transaction')
            ->where('status', 'POSTED');

        // Optional search filter
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('entry_number', 'like', "%{$search}%")
                  ->orWhereHas('transaction', function ($q2) use ($search) {
                      $q2->where('transaction_code', 'like', "%{$search}%")
                         ->orWhere('external_reference_id', 'like', "%{$search}%")
                         ->orWhere('description', 'like', "%{$search}%")
                         ->orWhere('source_module', 'like', "%{$search}%");
                  });
            });
        }

        // Calculate totals using SQL aggregation instead of fetching all into memory
        $summaryQuery = \Illuminate\Support\Facades\DB::table('journal_entries')
            ->join('transactions', 'journal_entries.transaction_id', '=', 'transactions.id')
            ->where('journal_entries.status', 'POSTED');

        if ($search) {
            $summaryQuery->where(function ($q) use ($search) {
                $q->where('journal_entries.entry_number', 'like', "%{$search}%")
                  ->orWhere('transactions.transaction_code', 'like', "%{$search}%")
                  ->orWhere('transactions.external_reference_id', 'like', "%{$search}%")
                  ->orWhere('transactions.description', 'like', "%{$search}%")
                  ->orWhere('transactions.source_module', 'like', "%{$search}%");
            });
        }

        $totals = $summaryQuery->selectRaw("
            COUNT(*) as total_entries,
            SUM(CASE WHEN transactions.type = 'EXPENSE' THEN transactions.amount ELSE 0 END) as total_debit,
            SUM(CASE WHEN transactions.type = 'INCOME' THEN transactions.amount ELSE 0 END) as total_credit
        ")->first();

        // Newest first sorting
        $query->orderByDesc('entry_date')
              ->orderByDesc('created_at');

        $paginated = $query->paginate(50);

        return response()->json([
            'success' => true,
            'message' => 'General ledger entries retrieved successfully.',
            'data'    => GeneralLedgerResource::collection($paginated->items()),
            'summary' => [
                'total_entries' => (int) $totals->total_entries,
                'total_debit'   => (float) $totals->total_debit,
                'total_credit'  => (float) $totals->total_credit,
            ],
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page'    => $paginated->lastPage(),
                'total_pages'  => $paginated->lastPage(),
                'total_items'  => $paginated->total(),
            ]
        ]);
    }
}
