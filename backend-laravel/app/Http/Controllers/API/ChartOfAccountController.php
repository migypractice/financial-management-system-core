<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\ChartOfAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChartOfAccountController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $type = $request->query('type');

        $query = ChartOfAccount::where('is_active', true)->orderBy('code');

        if ($type) {
            $query->where('type', strtoupper($type));
        }

        return response()->json([
            'success' => true,
            'data'    => $query->get(),
        ]);
    }
}
