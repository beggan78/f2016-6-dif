import { findPlayerById, getPlayerName } from '../../utils/playerUtils';
import { TEAM_MODES } from '../../constants/playerConstants';
import { supportsInactiveUsers, supportsNextNextIndicators, getModeDefinition } from '../../constants/gameModes';

export const createFieldPositionHandlers = (
  teamMode,
  formation,
  allPlayers,
  nextPlayerIdToSubOut,
  modalHandlers
) => {
  const { openFieldPlayerModal, openSubstituteModal } = modalHandlers;
  
  // Helper to get mode definition - handles both legacy strings and team config objects
  const getDefinition = (teamModeOrConfig) => {
    // Handle null/undefined
    if (!teamModeOrConfig) {
      return null;
    }
    
    if (typeof teamModeOrConfig === 'string') {
      // Map legacy team modes to team configurations
      const legacyMappings = {
        [TEAM_MODES.PAIRS_7]: { format: '5v5', squadSize: 7, formation: '2-2', substitutionType: 'pairs' },
        [TEAM_MODES.INDIVIDUAL_5]: { format: '5v5', squadSize: 5, formation: '2-2', substitutionType: 'individual' },
        [TEAM_MODES.INDIVIDUAL_6]: { format: '5v5', squadSize: 6, formation: '2-2', substitutionType: 'individual' },
        [TEAM_MODES.INDIVIDUAL_7]: { format: '5v5', squadSize: 7, formation: '2-2', substitutionType: 'individual' },
        [TEAM_MODES.INDIVIDUAL_8]: { format: '5v5', squadSize: 8, formation: '2-2', substitutionType: 'individual' },
        [TEAM_MODES.INDIVIDUAL_9]: { format: '5v5', squadSize: 9, formation: '2-2', substitutionType: 'individual' },
        [TEAM_MODES.INDIVIDUAL_10]: { format: '5v5', squadSize: 10, formation: '2-2', substitutionType: 'individual' }
      };
      
      const teamConfig = legacyMappings[teamModeOrConfig];
      if (!teamConfig) {
        console.warn(`Unknown legacy team mode: ${teamModeOrConfig}`);
        return null;
      }
      
      return getModeDefinition(teamConfig);
    }
    return getModeDefinition(teamModeOrConfig);
  };
  
  const isPairsMode = teamMode === TEAM_MODES.PAIRS_7;
  const supportsInactive = supportsInactiveUsers(teamMode);
  const supportsNextNext = supportsNextNextIndicators(teamMode);
  
  const getPlayerNameById = (id) => getPlayerName(allPlayers, id);

  const handleFieldPlayerLongPress = (position) => {
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

  const handleSubstituteLongPress = (position) => {
    // Only for individual modes that support inactive players
    if (!supportsInactive) return;
    
    const definition = getDefinition(teamMode);
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

  // Create position-specific callback functions for long press events
  const createPositionCallback = (position) => {
    return () => {
      // Use substitute modal for substitute positions in modes that support inactive players
      const definition = getDefinition(teamMode);
      if (supportsInactive && definition?.substitutePositions.includes(position)) {
        handleSubstituteLongPress(position);
      } else {
        handleFieldPlayerLongPress(position);
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
    const definition = getDefinition(teamMode);
    if (definition) {
      const allPositions = [...definition.fieldPositions, ...definition.substitutePositions];
      
      allPositions.forEach(position => {
        positionCallbacks[`${position}Callback`] = createPositionCallback(position);
      });
    }
  }

  return positionCallbacks;
};