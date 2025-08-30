import React, { useMemo } from 'react';
import { Square, Pause, Play, SquarePlay, Undo2, RefreshCcw } from 'lucide-react';
import { Button, FieldPlayerModal, SubstitutePlayerModal, GoalieModal, ScoreManagerModal, ConfirmationModal } from '../shared/UI';
import GoalScorerModal from '../shared/GoalScorerModal';
import { PLAYER_ROLES, PLAYER_STATUS } from '../../constants/playerConstants';
import { TEAM_CONFIG } from '../../constants/teamConstants';
import { findPlayerById, hasActiveSubstitutes } from '../../utils/playerUtils';
import { calculateCurrentStintDuration } from '../../game/time/timeCalculator';
import { getCurrentTimestamp } from '../../utils/timeUtils';
import { calculateMatchTime } from '../../utils/gameEventLogger';

// New modular imports
import { useGameModals } from '../../hooks/useGameModals';
import { useGameUIState } from '../../hooks/useGameUIState';
import { useTeamNameAbbreviation } from '../../hooks/useTeamNameAbbreviation';
import { FormationRenderer } from './formations';
import { createSubstitutionHandlers } from '../../game/handlers/substitutionHandlers';
import { createFieldPositionHandlers } from '../../game/handlers/fieldPositionHandlers';
import { useFieldPositionHandlers } from '../../hooks/useFieldPositionHandlers';
import { useQuickTapWithScrollDetection } from '../../hooks/useQuickTapWithScrollDetection';
import { createTimerHandlers } from '../../game/handlers/timerHandlers';
import { createScoreHandlers } from '../../game/handlers/scoreHandlers';
import { createGoalieHandlers } from '../../game/handlers/goalieHandlers';
import { sortPlayersByGoalScoringRelevance } from '../../utils/playerSortingUtils';

// Animation timing constants are now imported from animationSupport

const getOrdinalSuffix = (number) => {
  if (number % 10 === 1 && number % 100 !== 11) return `${number}st`;
  if (number % 10 === 2 && number % 100 !== 12) return `${number}nd`;
  if (number % 10 === 3 && number % 100 !== 13) return `${number}rd`;
  return `${number}th`;
};

export function GameScreen({ 
  currentPeriodNumber, 
  formation,
  setFormation,
  allPlayers, 
  setAllPlayers,
  matchTimerSeconds, 
  subTimerSeconds, 
  isSubTimerPaused,
  pauseSubTimer,
  resumeSubTimer,
  formatTime, 
  resetSubTimer, 
  handleUndoSubstitution: handleUndoSubstitutionTimer,
  handleEndPeriod, 
  nextPhysicalPairToSubOut,
  nextPlayerToSubOut,
  nextPlayerIdToSubOut,
  nextNextPlayerIdToSubOut,
  setNextNextPlayerIdToSubOut,
  selectedSquadPlayers,
  setNextPhysicalPairToSubOut,
  setNextPlayerToSubOut,
  setNextPlayerIdToSubOut,
  teamConfig,
  selectedFormation,
  alertMinutes,
  pushNavigationState,
  removeFromNavigationStack,
  ownScore,
  opponentScore,
  opponentTeam,
  addGoalScored,
  addGoalConceded,
  setScore,
  rotationQueue,
  setRotationQueue,
  matchEvents,
  goalScorers,
  matchStartTime,
  matchState,
  handleActualMatchStart,
  getPlayerName
}) {
  // Use new modular hooks
  const modalHandlers = useGameModals(pushNavigationState, removeFromNavigationStack);
  const uiState = useGameUIState();
  
  // Team name management
  const ownTeamName = TEAM_CONFIG.OWN_TEAM_NAME;
  const opponentTeamName = opponentTeam || TEAM_CONFIG.DEFAULT_OPPONENT_TEAM_NAME;
  const { scoreRowRef, displayOwnTeam, displayOpponentTeam } = useTeamNameAbbreviation(
    ownTeamName, opponentTeamName, ownScore, opponentScore
  );

  // Animation state for start button
  const [isStartAnimating, setIsStartAnimating] = React.useState(false);

  // Helper functions  
  const getPlayerNameById = React.useCallback((id) => getPlayerName(id), [getPlayerName]);
  
  // Memoize eligible players to prevent unnecessary re-renders and state resets
  const eligiblePlayers = useMemo(() => {
    const filteredPlayers = selectedSquadPlayers.filter(p => p.stats && !p.stats.isInactive);
    return sortPlayersByGoalScoringRelevance(filteredPlayers);
  }, [selectedSquadPlayers]);
  
  // Determine which formation mode we're using
  const isPairsMode = teamConfig?.substitutionType === 'pairs';


  // Helper to create game state object for pure logic functions
  const createGameState = React.useCallback(() => {
    const gameState = {
      formation,
      allPlayers,
      teamConfig,
      selectedFormation,
      nextPhysicalPairToSubOut,
      nextPlayerToSubOut,
      nextPlayerIdToSubOut,
      nextNextPlayerIdToSubOut,
      rotationQueue,
      selectedSquadPlayers,
      fieldPlayerModal: modalHandlers.modals.fieldPlayer,
      lastSubstitution: uiState.lastSubstitution,
      subTimerSeconds,
      isSubTimerPaused,
      currentPeriodNumber,
      matchTimerSeconds,
      ownScore,
      opponentScore
    };
    
    
    return gameState;
  }, [
    formation, allPlayers, teamConfig, selectedFormation, nextPhysicalPairToSubOut,
    nextPlayerToSubOut, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut,
    rotationQueue, selectedSquadPlayers, modalHandlers.modals.fieldPlayer, uiState.lastSubstitution,
    subTimerSeconds, isSubTimerPaused, currentPeriodNumber, matchTimerSeconds, ownScore, opponentScore
  ]);

  // State updaters object for handlers
  const stateUpdaters = React.useMemo(() => ({
    setFormation,
    setAllPlayers,
    setNextPhysicalPairToSubOut,
    setNextPlayerToSubOut,
    setNextPlayerIdToSubOut,
    setNextNextPlayerIdToSubOut,
    setRotationQueue,
    setShouldSubstituteNow: uiState.setShouldSubstituteNow,
    setLastSubstitution: uiState.setLastSubstitution,
    setLastSubstitutionTimestamp: () => {}, // Legacy - not used in new architecture
    setScore, // Direct access for atomic updates
    setOwnScore: (score) => setScore(score, opponentScore),
    setOpponentScore: (score) => setScore(ownScore, score),
    addGoalScored,
    addGoalConceded,
    resetSubTimer,
    handleUndoSubstitutionTimer
  }), [
    setFormation, setAllPlayers, setNextPhysicalPairToSubOut,
    setNextPlayerToSubOut, setNextPlayerIdToSubOut, setNextNextPlayerIdToSubOut,
    setRotationQueue, uiState.setShouldSubstituteNow, uiState.setLastSubstitution,
    setScore, ownScore, opponentScore, addGoalScored, addGoalConceded, resetSubTimer,
    handleUndoSubstitutionTimer
  ]);

  // Animation hooks object for handlers
  const animationHooks = React.useMemo(() => ({
    setAnimationState: uiState.setAnimationState,
    setHideNextOffIndicator: uiState.setHideNextOffIndicator,
    setRecentlySubstitutedPlayers: uiState.setRecentlySubstitutedPlayers
  }), [uiState.setAnimationState, uiState.setHideNextOffIndicator, uiState.setRecentlySubstitutedPlayers]);

  // Timer controls object for handlers
  const timerControls = React.useMemo(() => ({
    pauseSubTimer,
    resumeSubTimer
  }), [pauseSubTimer, resumeSubTimer]);

  // Create handlers using the new handler factories
  const substitutionHandlers = React.useMemo(() => 
    createSubstitutionHandlers(
      createGameState,
      stateUpdaters,
      animationHooks,
      modalHandlers,
      teamConfig
    ), [createGameState, stateUpdaters, animationHooks, modalHandlers, teamConfig]
  );

  const fieldPositionCallbacks = React.useMemo(() =>
    createFieldPositionHandlers(
      teamConfig,
      formation,
      allPlayers,
      nextPlayerIdToSubOut,
      modalHandlers,
      selectedFormation  // NEW: Pass selectedFormation for formation-aware position callbacks
    ), [teamConfig, formation, allPlayers, nextPlayerIdToSubOut, modalHandlers, selectedFormation]
  );

  const quickTapHandlers = useFieldPositionHandlers(fieldPositionCallbacks, teamConfig);

  const timerHandlers = React.useMemo(() =>
    createTimerHandlers(
      selectedSquadPlayers,
      stateUpdaters,
      timerControls,
      createGameState
    ), [selectedSquadPlayers, stateUpdaters, timerControls, createGameState]
  );

  const scoreHandlers = React.useMemo(() =>
    createScoreHandlers(
      stateUpdaters,
      modalHandlers
    ), [stateUpdaters, modalHandlers]
  );

  const goalieHandlerCallbacks = React.useMemo(() =>
    createGoalieHandlers(
      createGameState,
      stateUpdaters,
      animationHooks,
      modalHandlers,
      allPlayers,
      selectedSquadPlayers
    ), [createGameState, stateUpdaters, animationHooks, modalHandlers, allPlayers, selectedSquadPlayers]
  );

  const goalieEvents = useQuickTapWithScrollDetection(goalieHandlerCallbacks.goalieCallback);
  const scoreEvents = useQuickTapWithScrollDetection(scoreHandlers.scoreCallback);
  
  const goalieHandlers = React.useMemo(() => ({
    ...goalieHandlerCallbacks,
    goalieEvents
  }), [goalieHandlerCallbacks, goalieEvents]);

  // Check if SUB NOW button should be enabled (at least one active substitute)
  const canSubstitute = React.useMemo(() => {
    return hasActiveSubstitutes(allPlayers, teamConfig);
  }, [allPlayers, teamConfig]);

  // Function to get player time stats
  const getPlayerTimeStats = React.useCallback((playerId) => {
    const player = findPlayerById(allPlayers, playerId);
    if (!player) {
      return { totalOutfieldTime: 0, attackDefenderDiff: 0 };
    }
    
    const stats = player.stats;
    
    // When timer is paused, only use the stored stats without calculating current stint
    if (isSubTimerPaused) {
      const totalOutfieldTime = stats.timeOnFieldSeconds || 0;
      const attackDefenderDiff = (stats.timeAsAttackerSeconds || 0) - (stats.timeAsDefenderSeconds || 0);
      
      return { totalOutfieldTime, attackDefenderDiff };
    }
    
    // Calculate current stint time using time module
    let currentStintTime = 0;
    if (stats.currentStatus === PLAYER_STATUS.ON_FIELD) {
      currentStintTime = calculateCurrentStintDuration(stats.lastStintStartTimeEpoch, getCurrentTimestamp());
    }
    
    // Total outfield time includes completed time plus current stint if on field
    const totalOutfieldTime = (stats.timeOnFieldSeconds || 0) + currentStintTime;
    
    // Calculate attacker-defender difference with current stint
    let attackerTime = stats.timeAsAttackerSeconds || 0;
    let defenderTime = stats.timeAsDefenderSeconds || 0;
    
    if (stats.currentStatus === PLAYER_STATUS.ON_FIELD && stats.currentRole) {
      if (stats.currentRole === PLAYER_ROLES.ATTACKER) {  // Use constant
        attackerTime += currentStintTime;
      } else if (stats.currentRole === PLAYER_ROLES.DEFENDER) {  // Use constant
        defenderTime += currentStintTime;
      }
      // Note: Midfielder time is intentionally not added to attacker-defender difference
      // as per user requirements - midfielders should not affect the balance
    }
    
    const attackDefenderDiff = attackerTime - defenderTime;
    
    return { totalOutfieldTime, attackDefenderDiff };
  }, [allPlayers, isSubTimerPaused]);

  // Handle substitution automation when shouldSubstituteNow is set
  React.useEffect(() => {
    if (uiState.shouldSubstituteNow) {
      uiState.setShouldSubstituteNow(false);
      substitutionHandlers.handleSubstitutionWithHighlight();
    }
  }, [uiState.shouldSubstituteNow, uiState.setShouldSubstituteNow, substitutionHandlers, uiState]);

  // Handle undo substitution using handler pattern
  const handleUndoSubstitutionClick = () => {
    if (uiState.lastSubstitution) {
      substitutionHandlers.handleUndo(uiState.lastSubstitution);
      // Clear the last substitution after handling
      uiState.clearLastSubstitution();
    }
  };

  // Handle animated match start with 2-second transition
  const handleAnimatedMatchStart = () => {
    if (isStartAnimating) return; // Prevent multiple clicks during animation
    setIsStartAnimating(true);
    setTimeout(() => {
      handleActualMatchStart();
    }, 2000);
  };

  return (
    <div className="relative space-y-4">
      {/* Start Match Overlay - shown when match is pending */}
      {matchState === 'pending' && (
        <div className={`absolute inset-0 z-50 flex items-center justify-center p-8 transition-opacity duration-[2000ms] ${isStartAnimating ? 'opacity-0' : 'opacity-100'}`}>
          {/* Subtle Glass effect backdrop - less blurry so GameScreen is visible */}
          <div className={`absolute inset-0 bg-black transition-all duration-[2000ms] ${isStartAnimating ? 'bg-opacity-0 backdrop-blur-none' : 'bg-opacity-30 backdrop-blur-sm'}`} />
          <div className={`absolute inset-0 bg-gradient-to-br from-sky-900/10 to-slate-900/15 transition-opacity duration-[2000ms] ${isStartAnimating ? 'opacity-0' : 'opacity-100'}`} />
          
          {/* Cool Clickable Icon */}
          <div className={`relative z-10 text-center transition-opacity duration-[2000ms] ${isStartAnimating ? 'opacity-0' : 'opacity-100'}`}>
            {/* Main Clickable Icon */}
            <div
              onClick={handleAnimatedMatchStart}
              className={`group relative inline-block select-none transition-opacity duration-[2000ms] ${isStartAnimating ? 'cursor-default opacity-0' : 'cursor-pointer opacity-100'}`}
            >
              {/* Multi-layer Glow Effects */}
              <div className="absolute inset-0 animate-pulse">
                <div className="absolute inset-0 bg-sky-400 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
                <div className="absolute inset-0 bg-sky-300 rounded-full blur-2xl opacity-30 group-hover:opacity-60 transition-opacity duration-300" />
                <div className="absolute inset-0 bg-white rounded-full blur-xl opacity-10 group-hover:opacity-30 transition-opacity duration-200" />
              </div>
              
              {/* Icon with Effects */}
              <SquarePlay 
                size={160} 
                className="relative text-sky-400 hover:text-sky-300 active:text-sky-500 
                          drop-shadow-2xl 
                          transform group-hover:scale-110 group-active:scale-95 
                          transition-all duration-300 ease-out
                          filter group-hover:brightness-110 group-active:brightness-90
                          group-hover:drop-shadow-[0_0_30px_rgba(56,189,248,0.8)]
                          group-active:drop-shadow-[0_0_50px_rgba(56,189,248,1)]" 
              />
              
              {/* Ripple Effect on Click */}
              <div className={`absolute inset-0 rounded-full transition-opacity ${isStartAnimating ? 'opacity-100 animate-ping duration-[2000ms]' : 'opacity-0 group-active:opacity-100 group-active:animate-ping duration-75'} bg-sky-400/20`} />
              {/* Extended ripple effects during animation */}
              {isStartAnimating && (
                <>
                  <div className="absolute inset-0 rounded-full opacity-60 animate-ping bg-sky-300/15 animation-delay-300" style={{animationDuration: '2000ms'}} />
                  <div className="absolute inset-0 rounded-full opacity-40 animate-ping bg-sky-200/10 animation-delay-600" style={{animationDuration: '2000ms'}} />
                </>
              )}
            </div>
            
            {/* Descriptive Text */}
            <div className={`mt-8 space-y-2 transition-opacity duration-[2000ms] ${isStartAnimating ? 'opacity-0' : 'opacity-100'}`}>
              <p className="text-3xl font-bold text-white drop-shadow-lg tracking-wide">
                Start {currentPeriodNumber === 1 ? 'Match' : `${getOrdinalSuffix(currentPeriodNumber)} Period`}
              </p>
              <p className="text-center text-sky-100/70 text-lg font-medium tracking-wide drop-shadow-sm">
                Tap to begin the period and start timers
              </p>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-xl font-semibold text-sky-300 text-center">Period {currentPeriodNumber}</h2>

      

      {/* Timers */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="p-2 bg-slate-700 rounded-lg">
          <p className="text-xs text-sky-200 mb-0.5">Match Clock</p>
          <p className={`text-2xl font-mono ${matchTimerSeconds < 0 ? 'text-red-400' : 'text-sky-400'}`}>
            {matchTimerSeconds < 0 ? '+' : ''}{formatTime(Math.abs(matchTimerSeconds))}
          </p>
        </div>
        <div className="p-2 bg-slate-700 rounded-lg relative">
          <p className="text-xs text-sky-200 mb-0.5">Substitution Timer</p>
          <div className="relative flex items-center justify-center">
            <p className={`text-2xl font-mono ${alertMinutes > 0 && subTimerSeconds >= alertMinutes * 60 ? 'text-red-400' : 'text-emerald-400'}`}>
              {formatTime(subTimerSeconds)}
            </p>
            <button
              onClick={isSubTimerPaused ? timerHandlers.handleResumeTimer : timerHandlers.handlePauseTimer}
              className="absolute right-0 p-1 hover:bg-slate-600 rounded-full transition-colors duration-150 flex-shrink-0"
              title={isSubTimerPaused ? "Resume substitution timer" : "Pause substitution timer"}
            >
              {isSubTimerPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Score Display */}
      <div className="p-2 bg-slate-700 rounded-lg text-center">
        <div ref={scoreRowRef} className="flex items-center justify-center space-x-2.5">
          <button
            onClick={() => scoreHandlers.handleAddGoalScored(createGameState())}
            className="flex-1 px-3 py-2 bg-sky-600 hover:bg-sky-500 rounded-md text-white font-semibold transition-colors"
          >
            {displayOwnTeam}
          </button>
          <div 
            {...scoreEvents}
            className="text-2xl font-mono font-bold text-sky-200 cursor-pointer select-none px-1.5 py-2 rounded-md hover:bg-slate-600 transition-colors whitespace-nowrap flex-shrink-0"
          >
            {ownScore} - {opponentScore}
          </div>
          <button
            onClick={() => scoreHandlers.handleAddGoalConceded(createGameState())}
            className="flex-1 px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded-md text-white font-semibold transition-colors"
          >
            {displayOpponentTeam}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1">Tap team name to add goal • Hold score to edit</p>
      </div>

      {/* Field & Subs Visualization */}
      <FormationRenderer
          teamConfig={teamConfig}
          selectedFormation={selectedFormation}
          formation={formation}
          allPlayers={allPlayers}
          animationState={uiState.animationState}
          recentlySubstitutedPlayers={uiState.recentlySubstitutedPlayers}
          hideNextOffIndicator={uiState.hideNextOffIndicator || (teamConfig?.substitutionType === 'individual' && !canSubstitute)}
          nextPhysicalPairToSubOut={nextPhysicalPairToSubOut}
          nextPlayerIdToSubOut={nextPlayerIdToSubOut}
          nextNextPlayerIdToSubOut={nextNextPlayerIdToSubOut}
          quickTapHandlers={quickTapHandlers}
          goalieHandlers={goalieHandlers}
          getPlayerNameById={getPlayerNameById}
          getPlayerTimeStats={getPlayerTimeStats}
        />

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 mt-4">
        {/* Top row: SUB NOW with undo button */}
        <div className="flex gap-2">
          <Button 
            onClick={substitutionHandlers.handleSubstitutionWithHighlight} 
            Icon={RefreshCcw} 
            className="flex-1"
            disabled={!canSubstitute}
            title={canSubstitute ? "Make substitution" : "All substitutes are inactive - cannot substitute"}
          >
            SUB NOW
          </Button>
          <button
            onClick={handleUndoSubstitutionClick}
            disabled={!uiState.lastSubstitution}
            className={`w-12 h-12 rounded-md flex items-center justify-center transition-all duration-200 ${
              uiState.lastSubstitution 
                ? 'bg-slate-600 hover:bg-slate-500 text-slate-100 shadow-md cursor-pointer' 
                : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'
            }`}
            title={uiState.lastSubstitution ? "Undo last substitution" : "No substitution to undo"}
          >
            <Undo2 className="h-5 w-5" />
          </button>
        </div>
        
        {/* Bottom row: End Period */}
        <Button onClick={handleEndPeriod} Icon={Square} variant="danger" className="w-full">
          End Period
        </Button>
      </div>

      {/* Field Player Modal */}
      <FieldPlayerModal
        isOpen={modalHandlers.modals.fieldPlayer.isOpen}
        onSetNext={() => substitutionHandlers.handleSetNextSubstitution(modalHandlers.modals.fieldPlayer)}
        onSubNow={() => substitutionHandlers.handleSubstituteNow(modalHandlers.modals.fieldPlayer)}
        onCancel={substitutionHandlers.handleCancelFieldPlayerModal}
        onChangePosition={substitutionHandlers.handleChangePosition}
        playerName={modalHandlers.modals.fieldPlayer.playerName}
        availablePlayers={modalHandlers.modals.fieldPlayer.availablePlayers}
        showPositionChange={!isPairsMode && modalHandlers.modals.fieldPlayer.type === 'player'}
        showPositionOptions={modalHandlers.modals.fieldPlayer.showPositionOptions}
        showSwapPositions={isPairsMode && modalHandlers.modals.fieldPlayer.type === 'pair'}
        showSubstitutionOptions={
          modalHandlers.modals.fieldPlayer.type === 'player' || 
          (modalHandlers.modals.fieldPlayer.type === 'pair' && modalHandlers.modals.fieldPlayer.target !== 'subPair')
        }
        canSubstitute={teamConfig?.substitutionType === 'individual' ? canSubstitute : true}
      />

      {/* Substitute Player Modal */}
      <SubstitutePlayerModal
        isOpen={modalHandlers.modals.substitute.isOpen}
        onInactivate={() => substitutionHandlers.handleInactivatePlayer(modalHandlers.modals.substitute, allPlayers, formation)}
        onActivate={() => substitutionHandlers.handleActivatePlayer(modalHandlers.modals.substitute)}
        onCancel={substitutionHandlers.handleCancelSubstituteModal}
        onSetAsNextToGoIn={() => substitutionHandlers.handleSetAsNextToGoIn(modalHandlers.modals.substitute, formation)}
        playerName={modalHandlers.modals.substitute.playerName}
        isCurrentlyInactive={modalHandlers.modals.substitute.isCurrentlyInactive}
        canSetAsNextToGoIn={modalHandlers.modals.substitute.canSetAsNextToGoIn}
      />

      {/* Goalie Replacement Modal */}
      <GoalieModal
        isOpen={modalHandlers.modals.goalie.isOpen}
        onCancel={goalieHandlers.handleCancelGoalieModal}
        onSelectGoalie={goalieHandlers.handleSelectNewGoalie}
        currentGoalieName={modalHandlers.modals.goalie.currentGoalieName}
        availablePlayers={modalHandlers.modals.goalie.availablePlayers}
      />

      {/* Score Manager Modal */}
      <ScoreManagerModal
        isOpen={modalHandlers.modals.scoreEdit.isOpen}
        onCancel={modalHandlers.closeScoreEditModal}
        ownScore={ownScore}
        opponentScore={opponentScore}
        ownTeamName={ownTeamName}
        opponentTeam={opponentTeamName}
        matchEvents={matchEvents}
        goalScorers={goalScorers}
        allPlayers={allPlayers}
        onAddGoalScored={() => scoreHandlers.handleAddGoalScored(createGameState())}
        onAddGoalConceded={() => scoreHandlers.handleAddGoalConceded(createGameState())}
        onEditGoalScorer={scoreHandlers.handleEditGoalScorer}
        onDeleteGoal={scoreHandlers.handleDeleteGoal}
        calculateMatchTime={(timestamp) => calculateMatchTime(timestamp, matchStartTime)}
        formatTime={formatTime}
        getPlayerName={getPlayerName}
      />

      {/* Undo Confirmation Modal */}
      <ConfirmationModal
        isOpen={modalHandlers.modals.undoConfirm.isOpen}
        onConfirm={handleUndoSubstitutionClick}
        onCancel={modalHandlers.closeUndoConfirmModal}
        title="Undo Substitution"
        message="Are you sure you want to undo the last substitution? This will reverse player positions and time tracking."
        confirmText="Undo"
        cancelText="Cancel"
        variant="warning"
      />

      {/* Goal Scorer Modal */}
      <GoalScorerModal
        isOpen={modalHandlers.modals.goalScorer.isOpen}
        onClose={scoreHandlers.handleCancelGoalScorer}
        onSelectScorer={(scorerId) => scoreHandlers.handleSelectGoalScorer(modalHandlers.modals.goalScorer.eventId, scorerId)}
        onCorrectGoal={(eventId, scorerId) => scoreHandlers.handleCorrectGoalScorer(eventId, scorerId)}
        eligiblePlayers={eligiblePlayers}
        mode={modalHandlers.modals.goalScorer.mode}
        eventId={modalHandlers.modals.goalScorer.eventId}
        currentScorerId={modalHandlers.modals.goalScorer.currentScorerId}
        existingGoalData={modalHandlers.modals.goalScorer.existingGoalData}
        matchTime={modalHandlers.modals.goalScorer.matchTime}
        goalType={modalHandlers.modals.goalScorer.team}
      />
    </div>
  );
}

// Custom comparison function for React.memo
const arePropsEqual = (prevProps, nextProps) => {
  // Compare primitive props
  const primitiveProps = [
    'currentPeriodNumber', 'matchTimerSeconds', 'subTimerSeconds', 'isSubTimerPaused',
    'teamConfig', 'selectedFormation', 'nextPhysicalPairToSubOut', 'nextPlayerToSubOut',
    'nextPlayerIdToSubOut', 'nextNextPlayerIdToSubOut', 'ownScore', 'opponentScore'
  ];
  
  for (const prop of primitiveProps) {
    if (prevProps[prop] !== nextProps[prop]) {
      return false;
    }
  }
  
  // Compare complex objects with shallow comparison
  // Formation object comparison
  if (JSON.stringify(prevProps.formation) !== JSON.stringify(nextProps.formation)) {
    return false;
  }
  
  // Players array comparison (shallow)
  if (prevProps.allPlayers?.length !== nextProps.allPlayers?.length) {
    return false;
  }
  
  // Compare players by reference (assuming immutable updates)
  if (prevProps.allPlayers && nextProps.allPlayers) {
    for (let i = 0; i < prevProps.allPlayers.length; i++) {
      if (prevProps.allPlayers[i] !== nextProps.allPlayers[i]) {
        return false;
      }
    }
  }
  
  // Rotation queue comparison
  if (prevProps.rotationQueue?.length !== nextProps.rotationQueue?.length) {
    return false;
  }
  
  if (prevProps.rotationQueue && nextProps.rotationQueue) {
    for (let i = 0; i < prevProps.rotationQueue.length; i++) {
      if (prevProps.rotationQueue[i] !== nextProps.rotationQueue[i]) {
        return false;
      }
    }
  }
  
  // All props are equal
  return true;
};

// Export memoized component
export default React.memo(GameScreen, arePropsEqual);