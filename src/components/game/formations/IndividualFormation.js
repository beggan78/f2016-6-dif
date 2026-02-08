import React from 'react';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { findPlayerById } from '../../../utils/playerUtils';
import { getFieldPositions, getSubstitutePositions, getPositionRole } from '../../../game/logic/positionUtils';
import { supportsInactiveUsers } from '../../../constants/gameModes';
import {
  getPositionIcon,
  getPositionDisplayName,
  getIndicatorProps,
  getPositionEvents,
  getSubstituteTargetPositions
} from '../../../game/ui/positionUtils';
import { getPlayerStyling } from '../../../game/ui/playerStyling';
import { getPlayerAnimation } from '../../../game/ui/playerAnimation';
import { PlayerStatsDisplay } from './components/PlayerStatsDisplay';
import { FORMATION_STYLES, ICON_STYLES } from './constants';
import { orderFieldPositionsForDisplay } from '../../../utils/positionDisplayOrder';

const EMPTY_FORMATION = {};

export function IndividualFormation({
  teamConfig,
  selectedFormation,
  formation,
  allPlayers,
  animationState,
  recentlySubstitutedPlayers,
  hideNextOffIndicator,
  quickTapHandlers,
  goalieHandlers,
  getPlayerNameById,
  getPlayerTimeStats,
  nextPlayerIdToSubOut,
  substitutionCount = 1,
  rotationQueue = [],
  renderSection = 'all',
  ...domProps
}) {
  // Create formation-aware team config for position utilities
  const formationAwareTeamConfig = React.useMemo(() => {
    if (selectedFormation && selectedFormation !== teamConfig.formation) {
      return {
        ...teamConfig,
        formation: selectedFormation
      };
    }
    return teamConfig;
  }, [selectedFormation, teamConfig]);

  // Get formation-specific position lists from formation definitions
  const fieldPositions = getFieldPositions(formationAwareTeamConfig);
  const substitutePositions = getSubstitutePositions(formationAwareTeamConfig);
  const orderedFieldPositions = React.useMemo(() => {
    return orderFieldPositionsForDisplay(fieldPositions);
  }, [fieldPositions]);

  // Mode capabilities
  const modeSupportsInactive = supportsInactiveUsers(formationAwareTeamConfig);

  // Map substitute positions to their target field positions
  const substituteTargetMapping = React.useMemo(
    () => getSubstituteTargetPositions(
      rotationQueue,
      formation || EMPTY_FORMATION,
      fieldPositions,
      substitutePositions,
      substitutionCount
    ),
    [rotationQueue, formation, fieldPositions, substitutePositions, substitutionCount]
  );

  // Create display labels for target positions with player names
  const incomingPositionLabels = React.useMemo(
    () => {
      const labels = {};
      Object.entries(substituteTargetMapping).forEach(([subPosition, targetFieldPosition]) => {
        const positionName = getPositionDisplayName(
          targetFieldPosition,
          null,
          formationAwareTeamConfig,
          substitutePositions
        );

        // Find the player at the target field position
        const playerIdAtPosition = formation?.[targetFieldPosition];
        const playerName = playerIdAtPosition && getPlayerNameById
          ? getPlayerNameById(playerIdAtPosition)
          : null;

        // Format: "PlayerName - Position"
        labels[subPosition] = playerName ? `${playerName} - ${positionName}` : positionName;
      });
      return labels;
    },
    [substituteTargetMapping, formationAwareTeamConfig, substitutePositions, formation, getPlayerNameById]
  );

  // Handle null/undefined formation after hook definitions to satisfy rules of hooks
  if (!formation) {
    return <div className="space-y-2" {...domProps}></div>;
  }

  // Determine which positions to render based on renderSection prop
  let positionsToRender;
  if (renderSection === 'field') {
    // Render goalie and field positions only
    positionsToRender = [...orderedFieldPositions, 'goalie'];
  } else if (renderSection === 'substitutes') {
    // Render substitute positions only
    positionsToRender = substitutePositions;
  } else {
    // Render all positions (default behavior)
    positionsToRender = [...orderedFieldPositions, 'goalie', ...substitutePositions];
  }

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
    const { isNextOff, isNextOn } = getIndicatorProps(
      player,
      position,
      formationAwareTeamConfig,
      nextPlayerIdToSubOut,
      substitutePositions,
      substitutionCount,
      rotationQueue
    );
    

    // Get proper role from position mapping (works for all formations)
    const playerRole = getPositionRole(position);

    // Get styling and animation using utilities
    const { animationClass, zIndexClass, styleProps } = getPlayerAnimation(playerId, animationState);
    const { bgColor, textColor, borderColor, glowClass } = getPlayerStyling({
      isFieldPosition,
      isInactive,
      isNextOff,
      isNextOn,
      isRecentlySubstituted,
      hideNextOffIndicator,
      supportsInactiveUsers: modeSupportsInactive,
      role: playerRole,
      isGoalie: isGoaliePosition
    });

    // Get utilities
    const longPressEvents = isGoaliePosition && goalieHandlers ? goalieHandlers.goalieEvents : getPositionEvents(quickTapHandlers, position);
    const positionDisplayName = getPositionDisplayName(position, player, formationAwareTeamConfig, substitutePositions);
    const icon = getPositionIcon(position, substitutePositions);
    const incomingPositionLabel = incomingPositionLabels[position] || null;
    const shouldShowIncomingPosition = isSubstitutePosition && incomingPositionLabel && (!modeSupportsInactive || !isInactive);
    const playerName = getPlayerNameById ? getPlayerNameById(playerId) : playerId;

    return (
      <div 
        key={position}
        data-testid={`player-${playerId}`}
        className={`${FORMATION_STYLES.containerBase} ${borderColor} ${bgColor} ${textColor} ${glowClass} ${animationClass} ${zIndexClass} ${canBeSelected || isSubstitutePosition ? FORMATION_STYLES.interactive : ''}`}
        style={styleProps}
        {...longPressEvents}
      >
        <h3 className="text-sm font-semibold mb-1 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>
              {positionDisplayName}
            </span>
            {shouldShowIncomingPosition && (
              <span className="text-[11px] font-normal text-slate-200">
                ({incomingPositionLabel})
              </span>
            )}
            {modeSupportsInactive && isInactive && <span className="text-xs text-slate-600">(Inactive)</span>}
          </span>
          <div className="flex space-x-1">
            {/* Primary indicators (full opacity) - only show for active players */}
            {(!modeSupportsInactive || !isInactive) && isNextOff && !hideNextOffIndicator && <ArrowDownCircle className={`${ICON_STYLES.large} ${ICON_STYLES.indicators.nextOff} inline-block`} />}
            {(!modeSupportsInactive || !isInactive) && isNextOn && !hideNextOffIndicator && <ArrowUpCircle className={`${ICON_STYLES.large} ${ICON_STYLES.indicators.nextOn} inline-block`} />}
          </div>
        </h3>
        <div className="flex items-center justify-between">
          <div>{icon} {playerName}</div>
          <PlayerStatsDisplay playerId={playerId} getPlayerTimeStats={getPlayerTimeStats} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2" {...domProps}>
      {positionsToRender.map((position, index) =>
        renderIndividualPosition(position, index)
      )}
    </div>
  );
}

// Memoize IndividualFormation to prevent unnecessary re-renders
export default React.memo(IndividualFormation);
