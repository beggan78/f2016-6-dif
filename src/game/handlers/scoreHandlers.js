import { logEvent, EVENT_TYPES, calculateMatchTime, getEventById, removeEvent } from '../../utils/gameEventLogger';

export const createScoreHandlers = (
  stateUpdaters,
  modalHandlers
) => {
  const { 
    setScore,
    addHomeGoal,
    addAwayGoal 
  } = stateUpdaters;
  
  const { openScoreEditModal, closeScoreEditModal, openGoalScorerModal, closeGoalScorerModal } = modalHandlers;

  // Generate unique event ID for goals
  const generateEventId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `evt_${timestamp}_${random}`;
  };

  const handleAddHomeGoal = (gameState = null) => {
    // Update score immediately (backward compatibility)
    addHomeGoal();
    
    // Only do event logging if gameState is provided (new functionality)
    if (gameState) {
      const eventId = generateEventId();
      const now = Date.now();
      const { homeScore, awayScore, currentPeriodNumber } = gameState;
      
      // Log goal event
      logEvent(EVENT_TYPES.GOAL_HOME, {
        eventId,
        periodNumber: currentPeriodNumber,
        homeScore: homeScore + 1,
        awayScore,
        scorerId: null, // To be filled by modal
        teamName: 'home'
      });
      
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
    }
  };

  const handleAddAwayGoal = (gameState = null) => {
    // Update score immediately (backward compatibility)
    addAwayGoal();
    
    // Only do event logging if gameState is provided (new functionality)
    if (gameState) {
      const eventId = generateEventId();
      const now = Date.now();
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
    if (scorerId) {
      // Log scorer correction event
      logEvent(EVENT_TYPES.GOAL_CORRECTED, {
        originalEventId: eventId,
        scorerId,
        correctionType: 'initial_attribution'
      });
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

  const handleUndoGoal = (eventId) => {
    const goalEvent = getEventById(eventId);
    
    if (goalEvent) {
      // Mark the goal event as undone
      logEvent(EVENT_TYPES.GOAL_UNDONE, {
        originalEventId: eventId,
        originalType: goalEvent.type,
        reason: 'user_correction'
      });
      
      // Remove the goal event from the timeline
      removeEvent(eventId);
      
      // Update score
      if (goalEvent.type === EVENT_TYPES.GOAL_HOME) {
        // Decrease home score by 1
        const currentHomeScore = goalEvent.data.homeScore;
        const currentAwayScore = goalEvent.data.awayScore;
        setScore(currentHomeScore - 1, currentAwayScore);
      } else if (goalEvent.type === EVENT_TYPES.GOAL_AWAY) {
        // Decrease away score by 1
        const currentHomeScore = goalEvent.data.homeScore;
        const currentAwayScore = goalEvent.data.awayScore;
        setScore(currentHomeScore, currentAwayScore - 1);
      }
    }
    
    closeGoalScorerModal();
  };

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

  return {
    handleAddHomeGoal,
    handleAddAwayGoal,
    handleSelectGoalScorer,
    handleCorrectGoalScorer,
    handleUndoGoal,
    handleScoreEdit,
    handleOpenScoreEdit,
    scoreCallback
  };
};