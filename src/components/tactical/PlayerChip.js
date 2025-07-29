import React from 'react';
import { BaseChip } from './BaseChip';
import { CHIP_COLORS, CHIP_APPEARANCE } from '../../config/tacticalBoardConfig';

export function PlayerChip({ 
  id, 
  color, 
  number, 
  x, 
  y, 
  onPointerStart, 
  onDoubleClick,
  isInPalette = false,
  style = {}
}) {
  const chipClasses = CHIP_COLORS[color] || CHIP_COLORS.white;
  
  // Special styling for Djurgården striped jersey
  const isDjurgarden = color === 'djurgarden';

  const playerChipClasses = `
    ${CHIP_APPEARANCE.PLAYER_CHIP.WIDTH}
    rounded-full 
    ${CHIP_APPEARANCE.PLAYER_CHIP.BORDER}
    ${chipClasses}
    flex 
    items-center 
    justify-center 
    font-bold 
    ${CHIP_APPEARANCE.PLAYER_CHIP.TEXT_SIZE}
    ${isDjurgarden ? 'overflow-hidden' : ''}
  `.trim();

  return (
    <BaseChip
      id={id}
      x={x}
      y={y}
      onPointerStart={onPointerStart}
      onDoubleClick={onDoubleClick}
      isInPalette={isInPalette}
      style={style}
      className={playerChipClasses}
    >
      {/* Djurgården striped pattern (winner: #3 - slightly thicker stripes) */}
      {isDjurgarden && (
        <div className="absolute inset-0 rounded-full overflow-hidden bg-sky-400">
          <div className="absolute top-0 bottom-0 bg-blue-800" style={{left: '13.5%', width: '16%'}}></div>
          <div className="absolute top-0 bottom-0 bg-blue-800" style={{left: '42%', width: '16%'}}></div>
          <div className="absolute top-0 bottom-0 bg-blue-800" style={{left: '70.5%', width: '16%'}}></div>
        </div>
      )}
      
      {/* Number display */}
      <span className="relative z-10 font-bold">
        {number}
      </span>
    </BaseChip>
  );
}