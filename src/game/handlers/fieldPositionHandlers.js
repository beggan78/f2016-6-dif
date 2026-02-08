import { findPlayerById, getPlayerName } from '../../utils/playerUtils';
import { supportsInactiveUsers, hasMultipleSubstitutes, getModeDefinition } from '../../constants/gameModes';

export const createFieldPositionHandlers = (
  teamConfig,
  formation,
  allPlayers,
  nextPlayerIdToSubOut,
  modalHandlers,
  selectedFormation = null,  // Add selectedFormation parameter for formation-aware callbacks
  substitutionCount = 1,     // NEW: Add substitutionCount parameter for multi-sub logic
  rotationQueue = []         // NEW: Add rotationQueue parameter for multi-sub player detection
) => {
  const { openFieldPlayerModal, openSubstituteModal } = modalHandlers;

  // Helper to get mode definition - handles team config objects
  // FORMATION-AWARE!
  const getDefinition = (teamConfig) => {
    // Handle null/undefined
    if (!teamConfig || typeof teamConfig !== 'object') {
      return null;
    }

    return getModeDefinition(teamConfig);
  };

  const supportsInactive = supportsInactiveUsers(teamConfig);
  const supportsNextNext = hasMultipleSubstitutes(teamConfig);

  const getPlayerNameById = (id) => getPlayerName(allPlayers, id);

  const handleFieldPlayerQuickTap = (position) => {
    // Individual modes - handle individual player interactions
    const playerId = formation[position];
    const playerName = getPlayerNameById(playerId);

    // Check if this player is in the first N players of rotation queue (about to sub off)
    const nextNToSubOut = rotationQueue.slice(0, substitutionCount);
    const isPlayerAboutToSubOff = nextNToSubOut.includes(playerId);

    openFieldPlayerModal({
      type: 'player',
      target: position,
      playerName: playerName,
      sourcePlayerId: playerId,
      availablePlayers: [],
      showPositionOptions: false,
      isPlayerAboutToSubOff: isPlayerAboutToSubOff
    });
  };

  const handleSubstituteQuickTap = (position) => {
    // Only for individual modes that support inactive players
    if (!supportsInactive) return;

    const definition = getDefinition(teamConfig);
    if (!definition?.substitutePositions.includes(position)) return;

    const playerId = formation[position];
    const playerName = getPlayerNameById(playerId);
    const player = findPlayerById(allPlayers, playerId);
    const isCurrentlyInactive = player?.stats.isInactive || false;

    // Determine position in substitute queue (0-indexed)
    const substitutePositionIndex = definition.substitutePositions.indexOf(position);

    // Check if this substitute is in the "next to go in" group based on substitutionCount
    const isInNextGroup = substitutePositionIndex < substitutionCount;

    // Determine if player can change next position (multi-sub mode only)
    const canChangeNextPosition = isInNextGroup &&
                                   substitutionCount > 1 &&
                                   !isCurrentlyInactive;

    // Determine if player can be set to go in next (single-sub mode)
    const isNextToGoIn = playerId === nextPlayerIdToSubOut;
    const canSetAsNextToGoIn = supportsNextNext &&
                               !isInNextGroup &&
                               !isNextToGoIn &&
                               !isCurrentlyInactive;

    openSubstituteModal({
      playerId: playerId,
      playerName: playerName,
      isCurrentlyInactive: isCurrentlyInactive,
      canSetAsNextToGoIn: canSetAsNextToGoIn,
      canChangeNextPosition: canChangeNextPosition,
      availableNextPositions: [],
      showPositionSelection: false
    });
  };

  // Create position-specific callback functions for quick tap events
  const createPositionCallback = (position) => {
    return (event) => {
      // Prevent event propagation to avoid accidental modal button clicks
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      
      // Use substitute modal for substitute positions in modes that support inactive players
      const definition = getDefinition(teamConfig);
      if (supportsInactive && definition?.substitutePositions.includes(position)) {
        handleSubstituteQuickTap(position);
      } else {
        handleFieldPlayerQuickTap(position);
      }
    };
  };

  // Generate callback functions for all possible positions
  const positionCallbacks = {};

  // Individual modes - dynamically get all positions from team mode definition
  const definition = getDefinition(teamConfig);
  if (definition) {
    const allPositions = [...definition.fieldPositions, ...definition.substitutePositions];

    allPositions.forEach(position => {
      positionCallbacks[`${position}Callback`] = createPositionCallback(position);
    });
  }

  return positionCallbacks;
};