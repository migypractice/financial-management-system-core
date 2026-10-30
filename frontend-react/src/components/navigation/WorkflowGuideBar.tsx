import React from 'react';
import { 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  Send, 
  ArrowRight, 
  Receipt, 
  DollarSign, 
  Landmark, 
  BookOpen 
} from 'lucide-react';

export interface WorkflowGuideBarProps {
  flow: 'PAYABLES' | 'RECEIVABLES';
  currentStep: 1 | 2 | 3 | 4;
  onNavigate?: (path: string) => void;
  className?: string;
}

export const WorkflowGuideBar: React.FC<WorkflowGuideBarProps> = ({
  flow,
  currentStep,
  onNavigate,
  className = '',
}) => {
  const steps = flow === 'PAYABLES' ? [
    {
      step: 1,
      title: '1. Receive Bill',
      path: '/ap',
      icon: FileText,
      description: 'Record vendor invoice',
    },
    {
      step: 2,
      title: '2. AI Audit & Queue Voucher',
      path: '/ap',
      icon: Sparkles,
      description: 'Audit guard check & queue',
    },
    {
      step: 3,
      title: '3. Approve Voucher',
      path: '/disbursements',
      icon: CheckCircle2,
      description: 'Maker-checker sign-off',
    },
    {
      step: 4,
      title: '4. Release Bank Payment',
      path: '/cash',
      secondaryPath: '/gl',
      icon: Send,
      description: 'Treasury payout & GL post',
    },
  ] : [
    {
      step: 1,
      title: '1. Issue Invoice',
      path: '/ar',
      icon: FileText,
      description: 'Bill customer & terms',
    },
    {
      step: 2,
      title: '2. Collect Payment',
      path: '/collections',
      icon: Receipt,
      description: 'Deposit & official receipt',
    },
    {
      step: 3,
      title: '3. Credit Bank Account',
      path: '/cash',
      icon: Landmark,
      description: 'Treasury cash increment',
    },
    {
      step: 4,
      title: '4. Auto-Post VAT & GL',
      path: '/gl',
      secondaryPath: '/tax',
      icon: BookOpen,
      description: 'Balanced double-entry',
    },
  ];

  const flowTitle = flow === 'PAYABLES' ? 'Payables & Payout Lifecycle' : 'Receivables & Inflow Lifecycle';

  return (
    <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 shadow-xs ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
            flow === 'PAYABLES' 
              ? 'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
          }`}>
            {flowTitle}
          </span>
        </div>

        {/* 4 Steps Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1">
          {steps.map((s, index) => {
            const isActive = currentStep === s.step;
            const isCompleted = currentStep > s.step;
            const Icon = s.icon;

            return (
              <button
                key={s.step}
                type="button"
                onClick={() => onNavigate?.(s.path)}
                className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                  isActive
                    ? flow === 'PAYABLES'
                      ? 'bg-orange-50/80 border-orange-300 dark:bg-orange-950/40 dark:border-orange-700 text-orange-900 dark:text-orange-200 shadow-xs ring-1 ring-orange-400/40'
                      : 'bg-emerald-50/80 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 shadow-xs ring-1 ring-emerald-400/40'
                    : isCompleted
                    ? 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750'
                }`}
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-xs font-bold ${
                  isActive
                    ? flow === 'PAYABLES'
                      ? 'bg-orange-600 text-white'
                      : 'bg-emerald-600 text-white'
                    : isCompleted
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    : 'bg-slate-100 dark:bg-slate-700/50 text-slate-400'
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold truncate leading-tight">
                    {s.title}
                  </p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate leading-tight">
                    {s.description}
                  </p>
                </div>

                {index < 3 && (
                  <ArrowRight className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0 hidden md:block" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WorkflowGuideBar;
