import React, { useCallback } from 'react';
import { PlayerChip } from './PlayerChip';
import { SoccerBallChip } from './SoccerBallChip';

const AVAILABLE_COLORS = [
  'djurgarden',
  'white',
  'red', 
  'blue',
  'yellow',
  'green',
  'orange',
  'purple',
  'black'
];

const SOCCER_BALL_VARIATIONS = [
  'ball-v1'
];

export function ChipPalette({ onDragStart, isDragging }) {
  
  const handlePlayerChipPointerStart = useCallback((color, event) => {
    if (!onDragStart) return;
    const chipData = {
      type: 'player',
      color: color,
      isNewChip: true
    };
    onDragStart(chipData, event);
  }, [onDragStart]);

  const handleBallChipPointerStart = useCallback((variation, event) => {
    if (!onDragStart) return;
    const chipData = {
      type: 'ball',
      variation: variation,
      isNewChip: true
    };
    onDragStart(chipData, event);
  }, [onDragStart]);

  return (
    <div className={`bg-slate-800 rounded-lg p-4 shadow-lg transition-opacity duration-200 ${isDragging ? 'opacity-90' : ''}`}>
      <h3 className="text-lg font-semibold text-sky-400 mb-3">Chips</h3>
      
      <div className="flex flex-wrap gap-3 justify-center items-end">
        {AVAILABLE_COLORS.map((color) => (
          <PlayerChip
            key={color}
            id={`palette-${color}`}
            color={color}
            number={1}
            isInPalette={true}
            onPointerStart={(event) => handlePlayerChipPointerStart(color, event)}
          />
        ))}
        {SOCCER_BALL_VARIATIONS.map((variation) => (
          <SoccerBallChip
            key={variation}
            id={`palette-${variation}`}
            variation={variation}
            isInPalette={true}
            onPointerStart={(event) => handleBallChipPointerStart(variation, event)}
          />
        ))}
      </div>

      {/* Instructions */}
      <div className="border-t border-slate-700 pt-4 mt-4">
        <p className="text-xs text-slate-400 text-center">
          Drag chips onto the pitch • Double-tap to delete • Numbers auto-increment per color
        </p>
      </div>
    </div>
  );
}