import React from 'react';
import { X, Printer, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';

export interface BirForm2307Data {
  isOpen: boolean;
  payeeName: string;
  tin?: string;
  address?: string;
  atcCode: 'WC158' | 'WC160' | 'WC100' | string;
  rate?: number;
  taxBase: number;
  taxWithheld: number;
  period?: string;
  voucherRef?: string;
}

interface BirForm2307ModalProps {
  data: BirForm2307Data;
  onClose: () => void;
}

export const BirForm2307Modal: React.FC<BirForm2307ModalProps> = ({ data, onClose }) => {
  if (!data.isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const atcRate = data.rate ?? (data.atcCode === 'WC158' ? 1 : data.atcCode === 'WC160' ? 2 : 5);
  const atcDesc = data.atcCode === 'WC158' 
    ? 'Income payments to suppliers of agricultural / industrial goods (1%)'
    : data.atcCode === 'WC160'
    ? 'Income payments to suppliers of contractor / professional services (2%)'
    : 'Income payments for real estate / equipment lease & rentals (5%)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-6 overflow-hidden print:border-none print:shadow-none print:my-0">
        
        {/* Modal Top Action Bar (hidden when printing) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 print:hidden">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                BIR Form No. 2307 Certificate
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Certificate of Creditable Tax Withheld at Source (PFRS & BIR Compliant)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Certificate Sheet Content (Printable) */}
        <div className="p-6 sm:p-8 space-y-6 text-slate-900 dark:text-slate-100 font-sans print:p-4 print:text-black">
          
          {/* Official BIR Header */}
          <div className="text-center border-b-2 border-slate-800 dark:border-slate-300 pb-4 space-y-1">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-[11px] font-bold tracking-widest uppercase text-slate-600 dark:text-slate-400">
                Republic of the Philippines • Department of Finance
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight uppercase">
              Bureau of Internal Revenue
            </h1>
            <div className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded font-mono font-bold text-xs uppercase tracking-wider border border-slate-300 dark:border-slate-700">
              BIR Form No. 2307
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Certificate of Creditable Tax Withheld at Source
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              For the Period: <span className="font-semibold text-slate-800 dark:text-slate-200">{data.period || 'October 01, 2026 to October 31, 2026'}</span>
            </p>
          </div>

          {/* Part I & Part II Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            
            {/* Part I: Payee */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3.5 space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="font-bold text-[10px] tracking-wider uppercase text-indigo-700 dark:text-indigo-400 block border-b pb-1">
                Part I — Payee Information (Recipient)
              </span>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Taxpayer Identification Number (TIN):</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{data.tin || '004-882-913-000'}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Payee's Registered Name:</span>
                <span className="font-semibold text-slate-900 dark:text-white text-sm">{data.payeeName}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Registered Address:</span>
                <span className="text-slate-700 dark:text-slate-300">{data.address || 'Metro Manila, Philippines'}</span>
              </div>
            </div>

            {/* Part II: Payor */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3.5 space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="font-bold text-[10px] tracking-wider uppercase text-emerald-700 dark:text-emerald-400 block border-b pb-1">
                Part II — Payor Information (Withholding Agent)
              </span>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Taxpayer Identification Number (TIN):</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">000-192-847-000</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Withholding Agent's Name:</span>
                <span className="font-semibold text-slate-900 dark:text-white text-sm">ARCHON NELL INCORPORATED</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">RDO Code & Address:</span>
                <span className="text-slate-700 dark:text-slate-300">RDO 043 — Pasig City, Metro Manila</span>
              </div>
            </div>
          </div>

          {/* Part III: Details of Monthly Withholding Tax */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Part III — Details of Monthly Withholding Tax & ATC Classification
            </div>
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  <th className="py-2.5 px-3">Nature of Income Payment</th>
                  <th className="py-2.5 px-3 text-center w-20">ATC</th>
                  <th className="py-2.5 px-3 text-center w-16">Rate</th>
                  <th className="py-2.5 px-3 text-right">Tax Base (Net of VAT)</th>
                  <th className="py-2.5 px-3 text-right">Tax Withheld (₱)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-900 dark:text-white block">{atcDesc}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      Disbursement Ref: {data.voucherRef || 'Voucher Auto-Posting'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {data.atcCode}
                  </td>
                  <td className="py-3 px-3 text-center tabular-nums font-semibold">
                    {atcRate}%
                  </td>
                  <td className="py-3 px-3 text-right font-medium tabular-nums">
                    ₱{data.taxBase.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    ₱{data.taxWithheld.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-800/70 border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                  <td colSpan={4} className="py-2.5 px-3 text-right uppercase text-[11px] text-slate-700 dark:text-slate-300">
                    Total Tax Withheld (Creditable against Income Tax):
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-sm font-extrabold text-indigo-700 dark:text-indigo-300 border-double border-b-4 border-indigo-400">
                    ₱{data.taxWithheld.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Part IV: Declaration & Signatures */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed italic text-center">
              We declare under the penalties of perjury that this certificate has been made in good faith, verified by us, and to the best of our knowledge and belief, is true and correct, pursuant to the provisions of the National Internal Revenue Code of 1997, as amended.
            </p>

            <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs">
              <div className="border-t border-slate-400 dark:border-slate-600 pt-2">
                <p className="font-bold text-slate-800 dark:text-slate-200 uppercase">Archon Nell Incorporated</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Chief Financial Officer / Authorized Signatory</p>
                <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Digitally Verified & Posted</p>
              </div>

              <div className="border-t border-slate-400 dark:border-slate-600 pt-2">
                <p className="font-bold text-slate-800 dark:text-slate-200 uppercase">{data.payeeName}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Payee / Authorized Representative</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Acknowledgment of Creditable Tax</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

