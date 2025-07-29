import React from 'react';
import { BarChart3, ArrowLeft } from 'lucide-react';
import { Button } from '../shared/UI';

/**
 * ReportNavigation - Navigation controls for the match report header
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onNavigateToStats - Callback for navigating to stats screen
 * @param {Function} props.onBackToGame - Callback for navigating back to game screen
 * @param {string} props.className - Optional additional CSS classes
 */
export function ReportNavigation({
  onNavigateToStats,
  onBackToGame,
  className = ""
}) {
  // Don't render if no navigation callbacks are provided
  if (!onNavigateToStats && !onBackToGame) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 mb-4 ${className}`.trim()}>
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
      
      {onBackToGame && (
        <Button 
          onClick={onBackToGame} 
          variant="secondary" 
          Icon={ArrowLeft}
          size="sm"
          data-testid="button-back-to-game"
        >
          Back to Game
        </Button>
      )}
    </div>
  );
}