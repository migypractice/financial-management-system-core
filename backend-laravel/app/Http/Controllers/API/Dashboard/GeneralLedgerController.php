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
                         ->orWhere('description', 'like', "%{$search}%");
                  });
            });
        }

        // Newest first sorting
        $query->orderByDesc('entry_date')
              ->orderByDesc('created_at');

        $entries = $query->get();

        // Calculate totals based on the fetched data
        $totalDebit = 0;
        $totalCredit = 0;

        foreach ($entries as $entry) {
            $amount = (float) $entry->transaction->amount;
            if ($entry->transaction->type === 'EXPENSE') {
                $totalDebit += $amount;
            } else {
                $totalCredit += $amount;
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'General ledger entries retrieved successfully.',
            'data'    => GeneralLedgerResource::collection($entries),
            'summary' => [
                'total_entries' => $entries->count(),
                'total_debit'   => $totalDebit,
                'total_credit'  => $totalCredit,
            ]
        ]);
    }
}
