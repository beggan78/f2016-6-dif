import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PlayerChip } from './PlayerChip';
import { SoccerBallChip } from './SoccerBallChip';
import { AVAILABLE_COLORS, SOCCER_BALL_VARIATIONS } from '../../config/tacticalBoardConfig';

export function ChipPalette({ onDragStart, isDragging, isInteractionDisabled = false }) {
  const { t } = useTranslation('tactical');
  
  const handlePlayerChipPointerStart = useCallback((color, event) => {
    if (!onDragStart || isInteractionDisabled) return;
    const chipData = {
      type: 'player',
      color: color,
      isNewChip: true
    };
    onDragStart(chipData, event);
  }, [onDragStart, isInteractionDisabled]);

  const handleBallChipPointerStart = useCallback((variation, event) => {
    if (!onDragStart || isInteractionDisabled) return;
    const chipData = {
      type: 'ball',
      variation: variation,
      isNewChip: true
    };
    onDragStart(chipData, event);
  }, [onDragStart, isInteractionDisabled]);

  return (
    <div 
      className={`bg-slate-800 rounded-lg p-4 shadow-lg transition-opacity duration-200 ${isDragging ? 'opacity-90' : ''} ${isInteractionDisabled ? 'opacity-80' : ''}`}
      aria-disabled={isInteractionDisabled}
    >
      <div className="flex flex-wrap gap-3 justify-center items-end">
        {AVAILABLE_COLORS.map((color) => (
          <PlayerChip
            key={color}
            id={`palette-${color}`}
            color={color}
            number={1}
            isInPalette={true}
            onPointerStart={isInteractionDisabled ? undefined : (event) => handlePlayerChipPointerStart(color, event)}
            style={isInteractionDisabled ? { cursor: 'not-allowed' } : undefined}
          />
        ))}
        {SOCCER_BALL_VARIATIONS.map((variation) => (
          <SoccerBallChip
            key={variation}
            id={`palette-${variation}`}
            variation={variation}
            isInPalette={true}
            onPointerStart={isInteractionDisabled ? undefined : (event) => handleBallChipPointerStart(variation, event)}
            style={isInteractionDisabled ? { cursor: 'not-allowed' } : undefined}
          />
        ))}
      </div>

      {/* Instructions */}
      <div className="border-t border-slate-700 pt-4 mt-4">
        <p className="text-xs text-slate-400 text-center">
          {isInteractionDisabled
            ? t('palette.drawModeHint')
            : t('palette.dragInstruction')}
        </p>
      </div>
    </div>
  );
}
