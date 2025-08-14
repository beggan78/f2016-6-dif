import { logEvent, EVENT_TYPES, calculateMatchTime, getAllEvents, markEventAsUndone, updateEventData } from '../../utils/gameEventLogger';

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
      
      // Log the goal event with original timestamp from when goal was clicked
      logEvent(pendingGoal.type, {
        eventId: pendingGoal.eventId,
        periodNumber: pendingGoal.periodNumber,
        homeScore: pendingGoal.homeScore,
        awayScore: pendingGoal.awayScore,
        scorerId: scorerId || null,
        teamName: pendingGoal.teamName
      }, pendingGoal.timestamp);
      
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

  const handleDeleteGoal = (eventId) => {
    // Find the goal event to delete
    const allEvents = getAllEvents();
    const goalEvent = allEvents.find(event => 
      (event.eventId === eventId || event.id === eventId) && !event.undone
    );
    
    if (goalEvent) {
      // Mark the goal as undone using the proper function
      const markSuccess = markEventAsUndone(goalEvent.eventId || goalEvent.id, 'manual_deletion');
      
      if (markSuccess) {
        // Get updated events after marking as undone
        const updatedEvents = getAllEvents();
          
        // Find the index of the deleted goal in the original chronological sequence (includes undone events)
        const originalGoalEvents = updatedEvents
          .filter(event => ['goal_home', 'goal_away'].includes(event.type))
          .sort((a, b) => a.timestamp - b.timestamp);
          
        const deletedGoalIndex = originalGoalEvents.findIndex(event => 
          (event.eventId === eventId || event.id === eventId)
        );
        
        if (deletedGoalIndex >= 0) {
          // Determine if deleted goal was home or away to know which score to decrement
          const wasHomeGoal = goalEvent.type === EVENT_TYPES.GOAL_HOME;
          
          // Get all subsequent goal events (after the deleted one) - from original list
          const subsequentGoals = originalGoalEvents.slice(deletedGoalIndex + 1);
          
          // Rewrite history: update score data for all subsequent goals
          subsequentGoals.forEach((event) => {
            if (event.data && event.data.homeScore !== undefined && event.data.awayScore !== undefined) {
              // Create corrected event data with decremented scores
              const correctedData = {
                homeScore: wasHomeGoal ? (event.data.homeScore - 1) : event.data.homeScore,
                awayScore: wasHomeGoal ? event.data.awayScore : (event.data.awayScore - 1)
              };
              
              // Update the event data directly
              updateEventData(event.id, correctedData);
            }
          });
        }
        
        // Recalculate final scores by counting remaining active goals
        const remainingGoals = updatedEvents.filter(event => 
          ['goal_home', 'goal_away'].includes(event.type) && !event.undone
        );
        
        let newHomeScore = 0;
        let newAwayScore = 0;
        
        remainingGoals.forEach(goal => {
          if (goal.type === EVENT_TYPES.GOAL_HOME) {
            newHomeScore++;
          } else if (goal.type === EVENT_TYPES.GOAL_AWAY) {
            newAwayScore++;
          }
        });
        
        setScore(newHomeScore, newAwayScore);
      }
    }
  };

  const handleEditGoalScorer = (eventId) => {
    // Open goal scorer modal for editing existing goal
    if (openGoalScorerModal) {
      const allEvents = getAllEvents();
      const goalEvent = allEvents.find(event => 
        (event.eventId === eventId || event.id === eventId) && !event.undone
      );
      
      if (goalEvent) {
        openGoalScorerModal({
          eventId: goalEvent.eventId || goalEvent.id,
          team: goalEvent.type === EVENT_TYPES.GOAL_HOME ? 'home' : 'away',
          mode: 'edit',
          matchTime: calculateMatchTime(goalEvent.timestamp),
          periodNumber: goalEvent.data?.periodNumber || 1
        });
      }
    }
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
    handleDeleteGoal,
    handleEditGoalScorer,
    scoreCallback
  };
};