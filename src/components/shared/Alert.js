import React from 'react';

const VARIANT_STYLES = {
  error: 'bg-rose-900/30 border-rose-600/50 text-rose-300',
  success: 'bg-emerald-900/30 border-emerald-600/50 text-emerald-300',
  info: 'bg-sky-900/30 border-sky-600/50 text-sky-300',
  warning: 'bg-amber-900/30 border-amber-600/50 text-amber-300',
};

export function Alert({ variant = 'error', icon: Icon, children, className = '' }) {
  return (
    <div className={`rounded-lg border p-4 ${VARIANT_STYLES[variant]} ${className}`}>
      <div className="flex items-start gap-3">
        {Icon && <Icon className="h-5 w-5 shrink-0 mt-0.5" />}
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}
