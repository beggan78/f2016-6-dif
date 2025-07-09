import { animateStateChange } from '../animation/animationSupport';
import { calculateGoalieSwitch } from '../logic/gameStateLogic';
import { getPlayerName, getOutfieldPlayers } from '../../utils/playerUtils';
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
    setPeriodFormation,
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

  const handleGoalieLongPress = (periodFormation) => {
    const currentGoalieName = getPlayerNameById(periodFormation.goalie);
    
    // Get available players for goalie replacement (outfield squad players)
    const selectedSquadIds = selectedSquadPlayers.map(p => p.id);
    const outfieldPlayers = getOutfieldPlayers(allPlayers, selectedSquadIds, periodFormation.goalie);
    const availablePlayers = outfieldPlayers.map(player => ({
      id: player.id,
      name: player.name
    }));

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
        setPeriodFormation(newGameState.periodFormation);
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
              previousGoalieId: gameState.periodFormation.goalie,
              previousGoalieName: gameState.periodFormation.goalie ? getPlayerNameById(gameState.periodFormation.goalie) : null,
              eventType: 'replacement',
              matchTime: calculateMatchTime(currentTime),
              timestamp: currentTime,
              periodNumber: gameState.currentPeriodNumber || 1,
              teamMode: gameState.teamMode,
              description: `${newGoaliePlayer.name} is goalie`
            });
          }
        } catch (error) {
          console.error('Failed to log goalie switch event:', error);
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
    handleGoalieLongPress(gameState.periodFormation);
  };

  return {
    handleGoalieLongPress,
    handleSelectNewGoalie,
    handleCancelGoalieModal,
    goalieCallback
  };
};