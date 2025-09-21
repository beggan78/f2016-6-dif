import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../shared/UI';

/**
 * ReportNavigation - Navigation controls for the match report header
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onNavigateBack - Callback for general back navigation
 * @param {string} props.className - Optional additional CSS classes
 */
export function ReportNavigation({
  onNavigateBack,
  className = ""
}) {
  // Don't render if no navigation callback is provided
  if (!onNavigateBack) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 mb-4 ${className}`.trim()}>
      <Button
        onClick={() => onNavigateBack()}
        variant="secondary"
        Icon={ArrowLeft}
        size="sm"
        data-testid="button-back"
      >
        Back
      </Button>
    </div>
  );
}
