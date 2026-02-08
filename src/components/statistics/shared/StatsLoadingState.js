import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * StatsLoadingState Component
 *
 * Reusable loading state display for statistics views.
 * Shows a centered loading message with consistent styling.
 *
 * @param {Object} props
 * @param {string} [props.message] - Loading message to display
 */
export function StatsLoadingState({ message }) {
  const { t } = useTranslation('statistics');
  const displayMessage = message || t('loading');
  return (
    <div className="space-y-6">
      <div className="bg-slate-700 p-8 rounded-lg border border-slate-600 text-center">
        <div className="text-slate-400">{displayMessage}</div>
      </div>
    </div>
  );
}
