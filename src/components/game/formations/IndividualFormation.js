import React from 'react';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { findPlayerById } from '../../../utils/playerUtils';
import { getFieldPositions, getSubstitutePositions } from '../../../game/logic/positionUtils';
import { getAllPositions } from '../../../utils/formationUtils';
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
  
  // Formation capabilities
  const formationSupportsInactive = supportsInactivePlayers(formationType);
  const formationSupportsNextNext = supportsNextNextIndicators(formationType);

  const renderIndividualPosition = (position, renderIndex) => {
    const playerId = periodFormation[position];
    if (!playerId) return null;
    
    const isFieldPosition = fieldPositions.includes(position);
    const isSubstitutePosition = substitutePositions.includes(position);
    const canBeSelected = isFieldPosition;

    // Check if this player was recently substituted
    const isRecentlySubstituted = recentlySubstitutedPlayers.has(playerId);

    // Check if player is inactive (only for formations that support it)
    const player = formationSupportsInactive ? findPlayerById(allPlayers, playerId) : null;
    const isInactive = player?.stats.isInactive || false;

    // Get indicator props using utility
    const { isNextOff, isNextOn, isNextNextOff, isNextNextOn } = getIndicatorProps(
      player, position, formationType, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut, substitutePositions
    );

    // Get styling and animation using utilities
    const { animationClass, zIndexClass, styleProps } = getPlayerAnimation(playerId, animationState);
    const { bgColor, textColor, borderColor, glowClass } = getPlayerStyling({
      isFieldPosition,
      isInactive,
      isNextOff,
      isNextOn,
      isRecentlySubstituted,
      hideNextOffIndicator,
      supportsInactivePlayers: formationSupportsInactive
    });

    // Get utilities
    const longPressEvents = getPositionEvents(longPressHandlers, position);
    const positionDisplayName = getPositionDisplayName(position, player, formationType, substitutePositions);
    const icon = getPositionIcon(position, substitutePositions);

    return (
      <div 
        key={position}
        className={`${FORMATION_STYLES.containerBase} ${borderColor} ${bgColor} ${textColor} ${glowClass} ${animationClass} ${zIndexClass} ${canBeSelected || isSubstitutePosition ? FORMATION_STYLES.interactive : ''}`}
        style={styleProps}
        {...longPressEvents}
      >
        <h3 className="text-sm font-semibold mb-1 flex items-center justify-between">
          {positionDisplayName} {formationSupportsInactive && isInactive && <span className="text-xs text-slate-600">(Inactive)</span>}
          <div className="flex space-x-1">
            {/* Primary indicators (full opacity) - only show for active players */}
            {(!formationSupportsInactive || !isInactive) && isNextOff && !hideNextOffIndicator && <ArrowDownCircle className={`${ICON_STYLES.large} ${ICON_STYLES.indicators.nextOff} inline-block`} />}
            {(!formationSupportsInactive || !isInactive) && isNextOn && !hideNextOffIndicator && <ArrowUpCircle className={`${ICON_STYLES.large} ${ICON_STYLES.indicators.nextOn} inline-block`} />}
            {/* Secondary indicators (very dimmed) - only show for active players and formations that support it */}
            {formationSupportsNextNext && (!isInactive) && isNextNextOff && !hideNextOffIndicator && <ArrowDownCircle className={`${ICON_STYLES.medium} ${ICON_STYLES.indicators.nextNextOff} inline-block`} />}
            {formationSupportsNextNext && (!isInactive) && isNextNextOn && !hideNextOffIndicator && <ArrowUpCircle className={`${ICON_STYLES.medium} ${ICON_STYLES.indicators.nextNextOn} inline-block`} />}
          </div>
        </h3>
        <div className="flex items-center justify-between">
          <div>{icon} {getPlayerNameById(playerId)}</div>
          <PlayerStatsDisplay playerId={playerId} getPlayerTimeStats={getPlayerTimeStats} />
        </div>
        {canBeSelected && (
          <p className={FORMATION_STYLES.helpText}>{HELP_MESSAGES.fieldPlayerOptions}</p>
        )}
        {isSubstitutePosition && formationSupportsInactive && (
          <p className={FORMATION_STYLES.helpText}>{HELP_MESSAGES.substituteToggle(isInactive)}</p>
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