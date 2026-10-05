import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileCheck,
  Send,
  ShieldAlert,
  Activity
} from 'lucide-react';

export type FinancialStatus =
  | 'approved'
  | 'APPROVED'
  | 'posted'
  | 'POSTED'
  | 'pending'
  | 'PENDING'
  | 'pending_approval'
  | 'ai_flagged'
  | 'FLAGGED'
  | 'rejected'
  | 'REJECTED'
  | 'disbursed'
  | 'DISBURSED'
  | 'paid'
  | 'PAID'
  | 'unpaid'
  | 'UNPAID'
  | 'partial'
  | 'PARTIAL'
  | 'overdue'
  | 'OVERDUE'
  | 'operational'
  | 'OPERATIONAL';

interface StatusBadgeProps {
  status: FinancialStatus | string;
  size?: 'sm' | 'md';
  customLabel?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'sm',
  customLabel,
  className = '',
}) => {
  const norm = String(status).toLowerCase();

  let label = customLabel || status;
  let bg = 'bg-slate-100 dark:bg-slate-800';
  let text = 'text-slate-700 dark:text-slate-300';
  let border = 'border-slate-200 dark:border-slate-700';
  let dot = 'bg-slate-400';
  let icon: React.ReactNode = null;

  switch (norm) {
    case 'approved':
      label = customLabel || 'Approved';
      bg = 'bg-emerald-50 dark:bg-emerald-950/40';
      text = 'text-emerald-700 dark:text-emerald-400';
      border = 'border-emerald-200 dark:border-emerald-800/60';
      dot = 'bg-emerald-500';
      icon = <CheckCircle2 size={11} className="shrink-0" />;
      break;

    case 'posted':
      label = customLabel || 'Posted to GL';
      bg = 'bg-blue-50 dark:bg-blue-950/40';
      text = 'text-blue-700 dark:text-blue-400';
      border = 'border-blue-200 dark:border-blue-800/60';
      dot = 'bg-blue-500';
      icon = <FileCheck size={11} className="shrink-0" />;
      break;

    case 'pending':
    case 'pending_approval':
      label = customLabel || 'Pending Review';
      bg = 'bg-amber-50 dark:bg-amber-950/40';
      text = 'text-amber-700 dark:text-amber-400';
      border = 'border-amber-200 dark:border-amber-800/60';
      dot = 'bg-amber-500';
      icon = <Clock size={11} className="shrink-0" />;
      break;

    case 'ai_flagged':
    case 'flagged':
      label = customLabel || 'AI Flagged';
      bg = 'bg-rose-50 dark:bg-rose-950/40';
      text = 'text-rose-700 dark:text-rose-400';
      border = 'border-rose-200 dark:border-rose-800/60';
      dot = 'bg-rose-500';
      icon = <AlertTriangle size={11} className="shrink-0" />;
      break;

    case 'rejected':
      label = customLabel || 'Rejected';
      bg = 'bg-slate-100 dark:bg-slate-800';
      text = 'text-slate-600 dark:text-slate-400';
      border = 'border-slate-200 dark:border-slate-700';
      dot = 'bg-slate-400';
      icon = <XCircle size={11} className="shrink-0" />;
      break;

    case 'disbursed':
      label = customLabel || 'Disbursed';
      bg = 'bg-indigo-50 dark:bg-indigo-950/40';
      text = 'text-indigo-700 dark:text-indigo-400';
      border = 'border-indigo-200 dark:border-indigo-800/60';
      dot = 'bg-indigo-500';
      icon = <Send size={11} className="shrink-0" />;
      break;

    case 'paid':
      label = customLabel || 'Paid';
      bg = 'bg-emerald-50 dark:bg-emerald-950/40';
      text = 'text-emerald-700 dark:text-emerald-400';
      border = 'border-emerald-200 dark:border-emerald-800/60';
      dot = 'bg-emerald-500';
      icon = <CheckCircle2 size={11} className="shrink-0" />;
      break;

    case 'unpaid':
      label = customLabel || 'Unpaid';
      bg = 'bg-amber-50 dark:bg-amber-950/40';
      text = 'text-amber-700 dark:text-amber-400';
      border = 'border-amber-200 dark:border-amber-800/60';
      dot = 'bg-amber-500';
      icon = <Clock size={11} className="shrink-0" />;
      break;

    case 'partial':
      label = customLabel || 'Partial';
      bg = 'bg-sky-50 dark:bg-sky-950/40';
      text = 'text-sky-700 dark:text-sky-400';
      border = 'border-sky-200 dark:border-sky-800/60';
      dot = 'bg-sky-500';
      icon = <Activity size={11} className="shrink-0" />;
      break;

    case 'overdue':
    case 'critical':
      label = customLabel || 'Overdue';
      bg = 'bg-red-50 dark:bg-red-950/40';
      text = 'text-red-700 dark:text-red-400';
      border = 'border-red-200 dark:border-red-800/60';
      dot = 'bg-red-500 animate-pulse';
      icon = <ShieldAlert size={11} className="shrink-0" />;
      break;

    case 'operational':
      label = customLabel || 'Operational';
      bg = 'bg-emerald-50 dark:bg-emerald-950/40';
      text = 'text-emerald-700 dark:text-emerald-400';
      border = 'border-emerald-200 dark:border-emerald-800/60';
      dot = 'bg-emerald-500 animate-pulse';
      icon = null;
      break;

    default:
      break;
  }

  const paddingClass = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border shadow-xs tracking-tight ${paddingClass} ${bg} ${text} ${border} ${className}`}
    >
      {icon || <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />}
      <span className="truncate">{label}</span>
    </span>
  );
};

export default StatusBadge;
