import { animateStateChange } from '../animation/animationSupport';
import { calculateGoalieSwitch } from '../logic/gameStateLogic';
import { getPlayerName, getOutfieldPlayers } from '../../utils/playerUtils';

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
    setAllPlayers
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
    animateStateChange(
      gameStateFactory(),
      (gameState) => calculateGoalieSwitch(gameState, newGoalieId),
      (newGameState) => {
        setPeriodFormation(newGameState.periodFormation);
        setAllPlayers(newGameState.allPlayers);
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