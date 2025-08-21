import { logEvent, EVENT_TYPES, calculateMatchTime, getAllEvents, markEventAsUndone, updateEventData } from '../../utils/gameEventLogger';

export const createScoreHandlers = (
  stateUpdaters,
  modalHandlers
) => {
  const { 
    setScore,
    addGoalScored,
    addGoalConceded
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

  // Unified helper to find event by ID with proper error handling
  const findEventById = (eventId) => {
    const allEvents = getAllEvents();
    const event = allEvents.find(e => e.id === eventId && !e.undone);
    
    if (!event) {
      console.warn(`Goal event not found: ${eventId}`);
      return null;
    }
    
    return event;
  };

  // Helper to determine team type from event type
  const getTeamFromEventType = (eventType) => {
    return eventType === EVENT_TYPES.GOAL_SCORED ? 'scored' : 'conceded';
  };

  // Helper to create pending goal data structure
  const createPendingGoalData = (goalType, eventId, gameState) => {
    const { ownScore, opponentScore, currentPeriodNumber } = gameState;
    const now = Date.now();
    
    return {
      eventId,
      type: goalType === 'scored' ? EVENT_TYPES.GOAL_SCORED : EVENT_TYPES.GOAL_CONCEDED,
      periodNumber: currentPeriodNumber,
      ownScore: goalType === 'scored' ? ownScore + 1 : ownScore,
      opponentScore: goalType === 'conceded' ? opponentScore + 1 : opponentScore,
      goalType: goalType,
      timestamp: now
    };
  };

  // Unified goal handling for both goals scored and conceded
  const handleAddGoal = (goalType, gameState = null) => {
    // For backward compatibility, if no gameState provided, just add goal immediately
    if (!gameState) {
      if (goalType === 'scored') {
        addGoalScored();
      } else {
        addGoalConceded();
      }
      return;
    }
    
    const eventId = generateEventId();
    const pendingGoalData = createPendingGoalData(goalType, eventId, gameState);
    
    // For own team goals: use modal flow for scorer attribution
    if (goalType === 'scored') {
      // Store as pending goal, don't increment score yet
      setPendingGoalData(pendingGoalData);
      
      // Open goal scorer modal for own team goals scored only
      if (openGoalScorerModal) {
        openGoalScorerModal({
          eventId,
          team: goalType,
          mode: 'new',
          matchTime: calculateMatchTime(pendingGoalData.timestamp),
          periodNumber: pendingGoalData.periodNumber
        });
      } else {
        console.error('Goal scorer modal not available - cannot process goal with gameState');
        console.error('This indicates a configuration problem. Modal handlers may not be properly initialized.');
        // Clear pending data to prevent orphaning
        if (clearPendingGoal) {
          clearPendingGoal();
        }
        return;
      }
    } else {
      // For opponent team goals: immediately increment score and log event (no modal)
      addGoalConceded();
      
      // Log the goal event immediately with no scorer attribution
      logEvent(pendingGoalData.type, {
        eventId: pendingGoalData.eventId,
        periodNumber: pendingGoalData.periodNumber,
        ownScore: pendingGoalData.ownScore,
        opponentScore: pendingGoalData.opponentScore,
        scorerId: null, // No scorer attribution for opponent goals
        goalType: pendingGoalData.goalType
      }, pendingGoalData.timestamp);
    }
  };

  const handleAddGoalScored = (gameState = null) => {
    return handleAddGoal('scored', gameState);
  };

  const handleAddGoalConceded = (gameState = null) => {
    return handleAddGoal('conceded', gameState);
  };

  const handleSelectGoalScorer = (eventId, scorerId) => {
    // Get pending goal data
    const pendingGoal = getPendingGoalData();
    
    // If there's a pending goal, confirm it now
    if (pendingGoal && pendingGoal.eventId === eventId) {
      // Increment the score
      if (pendingGoal.type === EVENT_TYPES.GOAL_SCORED) {
        addGoalScored();
      } else if (pendingGoal.type === EVENT_TYPES.GOAL_CONCEDED) {
        addGoalConceded();
      }
      
      // Log the goal event with original timestamp from when goal was clicked
      logEvent(pendingGoal.type, {
        eventId: pendingGoal.eventId,
        periodNumber: pendingGoal.periodNumber,
        ownScore: pendingGoal.ownScore,
        opponentScore: pendingGoal.opponentScore,
        scorerId: scorerId || null,
        goalType: pendingGoal.goalType
      }, pendingGoal.timestamp);
      
      // Clear pending goal
      clearPendingGoal();
    }
    
    closeGoalScorerModal();
  };

  const handleCorrectGoalScorer = (eventId, newScorerId) => {
    // Update the original goal event with new scorer
    const updateSuccess = updateEventData(eventId, { scorerId: newScorerId });
    
    if (updateSuccess) {
      // Log correction event for audit trail
      logEvent(EVENT_TYPES.GOAL_CORRECTED, {
        originalEventId: eventId,
        scorerId: newScorerId,
        correctionType: 'scorer_correction'
      });
    } else {
      console.warn('Failed to update goal scorer for event:', eventId);
    }
    
    closeGoalScorerModal();
  };

  // Removed: handleUndoGoal function

  const handleDeleteGoal = (eventId) => {
    // Find the goal event to delete
    const goalEvent = findEventById(eventId);
    
    if (!goalEvent) {
      // Warning already logged in findEventById
      return;
    }
    
    // Verify this is actually a goal event
    if (![EVENT_TYPES.GOAL_SCORED, EVENT_TYPES.GOAL_CONCEDED].includes(goalEvent.type)) {
      console.warn(`Attempted to delete non-goal event: ${eventId}, type: ${goalEvent.type}`);
      return;
    }
    
    // Mark the goal as undone using the proper function
    const markSuccess = markEventAsUndone(goalEvent.id, 'manual_deletion');
    
    if (!markSuccess) {
      console.error(`Failed to mark goal event as undone: ${eventId}`);
      return;
    }
    
    // Get updated events after marking as undone
    const updatedEvents = getAllEvents();
      
    // Find the index of the deleted goal in the original chronological sequence (includes undone events)
    const originalGoalEvents = updatedEvents
      .filter(event => [EVENT_TYPES.GOAL_SCORED, EVENT_TYPES.GOAL_CONCEDED].includes(event.type))
      .sort((a, b) => a.timestamp - b.timestamp);
      
    const deletedGoalIndex = originalGoalEvents.findIndex(event => event.id === eventId
    );
    
    if (deletedGoalIndex >= 0) {
      // Determine if deleted goal scored or conceded to know which score to decrement
      const wasGoalScored = goalEvent.type === EVENT_TYPES.GOAL_SCORED;
      
      // Get all subsequent goal events (after the deleted one) - from original list
      const subsequentGoals = originalGoalEvents.slice(deletedGoalIndex + 1);
      
      // Rewrite history: update score data for all subsequent goals
      subsequentGoals.forEach((event) => {
        if (event.data && event.data.ownScore !== undefined && event.data.opponentScore !== undefined) {
          // Create corrected event data with decremented scores
          const correctedData = {
            ownScore: wasGoalScored ? (event.data.ownScore - 1) : event.data.ownScore,
            opponentScore: wasGoalScored ? event.data.opponentScore : (event.data.opponentScore - 1)
          };
          
          // Update the event data directly
          const updateSuccess = updateEventData(event.id, correctedData);
          if (!updateSuccess) {
            console.warn(`Failed to update score history for event: ${event.id}`);
          }
        }
      });
      
      // Recalculate final scores by counting remaining active goals
      const remainingGoals = updatedEvents.filter(event => 
        [EVENT_TYPES.GOAL_SCORED, EVENT_TYPES.GOAL_CONCEDED].includes(event.type) && !event.undone
      );
      
      let newOwnScore = 0;
      let newOpponentScore = 0;
      
      remainingGoals.forEach(goal => {
        if (goal.type === EVENT_TYPES.GOAL_SCORED) {
          newOwnScore++;
        } else if (goal.type === EVENT_TYPES.GOAL_CONCEDED) {
          newOpponentScore++;
        }
      });
      
      setScore(newOwnScore, newOpponentScore);
    } else {
      console.warn(`Could not find deleted goal in chronological sequence: ${eventId}`);
    }
  };

  const handleEditGoalScorer = (eventId) => {
    // Open goal scorer modal for editing existing goal
    if (!openGoalScorerModal) {
      console.warn('Goal scorer modal not available for editing');
      return;
    }

    const goalEvent = findEventById(eventId);
    if (!goalEvent) {
      // Warning already logged in findEventById
      return;
    }

    openGoalScorerModal({
      eventId: goalEvent.id,
      team: getTeamFromEventType(goalEvent.type),
      mode: 'correct',
      matchTime: calculateMatchTime(goalEvent.timestamp),
      periodNumber: goalEvent.data?.periodNumber || 1,
      currentScorerId: goalEvent.data?.scorerId || null
    });
  };

  const handleScoreEdit = (newOwnScore, newOpponentScore) => {
    setScore(newOwnScore, newOpponentScore);
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
    handleAddGoalScored,
    handleAddGoalConceded,
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