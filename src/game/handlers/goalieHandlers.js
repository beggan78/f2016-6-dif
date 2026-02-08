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
    setNextPlayerIdToSubOut
  } = stateUpdaters;

  const {
    setAnimationState,
    setHideNextOffIndicator,
    setRecentlySubstitutedPlayers
  } = animationHooks;

  const {
    openGoalieModal,
    closeGoalieModal,
    removeFromNavigationStack
  } = modalHandlers;

  const getPlayerNameById = (id) => getPlayerName(allPlayers, id);

  const handleGoalieQuickTap = (formation) => {
    const currentGoalieName = getPlayerNameById(formation.goalie);
    
    // Get available players for goalie replacement (outfield squad players)
    const selectedSquadIds = selectedSquadPlayers.map(p => p.id);
    const outfieldPlayers = getOutfieldPlayers(allPlayers, selectedSquadIds, formation.goalie);
    const availablePlayers = outfieldPlayers
      .map(player => {
        const formattedName = formatPlayerName(player);
        return {
          ...player,
          id: player.id,
          displayName: player.displayName || formattedName,
          firstName: player.firstName || player.displayName || formattedName,
          lastName: player.lastName || null,
          isInactive: player.stats?.isInactive || false
        };
      })
      .sort((a, b) => {
        // Sort by inactive status first (active players first)
        if (a.isInactive !== b.isInactive) {
          return a.isInactive ? 1 : -1;
        }
        // Then sort alphabetically by name within each group
        const nameA = formatPlayerName(a);
        const nameB = formatPlayerName(b);
        return nameA.localeCompare(nameB);
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

        // Log goalie assignment event
        try {
          if (newGoaliePlayer) {
            logEvent(EVENT_TYPES.GOALIE_ASSIGNMENT, {
              goalieId: newGoalieId,
              goalieName: formatPlayerName(newGoaliePlayer),
              previousGoalieId: gameState.formation.goalie,
              previousGoalieName: gameState.formation.goalie ? getPlayerNameById(gameState.formation.goalie) : null,
              newGoaliePosition: newGoaliePlayer?.stats?.currentPositionKey || null,
              eventType: 'replacement',
              matchTime: calculateMatchTime(currentTime),
              timestamp: currentTime,
              periodNumber: gameState.currentPeriodNumber || 1,
              teamConfig: gameState.teamConfig,
              description: `${formatPlayerName(newGoaliePlayer)} is goalie`,
              matchId: gameState.currentMatchId
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
    if (removeFromNavigationStack) {
      removeFromNavigationStack();
    }
  };

  // Create goalie quick tap callback
  const goalieCallback = (event) => {
    // Prevent event propagation to avoid accidental modal button clicks
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const gameState = gameStateFactory();
    handleGoalieQuickTap(gameState.formation);
  };

  return {
    handleGoalieQuickTap,
    handleSelectNewGoalie,
    handleCancelGoalieModal,
    goalieCallback
  };
};
