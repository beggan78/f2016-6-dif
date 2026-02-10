import React from 'react';
import { Alert } from '../../shared/Alert';

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
      <Alert variant="error">
        <div className="text-center">
          <div className="mb-2 font-medium">{title}</div>
          <div className="text-sm opacity-80">{message}</div>
        </div>
      </Alert>
    </div>
  );
}
