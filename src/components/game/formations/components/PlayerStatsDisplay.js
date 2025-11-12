import React from 'react';
import { Clock, Sword } from 'lucide-react';
import { formatTime, formatTimeDifference } from '../../../../utils/formatUtils';
import { ICON_STYLES } from '../constants';

/**
 * Reusable component for displaying player time stats
 * Used in individual formation components
 */
export function PlayerStatsDisplay({ playerId, getPlayerTimeStats, className = '' }) {
  if (!playerId) return null;
  
  const stats = getPlayerTimeStats(playerId);
  
  return (
    <div className={`text-right text-xs ${className}`}>
      <span>
        <Clock className={ICON_STYLES.small} /> 
        <span className="font-mono">{formatTime(stats.totalOutfieldTime)}</span>
      </span>
      <span className="ml-3">
        <Sword className={ICON_STYLES.small} /> 
        <span className="font-mono">{formatTimeDifference(stats.attackDefenderDiff)}</span>
      </span>
    </div>
  );
}
