import React, { useRef, useCallback } from 'react';
import { PlayerChip } from './PlayerChip';
import { SoccerBallChip } from './SoccerBallChip';
import { ChipPalette } from './ChipPalette';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import fullFieldImage from '../../assets/images/full-field.png';
import halfFieldImage from '../../assets/images/half-field.png';

export function TacticalBoard({ 
  pitchMode, 
  placedChips, 
  onChipPlace, 
  onChipMove, 
  onChipDelete 
}) {
  const boardRef = useRef(null);
  
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

  const handleChipDoubleClick = useCallback((chipId) => {
    onChipDelete(chipId);
  }, [onChipDelete]);


  return (
    <div className="flex flex-col space-y-4 max-w-4xl mx-auto">
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
            width: '100%'
          }}
        >

          {/* Placed Chips */}
          {placedChips.map((chip) => {
            // Hide the chip if it's currently being dragged
            const isBeingDragged = isChipBeingDragged(chip.id);
            
            return chip.type === 'player' ? (
              <PlayerChip
                key={chip.id}
                id={chip.id}
                color={chip.color}
                number={chip.number}
                x={chip.x}
                y={chip.y}
                onPointerStart={(event) => handlePointerStart(chip, event)}
                onDoubleClick={() => handleChipDoubleClick(chip.id)}
                style={{
                  opacity: isBeingDragged ? 0 : 1,
                  transition: isBeingDragged ? 'none' : 'opacity 0.1s ease'
                }}
              />
            ) : (
              <SoccerBallChip
                key={chip.id}
                id={chip.id}
                x={chip.x}
                y={chip.y}
                variation={chip.variation}
                onPointerStart={(event) => handlePointerStart(chip, event)}
                onDoubleClick={() => handleChipDoubleClick(chip.id)}
                style={{
                  opacity: isBeingDragged ? 0 : 1,
                  transition: isBeingDragged ? 'none' : 'opacity 0.1s ease'
                }}
              />
            );
          })}

          {/* Ghost Chip for Drag Preview */}
          {ghostChip && (
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
      <ChipPalette onDragStart={handlePointerStart} isDragging={isDragging} />
    </div>
  );
}