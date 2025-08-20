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
    return eventType === EVENT_TYPES.GOAL_HOME ? 'home' : 'away';
  };

  // Helper to create pending goal data structure
  const createPendingGoalData = (teamType, eventId, gameState) => {
    const { homeScore, awayScore, currentPeriodNumber } = gameState;
    const now = Date.now();
    
    return {
      eventId,
      type: teamType === 'home' ? EVENT_TYPES.GOAL_HOME : EVENT_TYPES.GOAL_AWAY,
      periodNumber: currentPeriodNumber,
      homeScore: teamType === 'home' ? homeScore + 1 : homeScore,
      awayScore: teamType === 'away' ? awayScore + 1 : awayScore,
      teamName: teamType,
      timestamp: now
    };
  };

  // Unified goal handling for both home and away teams
  const handleAddGoal = (teamType, gameState = null) => {
    // For backward compatibility, if no gameState provided, just add goal immediately
    if (!gameState) {
      if (teamType === 'home') {
        addHomeGoal();
      } else {
        addAwayGoal();
      }
      return;
    }
    
    const eventId = generateEventId();
    const pendingGoalData = createPendingGoalData(teamType, eventId, gameState);
    
    // For home team goals: use modal flow for scorer attribution
    if (teamType === 'home') {
      // Store as pending goal, don't increment score yet
      setPendingGoalData(pendingGoalData);
      
      // Open goal scorer modal for home team goals only
      if (openGoalScorerModal) {
        openGoalScorerModal({
          eventId,
          team: teamType,
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
      // For away team goals: immediately increment score and log event (no modal)
      addAwayGoal();
      
      // Log the goal event immediately with no scorer attribution
      logEvent(pendingGoalData.type, {
        eventId: pendingGoalData.eventId,
        periodNumber: pendingGoalData.periodNumber,
        homeScore: pendingGoalData.homeScore,
        awayScore: pendingGoalData.awayScore,
        scorerId: null, // No scorer attribution for opponent goals
        teamName: pendingGoalData.teamName
      }, pendingGoalData.timestamp);
    }
  };

  const handleAddHomeGoal = (gameState = null) => {
    return handleAddGoal('home', gameState);
  };

  const handleAddAwayGoal = (gameState = null) => {
    return handleAddGoal('away', gameState);
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
    if (![EVENT_TYPES.GOAL_HOME, EVENT_TYPES.GOAL_AWAY].includes(goalEvent.type)) {
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
      .filter(event => [EVENT_TYPES.GOAL_HOME, EVENT_TYPES.GOAL_AWAY].includes(event.type))
      .sort((a, b) => a.timestamp - b.timestamp);
      
    const deletedGoalIndex = originalGoalEvents.findIndex(event => event.id === eventId
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
          const updateSuccess = updateEventData(event.id, correctedData);
          if (!updateSuccess) {
            console.warn(`Failed to update score history for event: ${event.id}`);
          }
        }
      });
      
      // Recalculate final scores by counting remaining active goals
      const remainingGoals = updatedEvents.filter(event => 
        [EVENT_TYPES.GOAL_HOME, EVENT_TYPES.GOAL_AWAY].includes(event.type) && !event.undone
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
      console.log(`Goal deleted successfully. New scores: Home ${newHomeScore}, Away ${newAwayScore}`);
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