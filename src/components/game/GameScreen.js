import React from 'react';
import { Square, Pause, Play, Undo2, RotateCcw } from 'lucide-react';
import { Button, FieldPlayerModal, SubstitutePlayerModal, GoalieModal, ScoreEditModal, ConfirmationModal } from '../shared/UI';
import { TEAM_MODES } from '../../constants/playerConstants';
import { TEAM_CONFIG } from '../../constants/teamConstants';
import { getPlayerName, findPlayerById } from '../../utils/playerUtils';
import { calculateCurrentStintDuration } from '../../game/time/timeCalculator';

// New modular imports
import { useGameModals } from '../../hooks/useGameModals';
import { useGameUIState } from '../../hooks/useGameUIState';
import { useTeamNameAbbreviation } from '../../hooks/useTeamNameAbbreviation';
import { FormationRenderer } from './formations';
import { createSubstitutionHandlers } from '../../game/handlers/substitutionHandlers';
import { createFieldPositionHandlers } from '../../game/handlers/fieldPositionHandlers';
import { useFieldPositionHandlers } from '../../hooks/useFieldPositionHandlers';
import { useLongPressWithScrollDetection } from '../../hooks/useLongPressWithScrollDetection';
import { createTimerHandlers } from '../../game/handlers/timerHandlers';
import { createScoreHandlers } from '../../game/handlers/scoreHandlers';
import { createGoalieHandlers } from '../../game/handlers/goalieHandlers';

// Animation timing constants are now imported from animationSupport

export function GameScreen({ 
  currentPeriodNumber, 
  periodFormation, 
  setPeriodFormation,
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
  teamMode,
  alertMinutes,
  pushModalState,
  removeModalFromStack,
  homeScore,
  awayScore,
  opponentTeamName,
  addHomeGoal,
  addAwayGoal,
  setScore,
  rotationQueue,
  setRotationQueue
}) {
  // Use new modular hooks
  const modalHandlers = useGameModals(pushModalState, removeModalFromStack);
  const uiState = useGameUIState();
  
  // Team name management
  const homeTeamName = TEAM_CONFIG.HOME_TEAM_NAME;
  const awayTeamName = opponentTeamName || TEAM_CONFIG.DEFAULT_AWAY_TEAM_NAME;
  const { scoreRowRef, displayHomeTeam, displayAwayTeam } = useTeamNameAbbreviation(
    homeTeamName, awayTeamName, homeScore, awayScore
  );

  // Helper functions
  const getPlayerNameById = React.useCallback((id) => getPlayerName(allPlayers, id), [allPlayers]);
  
  // Determine which formation mode we're using
  const isPairsMode = teamMode === TEAM_MODES.PAIRS_7;

  // Helper to create game state object for pure logic functions
  const createGameState = React.useCallback(() => {
    const gameState = {
      periodFormation,
      allPlayers,
      teamMode,
      nextPhysicalPairToSubOut,
      nextPlayerToSubOut,
      nextPlayerIdToSubOut,
      nextNextPlayerIdToSubOut,
      rotationQueue,
      selectedSquadPlayers,
      fieldPlayerModal: modalHandlers.modals.fieldPlayer,
      lastSubstitution: uiState.lastSubstitution,
      subTimerSeconds,
      isSubTimerPaused
    };
    
    console.log(`🎯 DEBUG createGameState - Timer state for substitution:`);
    console.log(`  ⏸️ isSubTimerPaused: ${isSubTimerPaused}`);
    console.log(`  🕐 subTimerSeconds: ${subTimerSeconds}`);
    
    return gameState;
  }, [
    periodFormation, allPlayers, teamMode, nextPhysicalPairToSubOut,
    nextPlayerToSubOut, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut,
    rotationQueue, selectedSquadPlayers, modalHandlers.modals.fieldPlayer, uiState.lastSubstitution,
    subTimerSeconds, isSubTimerPaused
  ]);

  // State updaters object for handlers
  const stateUpdaters = React.useMemo(() => ({
    setPeriodFormation,
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
    setHomeScore: (score) => setScore(score, awayScore),
    setAwayScore: (score) => setScore(homeScore, score),
    addHomeGoal,
    addAwayGoal,
    resetSubTimer,
    handleUndoSubstitutionTimer
  }), [
    setPeriodFormation, setAllPlayers, setNextPhysicalPairToSubOut,
    setNextPlayerToSubOut, setNextPlayerIdToSubOut, setNextNextPlayerIdToSubOut,
    setRotationQueue, uiState.setShouldSubstituteNow, uiState.setLastSubstitution,
    setScore, homeScore, awayScore, addHomeGoal, addAwayGoal, resetSubTimer,
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
      teamMode
    ), [createGameState, stateUpdaters, animationHooks, modalHandlers, teamMode]
  );

  const fieldPositionCallbacks = React.useMemo(() =>
    createFieldPositionHandlers(
      teamMode,
      periodFormation,
      allPlayers,
      nextPlayerIdToSubOut,
      modalHandlers
    ), [teamMode, periodFormation, allPlayers, nextPlayerIdToSubOut, modalHandlers]
  );

  const longPressHandlers = useFieldPositionHandlers(fieldPositionCallbacks, teamMode);

  const timerHandlers = React.useMemo(() =>
    createTimerHandlers(
      selectedSquadPlayers,
      stateUpdaters,
      timerControls
    ), [selectedSquadPlayers, stateUpdaters, timerControls]
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

  const goalieEvents = useLongPressWithScrollDetection(goalieHandlerCallbacks.goalieCallback);
  const scoreEvents = useLongPressWithScrollDetection(scoreHandlers.scoreCallback);
  
  const goalieHandlers = React.useMemo(() => ({
    ...goalieHandlerCallbacks,
    goalieEvents
  }), [goalieHandlerCallbacks, goalieEvents]);

  // Function to get player time stats
  const getPlayerTimeStats = React.useCallback((playerId) => {
    const player = findPlayerById(allPlayers, playerId);
    if (!player) {
      console.warn(`getPlayerTimeStats: Player not found for ID: ${playerId}`);
      return { totalOutfieldTime: 0, attackDefenderDiff: 0 };
    }
    
    const stats = player.stats;
    
    // Debug logging for time field validation (removed non-relevant logs)
    
    // When timer is paused, only use the stored stats without calculating current stint
    if (isSubTimerPaused) {
      const totalOutfieldTime = stats.timeOnFieldSeconds || 0;
      const attackDefenderDiff = (stats.timeAsAttackerSeconds || 0) - (stats.timeAsDefenderSeconds || 0);
      
      return { totalOutfieldTime, attackDefenderDiff };
    }
    
    // Calculate current stint time using time module
    let currentStintTime = 0;
    if (stats.currentPeriodStatus === 'on_field') {
      currentStintTime = calculateCurrentStintDuration(stats.lastStintStartTimeEpoch, Date.now());
    }
    
    // Total outfield time includes completed time plus current stint if on field
    const totalOutfieldTime = (stats.timeOnFieldSeconds || 0) + currentStintTime;
    
    // Calculate attacker-defender difference with current stint
    let attackerTime = stats.timeAsAttackerSeconds || 0;
    let defenderTime = stats.timeAsDefenderSeconds || 0;
    
    if (stats.currentPeriodStatus === 'on_field' && stats.currentPeriodRole) {
      if (stats.currentPeriodRole === 'Attacker') {
        attackerTime += currentStintTime;
      } else if (stats.currentPeriodRole === 'Defender') {
        defenderTime += currentStintTime;
      }
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


  return (
    <div className="space-y-4">
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
            onClick={scoreHandlers.handleAddHomeGoal}
            className="flex-1 px-3 py-2 bg-sky-600 hover:bg-sky-500 rounded-md text-white font-semibold transition-colors"
          >
            {displayHomeTeam}
          </button>
          <div 
            {...scoreEvents}
            className="text-2xl font-mono font-bold text-sky-200 cursor-pointer select-none px-1.5 py-2 rounded-md hover:bg-slate-600 transition-colors whitespace-nowrap flex-shrink-0"
          >
            {homeScore} - {awayScore}
          </div>
          <button
            onClick={scoreHandlers.handleAddAwayGoal}
            className="flex-1 px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded-md text-white font-semibold transition-colors"
          >
            {displayAwayTeam}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1">Tap team name to add goal • Hold score to edit</p>
      </div>

      {/* Field & Subs Visualization */}
      <FormationRenderer
          teamMode={teamMode}
          periodFormation={periodFormation}
          allPlayers={allPlayers}
          animationState={uiState.animationState}
          recentlySubstitutedPlayers={uiState.recentlySubstitutedPlayers}
          hideNextOffIndicator={uiState.hideNextOffIndicator}
          nextPhysicalPairToSubOut={nextPhysicalPairToSubOut}
          nextPlayerIdToSubOut={nextPlayerIdToSubOut}
          nextNextPlayerIdToSubOut={nextNextPlayerIdToSubOut}
          longPressHandlers={longPressHandlers}
          goalieHandlers={goalieHandlers}
          getPlayerNameById={getPlayerNameById}
          getPlayerTimeStats={getPlayerTimeStats}
        />

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 mt-4">
        {/* Top row: SUB NOW with undo button */}
        <div className="flex gap-2">
          <Button onClick={substitutionHandlers.handleSubstitutionWithHighlight} Icon={RotateCcw} className="flex-1">
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
      />

      {/* Substitute Player Modal */}
      <SubstitutePlayerModal
        isOpen={modalHandlers.modals.substitute.isOpen}
        onInactivate={() => substitutionHandlers.handleInactivatePlayer(modalHandlers.modals.substitute, allPlayers, periodFormation)}
        onActivate={() => substitutionHandlers.handleActivatePlayer(modalHandlers.modals.substitute)}
        onCancel={substitutionHandlers.handleCancelSubstituteModal}
        onSetAsNextToGoIn={() => substitutionHandlers.handleSetAsNextToGoIn(modalHandlers.modals.substitute, periodFormation)}
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

      {/* Score Edit Modal */}
      <ScoreEditModal
        isOpen={modalHandlers.modals.scoreEdit.isOpen}
        onCancel={modalHandlers.closeScoreEditModal}
        onSave={(newHomeScore, newAwayScore) => scoreHandlers.handleScoreEdit(newHomeScore, newAwayScore)}
        homeScore={homeScore}
        awayScore={awayScore}
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
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
    </div>
  );
}