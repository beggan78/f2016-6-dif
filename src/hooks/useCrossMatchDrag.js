import { useCallback, useEffect, useRef, useState } from 'react';

const INITIAL_STATE = {
  active: false,
  sourceMatchId: null,
  sourcePlayerId: null,
  targetMatchId: null,
  hoveredPlayerId: null,
  isEligible: false
};

export function useCrossMatchDrag({
  selectedPlayersByMatch,
  unavailablePlayersByMatch,
  onSwapPlayers
}) {
  const [crossMatchState, setCrossMatchState] = useState(INITIAL_STATE);
  const [swapAnimation, setSwapAnimation] = useState(null);
  const crossMatchStateRef = useRef(INITIAL_STATE);
  const containerRefs = useRef(new Map());
  const selectedRef = useRef(selectedPlayersByMatch);
  const unavailableRef = useRef(unavailablePlayersByMatch);
  const onSwapPlayersRef = useRef(onSwapPlayers);
  const swapAnimationTimeoutRef = useRef(null);

  selectedRef.current = selectedPlayersByMatch;
  unavailableRef.current = unavailablePlayersByMatch;
  onSwapPlayersRef.current = onSwapPlayers;

  const registerContainer = useCallback((matchId, containerRef) => {
    containerRefs.current.set(matchId, containerRef);
    return () => {
      containerRefs.current.delete(matchId);
    };
  }, []);

  const handleDragMove = useCallback(({ itemId, clientX, clientY }, sourceMatchId) => {
    let targetMatchId = null;
    let targetContainerRef = null;

    for (const [matchId, ref] of containerRefs.current.entries()) {
      if (matchId === sourceMatchId) continue;
      const el = ref.current;
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        targetMatchId = matchId;
        targetContainerRef = ref;
        break;
      }
    }

    if (!targetMatchId || !targetContainerRef) {
      if (crossMatchStateRef.current.active) {
        crossMatchStateRef.current = INITIAL_STATE;
        setCrossMatchState(INITIAL_STATE);
      }
      return;
    }

    const container = targetContainerRef.current;
    if (!container) return;

    const nodes = Array.from(container.querySelectorAll('[data-drag-item-id]'));
    let hoveredPlayerId = null;

    for (const node of nodes) {
      const rect = node.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        hoveredPlayerId = node.dataset.dragItemId;
        break;
      }
    }

    if (!hoveredPlayerId) {
      if (crossMatchStateRef.current.hoveredPlayerId !== null) {
        const nextState = {
          active: true,
          sourceMatchId,
          sourcePlayerId: itemId,
          targetMatchId,
          hoveredPlayerId: null,
          isEligible: false
        };
        crossMatchStateRef.current = nextState;
        setCrossMatchState(nextState);
      }
      return;
    }

    const unavailableInTarget = unavailableRef.current[targetMatchId] || [];
    const unavailableInSource = unavailableRef.current[sourceMatchId] || [];
    const draggedPlayerUnavailableInTarget = unavailableInTarget.includes(itemId);
    const hoveredPlayerUnavailableInSource = unavailableInSource.includes(hoveredPlayerId);
    const selectedInSource = selectedRef.current[sourceMatchId] || [];
    const hoveredPlayerAlreadyInSource = selectedInSource.includes(hoveredPlayerId);
    const selectedInTarget = selectedRef.current[targetMatchId] || [];
    const draggedPlayerAlreadyInTarget = selectedInTarget.includes(itemId);
    const isEligible = !draggedPlayerUnavailableInTarget && !hoveredPlayerUnavailableInSource
      && !hoveredPlayerAlreadyInSource && !draggedPlayerAlreadyInTarget;

    const prev = crossMatchStateRef.current;
    if (
      prev.hoveredPlayerId === hoveredPlayerId &&
      prev.isEligible === isEligible &&
      prev.targetMatchId === targetMatchId &&
      prev.sourcePlayerId === itemId
    ) {
      return;
    }

    const nextState = {
      active: true,
      sourceMatchId,
      sourcePlayerId: itemId,
      targetMatchId,
      hoveredPlayerId,
      isEligible
    };
    crossMatchStateRef.current = nextState;
    setCrossMatchState(nextState);
  }, []);

  const handleDragEnd = useCallback(({ cancelled }, sourceMatchId) => {
    const state = crossMatchStateRef.current;

    if (!cancelled && state.active && state.isEligible && state.hoveredPlayerId && onSwapPlayersRef.current) {
      // Capture hovered player's position before swap
      let fromRect = null;
      const targetContainer = containerRefs.current.get(state.targetMatchId);
      if (targetContainer?.current) {
        const card = targetContainer.current.querySelector(
          `[data-drag-item-id="${state.hoveredPlayerId}"]`
        );
        if (card) {
          fromRect = card.getBoundingClientRect();
        }
      }

      onSwapPlayersRef.current(sourceMatchId, state.sourcePlayerId, state.targetMatchId, state.hoveredPlayerId);

      if (fromRect) {
        if (swapAnimationTimeoutRef.current) {
          clearTimeout(swapAnimationTimeoutRef.current);
        }
        setSwapAnimation({
          playerId: state.hoveredPlayerId,
          fromRect,
          toMatchId: sourceMatchId,
          sourcePlayerId: state.sourcePlayerId,
          sourceNewMatchId: state.targetMatchId
        });
        swapAnimationTimeoutRef.current = setTimeout(() => {
          setSwapAnimation(null);
          swapAnimationTimeoutRef.current = null;
        }, 700);
      }
    }

    crossMatchStateRef.current = INITIAL_STATE;
    setCrossMatchState(INITIAL_STATE);
  }, []);

  useEffect(() => {
    return () => {
      if (swapAnimationTimeoutRef.current) {
        clearTimeout(swapAnimationTimeoutRef.current);
      }
    };
  }, []);

  return {
    registerContainer,
    handleDragMove,
    handleDragEnd,
    crossMatchState,
    swapAnimation
  };
}
