import React from 'react';
import { EmptyState } from '../../shared/EmptyState';

/**
 * StatsEmptyState Component
 *
 * Statistics-specific empty state display. Thin wrapper around the shared EmptyState component.
 *
 * @param {Object} props
 * @param {React.Component} [props.icon] - Optional Lucide icon component
 * @param {string} props.title - Empty state title
 * @param {string|React.Node} [props.message] - Optional message or React node
 * @param {React.Node} [props.actions] - Optional action buttons or elements
 */
export function StatsEmptyState(props) {
  return (
    <div className="space-y-6">
      <EmptyState {...props} />
    </div>
  );
}
