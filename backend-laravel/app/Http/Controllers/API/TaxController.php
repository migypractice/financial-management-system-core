<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\ApBill;
use App\Models\ArInvoice;
use App\Models\Collection;
use App\Models\Disbursement;
use App\Services\AIService\AIService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaxController extends Controller
{
    public function __construct(
        protected AIService $aiService
    ) {}

    /**
     * GET /api/v1/tax/summary
     * 100% Live Tax Summary — computes real VAT and EWT from actual AR/AP records.
     */
    public function summary(Request $request): JsonResponse
    {
        // ═══ OUTPUT VAT (from AR Sales Invoices) ═══
        $arInvoices = ArInvoice::with('customer')->orderByDesc('invoice_date')->get();
        $totalOutputVATBase = 0;
        $totalOutputVAT = 0;
        $arTaxLedger = [];

        foreach ($arInvoices as $inv) {
            $gross = (float) $inv->total_amount;
            $vatableBase = round($gross / 1.12, 2);
            $vatAmount = round($gross - $vatableBase, 2);
            $totalOutputVATBase += $vatableBase;
            $totalOutputVAT += $vatAmount;

            $invDate = $inv->invoice_date ? ($inv->invoice_date instanceof \Carbon\Carbon ? $inv->invoice_date->toDateString() : (string) $inv->invoice_date) : now()->toDateString();

            $arTaxLedger[] = [
                'id'             => $inv->id,
                'reference'      => $inv->invoice_number,
                'counterparty'   => $inv->customer->name ?? 'Customer',
                'date'           => $invDate,
                'gross_amount'   => $gross,
                'vatable_base'   => $vatableBase,
                'vat_amount'     => $vatAmount,
                'vat_type'       => 'OUTPUT',
                'ewt_code'       => null,
                'ewt_rate'       => 0,
                'ewt_amount'     => 0,
                'status'         => $inv->status,
                'module'         => 'AR',
            ];
        }

        // ═══ INPUT VAT + EWT (from AP Bills) ═══
        $apBills = ApBill::with('supplier')->orderByDesc('bill_date')->get();
        $totalInputVATBase = 0;
        $totalInputVAT = 0;
        $totalEWT = 0;
        $ewtByCode = [];
        $apTaxLedger = [];

        foreach ($apBills as $bill) {
            $gross = (float) $bill->total_amount;
            $category = $bill->category_type ?? 'SUPPLIER_INVOICE';

            $breakdown = $this->aiService->computeTaxBreakdown($gross, $category, 'ACCOUNTS_PAYABLE');

            $totalInputVATBase += $breakdown['vatable_base'];
            $totalInputVAT += $breakdown['vat_amount'];
            $totalEWT += $breakdown['ewt_amount'];

            // Accumulate EWT by tax code
            $ewtCode = $breakdown['ewt_code'] ?? 'WC160';
            if (!isset($ewtByCode[$ewtCode])) {
                $ewtByCode[$ewtCode] = [
                    'code'        => $ewtCode,
                    'description' => $breakdown['ewt_desc'],
                    'rate'        => $breakdown['ewt_rate'],
                    'tax_base'    => 0,
                    'amount'      => 0,
                ];
            }
            $ewtByCode[$ewtCode]['tax_base'] += $breakdown['vatable_base'];
            $ewtByCode[$ewtCode]['amount'] += $breakdown['ewt_amount'];

            $billDate = $bill->bill_date ? ($bill->bill_date instanceof \Carbon\Carbon ? $bill->bill_date->toDateString() : (string) $bill->bill_date) : now()->toDateString();

            $apTaxLedger[] = [
                'id'             => $bill->id,
                'reference'      => $bill->bill_number,
                'counterparty'   => $bill->supplier->name ?? 'Supplier',
                'date'           => $billDate,
                'gross_amount'   => $gross,
                'vatable_base'   => $breakdown['vatable_base'],
                'vat_amount'     => $breakdown['vat_amount'],
                'vat_type'       => 'INPUT',
                'ewt_code'       => $breakdown['ewt_code'],
                'ewt_rate'       => $breakdown['ewt_rate'],
                'ewt_amount'     => $breakdown['ewt_amount'],
                'status'         => $bill->status,
                'module'         => 'AP',
            ];
        }

        // ═══ Net VAT Payable (BIR 2550M/2550Q) ═══
        $netVATPayable = max(0, $totalOutputVAT - $totalInputVAT);
        $excessInputTax = $totalInputVAT > $totalOutputVAT
            ? round($totalInputVAT - $totalOutputVAT, 2)
            : 0;

        // Merge and sort tax ledger by date (newest first)
        $taxLedger = array_merge($arTaxLedger, $apTaxLedger);
        usort($taxLedger, fn($a, $b) => strcmp($b['date'], $a['date']));

        return response()->json([
            'success' => true,
            'data'    => [
                'vat_summary' => [
                    'output_vat'       => round($totalOutputVAT, 2),
                    'output_vat_base'  => round($totalOutputVATBase, 2),
                    'input_vat'        => round($totalInputVAT, 2),
                    'input_vat_base'   => round($totalInputVATBase, 2),
                    'net_vat_payable'  => round($netVATPayable, 2),
                    'excess_input_tax' => round($excessInputTax, 2),
                ],
                'ewt_summary' => array_values($ewtByCode),
                'total_ewt'   => round($totalEWT, 2),
                'tax_ledger'  => $taxLedger,
                'period'      => [
                    'label' => now()->format('F Y'),
                    'year'  => now()->format('Y'),
                    'month' => now()->format('m'),
                ],
            ],
        ]);
    }
}
