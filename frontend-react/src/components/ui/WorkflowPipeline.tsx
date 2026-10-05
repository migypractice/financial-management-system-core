import React from 'react';
import { Send, Bot, CheckCircle, BookOpen, ArrowRight } from 'lucide-react';

interface WorkflowPipelineProps {
  currentStage?: 'TRANSACTION' | 'AI_EVALUATION' | 'MANAGER_APPROVAL' | 'GL_POSTING';
  compact?: boolean;
  className?: string;
}

const STAGES = [
  { id: 'TRANSACTION', label: 'External / System Txn', sub: 'Inbound / Outbound', icon: Send },
  { id: 'AI_EVALUATION', label: 'AI Evaluation', sub: 'Anomaly & GL Matching', icon: Bot },
  { id: 'MANAGER_APPROVAL', label: 'Manager Approval', sub: 'Maker-Checker Review', icon: CheckCircle },
  { id: 'GL_POSTING', label: 'General Ledger Posting', sub: 'Balanced Double-Entry', icon: BookOpen },
];

export const WorkflowPipeline: React.FC<WorkflowPipelineProps> = ({
  currentStage,
  compact = false,
  className = '',
}) => {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 p-3 sm:p-4 shadow-xs ${className}`}>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isActive = currentStage === stage.id;
          const isDone =
            currentStage === 'GL_POSTING' ||
            (currentStage === 'MANAGER_APPROVAL' && idx <= 1) ||
            (currentStage === 'AI_EVALUATION' && idx === 0);

          return (
            <React.Fragment key={stage.id}>
              <div
                className={`flex items-center gap-2.5 flex-1 min-w-0 p-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60'
                    : isDone
                    ? 'bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs scale-105'
                      : isDone
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                  }`}
                >
                  <Icon size={compact ? 13 : 15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-bold">
                      0{idx + 1}
                    </span>
                    <p className={`text-xs font-semibold truncate ${isActive ? 'text-indigo-950 dark:text-indigo-200' : 'text-slate-800 dark:text-slate-200'}`}>
                      {stage.label}
                    </p>
                  </div>
                  {!compact && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate hidden md:block">
                      {stage.sub}
                    </p>
                  )}
                </div>
              </div>

              {idx < STAGES.length - 1 && (
                <div className="hidden sm:flex items-center text-slate-300 dark:text-slate-600 shrink-0 px-0.5">
                  <ArrowRight size={14} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default WorkflowPipeline;
