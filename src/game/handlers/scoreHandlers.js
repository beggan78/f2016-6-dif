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
    console.log('[DEBUG] handleAddHomeGoal called with gameState:', gameState);
    
    // For backward compatibility, if no gameState provided, just add goal immediately
    if (!gameState) {
      console.log('[DEBUG] No gameState provided, adding goal immediately');
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
    
    console.log('[DEBUG] Storing pending goal data:', pendingGoalData);
    setPendingGoalData(pendingGoalData);
    
    // Show goal scorer modal for attribution
    if (openGoalScorerModal) {
      console.log('[DEBUG] Opening goal scorer modal');
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
    console.log('[DEBUG] handleSelectGoalScorer called with eventId:', eventId, 'scorerId:', scorerId);
    
    // Get pending goal data
    const pendingGoal = getPendingGoalData();
    console.log('[DEBUG] Retrieved pending goal:', pendingGoal);
    
    // If there's a pending goal, confirm it now
    if (pendingGoal && pendingGoal.eventId === eventId) {
      console.log('[DEBUG] Confirming pending goal');
      
      // Increment the score
      if (pendingGoal.type === EVENT_TYPES.GOAL_HOME) {
        console.log('[DEBUG] Adding home goal to score');
        addHomeGoal();
      } else if (pendingGoal.type === EVENT_TYPES.GOAL_AWAY) {
        console.log('[DEBUG] Adding away goal to score');
        addAwayGoal();
      }
      
      // Log the goal event
      console.log('[DEBUG] Logging goal event');
      logEvent(pendingGoal.type, {
        eventId: pendingGoal.eventId,
        periodNumber: pendingGoal.periodNumber,
        homeScore: pendingGoal.homeScore,
        awayScore: pendingGoal.awayScore,
        scorerId: scorerId || null,
        teamName: pendingGoal.teamName
      });
      
      // Clear pending goal
      console.log('[DEBUG] Clearing pending goal');
      clearPendingGoal();
    } else {
      console.log('[DEBUG] No matching pending goal - this should not happen for initial scorer selection');
    }
    
    console.log('[DEBUG] Closing goal scorer modal');
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
    console.log('[DEBUG] handleCancelGoalScorer called');
    
    // Get and clear pending goal data
    const pendingGoal = getPendingGoalData();
    console.log('[DEBUG] Cancelling pending goal:', pendingGoal);
    
    if (pendingGoal) {
      console.log('[DEBUG] Clearing pending goal data');
      clearPendingGoal();
    }
    
    console.log('[DEBUG] Closing goal scorer modal');
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