import React from 'react';
import { ArrowUpCircle, ArrowDownCircle, Shield, Sword, RotateCcw, Clock } from 'lucide-react';
import { getPlayerAnimationProps } from '../../../game/animation/animationSupport';
import { formatTime, formatTimeDifference } from '../../../utils/formatUtils';
import { findPlayerById } from '../../../utils/playerUtils';
import { getFieldPositions, getSubstitutePositions, getAllPositions } from '../../../utils/formationUtils';
import { FORMATION_TYPES } from '../../../constants/playerConstants';

export function IndividualFormation({ 
  formationType,
  periodFormation, 
  allPlayers, 
  animationState,
  recentlySubstitutedPlayers,
  hideNextOffIndicator,
  nextPlayerIdToSubOut,
  nextNextPlayerIdToSubOut,
  longPressHandlers,
  getPlayerNameById,
  getPlayerTimeStats 
}) {
  // Get formation-specific position lists from formation definitions
  const fieldPositions = getFieldPositions(formationType);
  const substitutePositions = getSubstitutePositions(formationType);
  const allPositions = getAllPositions(formationType).filter(pos => pos !== 'goalie');
  
  // Check if this formation supports inactive players (7+ player modes)
  const supportsInactivePlayers = formationType === FORMATION_TYPES.INDIVIDUAL_7;
  
  // Check if this formation supports next/nextNext indicators (7+ player modes)
  const supportsNextNextIndicators = formationType === FORMATION_TYPES.INDIVIDUAL_7;

  const getPositionIcon = (position) => {
    if (substitutePositions.includes(position)) {
      return <RotateCcw className="inline h-3 w-3 mr-1" />;
    } else if (position.includes('Defender')) {
      return <Shield className="inline h-3 w-3 mr-1" />;
    } else {
      return <Sword className="inline h-3 w-3 mr-1" />;
    }
  };

  const getPositionDisplayName = (position) => {
    // Dynamic position name mapping
    const nameMap = {
      leftDefender: 'Left Defender',
      rightDefender: 'Right Defender', 
      leftAttacker: 'Left Attacker',
      rightAttacker: 'Right Attacker',
      substitute: 'Substitute',
      leftDefender7: 'Left Defender',
      rightDefender7: 'Right Defender',
      leftAttacker7: 'Left Attacker', 
      rightAttacker7: 'Right Attacker',
      substitute7_1: 'Substitute',
      substitute7_2: 'Substitute'
    };
    
    // For substitute positions with inactive support, check player status
    if (supportsInactivePlayers && substitutePositions.includes(position)) {
      const playerId = periodFormation[position];
      const player = findPlayerById(allPlayers, playerId);
      if (player?.stats.isInactive) {
        return 'Inactive';
      }
    }
    
    return nameMap[position] || position;
  };

  const renderIndividualPosition = (position, renderIndex) => {
    const playerId = periodFormation[position];
    if (!playerId) return null;
    
    const isFieldPosition = fieldPositions.includes(position);
    const isSubstitutePosition = substitutePositions.includes(position);
    
    // Dynamic next/nextNext logic based on formation type and substitute positions
    const isNextOff = playerId === nextPlayerIdToSubOut;
    const isNextOn = isSubstitutePosition && position === substitutePositions[0]; // First substitute is "next on"
    const isNextNextOff = supportsNextNextIndicators ? playerId === nextNextPlayerIdToSubOut : false;
    const isNextNextOn = supportsNextNextIndicators && isSubstitutePosition && position === substitutePositions[1]; // Second substitute is "next next on"
    
    const canBeSelected = isFieldPosition;

    // Check if this player was recently substituted
    const isRecentlySubstituted = recentlySubstitutedPlayers.has(playerId);

    // Check if player is inactive (only for formations that support it)
    const player = supportsInactivePlayers ? findPlayerById(allPlayers, playerId) : null;
    const isInactive = player?.stats.isInactive || false;

    // Animation logic
    let animationClass = '';
    let zIndexClass = '';
    let styleProps = {};
    
    const animationProps = getPlayerAnimationProps(playerId, animationState);
    if (animationProps) {
      animationClass = animationProps.animationClass;
      zIndexClass = animationProps.zIndexClass;
      styleProps = animationProps.styleProps;
    }

    // Styling logic
    let bgColor = 'bg-slate-700'; // Default for substitute
    let textColor = 'text-slate-300';
    let borderColor = 'border-transparent';
    let glowClass = '';

    if (isFieldPosition) { // On field
      bgColor = 'bg-sky-700';
      textColor = 'text-sky-100';
    }

    // Inactive players get dimmed appearance (only for formations that support it)
    if (supportsInactivePlayers && isInactive) {
      bgColor = 'bg-slate-800';
      textColor = 'text-slate-500';
    }

    if (isNextOff && !hideNextOffIndicator) {
      borderColor = 'border-rose-500';
    }
    if (isNextOn && !hideNextOffIndicator) {
      borderColor = 'border-emerald-500';
    }

    // Add glow effect for recently substituted players
    if (isRecentlySubstituted) {
      glowClass = 'animate-pulse shadow-lg shadow-amber-400/50 border-amber-400';
      borderColor = 'border-amber-400';
    }

    const longPressEvents = longPressHandlers[`${position}Events`] || {};
    const positionDisplayName = getPositionDisplayName(position);
    const icon = getPositionIcon(position);

    return (
      <div 
        key={position}
        className={`p-2 rounded-lg shadow-md transition-all duration-300 border-2 ${borderColor} ${bgColor} ${textColor} ${glowClass} ${animationClass} ${zIndexClass} ${canBeSelected || isSubstitutePosition ? 'cursor-pointer select-none' : ''} relative`}
        style={styleProps}
        {...longPressEvents}
      >
        <h3 className="text-sm font-semibold mb-1 flex items-center justify-between">
          {positionDisplayName} {supportsInactivePlayers && isInactive && <span className="text-xs text-slate-600">(Inactive)</span>}
          <div className="flex space-x-1">
            {/* Primary indicators (full opacity) - only show for active players */}
            {(!supportsInactivePlayers || !isInactive) && isNextOff && !hideNextOffIndicator && <ArrowDownCircle className="h-5 w-5 text-rose-400 inline-block" />}
            {(!supportsInactivePlayers || !isInactive) && isNextOn && !hideNextOffIndicator && <ArrowUpCircle className="h-5 w-5 text-emerald-400 inline-block" />}
            {/* Secondary indicators (very dimmed) - only show for active players and formations that support it */}
            {supportsNextNextIndicators && (!isInactive) && isNextNextOff && !hideNextOffIndicator && <ArrowDownCircle className="h-4 w-4 text-rose-200 opacity-40 inline-block" />}
            {supportsNextNextIndicators && (!isInactive) && isNextNextOn && !hideNextOffIndicator && <ArrowUpCircle className="h-4 w-4 text-emerald-200 opacity-40 inline-block" />}
          </div>
        </h3>
        <div className="flex items-center justify-between">
          <div>{icon} {getPlayerNameById(playerId)}</div>
          {playerId && (() => {
            const stats = getPlayerTimeStats(playerId);
            return (
              <div className="text-right text-xs">
                <span><Clock className="inline h-3 w-3" /> <span className="font-mono">{formatTime(stats.totalOutfieldTime)}</span></span>
                <span className="ml-3"><Sword className="inline h-3 w-3" /> <span className="font-mono">{formatTimeDifference(stats.attackDefenderDiff)}</span></span>
              </div>
            );
          })()}
        </div>
        {canBeSelected && (
          <p className="text-xs text-slate-400 mt-0.5">Hold for options</p>
        )}
        {isSubstitutePosition && supportsInactivePlayers && (
          <p className="text-xs text-slate-400 mt-0.5">Hold to {isInactive ? 'activate' : 'inactivate'}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {allPositions.map((position, index) => 
        renderIndividualPosition(position, index)
      )}
    </div>
  );
}