import React from 'react';

/**
 * StatsErrorState Component
 *
 * Reusable error state display for statistics views.
 * Shows an error title and message with consistent styling.
 *
 * @param {Object} props
 * @param {string} props.title - Error title
 * @param {string} props.message - Error message details
 */
export function StatsErrorState({ title, message }) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-700 p-8 rounded-lg border border-slate-600 text-center">
        <div className="text-red-400 mb-2">{title}</div>
        <div className="text-slate-400 text-sm">{message}</div>
      </div>
    </div>
  );
}
