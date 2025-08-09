import { findPlayerById, getPlayerName } from '../../utils/playerUtils';
import { supportsInactiveUsers, supportsNextNextIndicators, getModeDefinition } from '../../constants/gameModes';

export const createFieldPositionHandlers = (
  teamConfig,
  formation,
  allPlayers,
  nextPlayerIdToSubOut,
  modalHandlers,
  selectedFormation = null  // NEW: Add selectedFormation parameter for formation-aware callbacks
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
  
  const isPairsMode = teamConfig?.substitutionType === 'pairs';
  const supportsInactive = supportsInactiveUsers(teamConfig);
  const supportsNextNext = supportsNextNextIndicators(teamConfig);
  
  const getPlayerNameById = (id) => getPlayerName(allPlayers, id);

  const handleFieldPlayerQuickTap = (position) => {
    if (isPairsMode) {
      // Pairs mode - handle pair interactions
      const pairKey = position;
      const pairData = formation[pairKey];
      if (!pairData) return;

      const defenderName = getPlayerNameById(pairData.defender);
      const attackerName = getPlayerNameById(pairData.attacker);
      const pairName = `${defenderName} / ${attackerName}`;

      openFieldPlayerModal({
        type: 'pair',
        target: pairKey,
        playerName: pairName,
        sourcePlayerId: null,
        availablePlayers: [],
        showPositionOptions: false
      });
    } else {
      // Individual modes - handle individual player interactions
      const playerId = formation[position];
      const playerName = getPlayerNameById(playerId);
      
      openFieldPlayerModal({
        type: 'player',
        target: position,
        playerName: playerName,
        sourcePlayerId: playerId,
        availablePlayers: [],
        showPositionOptions: false
      });
    }
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
    
    // Determine if player can be set as next to go in
    // All substitute positions except substitute_1 can be set as next to go in
    const isNextToGoIn = playerId === nextPlayerIdToSubOut;
    const canSetAsNextToGoIn = supportsNextNext && 
                               position !== 'substitute_1' &&
                               !isNextToGoIn && 
                               !isCurrentlyInactive;
    
    openSubstituteModal({
      playerId: playerId,
      playerName: playerName,
      isCurrentlyInactive: isCurrentlyInactive,
      canSetAsNextToGoIn: canSetAsNextToGoIn
    });
  };

  // Create position-specific callback functions for quick tap events
  const createPositionCallback = (position) => {
    return () => {
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
  
  if (isPairsMode) {
    positionCallbacks.leftPairCallback = createPositionCallback('leftPair');
    positionCallbacks.rightPairCallback = createPositionCallback('rightPair');
    positionCallbacks.subPairCallback = createPositionCallback('subPair');
  } else {
    // Individual modes - dynamically get all positions from team mode definition
    const definition = getDefinition(teamConfig);
    if (definition) {
      const allPositions = [...definition.fieldPositions, ...definition.substitutePositions];
      
      allPositions.forEach(position => {
        positionCallbacks[`${position}Callback`] = createPositionCallback(position);
      });
    }
  }

  return positionCallbacks;
};