import React from 'react';

const VARIANT_STYLES = {
  default: 'text-slate-400 hover:text-slate-200',
  danger: 'text-slate-400 hover:text-rose-400',
};

const SIZE_STYLES = {
  sm: 'p-1',
  md: 'p-2',
};

const ICON_SIZE_STYLES = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
};

export function IconButton({ onClick, icon: Icon, label, variant = 'default', size = 'md', disabled = false, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`rounded transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800 ${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {Icon && <Icon className={ICON_SIZE_STYLES[size]} />}
    </button>
  );
}
