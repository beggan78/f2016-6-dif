import { handlePauseResumeTime } from '../time/stintManager';

export const createTimerHandlers = (
  selectedSquadPlayers,
  stateUpdaters,
  timerControls
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
    pauseSubTimer(updatePlayerStatsForPause);
  };

  const handleResumeTimer = () => {
    resumeSubTimer(updatePlayerStatsForPause);
  };

  return {
    handlePauseTimer,
    handleResumeTimer,
    updatePlayerStatsForPause
  };
};