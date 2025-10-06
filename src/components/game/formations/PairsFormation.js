import React from 'react';
import { ArrowUpCircle, ArrowDownCircle, Shield, Sword, Hand } from 'lucide-react';
import { getPositionEvents } from '../../../game/ui/positionUtils';
import { getPlayerStyling } from '../../../game/ui/playerStyling';
import { getPairAnimation, getPlayerAnimation } from '../../../game/ui/playerAnimation';
import { PlayerStatsDisplay } from './components/PlayerStatsDisplay';
import { FORMATION_STYLES, ICON_STYLES, POSITION_DISPLAY_NAMES } from './constants';

export function PairsFormation({
  formation,
  allPlayers,
  animationState,
  recentlySubstitutedPlayers,
  hideNextOffIndicator,
  nextPhysicalPairToSubOut,
  quickTapHandlers,
  goalieHandlers,
  getPlayerNameById,
  getPlayerTimeStats,
  teamConfig,
  renderSection = 'all',
  selectedFormation, // Extract this prop to prevent it from being passed to DOM
  nextPlayerIdToSubOut, // Extract this prop to prevent it from being passed to DOM
  nextNextPlayerIdToSubOut, // Extract this prop to prevent it from being passed to DOM
  substitutionCount, // Extract this prop to prevent it from being passed to DOM
  rotationQueue, // Extract this prop to prevent it from being passed to DOM
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

  // Helper function to render individual player role
  const renderPlayerRole = (playerId, pairData, pairKey, isDefender) => {
    const RoleIcon = isDefender ? Shield : Sword;
    const playerName = getPlayerNameById ? getPlayerNameById(playerId) : playerId;
    const roleLabel = isDefender ? 'D' : 'A';
    
    return (
      <div className="flex items-center justify-between" data-testid={`player-${playerId}`}>
        <div className="flex items-center space-x-1">
          <RoleIcon className={ICON_STYLES.small} />
          <span>{roleLabel}: {playerName}</span>
        </div>
        <PlayerStatsDisplay playerId={playerId} getPlayerTimeStats={getPlayerTimeStats} className="ml-4" />
      </div>
    );
  };

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

    const longPressEvents = getPositionEvents(quickTapHandlers, pairKey);

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
          {renderPlayerRole(pairData.defender, pairData, pairKey, true)}
          {renderPlayerRole(pairData.attacker, pairData, pairKey, false)}
        </div>
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
        <h3 className="text-sm font-semibold mb-1">{POSITION_DISPLAY_NAMES.goalie}</h3>
        <div className="flex items-center justify-between">
          <div><Hand className={ICON_STYLES.small} /> {getPlayerNameById ? getPlayerNameById(goalieId) : goalieId}</div>
          <PlayerStatsDisplay playerId={goalieId} getPlayerTimeStats={getPlayerTimeStats} />
        </div>
      </div>
    );
  };

  // Conditional rendering based on renderSection prop
  const renderFieldSection = () => (
    <>
      {renderGoalie()}
      {renderPair('leftPair', POSITION_DISPLAY_NAMES.leftPair, 0)}
      {renderPair('rightPair', POSITION_DISPLAY_NAMES.rightPair, 1)}
    </>
  );

  const renderSubstituteSection = () => (
    <>
      {renderPair('subPair', POSITION_DISPLAY_NAMES.subPair, 2)}
    </>
  );

  const renderAllSections = () => (
    <>
      {renderGoalie()}
      {renderPair('leftPair', POSITION_DISPLAY_NAMES.leftPair, 0)}
      {renderPair('rightPair', POSITION_DISPLAY_NAMES.rightPair, 1)}
      {renderPair('subPair', POSITION_DISPLAY_NAMES.subPair, 2)}
    </>
  );

  return (
    <div className="space-y-2" {...domProps}>
      {renderSection === 'field' && renderFieldSection()}
      {renderSection === 'substitutes' && renderSubstituteSection()}
      {renderSection === 'all' && renderAllSections()}
    </div>
  );
}

// Memoize PairsFormation to prevent unnecessary re-renders
export default React.memo(PairsFormation);