import { useState, useMemo, useRef, useEffect, useCallback } from 'react';

const SNAP_THRESHOLD_PX = 18;
export const COLUMN_SHIFT_PX = 12;
const DRAG_ACTIVATION_THRESHOLD = 6;

const arraysEqual = (a = [], b = []) => {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((value, index) => value === b[index]);
};

export function useColumnDragDrop(columns, onReorderOrOptions) {
  const options =
    typeof onReorderOrOptions === 'function'
      ? { onReorder: onReorderOrOptions }
      : onReorderOrOptions || {};

  const { onReorder, initialOrder, fixedColumns = [] } = options;

  const defaultColumnOrder = useMemo(() => columns.map((column) => column.key), [columns]);

  const mergeColumnOrder = useCallback(
    (order) => {
      if (!Array.isArray(order) || order.length === 0) {
        return [...defaultColumnOrder];
      }

      const sanitizedOrder = order.filter((key) => defaultColumnOrder.includes(key));
      const missingKeys = defaultColumnOrder.filter((key) => !sanitizedOrder.includes(key));

      return [...sanitizedOrder, ...missingKeys];
    },
    [defaultColumnOrder]
  );

  const [columnOrder, setColumnOrder] = useState(() => mergeColumnOrder(initialOrder));
  const [draggingColumn, setDraggingColumn] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [dropIndicator, setDropIndicator] = useState(null);
  const [isReordering, setIsReordering] = useState(false);

  const activePointerIdRef = useRef(null);
  const draggingColumnRef = useRef(null);
  const dragOverColumnRef = useRef(null);
  const dropIndicatorRef = useRef(null);
  const pointerMoveListenerRef = useRef(null);
  const pointerUpListenerRef = useRef(null);
  const pointerCancelListenerRef = useRef(null);
  const headerRowRef = useRef(null);
  const dragGhostRef = useRef(null);
  const dragGhostOffsetRef = useRef({ x: 0, y: 0 });
  const dragSessionRef = useRef(null);

  useEffect(() => {
    setColumnOrder((previous) => mergeColumnOrder(previous));
  }, [mergeColumnOrder]);

  useEffect(() => {
    if (!initialOrder) {
      return;
    }

    const mergedInitialOrder = mergeColumnOrder(initialOrder);

    setColumnOrder((previous) =>
      arraysEqual(previous, mergedInitialOrder) ? previous : mergedInitialOrder
    );
  }, [initialOrder, mergeColumnOrder]);

  useEffect(() => {
    draggingColumnRef.current = draggingColumn;
  }, [draggingColumn]);

  useEffect(() => {
    dragOverColumnRef.current = dragOverColumn;
  }, [dragOverColumn]);

  useEffect(() => {
    dropIndicatorRef.current = dropIndicator;
  }, [dropIndicator]);

  const orderedColumns = useMemo(() => {
    const columnMap = new Map(columns.map((column) => [column.key, column]));
    return columnOrder.map((key) => columnMap.get(key)).filter(Boolean);
  }, [columns, columnOrder]);

  const removeDragGhost = useCallback(() => {
    if (dragGhostRef.current) {
      dragGhostRef.current.remove();
      dragGhostRef.current = null;
    }
  }, []);

  const updateDragGhostPosition = useCallback((clientX, clientY) => {
    const ghost = dragGhostRef.current;
    if (!ghost) {
      return;
    }

    const x = clientX - dragGhostOffsetRef.current.x;
    const y = clientY - dragGhostOffsetRef.current.y;
    ghost.style.transform = `translate(${x}px, ${y}px)`;
  }, []);

  const createDragGhost = useCallback(
    (headerElement, columnLabel, clientX, clientY) => {
      removeDragGhost();

      if (!headerElement) {
        return;
      }

      const rect = headerElement.getBoundingClientRect();
      dragGhostOffsetRef.current = {
        x: Math.min(Math.max(clientX - rect.left, 0), rect.width),
        y: Math.min(Math.max(clientY - rect.top, 0), rect.height)
      };

      const ghost = document.createElement('div');
      ghost.textContent = columnLabel;
      ghost.style.position = 'fixed';
      ghost.style.top = '0';
      ghost.style.left = '0';
      ghost.style.pointerEvents = 'none';
      ghost.style.zIndex = '9999';
      ghost.style.padding = '0.5rem 0.75rem';
      ghost.style.borderRadius = '0.5rem';
      ghost.style.border = '1px solid rgba(56, 189, 248, 0.6)';
      ghost.style.background = 'rgba(15, 23, 42, 0.95)';
      ghost.style.color = 'rgb(224, 242, 254)';
      ghost.style.fontSize = '0.75rem';
      ghost.style.fontWeight = '600';
      ghost.style.letterSpacing = '0.08em';
      ghost.style.textTransform = 'uppercase';
      ghost.style.boxShadow = '0 10px 25px rgba(14, 165, 233, 0.35)';
      ghost.style.opacity = '0.95';
      ghost.style.minWidth = `${Math.max(rect.width, 60)}px`;
      ghost.style.textAlign = 'center';
      ghost.style.transition = 'transform 0.08s ease-out';

      document.body.appendChild(ghost);
      dragGhostRef.current = ghost;
      updateDragGhostPosition(clientX, clientY);
    },
    [removeDragGhost, updateDragGhostPosition]
  );

  const resetReorderState = useCallback(() => {
    setDraggingColumn(null);
    setDragOverColumn(null);
    setDropIndicator(null);
    setIsReordering(false);
    draggingColumnRef.current = null;
    dragOverColumnRef.current = null;
    dropIndicatorRef.current = null;
    dragSessionRef.current = null;
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

    activePointerIdRef.current = null;
    draggingColumnRef.current = null;
    dragOverColumnRef.current = null;
    dropIndicatorRef.current = null;
    removeDragGhost();
    dragSessionRef.current = null;
  }, [removeDragGhost]);

  const startDragSession = useCallback(
    (event) => {
      const session = dragSessionRef.current;

      if (!session || session.started) {
        return false;
      }

      session.started = true;

      setDraggingColumn(session.columnKey);
      setIsReordering(true);
      setDragOverColumn(null);
      dragOverColumnRef.current = null;
      setDropIndicator(null);
      dropIndicatorRef.current = null;
      draggingColumnRef.current = session.columnKey;

      if (event.cancelable) {
        event.preventDefault();
      }

      createDragGhost(session.headerElement, session.columnLabel, event.clientX, event.clientY);

      return true;
    },
    [createDragGhost]
  );

  const determineDropPosition = useCallback((clientX, columnKey, rect) => {
    const currentIndicator = dropIndicatorRef.current;
    let transformOffset = 0;

    if (currentIndicator?.columnKey === columnKey) {
      transformOffset =
        currentIndicator.position === 'before'
          ? COLUMN_SHIFT_PX
          : currentIndicator.position === 'after'
          ? -COLUMN_SHIFT_PX
          : 0;
    }

    const effectiveLeft = rect.left - transformOffset;
    const effectiveRight = rect.right - transformOffset;
    const center = (effectiveLeft + effectiveRight) / 2;
    const threshold = Math.min(rect.width * 0.2, SNAP_THRESHOLD_PX);

    if (clientX <= center - threshold) {
      return 'before';
    }

    if (clientX >= center + threshold) {
      return 'after';
    }

    if (currentIndicator?.columnKey === columnKey) {
      return currentIndicator.position;
    }

    return clientX < center ? 'before' : 'after';
  }, []);

  const resolvePointerTarget = useCallback(
    (clientX) => {
      const headerRow = headerRowRef.current;
      if (!headerRow) {
        return null;
      }

      const headers = Array.from(headerRow.querySelectorAll('th[data-column-key]'));
      if (headers.length === 0) {
        return null;
      }

      const hovered = headers
        .map((header) => {
          const rect = header.getBoundingClientRect();
          if (clientX >= rect.left && clientX <= rect.right) {
            return {
              columnKey: header.dataset.columnKey,
              rect
            };
          }
          return null;
        })
        .filter(Boolean);

      const fallback = hovered.length ? hovered[hovered.length - 1] : null;

      if (!fallback) {
        return null;
      }

      const position = determineDropPosition(clientX, fallback.columnKey, fallback.rect);

      return {
        columnKey: fallback.columnKey,
        position
      };
    },
    [determineDropPosition]
  );

  const reorderColumns = useCallback(
    (sourceKey, targetKey, position = 'before') => {
      if (!sourceKey || !targetKey || sourceKey === targetKey) {
        resetReorderState();
        return;
      }

      // Prevent reordering if source or target is fixed
      if (fixedColumns.includes(sourceKey) || fixedColumns.includes(targetKey)) {
        resetReorderState();
        return;
      }

      setColumnOrder((previousOrder) => {
        const withoutSource = previousOrder.filter((key) => key !== sourceKey);
        const targetIndex = withoutSource.indexOf(targetKey);

        if (targetIndex === -1) {
          return previousOrder;
        }

        const insertionIndex = position === 'after' ? targetIndex + 1 : targetIndex;

        // Prevent inserting before a fixed column
        if (insertionIndex < fixedColumns.length) {
          return previousOrder;
        }

        const nextOrder = [...withoutSource];
        nextOrder.splice(insertionIndex, 0, sourceKey);
        const mergedOrder = mergeColumnOrder(nextOrder);

        if (onReorder) {
          onReorder(mergedOrder);
        }

        return mergedOrder;
      });

      resetReorderState();
    },
    [mergeColumnOrder, onReorder, resetReorderState, fixedColumns]
  );

  useEffect(() => {
    return () => {
      cleanupPointerListeners();
    };
  }, [cleanupPointerListeners]);

  const handlePointerDown = useCallback(
    (event, columnKey) => {
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
      }

      // Prevent dragging fixed columns
      if (fixedColumns.includes(columnKey)) {
        return;
      }

      cleanupPointerListeners();
      activePointerIdRef.current = event.pointerId;

      const columnDefinition = orderedColumns.find((column) => column.key === columnKey);

      dragSessionRef.current = {
        started: false,
        columnKey,
        columnLabel: columnDefinition?.label || columnKey,
        headerElement: event.currentTarget,
        pointerType: event.pointerType,
        startClientX: event.clientX,
        startClientY: event.clientY
      };

      const handleMove = (moveEvent) => {
        if (moveEvent.pointerId !== activePointerIdRef.current) {
          return;
        }

        const session = dragSessionRef.current;

        if (!session) {
          return;
        }

        if (!session.started) {
          if (session.pointerType === 'mouse') {
            const deltaX = Math.abs(moveEvent.clientX - session.startClientX);
            const deltaY = Math.abs(moveEvent.clientY - session.startClientY);

            if (Math.max(deltaX, deltaY) < DRAG_ACTIVATION_THRESHOLD) {
              return;
            }
          }

          const started = startDragSession(moveEvent);

          if (!started) {
            return;
          }
        }

        if (moveEvent.cancelable) {
          moveEvent.preventDefault();
        }
        updateDragGhostPosition(moveEvent.clientX, moveEvent.clientY);

        const target = resolvePointerTarget(moveEvent.clientX);

        if (!target || target.columnKey === draggingColumnRef.current) {
          if (dragOverColumnRef.current !== null) {
            dragOverColumnRef.current = null;
            setDragOverColumn(null);
          }
          dropIndicatorRef.current = null;
          setDropIndicator(null);
          return;
        }

        const { columnKey: targetKey, position } = target;

        if (dragOverColumnRef.current !== targetKey) {
          dragOverColumnRef.current = targetKey;
          setDragOverColumn(targetKey);
        }

        if (
          dropIndicatorRef.current?.columnKey === targetKey &&
          dropIndicatorRef.current?.position === position
        ) {
          return;
        }

        dropIndicatorRef.current = { columnKey: targetKey, position };
        setDropIndicator({ columnKey: targetKey, position });
      };

      const handleEnd = (endEvent) => {
        if (endEvent.pointerId !== activePointerIdRef.current) {
          return;
        }

        const session = dragSessionRef.current;

        if (!session?.started) {
          cleanupPointerListeners();
          return;
        }

        if (endEvent.cancelable) {
          endEvent.preventDefault();
        }
        updateDragGhostPosition(endEvent.clientX, endEvent.clientY);

        const resolvedTarget = resolvePointerTarget(endEvent.clientX);
        const indicator = dropIndicatorRef.current;
        const finalTarget = resolvedTarget || indicator;
        const targetKey =
          finalTarget?.columnKey || dragOverColumnRef.current || draggingColumnRef.current;
        const position = finalTarget?.position || indicator?.position || 'before';

        reorderColumns(draggingColumnRef.current, targetKey, position);
        cleanupPointerListeners();
      };

      const handleCancel = (cancelEvent) => {
        if (cancelEvent.pointerId !== activePointerIdRef.current) {
          return;
        }

        const session = dragSessionRef.current;

        if (session?.started) {
          resetReorderState();
        }

        cleanupPointerListeners();
      };

      pointerMoveListenerRef.current = handleMove;
      pointerUpListenerRef.current = handleEnd;
      pointerCancelListenerRef.current = handleCancel;

      window.addEventListener('pointermove', handleMove, { passive: false });
      window.addEventListener('pointerup', handleEnd, { passive: false });
      window.addEventListener('pointercancel', handleCancel, { passive: false });

      if (event.pointerType !== 'mouse') {
        startDragSession(event);
      }
    },
    [
      cleanupPointerListeners,
      orderedColumns,
      resolvePointerTarget,
      reorderColumns,
      startDragSession,
      updateDragGhostPosition,
      resetReorderState,
      fixedColumns
    ]
  );

  return {
    headerRowRef,
    orderedColumns,
    columnOrder,
    draggingColumn,
    dragOverColumn,
    dropIndicator,
    isReordering,
    handlePointerDown
  };
}
