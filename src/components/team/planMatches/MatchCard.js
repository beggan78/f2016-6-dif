import React, { useMemo, useRef } from 'react';
import { Button } from '../../shared/UI';
import { Portal } from '../../shared';
import { PlayerSelector } from './PlayerSelector';
import { PRACTICES_TOOLTIP } from '../../../constants/planMatchesConstants';
import { useListDragAndDrop } from '../../../hooks/useListDragAndDrop';
import { DraggablePlayerCard } from './DraggablePlayerCard';

export function MatchCard({
  match,
  roster,
  rosterById,
  selectedIds,
  unavailableIds,
  planningStatus,
  canPlan,
  isSelectedInOtherMatch,
  isSelectedAndOnlyAvailableHere,
  onPlanMatch,
  onToggleSelect,
  onToggleUnavailable,
  formatSchedule,
  isPlayerInMultipleMatches,
  onReorderSelectedPlayers
}) {
  const unavailableSet = useMemo(() => new Set(unavailableIds || []), [unavailableIds]);
  const displayRoster = useMemo(() => {
    return [
      ...(roster || []).filter(player => !unavailableSet.has(player.id)),
      ...(roster || []).filter(player => unavailableSet.has(player.id))
    ];
  }, [roster, unavailableSet]);

  const plannedState = planningStatus || null;
  const isPlanning = plannedState === 'loading';
  const isPlanned = plannedState === 'done';

  const selectedPlayers = useMemo(() => {
    return (selectedIds || [])
      .map((playerId) => rosterById.get(playerId))
      .filter(Boolean);
  }, [rosterById, selectedIds]);

  const listContainerRef = useRef(null);
  const {
    isDragging,
    draggedItemId,
    ghostPosition,
    handlePointerStart,
    isItemBeingDragged,
    isItemDragActivating,
    getItemShift,
    shouldSuppressClick
  } = useListDragAndDrop({
    items: selectedPlayers,
    onReorder: (reorderedPlayers) => {
      if (!onReorderSelectedPlayers) {
        return;
      }
      const newOrderedIds = reorderedPlayers.map((player) => player.id);
      onReorderSelectedPlayers(match.id, newOrderedIds);
    },
    containerRef: listContainerRef,
    activationThreshold: { time: 300, distance: 10 }
  });

  const ghostPlayer = useMemo(() => {
    if (!draggedItemId) {
      return null;
    }
    return selectedPlayers.find((player) => String(player.id) === String(draggedItemId)) || null;
  }, [draggedItemId, selectedPlayers]);

  return (
    <div className="bg-slate-800/70 border border-slate-700 rounded-lg p-3 space-y-3">
      <div className="grid grid-cols-2 gap-2 items-start">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isPlanned ? 'secondary' : 'accent'}
            onClick={onPlanMatch}
            disabled={isPlanning || isPlanned || !canPlan}
            className="px-2"
          >
            {isPlanning ? 'Saving...' : isPlanned ? 'Saved' : 'Save'}
          </Button>
        </div>

        <div className="flex items-center justify-end gap-3 min-w-0 text-right">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-100">{match.opponent}</div>
            <div className="text-xs text-slate-400">{formatSchedule(match.matchDate, match.matchTime)}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Roster</span>
            <span>{roster.length}</span>
          </div>
          <PlayerSelector
            players={displayRoster}
            selectedIds={selectedIds}
            unavailableIds={unavailableIds}
            onToggleSelect={onToggleSelect}
            onToggleUnavailable={onToggleUnavailable}
            isSelectedInOtherMatch={isSelectedInOtherMatch}
            isSelectedAndOnlyAvailableHere={isSelectedAndOnlyAvailableHere}
            practicesTooltip={PRACTICES_TOOLTIP}
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Selected</span>
            <span>{selectedIds.length}</span>
          </div>
          <div ref={listContainerRef} className="space-y-1 pr-1">
            {selectedPlayers.map((player) => (
              <DraggablePlayerCard
                key={player.id}
                player={player}
                isDragging={isItemBeingDragged(player.id)}
                shift={getItemShift(player.id)}
                onPointerStart={(event) => handlePointerStart(player.id, event)}
                onClick={() => {
                  if (shouldSuppressClick(player.id)) {
                    return;
                  }
                  onToggleSelect(player.id);
                }}
                isInMultipleMatches={isPlayerInMultipleMatches(player.id)}
                isSelectedAndOnlyAvailableHere={isSelectedAndOnlyAvailableHere(player.id)}
                isDragActivating={isItemDragActivating(player.id)}
              />
            ))}
            {selectedPlayers.length === 0 && (
              <div className="rounded border border-slate-700 bg-slate-900/30 px-2 py-2 text-xs text-slate-400">
                Empty.
              </div>
            )}
            {isDragging && ghostPosition && ghostPlayer && (
              <Portal>
                <div
                  className="fixed pointer-events-none z-[1000] ghost-card"
                  style={{
                    left: ghostPosition.x,
                    top: ghostPosition.y,
                    transform: 'translate(-50%, -50%) scale(1.05)',
                    opacity: 0.9
                  }}
                >
                  <DraggablePlayerCard
                    player={ghostPlayer}
                    isDragging={false}
                    shift={0}
                    isInMultipleMatches={isPlayerInMultipleMatches(ghostPlayer.id)}
                    isSelectedAndOnlyAvailableHere={isSelectedAndOnlyAvailableHere(ghostPlayer.id)}
                  />
                </div>
              </Portal>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
