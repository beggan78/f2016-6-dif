import { animateStateChange } from '../animation/animationSupport';
import { calculateGoalieSwitch } from '../logic/gameStateLogic';
import { getPlayerName, getOutfieldPlayers } from '../../utils/playerUtils';
import { formatPlayerName } from '../../utils/formatUtils';
import { logEvent, EVENT_TYPES, calculateMatchTime } from '../../utils/gameEventLogger';

export const createGoalieHandlers = (
  gameStateFactory,
  stateUpdaters,
  animationHooks,
  modalHandlers,
  allPlayers,
  selectedSquadPlayers
) => {
  const {
    setFormation,
    setAllPlayers,
    setRotationQueue,
    setNextPlayerIdToSubOut,
    setNextNextPlayerIdToSubOut
  } = stateUpdaters;

  const {
    setAnimationState,
    setHideNextOffIndicator,
    setRecentlySubstitutedPlayers
  } = animationHooks;

  const {
    openGoalieModal,
    closeGoalieModal,
    removeModalFromStack
  } = modalHandlers;

  const getPlayerNameById = (id) => getPlayerName(allPlayers, id);

  const handleGoalieLongPress = (formation) => {
    const currentGoalieName = getPlayerNameById(formation.goalie);
    
    // Get available players for goalie replacement (outfield squad players)
    const selectedSquadIds = selectedSquadPlayers.map(p => p.id);
    const outfieldPlayers = getOutfieldPlayers(allPlayers, selectedSquadIds, formation.goalie);
    const availablePlayers = outfieldPlayers
      .map(player => ({
        id: player.id,
        name: formatPlayerName(player),
        isInactive: player.stats?.isInactive || false
      }))
      .sort((a, b) => {
        // Sort by inactive status first (active players first)
        if (a.isInactive !== b.isInactive) {
          return a.isInactive ? 1 : -1;
        }
        // Then sort alphabetically by name within each group
        return a.name.localeCompare(b.name);
      });

    openGoalieModal({
      currentGoalieName: currentGoalieName,
      availablePlayers: availablePlayers
    });
  };

  const handleSelectNewGoalie = (newGoalieId) => {
    const gameState = gameStateFactory();
    const currentTime = Date.now();
    const newGoaliePlayer = allPlayers.find(p => p.id === newGoalieId);
    
    animateStateChange(
      gameState,
      (gameState) => calculateGoalieSwitch(gameState, newGoalieId),
      (newGameState) => {
        setFormation(newGameState.formation);
        setAllPlayers(newGameState.allPlayers);
        setRotationQueue(newGameState.rotationQueue);
        // Apply next player tracking updates if they changed
        if (newGameState.nextPlayerIdToSubOut !== undefined) {
          setNextPlayerIdToSubOut(newGameState.nextPlayerIdToSubOut);
        }
        if (newGameState.nextNextPlayerIdToSubOut !== undefined) {
          setNextNextPlayerIdToSubOut(newGameState.nextNextPlayerIdToSubOut);
        }

        // Log goalie assignment event
        try {
          if (newGoaliePlayer) {
            logEvent(EVENT_TYPES.GOALIE_ASSIGNMENT, {
              goalieId: newGoalieId,
              goalieName: newGoaliePlayer.name,
              previousGoalieId: gameState.formation.goalie,
              previousGoalieName: gameState.formation.goalie ? getPlayerNameById(gameState.formation.goalie) : null,
              eventType: 'replacement',
              matchTime: calculateMatchTime(currentTime),
              timestamp: currentTime,
              periodNumber: gameState.currentPeriodNumber || 1,
              teamConfig: gameState.teamConfig,
              description: `${newGoaliePlayer.name} is goalie`
            });
          }
        } catch (error) {
        }
      },
      setAnimationState,
      setHideNextOffIndicator,
      setRecentlySubstitutedPlayers
    );
    closeGoalieModal();
  };

  const handleCancelGoalieModal = () => {
    closeGoalieModal();
    if (removeModalFromStack) {
      removeModalFromStack();
    }
  };

  // Create goalie long press callback
  const goalieCallback = () => {
    const gameState = gameStateFactory();
    handleGoalieLongPress(gameState.formation);
  };

  return {
    handleGoalieLongPress,
    handleSelectNewGoalie,
    handleCancelGoalieModal,
    goalieCallback
  };
};