import React from 'react';
import { X, Printer, Receipt, CheckCircle2, Building2 } from 'lucide-react';

export interface OfficialReceiptData {
  isOpen: boolean;
  receiptNumber: string;
  collectionDate: string;
  customerName: string;
  companyName?: string;
  customerTin?: string;
  invoiceNumber?: string;
  paymentMethod: string;
  referenceNumber: string;
  amount: number;
  collectedByName?: string;
}

interface OfficialReceiptModalProps {
  data: OfficialReceiptData;
  onClose: () => void;
}

export const OfficialReceiptModal: React.FC<OfficialReceiptModalProps> = ({ data, onClose }) => {
  if (!data.isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // 12% Philippine VAT Breakdown
  const totalAmount = data.amount || 0;
  const vatableSales = totalAmount / 1.12;
  const vatAmount = totalAmount - vatableSales;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-6 overflow-hidden print:border-none print:shadow-none print:my-0">
        
        {/* Action Header (Hidden in Print) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 print:hidden">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <Receipt className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Official Receipt (BIR Compliant)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Official Cash Collection & Inflow Settlement Document
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Official Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div className="p-6 sm:p-8 space-y-5 text-slate-900 dark:text-slate-100 font-sans print:p-4 print:text-black">
          
          {/* Header */}
          <div className="text-center border-b-2 border-slate-900 dark:border-slate-300 pb-4 space-y-1">
            <div className="inline-flex items-center gap-1.5 justify-center font-black text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white uppercase">
              <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Archon Nell Incorporated
            </div>
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Transaction Core Financial Management System
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              VAT REG. TIN: 000-192-847-000 • RDO 043 Pasig City, Metro Manila
            </p>
            <div className="mt-2 inline-block px-4 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-md font-mono font-bold text-xs uppercase tracking-widest">
              OFFICIAL RECEIPT
            </div>
          </div>

          {/* Details Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs gap-2 py-1 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Receipt No: </span>
              <span className="font-mono font-extrabold text-slate-900 dark:text-white">{data.receiptNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Date: </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{data.collectionDate}</span>
            </div>
          </div>

          {/* Received From Block */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-xs space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-slate-500 dark:text-slate-400">Received From:</span>
              <span className="font-bold text-sm text-slate-900 dark:text-white">{data.customerName}</span>
            </div>
            {data.companyName && (
              <div className="flex justify-between items-baseline">
                <span className="text-slate-500 dark:text-slate-400">Business Style:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{data.companyName}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline">
              <span className="text-slate-500 dark:text-slate-400">Taxpayer Identification Number (TIN):</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">{data.customerTin || '240-881-992-000'}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-500 dark:text-slate-400">In Settlement of:</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                {data.invoiceNumber ? `Sales Invoice #${data.invoiceNumber}` : 'Customer Account Settlement'}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-500 dark:text-slate-400">Banking Channel & Ref:</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {data.paymentMethod.replace(/_/g, ' ')} • {data.referenceNumber}
              </span>
            </div>
          </div>

          {/* Value Breakdown Table */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden text-xs">
            <table className="w-full">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">VATable Sales (Net of VAT)</td>
                  <td className="py-2.5 px-4 text-right font-medium tabular-nums">
                    ₱{vatableSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">VAT-Exempt / Zero-Rated Sales</td>
                  <td className="py-2.5 px-4 text-right font-medium tabular-nums text-slate-400">
                    ₱0.00
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-medium">12% Output Value Added Tax (VAT)</td>
                  <td className="py-2.5 px-4 text-right font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                    ₱{vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr className="bg-emerald-50/60 dark:bg-emerald-950/40 border-t-2 border-emerald-300 dark:border-emerald-700 font-bold">
                  <td className="py-3 px-4 text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                    TOTAL AMOUNT PAID:
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-base font-extrabold text-emerald-700 dark:text-emerald-300 border-double border-b-4 border-emerald-500">
                    ₱{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-between items-end text-xs">
            <div>
              <p className="text-[10px] text-slate-400 leading-tight">
                This Official Receipt is system-generated and valid for input tax claims.
              </p>
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> General Ledger Posted & Bank Reconciled
              </div>
            </div>

            <div className="text-center w-52 border-t border-slate-400 dark:border-slate-600 pt-1">
              <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">{data.collectedByName || 'Archon Nell Treasury'}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Authorized Cashier / Signatory</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

