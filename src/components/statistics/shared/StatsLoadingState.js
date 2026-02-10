import React from 'react';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '../../shared/LoadingSpinner';
import { Card } from '../../shared/Card';

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
      <Card padding="lg" className="text-center">
        <LoadingSpinner size="md" message={displayMessage} />
      </Card>
    </div>
  );
}
