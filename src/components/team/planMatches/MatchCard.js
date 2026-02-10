import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../shared/UI';
import { Portal } from '../../shared';
import { PlayerSelector } from './PlayerSelector';

import { useListDragAndDrop } from '../../../hooks/useListDragAndDrop';
import { DraggablePlayerCard } from './DraggablePlayerCard';
import { useTranslation } from 'react-i18next';

export function MatchCard({
  match,
  matchId,
  matchCount,
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
  onReorderSelectedPlayers,
  registerContainer,
  onCrossDragMove,
  onCrossDragEnd,
  crossMatchState,
  swapAnimation,
  slideInAnimation,
  sortMetric
}) {
  const { t } = useTranslation('team');
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
  const flipCleanupRef = useRef(null);
  const slideInOverlayRef = useRef(null);
  const slideInDelayRef = useRef(null);
  const [slideInReady, setSlideInReady] = useState(false);

  const isTargetOfSlideIn = slideInAnimation && slideInAnimation.targetMatchId === matchId;

  const isBeingDisplaced = useCallback((playerId) => {
    if (!isTargetOfSlideIn) return false;
    return String(slideInAnimation.targetPlayerId) === String(playerId);
  }, [isTargetOfSlideIn, slideInAnimation]);

  const slideInSourcePlayer = useMemo(() => {
    if (!isTargetOfSlideIn) return null;
    return rosterById.get(slideInAnimation.sourcePlayerId) || null;
  }, [isTargetOfSlideIn, slideInAnimation, rosterById]);

  // Slide-in overlay positioning
  useLayoutEffect(() => {
    if (!isTargetOfSlideIn || !slideInAnimation.targetRect || !slideInAnimation.releasePosition) {
      setSlideInReady(false);
      return;
    }

    const overlay = slideInOverlayRef.current;
    if (!overlay) {
      setSlideInReady(false);
      return;
    }

    const { targetRect, releasePosition } = slideInAnimation;

    // Position overlay at target rect (fixed)
    overlay.style.position = 'fixed';
    overlay.style.left = `${targetRect.left}px`;
    overlay.style.top = `${targetRect.top}px`;
    overlay.style.width = `${targetRect.width}px`;

    // Calculate inverse transform: from release position (pointer-centered) to target slot
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;
    const dx = releasePosition.x - targetCenterX;
    const dy = releasePosition.y - targetCenterY;

    // Start at release position with slight scale-up
    overlay.style.transition = 'none';
    overlay.style.transform = `translate(${dx}px, ${dy}px) scale(1.05)`;
    overlay.style.opacity = '0.9';

    // Force reflow
    overlay.getBoundingClientRect();

    setSlideInReady(true);

    // After a small delay, animate to target position
    slideInDelayRef.current = setTimeout(() => {
      slideInDelayRef.current = null;
      if (overlay) {
        overlay.style.transition = 'transform 400ms ease-out, opacity 400ms ease-out';
        overlay.style.transform = 'translate(0, 0) scale(1)';
        overlay.style.opacity = '1';
      }
    }, 100);

    return () => {
      if (slideInDelayRef.current) {
        clearTimeout(slideInDelayRef.current);
        slideInDelayRef.current = null;
      }
    };
  }, [isTargetOfSlideIn, slideInAnimation]);

  useLayoutEffect(() => {
    if (!swapAnimation || swapAnimation.toMatchId !== matchId) return;

    const container = listContainerRef.current;
    if (!container) return;

    const card = container.querySelector(
      `[data-drag-item-id="${swapAnimation.playerId}"]`
    );
    if (!card) return;

    const toRect = card.getBoundingClientRect();
    const dx = swapAnimation.fromRect.left - toRect.left;
    const dy = swapAnimation.fromRect.top - toRect.top;

    card.style.transition = 'none';
    card.style.transform = `translate(${dx}px, ${dy}px)`;
    card.style.zIndex = '50';

    // Force reflow
    card.getBoundingClientRect();

    card.style.transition = 'transform 300ms ease-out';
    card.style.transform = 'translate(0, 0)';

    if (flipCleanupRef.current) {
      clearTimeout(flipCleanupRef.current);
    }

    flipCleanupRef.current = setTimeout(() => {
      if (card && card.isConnected) {
        card.style.transition = '';
        card.style.transform = '';
        card.style.zIndex = '';
      }
      flipCleanupRef.current = null;
    }, 320);

    return () => {
      if (flipCleanupRef.current) {
        clearTimeout(flipCleanupRef.current);
        flipCleanupRef.current = null;
      }
    };
  }, [swapAnimation, matchId]);

  useEffect(() => {
    if (matchCount > 1 && registerContainer && matchId) {
      return registerContainer(matchId, listContainerRef);
    }
  }, [matchCount, registerContainer, matchId]);

  const handleLocalDragMove = useCallback((moveData) => {
    if (onCrossDragMove && matchId) {
      onCrossDragMove(moveData, matchId);
    }
  }, [onCrossDragMove, matchId]);

  const handleLocalDragEnd = useCallback((endData) => {
    if (onCrossDragEnd && matchId) {
      onCrossDragEnd(endData, matchId);
    }
  }, [onCrossDragEnd, matchId]);

  const isSwapTarget = useCallback((playerId) => {
    if (!crossMatchState?.active) return false;
    return (
      crossMatchState.targetMatchId === matchId &&
      crossMatchState.hoveredPlayerId === String(playerId) &&
      crossMatchState.isEligible
    );
  }, [crossMatchState, matchId]);

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
    activationThreshold: { time: 300, distance: 10 },
    onDragMove: matchCount > 1 ? handleLocalDragMove : undefined,
    onDragEnd: matchCount > 1 ? handleLocalDragEnd : undefined
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
            {isPlanning ? t('planMatches.matchCard.saving') : isPlanned ? t('planMatches.matchCard.saved') : t('planMatches.matchCard.save')}
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
            <span>{t('planMatches.matchCard.roster')}</span>
            <span>{roster?.length || 0}</span>
          </div>
          <PlayerSelector
            players={displayRoster}
            selectedIds={selectedIds}
            unavailableIds={unavailableIds}
            onToggleSelect={onToggleSelect}
            onToggleUnavailable={onToggleUnavailable}
            isSelectedInOtherMatch={isSelectedInOtherMatch}
            isSelectedAndOnlyAvailableHere={isSelectedAndOnlyAvailableHere}
            sortMetric={sortMetric}
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{t('planMatches.matchCard.selected')}</span>
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
                isSwapTarget={isSwapTarget(player.id)}
                isSwapLanding={
                  swapAnimation
                  && swapAnimation.sourceNewMatchId === matchId
                  && String(swapAnimation.sourcePlayerId) === String(player.id)
                }
                isBeingDisplaced={isBeingDisplaced(player.id)}
                sortMetric={sortMetric}
              />
            ))}
            {selectedPlayers.length === 0 && (
              <div className="rounded border border-slate-700 bg-slate-900/30 px-2 py-2 text-xs text-slate-400">
                {t('planMatches.matchCard.empty')}
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
                    sortMetric={sortMetric}
                  />
                </div>
              </Portal>
            )}
            {isTargetOfSlideIn && slideInSourcePlayer && (
              <Portal>
                <div
                  ref={slideInOverlayRef}
                  className="slide-in-overlay"
                  style={{ visibility: slideInReady ? 'visible' : 'hidden' }}
                >
                  <DraggablePlayerCard
                    player={slideInSourcePlayer}
                    isDragging={false}
                    shift={0}
                    isInMultipleMatches={isPlayerInMultipleMatches(slideInSourcePlayer.id)}
                    isSelectedAndOnlyAvailableHere={isSelectedAndOnlyAvailableHere(slideInSourcePlayer.id)}
                    sortMetric={sortMetric}
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
