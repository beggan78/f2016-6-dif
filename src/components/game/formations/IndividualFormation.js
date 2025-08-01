import React from 'react';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { findPlayerById } from '../../../utils/playerUtils';
import { getFieldPositions, getSubstitutePositions } from '../../../game/logic/positionUtils';
import { getAllPositions } from '../../../constants/gameModes';
import { 
  getPositionIcon, 
  getPositionDisplayName, 
  getIndicatorProps, 
  getPositionEvents,
  supportsInactivePlayers,
  supportsNextNextIndicators
} from '../../../game/ui/positionUtils';
import { getPlayerStyling } from '../../../game/ui/playerStyling';
import { getPlayerAnimation } from '../../../game/ui/playerAnimation';
import { PlayerStatsDisplay } from './components/PlayerStatsDisplay';
import { FORMATION_STYLES, ICON_STYLES, HELP_MESSAGES } from './constants';

export function IndividualFormation({ 
  teamMode,
  selectedFormation,
  formation,
  allPlayers, 
  animationState,
  recentlySubstitutedPlayers,
  hideNextOffIndicator,
  longPressHandlers,
  goalieHandlers,
  getPlayerNameById,
  getPlayerTimeStats,
  nextPhysicalPairToSubOut, // Filter out React-specific props
  nextPlayerIdToSubOut,
  nextNextPlayerIdToSubOut,
  ...domProps
}) {
  // Handle null/undefined formation
  if (!formation) {
    return <div className="space-y-2" {...domProps}></div>;
  }

  // Create formation-aware team config for position utilities
  // Use selectedFormation if available, otherwise fall back to legacy behavior
  const formationAwareTeamMode = selectedFormation && typeof teamMode === 'string' ? {
    format: '5v5',
    squadSize: parseInt(teamMode.split('_')[1]) || 7,
    formation: selectedFormation,
    substitutionType: 'individual'
  } : teamMode;

  // Get formation-specific position lists from formation definitions
  const fieldPositions = getFieldPositions(formationAwareTeamMode);
  const substitutePositions = getSubstitutePositions(formationAwareTeamMode);
  const allPositions = getAllPositions(formationAwareTeamMode); // Include goalie in formation rendering

  // Mode capabilities - use original teamMode for capability checks (legacy compatibility)
  const modeSupportsInactive = supportsInactivePlayers(teamMode);
  const modeSupportsNextNext = supportsNextNextIndicators(teamMode);

  const renderIndividualPosition = (position, renderIndex) => {
    const playerId = formation[position];

    if (!playerId) return null;
    
    const isFieldPosition = fieldPositions.includes(position);
    const isSubstitutePosition = substitutePositions.includes(position);
    const isGoaliePosition = position === 'goalie';
    const canBeSelected = isFieldPosition;

    // Check if this player was recently substituted
    const isRecentlySubstituted = recentlySubstitutedPlayers.has(playerId);

    // Get player object (needed for next-off indicator logic)
    const player = findPlayerById(allPlayers, playerId);
    // Check if player is inactive (only for modes that support it)
    const isInactive = modeSupportsInactive ? (player?.stats.isInactive || false) : false;

    // Get indicator props using utility
    const { isNextOff, isNextOn, isNextNextOff, isNextNextOn } = getIndicatorProps(
      player, position, teamMode, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut, substitutePositions
    );
    

    const playerRole = position.includes('Defender') ? 'Defender' : (position.includes('Attacker') ? 'Attacker' : null);

    // Get styling and animation using utilities
    const { animationClass, zIndexClass, styleProps } = getPlayerAnimation(playerId, animationState);
    const { bgColor, textColor, borderColor, glowClass } = getPlayerStyling({
      isFieldPosition,
      isInactive,
      isNextOff,
      isNextOn,
      isRecentlySubstituted,
      hideNextOffIndicator,
      supportsInactivePlayers: modeSupportsInactive,
      role: playerRole,
      isGoalie: isGoaliePosition
    });

    // Get utilities
    const longPressEvents = isGoaliePosition && goalieHandlers ? goalieHandlers.goalieEvents : getPositionEvents(longPressHandlers, position);
    const positionDisplayName = isGoaliePosition ? 'Goalie' : getPositionDisplayName(position, player, formationAwareTeamMode, substitutePositions);
    const icon = getPositionIcon(position, substitutePositions);

    return (
      <div 
        key={position}
        data-testid={`player-${playerId}`}
        className={`${FORMATION_STYLES.containerBase} ${borderColor} ${bgColor} ${textColor} ${glowClass} ${animationClass} ${zIndexClass} ${canBeSelected || isSubstitutePosition ? FORMATION_STYLES.interactive : ''}`}
        style={styleProps}
        {...longPressEvents}
      >
        <h3 className="text-sm font-semibold mb-1 flex items-center justify-between">
          {positionDisplayName} {modeSupportsInactive && isInactive && <span className="text-xs text-slate-600">(Inactive)</span>}
          <div className="flex space-x-1">
            {/* Primary indicators (full opacity) - only show for active players */}
            {(!modeSupportsInactive || !isInactive) && isNextOff && !hideNextOffIndicator && <ArrowDownCircle className={`${ICON_STYLES.large} ${ICON_STYLES.indicators.nextOff} inline-block`} />}
            {(!modeSupportsInactive || !isInactive) && isNextOn && !hideNextOffIndicator && <ArrowUpCircle className={`${ICON_STYLES.large} ${ICON_STYLES.indicators.nextOn} inline-block`} />}
            {/* Secondary indicators (very dimmed) - only show for active players and modes that support it */}
            {modeSupportsNextNext && (!isInactive) && isNextNextOff && !hideNextOffIndicator && <ArrowDownCircle className={`${ICON_STYLES.medium} ${ICON_STYLES.indicators.nextNextOff} inline-block`} />}
            {modeSupportsNextNext && (!isInactive) && isNextNextOn && !hideNextOffIndicator && <ArrowUpCircle className={`${ICON_STYLES.medium} ${ICON_STYLES.indicators.nextNextOn} inline-block`} />}
          </div>
        </h3>
        <div className="flex items-center justify-between">
          <div>{icon} {getPlayerNameById ? getPlayerNameById(playerId) : playerId}</div>
          <PlayerStatsDisplay playerId={playerId} getPlayerTimeStats={getPlayerTimeStats} />
        </div>
        {canBeSelected && (
          <p className={FORMATION_STYLES.helpText}>{HELP_MESSAGES.fieldPlayerOptions}</p>
        )}
        {isSubstitutePosition && modeSupportsInactive && (
          <p className={FORMATION_STYLES.helpText}>{HELP_MESSAGES.substituteToggle(isInactive)}</p>
        )}
        {isGoaliePosition && (
          <p className={FORMATION_STYLES.helpText}>Hold to replace goalie</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2" {...domProps}>
      {allPositions.map((position, index) => 
        renderIndividualPosition(position, index)
      )}
    </div>
  );
}