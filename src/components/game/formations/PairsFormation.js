import React from 'react';
import { ArrowUpCircle, ArrowDownCircle, Shield, Sword, Hand } from 'lucide-react';
import { getPositionEvents } from '../../../game/ui/positionUtils';
import { getPlayerStyling } from '../../../game/ui/playerStyling';
import { getPairAnimation, getPlayerAnimation } from '../../../game/ui/playerAnimation';
import { PlayerStatsDisplay } from './components/PlayerStatsDisplay';
import { FORMATION_STYLES, ICON_STYLES, HELP_MESSAGES } from './constants';

export function PairsFormation({ 
  formation,
  allPlayers, 
  animationState, 
  recentlySubstitutedPlayers,
  hideNextOffIndicator,
  nextPhysicalPairToSubOut,
  longPressHandlers,
  goalieHandlers,
  getPlayerNameById,
  getPlayerTimeStats,
  ...domProps
}) {
  // Handle null/undefined formation
  if (!formation) {
    return (
      <div className="space-y-2" {...domProps}>
        <div>Left</div>
        <div>Right</div>
        <div>Substitutes</div>
      </div>
    );
  }

  const renderPair = (pairKey, pairDisplayName, renderIndex) => {
    const pairData = formation[pairKey];
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
      supportsInactiveUsers: false,
      role: null, // No specific role for pairs
      isGoalie: false
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
          <div className="flex items-center justify-between" data-testid={`player-${pairData.defender}`}>
            <div><Shield className={ICON_STYLES.small} /> D: {getPlayerNameById ? getPlayerNameById(pairData.defender) : pairData.defender}</div>
            <PlayerStatsDisplay playerId={pairData.defender} getPlayerTimeStats={getPlayerTimeStats} className="ml-4" />
          </div>
          <div className="flex items-center justify-between" data-testid={`player-${pairData.attacker}`}>
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

  const renderGoalie = () => {
    const goalieId = formation.goalie;
    if (!goalieId) return null;

    // Check if goalie was recently substituted
    const isRecentlySubstituted = recentlySubstitutedPlayers.has(goalieId);

    // Get styling and animation using utilities
    const { animationClass, zIndexClass, styleProps } = getPlayerAnimation(goalieId, animationState);
    const { bgColor, textColor, borderColor, glowClass } = getPlayerStyling({
      isFieldPosition: false, // Goalie is not a field position
      isInactive: false,
      isNextOff: false,
      isNextOn: false,
      isRecentlySubstituted,
      hideNextOffIndicator,
      supportsInactiveUsers: false,
      isGoalie: true
    });

    const longPressEvents = goalieHandlers ? goalieHandlers.goalieEvents : {};

    return (
      <div 
        key="goalie"
        className={`${FORMATION_STYLES.containerBase} ${borderColor} ${bgColor} ${textColor} ${glowClass} ${animationClass} ${zIndexClass} transition-all duration-300 cursor-pointer select-none hover:bg-slate-600`}
        style={styleProps}
        {...longPressEvents}
      >
        <h3 className="text-sm font-semibold mb-1">Goalie</h3>
        <div className="flex items-center justify-between">
          <div><Hand className={ICON_STYLES.small} /> {getPlayerNameById ? getPlayerNameById(goalieId) : goalieId}</div>
          <PlayerStatsDisplay playerId={goalieId} getPlayerTimeStats={getPlayerTimeStats} />
        </div>
        <p className={FORMATION_STYLES.helpText}>Hold to replace goalie</p>
      </div>
    );
  };

  return (
    <div className="space-y-2" {...domProps}>
      {renderGoalie()}
      {renderPair('leftPair', 'Left', 0)}
      {renderPair('rightPair', 'Right', 1)}
      {renderPair('subPair', 'Substitutes', 2)}
    </div>
  );
}

// Memoize PairsFormation to prevent unnecessary re-renders
export default React.memo(PairsFormation);