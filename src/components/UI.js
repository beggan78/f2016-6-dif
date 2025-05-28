import React from 'react';
import { ChevronDown } from 'lucide-react';

export function Select({ value, onChange, options, placeholder, id, disabled }) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full appearance-none bg-slate-600 border border-slate-500 text-slate-100 py-1.5 px-2.5 pr-7 rounded-md leading-tight focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          typeof opt === 'object' ?
            <option key={opt.value} value={opt.value}>{opt.label}</option> :
            <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
        <ChevronDown size={18} />
      </div>
    </div>
  );
}

export function Button({ onClick, children, Icon, variant = 'primary', size = 'md', disabled = false, className = '' }) {
  const baseStyle = "font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-150 ease-in-out flex items-center justify-center space-x-2";

  const sizeStyles = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base"
  };

  const variantStyles = {
    primary: `bg-sky-600 hover:bg-sky-500 text-white focus:ring-sky-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    secondary: `bg-slate-600 hover:bg-slate-500 text-sky-100 focus:ring-slate-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    danger: `bg-rose-600 hover:bg-rose-500 text-white focus:ring-rose-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {Icon && <Icon className={`h-4 w-4 ${size === 'lg' ? 'h-5 w-5' : ''}`} />}
      <span>{children}</span>
    </button>
  );
}