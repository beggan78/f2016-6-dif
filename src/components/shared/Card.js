import React from 'react';

const VARIANT_STYLES = {
  default: 'bg-slate-700 border-slate-600',
  dark: 'bg-slate-800 border-slate-600',
  highlighted: 'bg-sky-900/30 border-sky-600/50',
  subtle: 'bg-slate-700/50 border-slate-600',
};

const PADDING_STYLES = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({ variant = 'default', padding = 'md', className = '', children }) {
  return (
    <div className={`rounded-lg border ${VARIANT_STYLES[variant]} ${PADDING_STYLES[padding]} ${className}`}>
      {children}
    </div>
  );
}
