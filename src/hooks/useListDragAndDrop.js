import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_ACTIVATION = { time: 300, distance: 10 };
const DRAG_PULSE_DELAY_MS = 150;
const DRAG_PULSE_DURATION_MS = 180;
const DROP_SHIFT_PX = 48;

const getItemId = (item) => String(item?.id ?? '');

const arraysEqual = (a = [], b = []) => {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((value, index) => value === b[index]);
};

const reorderArray = (array, fromIndex, toIndex) => {
  if (!Array.isArray(array) || array.length === 0) {
    return array;
  }

  if (fromIndex < 0 || fromIndex >= array.length) {
    return array;
  }

  const result = [...array];
  const [removed] = result.splice(fromIndex, 1);
  const safeIndex = Math.max(0, Math.min(result.length, toIndex));
  result.splice(safeIndex, 0, removed);
  return result;
};

export function useListDragAndDrop({
  items = [],
  onReorder,
  containerRef,
  activationThreshold = DEFAULT_ACTIVATION,
  onDragMove,
  onDragEnd
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const [ghostPosition, setGhostPosition] = useState(null);
  const [activatingItemId, setActivatingItemId] = useState(null);

  const itemsRef = useRef(items);
  const activePointerIdRef = useRef(null);
  const dragSessionRef = useRef(null);
  const dropIndexRef = useRef(null);
  const ghostRafRef = useRef(null);
  const ghostPositionRef = useRef(null);
  const activationTimerRef = useRef(null);
  const pulseTimerRef = useRef(null);
  const pulseResetTimerRef = useRef(null);
  const pointerMoveListenerRef = useRef(null);
  const pointerUpListenerRef = useRef(null);
  const pointerCancelListenerRef = useRef(null);
  const keydownListenerRef = useRef(null);
  const lastPointerPosRef = useRef(null);
  const suppressClickRef = useRef({ itemId: null, until: 0 });
  const onDragMoveRef = useRef(onDragMove);
  const onDragEndRef = useRef(onDragEnd);

  itemsRef.current = items;
  onDragMoveRef.current = onDragMove;
  onDragEndRef.current = onDragEnd;

  const clearActivationTimers = useCallback(() => {
    if (activationTimerRef.current) {
      clearTimeout(activationTimerRef.current);
      activationTimerRef.current = null;
    }

    if (pulseTimerRef.current) {
      clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = null;
    }

    if (pulseResetTimerRef.current) {
      clearTimeout(pulseResetTimerRef.current);
      pulseResetTimerRef.current = null;
    }
  }, []);

  const cancelGhostRaf = useCallback(() => {
    if (ghostRafRef.current) {
      cancelAnimationFrame(ghostRafRef.current);
      ghostRafRef.current = null;
    }
  }, []);

  const cleanupPointerListeners = useCallback(() => {
    if (pointerMoveListenerRef.current) {
      window.removeEventListener('pointermove', pointerMoveListenerRef.current);
      pointerMoveListenerRef.current = null;
    }

    if (pointerUpListenerRef.current) {
      window.removeEventListener('pointerup', pointerUpListenerRef.current);
      pointerUpListenerRef.current = null;
    }

    if (pointerCancelListenerRef.current) {
      window.removeEventListener('pointercancel', pointerCancelListenerRef.current);
      pointerCancelListenerRef.current = null;
    }

    if (keydownListenerRef.current) {
      window.removeEventListener('keydown', keydownListenerRef.current);
      keydownListenerRef.current = null;
    }
  }, []);

  const resetDragState = useCallback(() => {
    setIsDragging(false);
    setDraggedItemId(null);
    setDropIndex(null);
    setGhostPosition(null);
    setActivatingItemId(null);
    dropIndexRef.current = null;
    activePointerIdRef.current = null;
    dragSessionRef.current = null;
    ghostPositionRef.current = null;
    lastPointerPosRef.current = null;
  }, []);

  const releasePointerCapture = useCallback(() => {
    const session = dragSessionRef.current;
    if (!session?.startTarget?.releasePointerCapture || session.pointerId == null) {
      return;
    }

    try {
      session.startTarget.releasePointerCapture(session.pointerId);
    } catch (error) {
      // Ignore release errors (pointer may already be released).
    }
  }, []);

  const scheduleGhostPositionUpdate = useCallback((clientX, clientY) => {
    ghostPositionRef.current = { x: clientX, y: clientY };

    if (ghostRafRef.current) {
      return;
    }

    ghostRafRef.current = requestAnimationFrame(() => {
      ghostRafRef.current = null;
      if (ghostPositionRef.current) {
        setGhostPosition(ghostPositionRef.current);
      }
    });
  }, []);

  const cacheItemRects = useCallback(() => {
    const session = dragSessionRef.current;
    if (!session) {
      return;
    }

    const container = containerRef?.current;
    const order = (itemsRef.current || []).map(getItemId);
    const itemRects = new Map();
    let containerRect = null;

    if (container) {
      containerRect = container.getBoundingClientRect();
      const nodes = Array.from(container.querySelectorAll('[data-drag-item-id]'));
      nodes.forEach((node) => {
        const itemId = node.dataset.dragItemId;
        if (itemId) {
          itemRects.set(itemId, node.getBoundingClientRect());
        }
      });
    }

    session.order = order;
    session.itemRects = itemRects;
    session.containerRect = containerRect;
  }, [containerRef]);

  const computeDropIndex = useCallback((clientY) => {
    const session = dragSessionRef.current;
    if (!session?.itemRects || !session.order) {
      return null;
    }

    const orderedIds = session.order.filter((id) => id !== session.itemId);
    let index = 0;

    for (const id of orderedIds) {
      const rect = session.itemRects.get(id);
      if (!rect) {
        index += 1;
        continue;
      }
      const centerY = rect.top + rect.height / 2;
      if (clientY < centerY) {
        return index;
      }
      index += 1;
    }

    return orderedIds.length;
  }, []);

  const updateDropIndex = useCallback((clientX, clientY) => {
    const session = dragSessionRef.current;
    if (!session) {
      return;
    }

    const containerRect = session.containerRect || containerRef?.current?.getBoundingClientRect();
    if (containerRect) {
      const isInside =
        clientX >= containerRect.left &&
        clientX <= containerRect.right &&
        clientY >= containerRect.top &&
        clientY <= containerRect.bottom;

      if (!isInside) {
        if (dropIndexRef.current !== null) {
          dropIndexRef.current = null;
          setDropIndex(null);
        }
        return;
      }
    }

    const nextIndex = computeDropIndex(clientY);
    if (nextIndex !== dropIndexRef.current) {
      dropIndexRef.current = nextIndex;
      setDropIndex(nextIndex);
    }
  }, [computeDropIndex, containerRef]);

  const cancelDrag = useCallback(() => {
    clearActivationTimers();
    cancelGhostRaf();
    releasePointerCapture();
    cleanupPointerListeners();
    resetDragState();
  }, [cancelGhostRaf, clearActivationTimers, cleanupPointerListeners, releasePointerCapture, resetDragState]);

  const markSuppressClick = useCallback((itemId) => {
    suppressClickRef.current = {
      itemId: String(itemId ?? ''),
      until: Date.now() + 250
    };
  }, []);

  const finalizeReorder = useCallback(
    (finalDropIndex) => {
      const session = dragSessionRef.current;
      if (!session || typeof finalDropIndex !== 'number') {
        return;
      }

      const currentItems = itemsRef.current || [];
      if (currentItems.length < 2) {
        return;
      }

      const currentIds = currentItems.map(getItemId);
      const fromIndex = currentIds.indexOf(session.itemId);
      if (fromIndex === -1) {
        return;
      }

      const nextItems = reorderArray(currentItems, fromIndex, finalDropIndex);
      const nextIds = nextItems.map(getItemId);

      if (arraysEqual(currentIds, nextIds)) {
        return;
      }

      if (onReorder) {
        onReorder(nextItems);
      }
    },
    [onReorder]
  );

  const startDragSession = useCallback((event) => {
    const session = dragSessionRef.current;
    if (!session || session.started) {
      return false;
    }

    session.started = true;
    setIsDragging(true);
    setDraggedItemId(session.itemId);
    setActivatingItemId(null);
    cacheItemRects();
    scheduleGhostPositionUpdate(event.clientX, event.clientY);
    updateDropIndex(event.clientX, event.clientY);

    if (event.cancelable) {
      event.preventDefault();
    }

    if (session.startTarget?.setPointerCapture && session.pointerId != null) {
      try {
        session.startTarget.setPointerCapture(session.pointerId);
      } catch (error) {
        // Ignore capture errors (pointer capture might not be supported).
      }
    }

    keydownListenerRef.current = (keyEvent) => {
      if (keyEvent.key === 'Escape') {
        keyEvent.preventDefault();
        if (onDragEndRef.current) {
          onDragEndRef.current({ cancelled: true });
        }
        cancelDrag();
      }
    };
    window.addEventListener('keydown', keydownListenerRef.current);

    return true;
  }, [cacheItemRects, cancelDrag, scheduleGhostPositionUpdate, updateDropIndex]);

  useEffect(() => {
    return () => {
      cancelDrag();
    };
  }, [cancelDrag]);

  const handlePointerStart = useCallback(
    (itemId, event) => {
      const normalizedId = String(itemId ?? '');
      const currentItems = itemsRef.current || [];

      if (currentItems.length < 2) {
        return;
      }

      if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
      }

      if (dragSessionRef.current) {
        return;
      }

      clearActivationTimers();
      cancelGhostRaf();
      setActivatingItemId(null);

      activePointerIdRef.current = event.pointerId;
      lastPointerPosRef.current = { x: event.clientX, y: event.clientY };

      dragSessionRef.current = {
        itemId: normalizedId,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        pointerType: event.pointerType,
        startTarget: event.currentTarget,
        started: false,
        order: null,
        itemRects: null,
        containerRect: null
      };

      const activationTime = activationThreshold?.time ?? DEFAULT_ACTIVATION.time;
      const activationDistance = activationThreshold?.distance ?? DEFAULT_ACTIVATION.distance;

      pulseTimerRef.current = setTimeout(() => {
        const session = dragSessionRef.current;
        if (!session || session.started || session.itemId !== normalizedId) {
          return;
        }

        setActivatingItemId(normalizedId);
        pulseResetTimerRef.current = setTimeout(() => {
          setActivatingItemId((current) => (current === normalizedId ? null : current));
        }, DRAG_PULSE_DURATION_MS);
      }, DRAG_PULSE_DELAY_MS);

      activationTimerRef.current = setTimeout(() => {
        const session = dragSessionRef.current;
        if (!session || session.started || session.itemId !== normalizedId) {
          return;
        }

        const lastPos = lastPointerPosRef.current || { x: session.startX, y: session.startY };
        startDragSession({
          clientX: lastPos.x,
          clientY: lastPos.y,
          cancelable: false,
          pointerId: session.pointerId
        });
      }, activationTime);

      const handleMove = (moveEvent) => {
        if (moveEvent.pointerId !== activePointerIdRef.current) {
          return;
        }

        const session = dragSessionRef.current;
        if (!session) {
          return;
        }

        lastPointerPosRef.current = { x: moveEvent.clientX, y: moveEvent.clientY };

        if (!session.started) {
          const deltaX = Math.abs(moveEvent.clientX - session.startX);
          const deltaY = Math.abs(moveEvent.clientY - session.startY);
          if (Math.max(deltaX, deltaY) < activationDistance) {
            return;
          }

          const started = startDragSession(moveEvent);
          if (!started) {
            return;
          }
        }

        if (moveEvent.cancelable) {
          moveEvent.preventDefault();
        }

        scheduleGhostPositionUpdate(moveEvent.clientX, moveEvent.clientY);
        updateDropIndex(moveEvent.clientX, moveEvent.clientY);

        if (onDragMoveRef.current) {
          onDragMoveRef.current({ itemId: session.itemId, clientX: moveEvent.clientX, clientY: moveEvent.clientY });
        }
      };

      const handleEnd = (endEvent) => {
        if (endEvent.pointerId !== activePointerIdRef.current) {
          return;
        }

        const session = dragSessionRef.current;

        clearActivationTimers();

        if (!session?.started) {
          cancelDrag();
          return;
        }

        if (endEvent.cancelable) {
          endEvent.preventDefault();
        }

        scheduleGhostPositionUpdate(endEvent.clientX, endEvent.clientY);

        const containerRect =
          session.containerRect || containerRef?.current?.getBoundingClientRect();
        const isInside = containerRect
          ? endEvent.clientX >= containerRect.left &&
            endEvent.clientX <= containerRect.right &&
            endEvent.clientY >= containerRect.top &&
            endEvent.clientY <= containerRect.bottom
          : true;

        if (isInside) {
          const nextIndex =
            dropIndexRef.current ?? computeDropIndex(endEvent.clientY);
          if (typeof nextIndex === 'number') {
            finalizeReorder(nextIndex);
          }
        }

        if (onDragEndRef.current) {
          onDragEndRef.current({ cancelled: false, clientX: endEvent.clientX, clientY: endEvent.clientY });
        }
        markSuppressClick(session.itemId);
        cancelDrag();
      };

      const handleCancel = (cancelEvent) => {
        if (cancelEvent.pointerId !== activePointerIdRef.current) {
          return;
        }

        clearActivationTimers();
        if (onDragEndRef.current) {
          onDragEndRef.current({ cancelled: true, clientX: cancelEvent.clientX, clientY: cancelEvent.clientY });
        }
        cancelDrag();
      };

      pointerMoveListenerRef.current = handleMove;
      pointerUpListenerRef.current = handleEnd;
      pointerCancelListenerRef.current = handleCancel;

      window.addEventListener('pointermove', handleMove, { passive: false });
      window.addEventListener('pointerup', handleEnd, { passive: false });
      window.addEventListener('pointercancel', handleCancel, { passive: false });
    },
    [
      activationThreshold,
      cancelDrag,
      cancelGhostRaf,
      clearActivationTimers,
      computeDropIndex,
      containerRef,
      finalizeReorder,
      markSuppressClick,
      scheduleGhostPositionUpdate,
      startDragSession,
      updateDropIndex
    ]
  );

  const isItemBeingDragged = useCallback(
    (itemId) => isDragging && draggedItemId === String(itemId ?? ''),
    [isDragging, draggedItemId]
  );

  const isItemDragActivating = useCallback(
    (itemId) => activatingItemId === String(itemId ?? ''),
    [activatingItemId]
  );

  const getItemShift = useCallback((itemId) => {
    if (!isDragging) {
      return 0;
    }

    const session = dragSessionRef.current;
    if (!session || dropIndexRef.current == null) {
      return 0;
    }

    const normalizedId = String(itemId ?? '');
    if (normalizedId === session.itemId) {
      return 0;
    }

    const orderedIds = session.order ? session.order.filter((id) => id !== session.itemId) : [];
    const itemIndex = orderedIds.indexOf(normalizedId);
    if (itemIndex === -1) {
      return 0;
    }

    return itemIndex < dropIndexRef.current ? -DROP_SHIFT_PX : DROP_SHIFT_PX;
  }, [isDragging]);

  const shouldSuppressClick = useCallback((itemId) => {
    const normalizedId = String(itemId ?? '');
    const { itemId: suppressedId, until } = suppressClickRef.current;
    if (suppressedId === normalizedId && Date.now() < until) {
      suppressClickRef.current = { itemId: null, until: 0 };
      return true;
    }
    return false;
  }, []);

  return {
    isDragging,
    draggedItemId,
    dropIndex,
    ghostPosition,
    handlePointerStart,
    isItemBeingDragged,
    isItemDragActivating,
    getItemShift,
    shouldSuppressClick
  };
}
