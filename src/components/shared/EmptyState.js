import React from 'react';

export function EmptyState({ icon: Icon, title, message, actions, className = '' }) {
  return (
    <div className={`bg-slate-700 p-8 rounded-lg border border-slate-600 text-center ${className}`}>
      {Icon && <Icon className="h-12 w-12 text-slate-500 mx-auto mb-4" />}
      <div className="text-slate-400">{title}</div>
      {message && (
        typeof message === 'string' ? (
          <p className="text-slate-500 text-sm mt-2">{message}</p>
        ) : (
          <div className="mt-2">{message}</div>
        )
      )}
      {actions && <div className="mt-4 flex justify-center">{actions}</div>}
    </div>
  );
}
