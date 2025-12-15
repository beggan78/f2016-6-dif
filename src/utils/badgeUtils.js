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
const DEFAULT_FORMAT_BASE = 'inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium w-14 text-center';

const FORMAT_VARIANTS = {
  '5v5': 'bg-emerald-900/50 text-emerald-200 border border-emerald-600',
  '7v7': 'bg-blue-900/50 text-blue-200 border border-blue-600',
  default: 'bg-slate-700 text-slate-200 border border-slate-600'
};

export function getOutcomeBadgeClasses(outcome, { baseClasses = DEFAULT_OUTCOME_BASE } = {}) {
  const variant = OUTCOME_VARIANTS[outcome] || OUTCOME_VARIANTS.default;
  return `${baseClasses} ${variant}`.trim();
}

export function getMatchTypeBadgeClasses(type, { baseClasses = DEFAULT_TYPE_BASE } = {}) {
  const variant = TYPE_VARIANTS[type] || TYPE_VARIANTS.default;
  return `${baseClasses} ${variant}`.trim();
}

export function getFormatBadgeClasses(format, { baseClasses = DEFAULT_FORMAT_BASE } = {}) {
  const formatKey = typeof format === 'string' ? format.toLowerCase() : format;
  const variant = FORMAT_VARIANTS[formatKey] || FORMAT_VARIANTS.default;
  return `${baseClasses} ${variant}`.trim();
}
