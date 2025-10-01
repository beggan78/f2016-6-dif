const OUTCOME_VARIANTS = {
  W: 'bg-emerald-900/50 text-emerald-300 border border-emerald-600',
  D: 'bg-slate-700 text-slate-300 border border-slate-600',
  L: 'bg-rose-900/50 text-rose-300 border border-rose-600',
  default: 'bg-slate-700 text-slate-300'
};

const TYPE_VARIANTS = {
  League: 'bg-sky-900/50 text-sky-300 border border-sky-600',
  Cup: 'bg-purple-900/50 text-purple-300 border border-purple-600',
  Friendly: 'bg-slate-700 text-slate-300 border border-slate-600',
  default: 'bg-slate-700 text-slate-300'
};

const DEFAULT_OUTCOME_BASE = 'inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium w-12 text-center';
const DEFAULT_TYPE_BASE = 'inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium w-20 text-center';

export function getOutcomeBadgeClasses(outcome, { baseClasses = DEFAULT_OUTCOME_BASE } = {}) {
  const variant = OUTCOME_VARIANTS[outcome] || OUTCOME_VARIANTS.default;
  return `${baseClasses} ${variant}`.trim();
}

export function getMatchTypeBadgeClasses(type, { baseClasses = DEFAULT_TYPE_BASE } = {}) {
  const variant = TYPE_VARIANTS[type] || TYPE_VARIANTS.default;
  return `${baseClasses} ${variant}`.trim();
}
