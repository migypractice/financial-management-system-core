import React from 'react';
import { Transaction } from '../../types/financial';
import { 
  X, 
  Printer, 
  FileCheck2, 
  AlertTriangle, 
  Building2, 
  ShieldCheck, 
  Calendar, 
  CreditCard,
  CheckCircle2,
  FileText
} from 'lucide-react';

interface SupportingDocumentModalProps {
  tx: Transaction;
  onClose: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  isActionable?: boolean;
  isProcessing?: boolean;
}

interface DocumentDetails {
  title: string;
  docNumber: string;
  issuerName: string;
  issuerTin: string;
  issuerAddress: string;
  payeeAccount: string;
  paymentTerm: string;
  items: Array<{
    description: string;
    qty: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  isAnomaly: boolean;
  anomalyReason?: string;
  verificationNotes: string;
}

/**
 * Generates high-fidelity document metadata tailored to the transaction
 */
function buildDocumentDetails(tx: Transaction): DocumentDetails {
  const isAnomaly = tx.aiAnomalyFlag;
  const desc = tx.description || '';
  const amount = Number(tx.amount) || 0;
  const tax = Number(tx.taxAmount) || amount * 0.12;
  const subtotal = Math.max(0, amount - tax);

  // If transaction has custom metadata attachment from Simulator
  if (tx.metadata?.attachment) {
    const att = tx.metadata.attachment;
    return {
      title: att.title || 'Official Supplier Invoice',
      docNumber: att.docNumber || `INV-${tx.externalReferenceId || tx.transactionCode}`,
      issuerName: att.issuerName || 'National Hardware & Cement Supply Corp.',
      issuerTin: att.issuerTin || 'TIN: 004-891-234-000',
      issuerAddress: att.issuerAddress || 'Km. 24 East Service Road, Taguig City',
      payeeAccount: att.payeeAccount || 'BDO-Corp-8821',
      paymentTerm: att.paymentTerm || 'Net 30 Days',
      items: att.items || [
        { description: desc, qty: 1, unitPrice: subtotal, total: subtotal }
      ],
      subtotal: Number(att.subtotal || subtotal),
      vatAmount: Number(att.vatAmount || tax),
      totalAmount: Number(att.totalAmount || amount),
      isAnomaly,
      anomalyReason: tx.aiAnomalyReason,
      verificationNotes: isAnomaly 
        ? 'Audit Flagged: Terminated user or unverified overseas vendor profile.'
        : '3-Way Match Verified against Purchase Order & Warehouse Receiving Report.',
    };
  }

  // Dynamic template based on module and category
  if (desc.toLowerCase().includes('cement') || tx.categoryType === 'SUPPLIER_INVOICE') {
    return {
      title: 'OFFICIAL SUPPLIER SALES INVOICE (BIR Form 2307)',
      docNumber: `SI-2026-${tx.transactionCode.slice(-6)}`,
      issuerName: 'Holcim Philippines / National Hardware Supply Corp.',
      issuerTin: 'TIN: 000-842-192-000-VAT',
      issuerAddress: 'Industrial Zone B, Calamba, Laguna',
      payeeAccount: 'BDO Unibank — Checking Acct #1088-2940-11',
      paymentTerm: 'Net 30 Days (PO-2026-8812)',
      items: [
        { description: 'Portland Cement Type 1 (40kg bags, Premium Grade)', qty: 500, unitPrice: 330, total: 165000 },
        { description: 'Heavy Hauling & Pallet Freight Handling', qty: 1, unitPrice: 20000, total: 20000 }
      ],
      subtotal: 165178.57,
      vatAmount: 19821.43,
      totalAmount: amount || 185000,
      isAnomaly: false,
      verificationNotes: 'Matched with Warehouse Receiving Report (WRR-9041) and signed Delivery Receipt.',
    };
  }

  if (desc.toLowerCase().includes('payroll') || tx.categoryType === 'PAYROLL_SALARY') {
    return {
      title: 'PAYROLL SUMMARY REGISTER & DISBURSEMENT ADVICE',
      docNumber: `PAY-2026-${tx.transactionCode.slice(-6)}`,
      issuerName: 'Archon Nell Human Resources & Payroll Dept.',
      issuerTin: 'TIN: 004-981-224-000-NV',
      issuerAddress: 'Head Office, Quezon City Commercial Complex',
      payeeAccount: 'BPI Corporate Payroll Gateway',
      paymentTerm: 'Direct Bank Credit (1st Half July 2026)',
      items: [
        { description: 'Warehouse Staff, Forklift Operators & Loaders (22 Personnel)', qty: 22, unitPrice: 8500, total: 187000 },
        { description: 'Fleet Delivery Drivers & Logistics Helpers (8 Personnel)', qty: 8, unitPrice: 8250, total: 66000 },
        { description: 'Retail Cashiers & Store Assistants (4 Personnel)', qty: 4, unitPrice: 8000, total: 32000 }
      ],
      subtotal: 285000,
      vatAmount: 0,
      totalAmount: amount || 285000,
      isAnomaly: false,
      verificationNotes: 'Biometric time cards certified by HR Head. SSS, PhilHealth, and Pag-IBIG withholding reconciled.',
    };
  }

  if (desc.toLowerCase().includes('suspicious') || desc.toLowerCase().includes('terminated')) {
    return {
      title: 'OUT-OF-POLICY REIMBURSEMENT CLAIM (UNVERIFIED)',
      docNumber: `CLAIM-AUDIT-${tx.transactionCode.slice(-6)}`,
      issuerName: 'Individual Claimant (Account Terminated)',
      issuerTin: 'TIN: UNREGISTERED / NOT ON FILE',
      issuerAddress: 'Unknown Residential Address',
      payeeAccount: 'Personal GCash / Wire Transfer',
      paymentTerm: 'Immediate Cash Advance Requested',
      items: [
        { description: 'Unitemized Representation & Miscellaneous Travel Expenses', qty: 1, unitPrice: 520000, total: 520000 }
      ],
      subtotal: 520000,
      vatAmount: 0,
      totalAmount: amount || 520000,
      isAnomaly: true,
      anomalyReason: tx.aiAnomalyReason || 'Missing official BIR registered receipts; employee status marked terminated.',
      verificationNotes: 'CRITICAL AUDIT NOTICE: Fails Anti-Fraud Rule #104. No supervisor authorization attached.',
    };
  }

  if (desc.toLowerCase().includes('steel') || desc.toLowerCase().includes('offshore')) {
    return {
      title: 'PROFORMA IMPORT BILLING (OVERSEAS TRADER)',
      docNumber: `IMPORT-EXP-${tx.transactionCode.slice(-6)}`,
      issuerName: 'Offshore Steel Logistics Ltd. (Foreign Unverified)',
      issuerTin: 'Non-Resident Foreign Entity',
      issuerAddress: 'Overseas Freeport Zone, International Port',
      payeeAccount: 'Cross-Border Wire Transfer',
      paymentTerm: 'Telegraphic Transfer (Advance Deposit)',
      items: [
        { description: 'Containerized Deformed Steel Rebar 16mm (Grade 60)', qty: 1, unitPrice: 1200000, total: 1200000 }
      ],
      subtotal: 1200000,
      vatAmount: 0,
      totalAmount: amount || 1200000,
      isAnomaly: true,
      anomalyReason: tx.aiAnomalyReason || 'Unaccredited supplier; exceeds single-source threshold without board approval.',
      verificationNotes: 'COMPLIANCE HOLD: Tariff declaration and Bureau of Customs clearance missing.',
    };
  }

  if (desc.toLowerCase().includes('fuel') || desc.toLowerCase().includes('diesel')) {
    return {
      title: 'FLEET FUEL CARD BILLING STATEMENT',
      docNumber: `SHELL-FLEET-${tx.transactionCode.slice(-6)}`,
      issuerName: 'Pilipinas Shell Petroleum Corp.',
      issuerTin: 'TIN: 000-164-755-000',
      issuerAddress: 'Shell House, 156 Valero St., Makati City',
      payeeAccount: 'Metrobank Auto-Debit Fleet Agreement',
      paymentTerm: 'Due Upon Receipt',
      items: [
        { description: 'Automotive Diesel (6 Isuzu Forward Delivery Trucks, 600 Liters)', qty: 600, unitPrice: 70, total: 42000 }
      ],
      subtotal: 37500,
      vatAmount: 4500,
      totalAmount: amount || 42000,
      isAnomaly: false,
      verificationNotes: 'Odometer logs and delivery route trip tickets verified by Logistics Dispatcher.',
    };
  }

  if (desc.toLowerCase().includes('rent') || desc.toLowerCase().includes('warehouse')) {
    return {
      title: 'COMMERCIAL LEASE STATEMENT & BILLING',
      docNumber: `RENT-2026-${tx.transactionCode.slice(-6)}`,
      issuerName: 'Grand Prime Properties & Industrial Warehouses Corp.',
      issuerTin: 'TIN: 204-512-990-000',
      issuerAddress: 'Compound 8, C5 Mindanao Ave. Ext., Quezon City',
      payeeAccount: 'BDO Corporate Checking Account',
      paymentTerm: 'Monthly Recurring (Contract #LEASE-2024-2027)',
      items: [
        { description: 'Warehouse Unit 4-B Rental (2,000 sq.m. storage & staging)', qty: 1, unitPrice: 150000, total: 150000 }
      ],
      subtotal: 133928.57,
      vatAmount: 16071.43,
      totalAmount: amount || 150000,
      isAnomaly: false,
      verificationNotes: 'Matches notarized lease contract on file with Legal Department.',
    };
  }

  // Generic Professional Default
  return {
    title: 'COMMERCIAL INVOICE & SUPPORTING TRANSACTION VOUCHER',
    docNumber: `VCH-${tx.transactionCode}`,
    issuerName: tx.payeeAccount ? `Payee: ${tx.payeeAccount}` : 'Archon Nell Enterprise Transactions',
    issuerTin: 'TIN: 004-981-224-000-NV',
    issuerAddress: 'Archon Nell Commercial Hub, West Service Road, Metro Manila',
    payeeAccount: 'Corporate Settlement Account',
    paymentTerm: 'Immediate / Verified Terms',
    items: [
      { description: desc || 'Commercial procurement and operations disbursement', qty: 1, unitPrice: subtotal, total: subtotal }
    ],
    subtotal,
    vatAmount: tax,
    totalAmount: amount,
    isAnomaly,
    anomalyReason: tx.aiAnomalyReason,
    verificationNotes: isAnomaly
      ? 'AI Anomaly Detected: Requires secondary manual verification.'
      : 'Electronic receipt data verified by Financial Transaction Core.',
  };
}

export const SupportingDocumentModal: React.FC<SupportingDocumentModalProps> = ({
  tx,
  onClose,
  onApprove,
  onReject,
  isActionable = false,
  isProcessing = false,
}) => {
  const doc = buildDocumentDetails(tx);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-900 dark:text-slate-100 transition-colors">
        
        {/* ── Top Bar Controls ── */}
        <div className="bg-slate-100 dark:bg-slate-800/90 px-5 py-3 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <FileCheck2 size={18} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                Voucher & Supporting Document Preview
              </h3>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Ref: {tx.transactionCode} &bull; {tx.externalModule}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer text-xs flex items-center gap-1 font-semibold"
              title="Print Document"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Official Printable Document Canvas ── */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-xs bg-slate-50/50 dark:bg-slate-950/40">
          
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 dark:border-slate-700 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-indigo-700 dark:text-indigo-400">
                  ARCHON NELL INCORPORATED
                </span>
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  ERP Certified
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                Construction Materials, Hardware & Heavy Industrial Supplies
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-500">
                Km. 23 West Service Road, Metro Manila Distribution Hub &bull; TIN: 004-981-224-000-NV
              </p>
            </div>

            <div className="sm:text-right space-y-1 shrink-0">
              <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${
                doc.isAnomaly
                  ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
              }`}>
                {doc.isAnomaly ? 'AUDIT HOLD / FLAGGED' : '3-WAY MATCH CLEARED'}
              </span>
              <p className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                {doc.docNumber}
              </p>
              <p className="text-[10px] text-slate-500">
                Date: {new Date(tx.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Document Title Banner */}
          <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Document Type</p>
              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{doc.title}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Category & Origin</p>
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                {tx.externalModule} &bull; {tx.categoryType}
              </p>
            </div>
          </div>

          {/* Issuer / Vendor & Billing Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payee / Issuer</p>
              <p className="text-xs font-bold text-slate-900 dark:text-white">{doc.issuerName}</p>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{doc.issuerTin}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{doc.issuerAddress}</p>
            </div>
            <div className="space-y-1 sm:text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment & Bank Details</p>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{doc.payeeAccount}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Payment Term: <strong className="text-slate-700 dark:text-slate-300">{doc.paymentTerm}</strong></p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Currency: <strong className="font-mono text-slate-700 dark:text-slate-300">{tx.currency || 'PHP'}</strong></p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div className="p-3 bg-slate-100 dark:bg-slate-750 font-semibold text-[11px] text-slate-700 dark:text-slate-300 grid grid-cols-12 gap-2 border-b border-slate-200 dark:border-slate-700">
              <div className="col-span-6 sm:col-span-7">Item Description</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-2 text-right">Unit Price</div>
              <div className="col-span-2 sm:col-span-1 text-right">Total</div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700/60 font-mono text-xs">
              {doc.items.map((item, idx) => (
                <div key={idx} className="p-3 grid grid-cols-12 gap-2 items-center hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="col-span-6 sm:col-span-7 font-sans font-medium text-slate-800 dark:text-slate-200">
                    {item.description}
                  </div>
                  <div className="col-span-2 text-right text-slate-600 dark:text-slate-400">
                    {item.qty}
                  </div>
                  <div className="col-span-2 text-right text-slate-600 dark:text-slate-400">
                    ₱{item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="col-span-2 sm:col-span-1 text-right font-bold text-slate-900 dark:text-white">
                    ₱{item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>

            {/* Total Computation Box */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-700 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal (Net of Tax):</span>
                <span>₱{doc.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Value-Added Tax (12% VAT):</span>
                <span>₱{doc.vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                <span className="font-sans">Grand Total Voucher Amount:</span>
                <span className="text-indigo-600 dark:text-indigo-400">
                  ₱{doc.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Compliance & Verification Stamp Box */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            doc.isAnomaly
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
          }`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide">
                {doc.isAnomaly ? <AlertTriangle size={16} className="text-rose-600" /> : <ShieldCheck size={16} className="text-emerald-600" />}
                <span>Internal Control & Compliance Status</span>
              </div>
              <p className="text-xs leading-relaxed opacity-90">
                {doc.verificationNotes}
              </p>
              {doc.isAnomaly && doc.anomalyReason && (
                <p className="text-xs font-semibold text-rose-700 dark:text-rose-300 mt-1">
                  AI Reason: {doc.anomalyReason}
                </p>
              )}
            </div>

            <div className="shrink-0 text-right sm:border-l sm:pl-4 border-slate-300 dark:border-slate-700">
              <p className="text-[10px] uppercase font-bold text-slate-500">AI Confidence</p>
              <p className="text-lg font-bold font-mono">
                {Math.round(tx.aiConfidenceScore * 100)}%
              </p>
            </div>
          </div>
        </div>

        {/* ── Bottom Modal Actions ── */}
        <div className="bg-slate-100 dark:bg-slate-800/90 px-5 py-3.5 border-t border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-xl border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer"
          >
            Close Document
          </button>

          {isActionable && onApprove && onReject && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onReject}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                Reject Voucher
              </button>

              <button
                type="button"
                onClick={onApprove}
                disabled={isProcessing}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <span>Posting to GL...</span>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Approve & Post to General Ledger</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default SupportingDocumentModal;
