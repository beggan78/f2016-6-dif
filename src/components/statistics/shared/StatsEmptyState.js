import React from 'react';

/**
 * StatsEmptyState Component
 *
 * Reusable empty state display for statistics views.
 * Shows an optional icon, title, message, and optional action buttons.
 *
 * @param {Object} props
 * @param {React.Component} [props.icon] - Optional Lucide icon component
 * @param {string} props.title - Empty state title
 * @param {string|React.Node} [props.message] - Optional message or React node
 * @param {React.Node} [props.actions] - Optional action buttons or elements
 */
export function StatsEmptyState({ icon: Icon, title, message, actions }) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-700 p-8 rounded-lg border border-slate-600 text-center">
        {Icon && <Icon className="h-12 w-12 text-slate-500 mx-auto mb-4" />}
        <div className="text-slate-400">{title}</div>
        {message && (
          typeof message === 'string' ? (
            <p className="text-slate-500 text-sm mt-2">{message}</p>
          ) : (
            <div className="mt-2">{message}</div>
          )
        )}
        {actions && <div className="mt-4">{actions}</div>}
      </div>
    </div>
  );
}
