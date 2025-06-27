import React from 'react';
import { ArrowUpCircle, ArrowDownCircle, Shield, Sword } from 'lucide-react';
import { getPositionEvents } from '../../../game/ui/positionUtils';
import { getPlayerStyling } from '../../../game/ui/playerStyling';
import { getPairAnimation } from '../../../game/ui/playerAnimation';
import { PlayerStatsDisplay } from './components/PlayerStatsDisplay';
import { FORMATION_STYLES, ICON_STYLES, HELP_MESSAGES } from './constants';

export function PairsFormation({ 
  periodFormation, 
  allPlayers, 
  animationState, 
  recentlySubstitutedPlayers,
  hideNextOffIndicator,
  nextPhysicalPairToSubOut,
  longPressHandlers,
  getPlayerNameById,
  getPlayerTimeStats 
}) {
  // Handle null/undefined periodFormation
  if (!periodFormation) {
    return (
      <div className="space-y-2">
        <div>Left</div>
        <div>Right</div>
        <div>Substitutes</div>
      </div>
    );
  }

  const renderPair = (pairKey, pairDisplayName, renderIndex) => {
    const pairData = periodFormation[pairKey];
    if (!pairData) return null;

    const isNextOff = pairKey === nextPhysicalPairToSubOut;
    const isNextOn = pairKey === 'subPair';
    const canBeSelected = pairKey !== 'subPair';

    // Check if any player in this pair was recently substituted
    const hasRecentlySubstitutedPlayer = 
      recentlySubstitutedPlayers.has(pairData.defender) || 
      recentlySubstitutedPlayers.has(pairData.attacker);

    const isFieldPair = pairKey === 'leftPair' || pairKey === 'rightPair';

    // Get styling and animation using utilities
    const { animationClass, zIndexClass, styleProps } = getPairAnimation(
      pairData.defender, pairData.attacker, animationState
    );
    const { bgColor, textColor, borderColor, glowClass } = getPlayerStyling({
      isFieldPosition: isFieldPair,
      isInactive: false, // Pairs mode doesn't support inactive players
      isNextOff,
      isNextOn,
      isRecentlySubstituted: hasRecentlySubstitutedPlayer,
      hideNextOffIndicator,
      supportsInactivePlayers: false
    });

    const longPressEvents = getPositionEvents(longPressHandlers, pairKey);

    return (
      <div 
        key={pairKey}
        className={`${FORMATION_STYLES.containerBase} ${borderColor} ${bgColor} ${textColor} ${glowClass} ${animationClass} ${zIndexClass} ${canBeSelected ? FORMATION_STYLES.interactive : ''}`}
        style={styleProps}
        {...longPressEvents}
      >
        <h3 className="text-sm font-semibold mb-1 flex items-center justify-between">
          {pairDisplayName}
          <div>
            {isNextOff && !hideNextOffIndicator && <ArrowDownCircle className={`${ICON_STYLES.large} ${ICON_STYLES.indicators.nextOff} inline-block`} />}
            {isNextOn && !hideNextOffIndicator && <ArrowUpCircle className={`${ICON_STYLES.large} ${ICON_STYLES.indicators.nextOn} inline-block`} />}
          </div>
        </h3>
        <div className="space-y-0.5">
          <div className="flex items-center justify-between">
            <div><Shield className={ICON_STYLES.small} /> D: {getPlayerNameById ? getPlayerNameById(pairData.defender) : pairData.defender}</div>
            <PlayerStatsDisplay playerId={pairData.defender} getPlayerTimeStats={getPlayerTimeStats} className="ml-4" />
          </div>
          <div className="flex items-center justify-between">
            <div><Sword className={ICON_STYLES.small} /> A: {getPlayerNameById ? getPlayerNameById(pairData.attacker) : pairData.attacker}</div>
            <PlayerStatsDisplay playerId={pairData.attacker} getPlayerTimeStats={getPlayerTimeStats} className="ml-4" />
          </div>
        </div>
        {canBeSelected && (
          <p className={FORMATION_STYLES.helpText}>{HELP_MESSAGES.fieldPlayerOptions}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {renderPair('leftPair', 'Left', 0)}
      {renderPair('rightPair', 'Right', 1)}
      {renderPair('subPair', 'Substitutes', 2)}
    </div>
  );
}