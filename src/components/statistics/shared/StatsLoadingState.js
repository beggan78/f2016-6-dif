import React from 'react';

/**
 * StatsLoadingState Component
 *
 * Reusable loading state display for statistics views.
 * Shows a centered loading message with consistent styling.
 *
 * @param {Object} props
 * @param {string} [props.message] - Loading message to display
 */
export function StatsLoadingState({ message = 'Loading statistics...' }) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-700 p-8 rounded-lg border border-slate-600 text-center">
        <div className="text-slate-400">{message}</div>
      </div>
    </div>
  );
}
