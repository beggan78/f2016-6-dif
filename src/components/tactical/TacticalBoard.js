import React, { useRef, useCallback, useState, useEffect } from 'react';
import { PlayerChip } from './PlayerChip';
import { SoccerBallChip } from './SoccerBallChip';
import { ChipPalette } from './ChipPalette';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import { DRAWING } from '../../config/tacticalBoardConfig';
import fullFieldImage from '../../assets/images/full-field.png';
import halfFieldImage from '../../assets/images/half-field.png';

export function TacticalBoard({ 
  pitchMode, 
  placedChips, 
  onChipPlace, 
  onChipMove, 
  onChipDelete,
  interactionMode = 'drag',
  drawings = [],
  onAddDrawing,
}) {
  const boardRef = useRef(null);
  const drawingSurfaceRef = useRef(null);
  const activeStrokeRef = useRef(null);
  const [activeStroke, setActiveStroke] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawMode = interactionMode === 'draw';
  
  // Track chip numbers by color for auto-incrementing
  const chipNumbers = useRef({});

  const getNextChipNumber = useCallback((color) => {
    if (!chipNumbers.current[color]) {
      chipNumbers.current[color] = 1;
    }
    return chipNumbers.current[color]++;
  }, []);

  // Use the drag and drop hook
  const { 
    isDragging, 
    ghostChip, 
    handlePointerStart, 
    isChipBeingDragged 
  } = useDragAndDrop(boardRef, onChipPlace, onChipMove, getNextChipNumber);

  const handlePointerStartSafe = useCallback((chip, event) => {
    if (isDrawMode) return;
    handlePointerStart(chip, event);
  }, [isDrawMode, handlePointerStart]);

  const handleChipDoubleClick = useCallback((chipId) => {
    if (isDrawMode) return;
    onChipDelete(chipId);
  }, [onChipDelete, isDrawMode]);

  const isChipVisible = useCallback((chipId) => {
    if (isDrawMode) return true;
    return !isChipBeingDragged(chipId);
  }, [isDrawMode, isChipBeingDragged]);

  const getNormalizedPoint = useCallback((event) => {
    if (drawingSurfaceRef.current) {
      const svg = drawingSurfaceRef.current;
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const ctm = svg.getScreenCTM();
      if (ctm) {
        const transformed = point.matrixTransform(ctm.inverse());
        return {
          x: Math.max(0, Math.min(100, transformed.x)),
          y: Math.max(0, Math.min(100, transformed.y)),
        };
      }
    }

    if (!boardRef.current) return null;
    const rect = boardRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };
  }, []);

  const handleDrawingPointerDown = useCallback((event) => {
    if (!isDrawMode) return;
    event.preventDefault();
    const point = getNormalizedPoint(event);
    if (!point) return;

    const newStroke = {
      id: `drawing-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      color: DRAWING.COLOR,
      width: DRAWING.WIDTH,
      points: [point],
    };

    activeStrokeRef.current = newStroke;
    setActiveStroke(newStroke);
    setIsDrawing(true);
  }, [getNormalizedPoint, isDrawMode]);

  const appendPointToStroke = useCallback((point) => {
    if (!activeStrokeRef.current) return;
    activeStrokeRef.current = {
      ...activeStrokeRef.current,
      points: [...activeStrokeRef.current.points, point],
    };
    setActiveStroke(activeStrokeRef.current);
  }, []);

  const finishDrawing = useCallback(() => {
    if (!activeStrokeRef.current) {
      setIsDrawing(false);
      setActiveStroke(null);
      return;
    }

    const strokeToSave = activeStrokeRef.current;
    if (strokeToSave.points.length > 1 && onAddDrawing) {
      onAddDrawing(strokeToSave);
    }

    activeStrokeRef.current = null;
    setActiveStroke(null);
    setIsDrawing(false);
  }, [onAddDrawing]);

  useEffect(() => {
    if (!isDrawing) return;

    const handlePointerMove = (event) => {
      if (!isDrawMode) return;
      event.preventDefault();
      const point = getNormalizedPoint(event);
      if (!point) return;
      appendPointToStroke(point);
    };

    const handlePointerUp = () => {
      finishDrawing();
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [appendPointToStroke, finishDrawing, getNormalizedPoint, isDrawMode, isDrawing]);

  useEffect(() => {
    if (!isDrawMode && isDrawing) {
      finishDrawing();
    }
  }, [isDrawMode, isDrawing, finishDrawing]);

  const renderStroke = useCallback((stroke) => {
    if (!stroke || !stroke.points || stroke.points.length < 2) return null;
    const pointsAttr = stroke.points.map((point) => `${point.x},${point.y}`).join(' ');
    return (
      <polyline
        key={stroke.id}
        points={pointsAttr}
        fill="none"
        stroke={stroke.color || DRAWING.COLOR}
        strokeWidth={stroke.width || DRAWING.WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }, []);

  return (
    <div className="flex flex-col space-y-4 max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto">
      {/* Soccer Pitch */}
      <div className="relative w-full bg-slate-800 rounded-lg overflow-hidden shadow-2xl">
        <div 
          ref={boardRef}
          className="relative w-full"
          style={{ 
            backgroundImage: pitchMode === 'full' ? `url(${fullFieldImage})` : `url(${halfFieldImage})`,
            backgroundSize: 'cover', // Use cover to fill the rounded container completely
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            touchAction: 'none', // Prevent default touch behaviors
            aspectRatio: pitchMode === 'full' ? '16 / 23' : '5 / 4',
            width: '100%',
            cursor: isDrawMode ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23facc15' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 20h9'/%3E%3Cpath d='M16.5 3.5l4 4L7 21l-4 1 1-4 12.5-12.5z'/%3E%3C/svg%3E\") 0 24, crosshair" : 'default'
          }}
        >

          {/* Placed Chips */}
          {placedChips.map((chip) => {
            // Hide the chip if it's currently being dragged
            const isBeingDragged = !isDrawMode && !isChipVisible(chip.id);
            
            return chip.type === 'player' ? (
              <PlayerChip
                key={chip.id}
                id={chip.id}
                color={chip.color}
                number={chip.number}
                x={chip.x}
                y={chip.y}
                onPointerStart={(event) => handlePointerStartSafe(chip, event)}
                onDoubleClick={() => handleChipDoubleClick(chip.id)}
                style={{
                  opacity: isBeingDragged ? 0 : 1,
                  transition: isBeingDragged ? 'none' : 'opacity 0.1s ease',
                  cursor: isDrawMode ? 'not-allowed' : undefined,
                }}
              />
            ) : (
              <SoccerBallChip
                key={chip.id}
                id={chip.id}
                x={chip.x}
                y={chip.y}
                variation={chip.variation}
                onPointerStart={(event) => handlePointerStartSafe(chip, event)}
                onDoubleClick={() => handleChipDoubleClick(chip.id)}
                style={{
                  opacity: isBeingDragged ? 0 : 1,
                  transition: isBeingDragged ? 'none' : 'opacity 0.1s ease',
                  cursor: isDrawMode ? 'not-allowed' : undefined,
                }}
              />
            );
          })}

          {/* Ghost Chip for Drag Preview */}
          {!isDrawMode && ghostChip && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${ghostChip.x}%`,
                top: `${ghostChip.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 100,
                opacity: 0.7,
                transition: 'opacity 0.1s ease'
              }}
            >
              {ghostChip.type === 'player' ? (
                <PlayerChip
                  id="ghost-chip"
                  color={ghostChip.color}
                  number={ghostChip.number}
                  x={0}
                  y={0}
                  isInPalette={false}
                />
              ) : (
                <SoccerBallChip
                  id="ghost-chip"
                  x={0}
                  y={0}
                  variation={ghostChip.variation}
                  isInPalette={false}
                />
              )}
            </div>
          )}

          {/* Drawing layer */}
          <svg
            ref={drawingSurfaceRef}
            className="absolute inset-0 z-30"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{
              pointerEvents: isDrawMode ? 'auto' : 'none',
              touchAction: 'none',
            }}
            onPointerDown={handleDrawingPointerDown}
          >
            {drawings.map((stroke) => renderStroke(stroke))}
            {activeStroke && renderStroke(activeStroke)}
          </svg>

          {/* Vecteezy Attribution - Required for Free License */}
          <div className="absolute bottom-0 right-1 z-20">
            <a
              href="https://www.vecteezy.com/free-vector/football-pitch"
              target="_blank"
              rel="noopener noreferrer"
              className="text-2xs text-green-200 hover:text-green-200 transition-colors duration-200"
              style={{ fontSize: '10px' }}
            >
              Design by Vecteezy
            </a>
          </div>
        </div>
      </div>

      {/* Chip Palette */}
      <ChipPalette 
        onDragStart={handlePointerStartSafe} 
        isDragging={!isDrawMode && isDragging} 
        isInteractionDisabled={isDrawMode}
      />
    </div>
  );
}

// Memoize TacticalBoard to prevent unnecessary re-renders
export default React.memo(TacticalBoard);
