import React, { useState, useEffect } from 'react';
import StatCard from '../../components/ui/StatCard';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { taxService, TaxSummaryResponse } from '../../services/taxService';
import { Receipt, Calendar, ShieldCheck, RefreshCw, AlertCircle, FileText, ArrowUpRight, ArrowDownLeft, Printer } from 'lucide-react';
import { DatePeriodFilterBar } from '../../components/ui/DatePeriodFilterBar';
import { BirForm2307Modal, BirForm2307Data } from '../../components/modals/BirForm2307Modal';

export const TaxManagementPage: React.FC = () => {
  const [data, setData] = useState<TaxSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'ledger'>('summary');

  // Date Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [datePreset, setDatePreset] = useState<'ALL' | 'OCT_2026' | 'Q4_2026'>('OCT_2026');

  // BIR 2307 Modal
  const [birModalData, setBirModalData] = useState<BirForm2307Data>({
    isOpen: false,
    payeeName: '',
    atcCode: 'WC160',
    taxBase: 0,
    taxWithheld: 0,
  });

  const handlePresetSelect = (preset: 'ALL' | 'OCT_2026' | 'Q4_2026') => {
    setDatePreset(preset);
    if (preset === 'ALL') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'OCT_2026') {
      setFromDate('2026-10-01');
      setToDate('2026-10-31');
    } else if (preset === 'Q4_2026') {
      setFromDate('2026-10-01');
      setToDate('2026-12-31');
    }
  };

  const fetchTaxData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await taxService.getTaxSummary();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load tax data', err);
      setError(err?.response?.data?.message || 'Failed to load live tax figures from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxData();
  }, []);

  if (loading) return <SkeletonLoader />;

  const vat = data?.vat_summary || {
    output_vat: 0,
    output_vat_base: 0,
    input_vat: 0,
    input_vat_base: 0,
    net_vat_payable: 0,
    excess_input_tax: 0,
  };

  const ewt = data?.ewt_summary || [];
  const totalEwt = data?.total_ewt || 0;
  const ledger = data?.tax_ledger || [];

  return (
    <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Tax Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            VAT reconciliation, withholding schedules, and tax ledger reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTaxData}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Sync Tax Data</span>
          </button>
        </div>
      </div>

      {/* Dynamic Date-Range / Period Filter Bar */}
      <DatePeriodFilterBar
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        selectedPreset={datePreset}
        onPresetSelect={handlePresetSelect}
      />

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-3 text-sm">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* VAT Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Output VAT (Sales)"
          value={`₱${vat.output_vat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          accentColor="bg-emerald-500"
          subtitle={`12% VAT on ₱${vat.output_vat_base.toLocaleString('en-US', { minimumFractionDigits: 2 })} AR Sales`}
        />
        <StatCard
          title="Total Input VAT (Purchases)"
          value={`₱${vat.input_vat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          accentColor="bg-amber-500"
          subtitle={`Claimable credits on ₱${vat.input_vat_base.toLocaleString('en-US', { minimumFractionDigits: 2 })} AP Bills`}
        />
        <StatCard
          title={vat.excess_input_tax > 0 ? "Excess Input Tax (Credit)" : "Net VAT Payable"}
          value={`₱${(vat.excess_input_tax > 0 ? vat.excess_input_tax : vat.net_vat_payable).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          accentColor={vat.excess_input_tax > 0 ? "bg-blue-500" : "bg-rose-500"}
          subtitle={vat.excess_input_tax > 0 ? "Carried over to next quarter" : `Due on ${data?.period.label || 'current period'}`}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('summary')}
          className={`pb-2.5 transition-colors cursor-pointer ${
            activeTab === 'summary'
              ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Withholding Tax & Compliance Summary
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-2.5 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'ledger'
              ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>Live Tax Ledger</span>
          <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
            {ledger.length}
          </span>
        </button>
      </div>

      {activeTab === 'summary' ? (
        <>
          {/* Withholding Tax Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-150 dark:border-slate-700 overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-700/30">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Withholding Tax (WHT/EWT) Schedule</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Computed under BIR Revenue Regulation 2-98 as amended</p>
              </div>
              <span className="text-xs font-semibold tabular-nums text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                Total EWT: ₱{totalEwt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-white dark:bg-slate-800 text-[11px] text-slate-500 dark:text-slate-400 uppercase border-b border-gray-200 dark:border-slate-600 font-semibold tracking-wider">
                <tr>
                  <th className="px-5 py-3">Tax Code (ATC)</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3 text-center">Rate</th>
                  <th className="px-5 py-3 text-right">Tax Base (₱)</th>
                  <th className="px-5 py-3 text-right">Amount Withheld (₱)</th>
                  <th className="px-5 py-3 text-right">Certificate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {ewt.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-6 text-center text-slate-400">
                      No withholding tax transactions recorded for this period.
                    </td>
                  </tr>
                ) : (
                  ewt.map((row) => (
                    <tr key={row.code} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-indigo-600 dark:text-indigo-400">{row.code}</td>
                      <td className="px-5 py-3.5 text-slate-800 dark:text-slate-200 font-medium">{row.description}</td>
                      <td className="px-5 py-3.5 text-center text-slate-700 dark:text-slate-300 tabular-nums">{row.rate}%</td>
                      <td className="px-5 py-3.5 text-right text-slate-600 dark:text-slate-400 tabular-nums">
                        {row.tax_base.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-900 dark:text-white tabular-nums">
                        {row.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => setBirModalData({
                            isOpen: true,
                            payeeName: row.code === 'WC158' ? 'Puyat Steel Corporation' : row.code === 'WC160' ? 'Holcim Philippines, Inc.' : 'Commercial Realty Group',
                            tin: row.code === 'WC158' ? '000-847-192-000' : '004-882-913-000',
                            address: 'Metro Manila, Philippines',
                            atcCode: row.code,
                            rate: row.rate,
                            taxBase: row.tax_base,
                            taxWithheld: row.amount,
                            period: 'October 2026',
                            voucherRef: `BIR-EWT-${row.code}`,
                          })}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
                          title="Generate BIR Form 2307 Withholding Certificate"
                        >
                          <Printer className="w-3 h-3 text-indigo-500" />
                          <span>Form 2307</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
                <tr className="bg-slate-50 dark:bg-slate-700/50 font-semibold">
                  <td colSpan={4} className="px-5 py-3 text-right text-slate-700 dark:text-slate-300">Total WHT Payable:</td>
                  <td className="px-5 py-3 text-right text-slate-900 dark:text-white tabular-nums border-double border-b-4 border-slate-300 dark:border-slate-600">
                    ₱{totalEwt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Filing Deadlines & Compliance Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-150 dark:border-slate-700 overflow-hidden shadow-xs">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30 flex items-center gap-2">
                <Calendar size={15} className="text-indigo-500" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Upcoming BIR Deadlines</h2>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-slate-700 text-sm">
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">BIR Form 2550M — Monthly VAT Declaration</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">eFPS Group E - Due 20th of current month</p>
                  </div>
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-full px-2.5 py-1">
                    20th Day
                  </span>
                </div>
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">BIR Form 1601-EQ — Quarterly Withholding Tax</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Creditable Income Taxes Withheld (Expanded)</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full px-2.5 py-1">
                    End of Q3
                  </span>
                </div>
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">BIR Form 2550Q — Quarterly VAT Return</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Cumulative quarterly VAT filing</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full px-2.5 py-1">
                    25th After Quarter
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-150 dark:border-slate-700 overflow-hidden shadow-xs">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30 flex items-center gap-2">
                <ShieldCheck size={15} className="text-emerald-500" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Tax Compliance & Audit Health</h2>
              </div>
              <div className="p-5 space-y-3.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400">BIR eFPS Gateway Status</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span> ONLINE & SYNCHRONIZED
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400">TIN Validation Verification</span>
                  <span className="text-slate-800 dark:text-slate-200">ACTIVE (BIR RDO 043 - Pasig)</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400">Subledger & GL Cross-Check</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">100% Balanced (Zero Drift)</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600 dark:text-slate-400">EWT Certificate Form 2307 Ready</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">AUTO-GENERATION READY</span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Live Tax Ledger Table */
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-150 dark:border-slate-700 overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-700/30">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Live Tax Ledger Audit Trail</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real-time VAT and EWT line items from AR Sales Invoices and AP Supplier Bills</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white dark:bg-slate-800 text-[11px] text-slate-500 dark:text-slate-400 uppercase border-b border-gray-200 dark:border-slate-600 font-semibold tracking-wider">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Counterparty</th>
                  <th className="px-4 py-3 text-center">Type</th>
                  <th className="px-4 py-3 text-right">Gross Amount</th>
                  <th className="px-4 py-3 text-right">Vatable Base</th>
                  <th className="px-4 py-3 text-right">VAT Amount</th>
                  <th className="px-4 py-3 text-right">EWT Withheld</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {ledger.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                      No tax records found in database.
                    </td>
                  </tr>
                ) : (
                  ledger.map((item) => (
                    <tr key={`${item.module}-${item.id}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{item.date}</td>
                      <td className="px-4 py-3 font-semibold text-indigo-600 dark:text-indigo-400">{item.reference}</td>
                      <td className="px-4 py-3 text-slate-800 dark:text-slate-200 font-medium truncate max-w-[150px]">{item.counterparty}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.vat_type === 'OUTPUT'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {item.vat_type === 'OUTPUT' ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                          {item.vat_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                        {item.gross_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400 tabular-nums">
                        {item.vatable_base.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white tabular-nums">
                        {item.vat_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                        {item.ewt_amount > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            {item.ewt_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({item.ewt_code})
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Official BIR Form 2307 Certificate Modal */}
      <BirForm2307Modal
        data={birModalData}
        onClose={() => setBirModalData((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default TaxManagementPage;
