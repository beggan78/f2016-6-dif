import React from 'react';
import { BarChart3, ArrowLeft } from 'lucide-react';
import { Button } from '../shared/UI';

/**
 * ReportNavigation - Navigation controls for the match report header
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onNavigateToStats - Callback for navigating to stats screen
 * @param {Function} props.onNavigateBack - Callback for general back navigation
 * @param {string} props.className - Optional additional CSS classes
 */
export function ReportNavigation({
  onNavigateToStats,
  onNavigateBack,
  className = ""
}) {
  // Don't render if no navigation callbacks are provided
  if (!onNavigateToStats && !onNavigateBack) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 mb-4 ${className}`.trim()}>
      {onNavigateBack && (
        <Button 
          onClick={() => onNavigateBack()} 
          variant="secondary" 
          Icon={ArrowLeft}
          size="sm"
          data-testid="button-back"
        >
          Back
        </Button>
      )}
      {onNavigateToStats && (
        <Button 
          onClick={onNavigateToStats} 
          variant="secondary" 
          Icon={BarChart3}
          size="sm"
          data-testid="button-quick-stats"
        >
          Quick Stats
        </Button>
      )}

    </div>
  );
}