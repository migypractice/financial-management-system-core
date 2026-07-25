import React from 'react';
import ProgressBar from '../../components/ui/ProgressBar';

/**
 * Budget Management Module
 * Tracks departmental budget allocations, consumption, and variances.
 */

interface DepartmentBudget {
  id: string;
  department: string;
  allocated: number;
  consumed: number;
  pending: number; // Encumbered but not yet paid
}

export const BudgetPage: React.FC = () => {
  const budgets: DepartmentBudget[] = [
    { id: 'bud-01', department: 'Human Resources (HRMS)', allocated: 12000000, consumed: 8450000, pending: 145000 },
    { id: 'bud-02', department: 'Supply Chain & Procurement', allocated: 25000000, consumed: 18200000, pending: 685000 },
    { id: 'bud-03', department: 'Fleet & Logistics', allocated: 5000000, consumed: 4100000, pending: 124500 },
    { id: 'bud-04', department: 'Facilities & Legal', allocated: 8000000, consumed: 2500000, pending: 95000 },
    { id: 'bud-05', department: 'IT & Infrastructure', allocated: 3500000, consumed: 3400000, pending: 45000 },
    { id: 'bud-06', department: 'E-Commerce Marketing', allocated: 6000000, consumed: 1200000, pending: 0 },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-full space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Budget Management</h1>
        <p className="text-sm text-slate-500 mt-0.5">Departmental allocations, encumbrances, and variance alerts (FY 2026).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {budgets.map((b) => {
          const totalUtilized = b.consumed + b.pending;
          const remaining = b.allocated - totalUtilized;
          const pct = (totalUtilized / b.allocated) * 100;
          const isWarning = pct > 90;

          return (
            <div key={b.id} className={`bg-white rounded-xl border p-5 ${isWarning ? 'border-red-200 shadow-sm' : 'border-gray-150'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-800">{b.department}</h3>
                {isWarning && (
                  <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold uppercase rounded border border-red-100">
                    Nearing Limit
                  </span>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <ProgressBar value={totalUtilized} max={b.allocated} size="md" />
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500 mb-1">Allocated</p>
                    <p className="font-mono font-bold text-slate-900">PHP {(b.allocated / 1000000).toFixed(1)}M</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1">Utilized</p>
                    <p className="font-mono font-semibold text-slate-700">PHP {(totalUtilized / 1000000).toFixed(1)}M</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500 mb-1">Remaining</p>
                    <p className={`font-mono font-bold ${isWarning ? 'text-red-600' : 'text-emerald-600'}`}>
                      PHP {(remaining / 1000000).toFixed(1)}M
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BudgetPage;
