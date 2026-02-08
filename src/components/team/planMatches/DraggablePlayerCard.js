import React from 'react';
import { Tooltip } from '../../shared';
import { PRACTICES_TOOLTIP } from '../../../constants/planMatchesConstants';

const DraggablePlayerCardComponent = ({
  player,
  isDragging,
  shift,
  onPointerStart,
  onClick,
  isInMultipleMatches,
  isSelectedAndOnlyAvailableHere,
  isDragActivating
}) => {
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
        isSelectedAndOnlyAvailableHere
          ? 'border border-orange-300/50 bg-orange-900/20 text-orange-200/80'
          : isInMultipleMatches
            ? 'border-2 border-sky-400 bg-sky-900/20 text-sky-100 shadow-lg shadow-sky-500/60'
            : 'border border-sky-500/60 bg-sky-900/20 text-sky-100'
      } ${isDragActivating ? 'drag-activating' : ''}`}
      style={{
        transform: shift ? `translateY(${shift}px)` : undefined,
        transition: isDragging
          ? 'none'
          : 'transform 200ms ease-out, opacity 100ms ease-out',
        opacity: isDragging ? 0.3 : 1
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="truncate">{player.displayName}</span>
        {player.jerseyNumber && (
          <span className="text-[10px] text-sky-200/70">#{player.jerseyNumber}</span>
        )}
      </div>
      <div className="flex items-center gap-2 text-[10px] font-mono text-sky-100/80">
        <Tooltip content={PRACTICES_TOOLTIP} position="top" trigger="hover" className="inline-flex">
          <span>{player.practicesPerMatch.toFixed(2)}</span>
        </Tooltip>
        <span>{player.attendanceRate.toFixed(1)}%</span>
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
    prevProps.player?.id === nextProps.player?.id &&
    prevProps.player?.displayName === nextProps.player?.displayName &&
    prevProps.player?.jerseyNumber === nextProps.player?.jerseyNumber &&
    prevProps.player?.practicesPerMatch === nextProps.player?.practicesPerMatch &&
    prevProps.player?.attendanceRate === nextProps.player?.attendanceRate
);
