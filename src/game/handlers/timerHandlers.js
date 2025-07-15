import { handlePauseResumeTime } from '../time/stintManager';
import { logEvent, EVENT_TYPES, calculateMatchTime } from '../../utils/gameEventLogger';
import { PLAYER_STATUS } from '../../constants/playerConstants';

export const createTimerHandlers = (
  selectedSquadPlayers,
  stateUpdaters,
  timerControls,
  gameStateFactory
) => {
  const { setAllPlayers } = stateUpdaters;
  const { pauseSubTimer, resumeSubTimer } = timerControls;

  // Function to update player stats when pausing/resuming
  const updatePlayerStatsForPause = (currentTimeEpoch, isPausing) => {
    setAllPlayers(prev => prev.map(player => {
      if (!selectedSquadPlayers.find(p => p.id === player.id)) {
        return player; // Not in selected squad, don't update
      }
      
      return handlePauseResumeTime(player, currentTimeEpoch, isPausing);
    }));
  };

  const handlePauseTimer = () => {
    try {
      const gameState = gameStateFactory();
      const currentTime = Date.now();
      
      // Log pause event with relevant data
      logEvent(EVENT_TYPES.TIMER_PAUSED, {
        pauseType: 'substitution',
        currentMatchTime: calculateMatchTime(currentTime),
        periodNumber: gameState.currentPeriodNumber || 1,
        subTimerSeconds: gameState.subTimerSeconds || 0,
        matchTimerSeconds: gameState.matchTimerSeconds || 0,
        activePlayerCount: selectedSquadPlayers.filter(p => p.stats.currentStatus === PLAYER_STATUS.ON_FIELD).length,
        pauseReason: 'user_initiated'
      });
      
      pauseSubTimer(updatePlayerStatsForPause);
    } catch (error) {
      console.error('Error logging timer pause event:', error);
      // Continue with pause operation even if logging fails
      pauseSubTimer(updatePlayerStatsForPause);
    }
  };

  const handleResumeTimer = () => {
    try {
      const gameState = gameStateFactory();
      const currentTime = Date.now();
      
      // Log resume event with relevant data
      logEvent(EVENT_TYPES.TIMER_RESUMED, {
        pauseType: 'substitution',
        currentMatchTime: calculateMatchTime(currentTime),
        periodNumber: gameState.currentPeriodNumber || 1,
        subTimerSeconds: gameState.subTimerSeconds || 0,
        matchTimerSeconds: gameState.matchTimerSeconds || 0,
        activePlayerCount: selectedSquadPlayers.filter(p => p.stats.currentStatus === PLAYER_STATUS.ON_FIELD).length,
        resumeReason: 'user_initiated'
      });
      
      resumeSubTimer(updatePlayerStatsForPause);
    } catch (error) {
      console.error('Error logging timer resume event:', error);
      // Continue with resume operation even if logging fails
      resumeSubTimer(updatePlayerStatsForPause);
    }
  };

  return {
    handlePauseTimer,
    handleResumeTimer,
    updatePlayerStatsForPause
  };
};