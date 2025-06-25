import { findPlayerById, getPlayerName } from '../../utils/playerUtils';
import { FORMATION_TYPES } from '../../constants/playerConstants';

export const createFieldPositionHandlers = (
  formationType,
  periodFormation,
  allPlayers,
  nextPlayerIdToSubOut,
  modalHandlers
) => {
  const { openFieldPlayerModal, openSubstituteModal } = modalHandlers;
  
  const isPairsMode = formationType === FORMATION_TYPES.PAIRS_7;
  const isIndividual7Mode = formationType === FORMATION_TYPES.INDIVIDUAL_7;
  
  const getPlayerNameById = (id) => getPlayerName(allPlayers, id);

  const handleFieldPlayerLongPress = (position) => {
    if (isPairsMode) {
      // Pairs mode - handle pair interactions
      const pairKey = position;
      const pairData = periodFormation[pairKey];
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
      const playerId = periodFormation[position];
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
    // Only for 7-player individual mode substitute players
    if (!isIndividual7Mode || (position !== 'substitute7_1' && position !== 'substitute7_2')) return;
    
    const playerId = periodFormation[position];
    const playerName = getPlayerNameById(playerId);
    const player = findPlayerById(allPlayers, playerId);
    const isCurrentlyInactive = player?.stats.isInactive || false;
    
    // Determine if player can be set as next to go in
    const isNextToGoIn = playerId === nextPlayerIdToSubOut;
    const canSetAsNextToGoIn = position === 'substitute7_2' && !isNextToGoIn && !isCurrentlyInactive;
    
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
      if (position === 'substitute7_1' || position === 'substitute7_2') {
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
    // Individual modes
    const positions = [
      'leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker', 'substitute',
      'leftDefender7', 'rightDefender7', 'leftAttacker7', 'rightAttacker7', 
      'substitute7_1', 'substitute7_2'
    ];
    
    positions.forEach(position => {
      positionCallbacks[`${position}Callback`] = createPositionCallback(position);
    });
  }

  return positionCallbacks;
};