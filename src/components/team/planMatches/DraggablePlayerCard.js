import React from 'react';
import { Check, X, HelpCircle } from 'lucide-react';
import { Tooltip } from '../../shared';
import { useTranslation } from 'react-i18next';
import { AUTO_SELECT_STRATEGY } from '../../../constants/planMatchesConstants';

const DraggablePlayerCardComponent = ({
  player,
  isDragging,
  shift,
  onPointerStart,
  onClick,
  isInMultipleMatches,
  isSelectedAndOnlyAvailableHere,
  isDragActivating,
  isSwapTarget,
  isSwapLanding,
  isBeingDisplaced,
  responseStatus,
  sortMetric
}) => {
  const { t } = useTranslation('team');

  if (!player) {
    return null;
  }

  return (
    <div
      data-drag-item-id={String(player.id)}
      role="button"
      tabIndex={0}
      onPointerDown={onPointerStart}
      onClick={isDragging ? undefined : onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !isDragging && onClick) {
          onClick();
        }
      }}
      className={`player-card-draggable flex items-center justify-between gap-2 rounded px-2 py-1 text-xs ${
        isSwapTarget
          ? 'border-2 border-sky-300 bg-sky-800/30 text-sky-100 shadow-[0_0_12px_rgba(125,211,252,0.5)] ring-2 ring-sky-300/40'
          : isSelectedAndOnlyAvailableHere
            ? 'border border-orange-300/50 bg-orange-900/20 text-orange-200/80'
            : isInMultipleMatches
              ? 'border-2 border-sky-400 bg-sky-900/20 text-sky-100 shadow-lg shadow-sky-500/60'
              : 'border border-sky-500/60 bg-sky-900/20 text-sky-100'
      } ${isDragActivating ? 'drag-activating' : ''} ${isSwapLanding ? 'swap-landing' : ''}`}
      style={{
        transform: isBeingDisplaced
          ? 'translateX(30px)'
          : shift ? `translateY(${shift}px)` : undefined,
        transition: isDragging
          ? 'none'
          : isBeingDisplaced
            ? 'transform 300ms ease-out, opacity 300ms ease-out'
            : 'transform 200ms ease-out, opacity 100ms ease-out, border-color 150ms ease-out, box-shadow 150ms ease-out',
        opacity: isDragging ? 0.3 : isBeingDisplaced ? 0.4 : 1
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {responseStatus === 'accepted' && (
          <Check className="h-3 w-3 flex-shrink-0 text-emerald-400" />
        )}
        {responseStatus === 'declined' && (
          <X className="h-3 w-3 flex-shrink-0 text-rose-400" />
        )}
        {responseStatus === 'no_response' && (
          <HelpCircle className="h-3 w-3 flex-shrink-0 text-amber-400" />
        )}
        <span className="truncate">{player.displayName}</span>
        {player.jerseyNumber && (
          <span className="text-[10px] text-sky-200/70">#{player.jerseyNumber}</span>
        )}
      </div>
      <div className="flex items-center gap-2 text-[10px] font-mono text-sky-100/80">
        {sortMetric === AUTO_SELECT_STRATEGY.ATTENDANCE
          ? <span>{player.attendanceRate.toFixed(0)}%</span>
          : <Tooltip content={t('planMatches.playerSelector.practicesTooltip')} position="top" trigger="hover" className="inline-flex">
              <span>{player.practicesPerMatch.toFixed(2)}</span>
            </Tooltip>
        }
      </div>
    </div>
  );
};

export const DraggablePlayerCard = React.memo(
  DraggablePlayerCardComponent,
  (prevProps, nextProps) =>
    prevProps.shift === nextProps.shift &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.isDragActivating === nextProps.isDragActivating &&
    prevProps.isInMultipleMatches === nextProps.isInMultipleMatches &&
    prevProps.isSelectedAndOnlyAvailableHere === nextProps.isSelectedAndOnlyAvailableHere &&
    prevProps.isSwapTarget === nextProps.isSwapTarget &&
    prevProps.isSwapLanding === nextProps.isSwapLanding &&
    prevProps.isBeingDisplaced === nextProps.isBeingDisplaced &&
    prevProps.responseStatus === nextProps.responseStatus &&
    prevProps.player?.id === nextProps.player?.id &&
    prevProps.player?.displayName === nextProps.player?.displayName &&
    prevProps.player?.jerseyNumber === nextProps.player?.jerseyNumber &&
    prevProps.player?.practicesPerMatch === nextProps.player?.practicesPerMatch &&
    prevProps.player?.attendanceRate === nextProps.player?.attendanceRate &&
    prevProps.sortMetric === nextProps.sortMetric
);
