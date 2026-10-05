import React from 'react';
import { Check, X } from 'lucide-react';
import { getPasswordChecks, getPasswordStrength, StrengthLevel } from '../../utils/securityRules';

const LEVELS: Record<StrengthLevel, { label: string; width: string; bar: string; text: string }> = {
  empty:  { label: '',        width: 'w-0',    bar: 'bg-slate-200',   text: 'text-slate-400' },
  weak:   { label: 'Weak',    width: 'w-1/4',  bar: 'bg-red-500',     text: 'text-red-600' },
  fair:   { label: 'Fair',    width: 'w-2/4',  bar: 'bg-amber-500',   text: 'text-amber-600' },
  good:   { label: 'Good',    width: 'w-3/4',  bar: 'bg-blue-500',    text: 'text-blue-600' },
  strong: { label: 'Strong',  width: 'w-full', bar: 'bg-emerald-500', text: 'text-emerald-600' },
};

export const PasswordStrength: React.FC<{ password: string }> = ({ password }) => {
  const level = LEVELS[getPasswordStrength(password)];
  const checks = getPasswordChecks(password);

  return (
    <div className="mt-2 space-y-2" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-300 ${level.width} ${level.bar}`} />
        </div>
        <span className={`text-xs font-semibold w-12 text-right ${level.text}`}>{level.label}</span>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
        {checks.map((c) => (
          <li key={c.id} className={`flex items-center gap-1.5 text-xs ${c.passed ? 'text-emerald-600' : 'text-slate-500 dark:text-slate-400'}`}>
            {c.passed ? <Check size={12} /> : <X size={12} />}
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PasswordStrength;
