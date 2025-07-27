import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PlayerChip } from './PlayerChip';
import { SoccerBallChip } from './SoccerBallChip';
import { ChipPalette } from './ChipPalette';
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
  const [draggedChip, setDraggedChip] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [ghostChip, setGhostChip] = useState(null);
  const nextChipId = useRef(1);
  
  // Track chip numbers by color for auto-incrementing
  const chipNumbers = useRef({});

  const getNextChipNumber = useCallback((color) => {
    if (!chipNumbers.current[color]) {
      chipNumbers.current[color] = 1;
    }
    return chipNumbers.current[color]++;
  }, []);

  const handlePointerStart = useCallback((chipData, event) => {
    event.preventDefault();
    setDraggedChip(chipData);
    setIsDragging(true);
    
    if (boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      
      if (chipData.isNewChip) {
        // For new chips from palette, create ghost chip and track mouse position
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        
        setGhostChip({
          type: chipData.type,
          color: chipData.color,
          variation: chipData.variation,
          number: chipData.type === 'player' ? getNextChipNumber(chipData.color) : null,
          x: Math.max(3, Math.min(97, x)),
          y: Math.max(3, Math.min(97, y))
        });
        setDragOffset({ x: 0, y: 0 });
      } else {
        // For existing chips, calculate offset for smooth dragging
        const chipX = (chipData.x / 100) * rect.width;
        const chipY = (chipData.y / 100) * rect.height;
        
        setDragOffset({
          x: event.clientX - rect.left - chipX,
          y: event.clientY - rect.top - chipY
        });
        setGhostChip(null);
      }
    }
    
    // Capture pointer for smooth tracking
    if (event.target.setPointerCapture) {
      event.target.setPointerCapture(event.pointerId);
    }
  }, [getNextChipNumber]);

  const handlePointerMove = useCallback((event) => {
    if (!isDragging || !draggedChip || !boardRef.current) return;
    
    event.preventDefault();
    const rect = boardRef.current.getBoundingClientRect();
    
    if (draggedChip.isNewChip && ghostChip) {
      // Update ghost chip position for new chips from palette
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      
      setGhostChip(prev => ({
        ...prev,
        x: Math.max(3, Math.min(97, x)),
        y: Math.max(3, Math.min(97, y))
      }));
    } else if (!draggedChip.isNewChip) {
      // For existing chips, update position in real-time
      const x = ((event.clientX - rect.left - dragOffset.x) / rect.width) * 100;
      const y = ((event.clientY - rect.top - dragOffset.y) / rect.height) * 100;
      const clampedX = Math.max(3, Math.min(97, x));
      const clampedY = Math.max(3, Math.min(97, y));
      onChipMove(draggedChip.id, { x: clampedX, y: clampedY });
    }
  }, [isDragging, draggedChip, dragOffset, ghostChip, onChipMove]);

  const handlePointerEnd = useCallback((event) => {
    if (!isDragging || !draggedChip || !boardRef.current) return;
    
    event.preventDefault();
    
    if (draggedChip.isNewChip && ghostChip) {
      // Create new chip from palette using ghost chip position
      const newChip = {
        id: `chip-${nextChipId.current++}`,
        type: ghostChip.type,
        color: ghostChip.color,
        variation: ghostChip.variation,
        number: ghostChip.number,
        x: ghostChip.x,
        y: ghostChip.y
      };
      onChipPlace(newChip);
    }

    // Clear all drag state
    setDraggedChip(null);
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
    setGhostChip(null);
  }, [isDragging, draggedChip, ghostChip, onChipPlace]);

  // Add global pointer event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerEnd);
      document.addEventListener('pointercancel', handlePointerEnd);
      
      return () => {
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerEnd);
        document.removeEventListener('pointercancel', handlePointerEnd);
      };
    }
  }, [isDragging, handlePointerMove, handlePointerEnd]);

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
            aspectRatio: pitchMode === 'full' ? '16 / 23' : '5 / 4', // Full pitch perfect, half pitch adjusted for full vertical height
            width: '100%'
          }}
        >

          {/* Placed Chips */}
          {placedChips.map((chip) => (
            chip.type === 'player' ? (
              <PlayerChip
                key={chip.id}
                id={chip.id}
                color={chip.color}
                number={chip.number}
                x={chip.x}
                y={chip.y}
                onPointerStart={(event) => handlePointerStart(chip, event)}
                onDoubleClick={() => handleChipDoubleClick(chip.id)}
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
              />
            )
          ))}

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
        </div>
      </div>

      {/* Chip Palette */}
      <ChipPalette onDragStart={handlePointerStart} isDragging={isDragging} />
    </div>
  );
}