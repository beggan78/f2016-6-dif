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
    const outfieldPlayers = getOutfieldPlayers(selectedSquadPlayers);
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

  // Create goalie long press handlers
  const createGoalieHandlers = () => {
    let touchTimer = null;
    let longPressTriggered = false;

    const handleTouchStart = (e) => {
      e.preventDefault();
      longPressTriggered = false;
      touchTimer = setTimeout(() => {
        longPressTriggered = true;
        const gameState = gameStateFactory();
        handleGoalieLongPress(gameState.periodFormation);
      }, 500);
    };

    const handleTouchEnd = (e) => {
      e.preventDefault();
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    };

    const handleMouseDown = (e) => {
      e.preventDefault();
      longPressTriggered = false;
      touchTimer = setTimeout(() => {
        longPressTriggered = true;
        const gameState = gameStateFactory();
        handleGoalieLongPress(gameState.periodFormation);
      }, 500);
    };

    const handleMouseUp = (e) => {
      e.preventDefault();
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    };

    const handleMouseLeave = (e) => {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    };

    return {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
      onMouseDown: handleMouseDown,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave
    };
  };

  return {
    handleGoalieLongPress,
    handleSelectNewGoalie,
    handleCancelGoalieModal,
    goalieEvents: createGoalieHandlers()
  };
};