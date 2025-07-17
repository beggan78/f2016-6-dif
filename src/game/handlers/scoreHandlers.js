import { logEvent, EVENT_TYPES, calculateMatchTime } from '../../utils/gameEventLogger';

export const createScoreHandlers = (
  stateUpdaters,
  modalHandlers
) => {
  const { 
    setScore,
    addHomeGoal,
    addAwayGoal 
  } = stateUpdaters;
  
  const { 
    openScoreEditModal, 
    closeScoreEditModal, 
    openGoalScorerModal, 
    closeGoalScorerModal,
    setPendingGoalData,
    getPendingGoalData,
    clearPendingGoal
  } = modalHandlers;

  // Generate unique event ID for goals
  const generateEventId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `evt_${timestamp}_${random}`;
  };

  const handleAddHomeGoal = (gameState = null) => {
    // For backward compatibility, if no gameState provided, just add goal immediately
    if (!gameState) {
      addHomeGoal();
      return;
    }
    
    // New flow: Store as pending goal, don't increment score yet
    const eventId = generateEventId();
    const now = Date.now();
    const { homeScore, awayScore, currentPeriodNumber } = gameState;
    
    // Store pending goal data
    const pendingGoalData = {
      eventId,
      type: EVENT_TYPES.GOAL_HOME,
      periodNumber: currentPeriodNumber,
      homeScore: homeScore + 1,
      awayScore,
      teamName: 'home',
      timestamp: now
    };
    
    setPendingGoalData(pendingGoalData);
    
    // Show goal scorer modal for attribution
    if (openGoalScorerModal) {
      openGoalScorerModal({
        eventId,
        team: 'home',
        mode: 'new',
        matchTime: calculateMatchTime(now),
        periodNumber: currentPeriodNumber
      });
    }
  };

  const handleAddAwayGoal = (gameState = null) => {
    // Update score immediately (backward compatibility)
    addAwayGoal();
    
    // Only do event logging if gameState is provided (new functionality)
    if (gameState) {
      const eventId = generateEventId();
      const { homeScore, awayScore, currentPeriodNumber } = gameState;
      
      // Log goal event
      logEvent(EVENT_TYPES.GOAL_AWAY, {
        eventId,
        periodNumber: currentPeriodNumber,
        homeScore,
        awayScore: awayScore + 1,
        teamName: 'away'
      });
      
      // Away goals don't need scorer attribution for now
      // This can be extended later if needed
    }
  };

  const handleSelectGoalScorer = (eventId, scorerId) => {
    // Get pending goal data
    const pendingGoal = getPendingGoalData();
    
    // If there's a pending goal, confirm it now
    if (pendingGoal && pendingGoal.eventId === eventId) {
      // Increment the score
      if (pendingGoal.type === EVENT_TYPES.GOAL_HOME) {
        addHomeGoal();
      } else if (pendingGoal.type === EVENT_TYPES.GOAL_AWAY) {
        addAwayGoal();
      }
      
      // Log the goal event
      logEvent(pendingGoal.type, {
        eventId: pendingGoal.eventId,
        periodNumber: pendingGoal.periodNumber,
        homeScore: pendingGoal.homeScore,
        awayScore: pendingGoal.awayScore,
        scorerId: scorerId || null,
        teamName: pendingGoal.teamName
      });
      
      // Clear pending goal
      clearPendingGoal();
    }
    
    closeGoalScorerModal();
  };

  const handleCorrectGoalScorer = (eventId, newScorerId) => {
    // Log correction event
    logEvent(EVENT_TYPES.GOAL_CORRECTED, {
      originalEventId: eventId,
      scorerId: newScorerId,
      correctionType: 'scorer_correction'
    });
    
    closeGoalScorerModal();
  };

  // Removed: handleUndoGoal function

  const handleScoreEdit = (newHomeScore, newAwayScore) => {
    setScore(newHomeScore, newAwayScore);
    closeScoreEditModal();
  };

  const handleOpenScoreEdit = () => {
    openScoreEditModal();
  };

  const scoreCallback = () => {
    handleOpenScoreEdit();
  };

  const handleCancelGoalScorer = () => {
    // Get and clear pending goal data
    const pendingGoal = getPendingGoalData();
    
    if (pendingGoal) {
      clearPendingGoal();
    }
    
    closeGoalScorerModal();
  };
  
  return {
    handleAddHomeGoal,
    handleAddAwayGoal,
    handleSelectGoalScorer,
    handleCorrectGoalScorer,
    handleScoreEdit,
    handleOpenScoreEdit,
    handleCancelGoalScorer,
    scoreCallback
  };
};