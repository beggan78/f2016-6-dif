import React from 'react';
import { BaseChip } from './BaseChip';
import { CHIP_APPEARANCE } from '../../config/tacticalBoardConfig';

export function SoccerBallChip({ 
  id, 
  x, 
  y, 
  variation = 'ball-v1',
  number,
  onPointerStart, 
  onDoubleClick,
  isInPalette = false,
  style = {}
}) {
  const soccerBallClasses = `
    ${CHIP_APPEARANCE.SOCCER_BALL_CHIP.WIDTH}
    rounded-full 
    overflow-hidden
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
      className={soccerBallClasses}
    >
      {/* Soccer ball pattern variations */}
      <div className="absolute inset-0 bg-white rounded-full">
        {variation === 'ball-v1' && (
          <>
            {/* 1: Centered pentagon with three accent dots */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-black" style={{clipPath: 'polygon(50% 0%, 95% 35%, 78% 90%, 22% 90%, 5% 35%)'}}></div>
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-0.5 bg-black rounded-full"></div>
            <div className="absolute bottom-0 left-1/4 w-0.5 h-0.5 bg-black rounded-full"></div>
            <div className="absolute bottom-0 right-1/4 w-0.5 h-0.5 bg-black rounded-full"></div>
          </>
        )}
      </div>
      
      {/* Number display for palette */}
      {isInPalette && number && (
        <span className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-sm font-bold text-white bg-slate-900 rounded px-1">
          {number}
        </span>
      )}
    </BaseChip>
  );
}