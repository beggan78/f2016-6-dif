import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { useGameState } from './hooks/useGameState';
import { useTimers } from './hooks/useTimers';
import { useBrowserBackIntercept } from './hooks/useBrowserBackIntercept';
import { formatTime } from './utils/formatUtils';
import { formatPlayerName } from './utils/formatUtils';
import { calculateUndoTimerTarget } from './game/time/timeCalculator';
import { initializePlayers } from './utils/playerUtils';
import { initialRoster } from './constants/defaultData';
import { VIEWS } from './constants/viewConstants';
import { clearAllEvents } from './utils/gameEventLogger';
import { ConfigurationScreen } from './components/setup/ConfigurationScreen';
import { PeriodSetupScreen } from './components/setup/PeriodSetupScreen';
import { GameScreen } from './components/game/GameScreen';
import { StatsScreen } from './components/stats/StatsScreen';
import { MatchReportScreen } from './components/report/MatchReportScreen';
import { TacticalBoardScreen } from './components/tactical/TacticalBoardScreen';
import { ConfirmationModal, ThreeOptionModal } from './components/shared/UI';
import { getSelectedSquadPlayers, getOutfieldPlayers } from './utils/playerUtils';
import { HamburgerMenu } from './components/shared/HamburgerMenu';
import { AddPlayerModal } from './components/shared/AddPlayerModal';
import { isDebugMode } from './utils/debugUtils';

// Main App Component
function App() {
  const gameState = useGameState();
  const timers = useTimers(gameState.periodDurationMinutes);
  
  // Debug mode detection
  const debugMode = isDebugMode();
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState({ timeString: '' });
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [fromView, setFromView] = useState(null);
  
  // Create a ref to store the pushNavigationState function to avoid circular dependency
  const pushNavigationStateRef = useRef(null);

  const handleNavigateFromTacticalBoard = useCallback((fallbackView) => {
    // Navigate back to the previous view - for now, go to GAME view if available, otherwise CONFIG
    if (gameState.view === VIEWS.TACTICAL_BOARD) {
      gameState.setView(fromView || fallbackView || VIEWS.CONFIG);
    }
  }, [gameState, fromView]);
  
  // Global navigation handler for when no modals are open
  const handleGlobalNavigation = useCallback(() => {
    // Check current view and handle accordingly
    if (gameState.view === VIEWS.PERIOD_SETUP && gameState.currentPeriodNumber === 1) {
      // Exception: PeriodSetupScreen -> ConfigurationScreen
      gameState.setView(VIEWS.CONFIG);
    } else if (gameState.view === VIEWS.TACTICAL_BOARD) {
      // Navigate back from Tactical Board - same as clicking Back button
      handleNavigateFromTacticalBoard();
    } else {
      // Default: Show "Start a new game?" confirmation modal
      setShowNewGameModal(true);
      // Register this modal with the browser back intercept system
      if (pushNavigationStateRef.current) {
        pushNavigationStateRef.current(() => {
          setShowNewGameModal(false);
        });
      }
    }
  }, [gameState, handleNavigateFromTacticalBoard]);
  
  const { pushNavigationState, removeFromNavigationStack } = useBrowserBackIntercept(handleGlobalNavigation);
  
  // Store the pushNavigationState function in the ref
  useEffect(() => {
    pushNavigationStateRef.current = pushNavigationState;
  }, [pushNavigationState]);

  const selectedSquadPlayers = useMemo(() => {
    return getSelectedSquadPlayers(gameState.allPlayers, gameState.selectedSquadIds);
  }, [gameState.allPlayers, gameState.selectedSquadIds]);

  // Global browser back handler - integrated with useBrowserBackIntercept
  useEffect(() => {
    // Wait a bit to ensure app is fully mounted
    const setupTimer = setTimeout(() => {
      // Push a state to history stack to detect back navigation
      window.history.pushState({ app: 'dif-coach' }, '', window.location.href);
    }, 100);

    return () => {
      clearTimeout(setupTimer);
    };
  }, []);

  const availableForPairing = useMemo(() => {
    if (!gameState.formation.goalie) return [];
    return getOutfieldPlayers(gameState.allPlayers, gameState.selectedSquadIds, gameState.formation.goalie);
  }, [gameState.allPlayers, gameState.selectedSquadIds, gameState.formation.goalie]);

  // Enhanced game handlers that integrate with timers
  const handleStartGame = () => {
    gameState.handleStartGame();
    timers.startTimers(
      gameState.currentPeriodNumber,
      gameState.teamConfig,
      'Djurgården', // Home team name
      gameState.opponentTeamName,
      gameState.formation,
      gameState.numPeriods,
      gameState.allPlayers
    );
  };


  const handleUndoSubstitution = (subTimerSecondsAtSubstitution, substitutionTimestamp) => {
    const targetSubTimerSeconds = calculateUndoTimerTarget(
      subTimerSecondsAtSubstitution,
      substitutionTimestamp || gameState.lastSubstitutionTimestamp
    );
    
    timers.restoreSubTimer(targetSubTimerSeconds);
  };

  const handleEndPeriod = () => {
    // Check if period is ending more than 1 minute early
    const remainingMinutes = Math.floor(timers.matchTimerSeconds / 60);
    const remainingSeconds = timers.matchTimerSeconds % 60;
    
    if (timers.matchTimerSeconds > 60) { // More than 1 minute remaining
      const timeString = remainingMinutes > 0 
        ? `${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')}`
        : `${remainingSeconds} seconds`;
      
      setConfirmModalData({ timeString });
      setShowConfirmModal(true);
      // Add modal to browser back button handling
      pushNavigationState(() => {
        setShowConfirmModal(false);
      });
      return;
    }
    
    // Proceed with ending the period
    const isMatchEnd = gameState.currentPeriodNumber >= gameState.numPeriods;
    timers.stopTimers(
      gameState.currentPeriodNumber,
      isMatchEnd,
      gameState.formation,
      gameState.teamConfig
    );
    gameState.handleEndPeriod(timers.isSubTimerPaused);
  };

  const handleConfirmEndPeriod = () => {
    setShowConfirmModal(false);
    removeFromNavigationStack();
    const isMatchEnd = gameState.currentPeriodNumber >= gameState.numPeriods;
    timers.stopTimers(
      gameState.currentPeriodNumber,
      isMatchEnd,
      gameState.formation,
      gameState.teamConfig
    );
    gameState.handleEndPeriod(timers.isSubTimerPaused);
  };

  const handleCancelEndPeriod = () => {
    setShowConfirmModal(false);
    removeFromNavigationStack();
  };

  const handleRestartMatch = () => {
    // Clear all game events from previous games
    clearAllEvents();
    
    // Reset all timer state and clear localStorage
    timers.resetAllTimers();
    
    // Reset all game state
    gameState.setView('config');
    gameState.setCurrentPeriodNumber(1);
    gameState.setGameLog([]);
    gameState.setAllPlayers(initializePlayers(initialRoster));
    gameState.setSelectedSquadIds([]);
    gameState.setPeriodGoalieIds({});
    gameState.setFormation({
      goalie: null,
      leftPair: { defender: null, attacker: null },
      rightPair: { defender: null, attacker: null },
      subPair: { defender: null, attacker: null },
      // 6-player formation structure
      leftDefender: null,
      rightDefender: null,
      leftAttacker: null,
      rightAttacker: null,
      substitute: null,
    });
    gameState.resetScore();
    gameState.setOpponentTeamName('');
    gameState.clearStoredState();
  };

  const handleAddPlayer = () => {
    setShowAddPlayerModal(true);
    // Add modal to browser back button handling
    pushNavigationState(() => {
      setShowAddPlayerModal(false);
    });
  };

  const handleAddPlayerConfirm = (playerName) => {
    setShowAddPlayerModal(false);
    removeFromNavigationStack();
    gameState.addTemporaryPlayer(playerName);
  };

  const handleAddPlayerCancel = () => {
    setShowAddPlayerModal(false);
    removeFromNavigationStack();
  };

  // Handle new game confirmation modal
  const handleConfirmNewGame = () => {
    setShowNewGameModal(false);
    removeFromNavigationStack();
    handleRestartMatch();
  };

  const handleCancelNewGame = () => {
    // When user clicks Cancel button, just close the modal without triggering browser back
    setShowNewGameModal(false);
    // Remove the modal from the browser back intercept stack without triggering navigation
    removeFromNavigationStack();
  };

  const handleLeaveSportWizard = () => {
    // Close the modal first
    setShowNewGameModal(false);
    removeFromNavigationStack();
    
    // Navigate back to where the user was before entering the Sport Wizard app
    // Go back to the state before we initialized the app
    const currentLevel = window.history.state?.navigationLevel || window.history.state?.modalLevel || 0;
    if (currentLevel > 0) {
      // Go back to before any navigation states were pushed
      window.history.go(-(currentLevel + 1));
    } else {
      // If no navigation states, try to go back one step
      // This handles the case where user came directly to the app
      if (window.history.length > 1) {
        window.history.back();
      } else {
        // If this is the only page in history, try to close the window
        // This will only work if the app was opened by script, otherwise it's ignored
        window.close();
      }
    }
  };

  const handleNavigateToTacticalBoard = () => {
    setFromView(gameState.view);
    gameState.setView(VIEWS.TACTICAL_BOARD);
  };

  // Render logic
  const renderView = () => {
    switch (gameState.view) {
      case VIEWS.CONFIG:
        return (
          <ConfigurationScreen 
            allPlayers={gameState.allPlayers}
            selectedSquadIds={gameState.selectedSquadIds}
            setSelectedSquadIds={gameState.setSelectedSquadIds}
            numPeriods={gameState.numPeriods}
            setNumPeriods={gameState.setNumPeriods}
            periodDurationMinutes={gameState.periodDurationMinutes}
            setPeriodDurationMinutes={gameState.setPeriodDurationMinutes}
            periodGoalieIds={gameState.periodGoalieIds}
            setPeriodGoalieIds={gameState.setPeriodGoalieIds}
            teamConfig={gameState.teamConfig}
            updateTeamConfig={gameState.updateTeamConfig}
            selectedFormation={gameState.selectedFormation}
            updateFormationSelection={gameState.updateFormationSelection}
            createTeamConfigFromSquadSize={gameState.createTeamConfigFromSquadSize}
            alertMinutes={gameState.alertMinutes}
            setAlertMinutes={gameState.setAlertMinutes}
            handleStartPeriodSetup={gameState.handleStartPeriodSetup}
            selectedSquadPlayers={selectedSquadPlayers}
            opponentTeamName={gameState.opponentTeamName}
            setOpponentTeamName={gameState.setOpponentTeamName}
            captainId={gameState.captainId}
            setCaptain={gameState.setCaptain}
            debugMode={debugMode}
          />
        );
      case VIEWS.PERIOD_SETUP:
        return (
          <PeriodSetupScreen 
            currentPeriodNumber={gameState.currentPeriodNumber}
            formation={gameState.formation}
            setFormation={gameState.setFormation}
            availableForPairing={availableForPairing}
            allPlayers={gameState.allPlayers}
            setAllPlayers={gameState.setAllPlayers}
            handleStartGame={handleStartGame}
            gameLog={gameState.gameLog}
            selectedSquadPlayers={selectedSquadPlayers}
            periodGoalieIds={gameState.periodGoalieIds}
            setPeriodGoalieIds={gameState.setPeriodGoalieIds}
            numPeriods={gameState.numPeriods}
            teamConfig={gameState.teamConfig}
            selectedFormation={gameState.selectedFormation}
            setView={gameState.setView}
            homeScore={gameState.homeScore}
            awayScore={gameState.awayScore}
            opponentTeamName={gameState.opponentTeamName}
            rotationQueue={gameState.rotationQueue}
            setRotationQueue={gameState.setRotationQueue}
            preparePeriodWithGameLog={gameState.preparePeriodWithGameLog}
            debugMode={debugMode}
          />
        );
      case VIEWS.GAME:
        return (
          <GameScreen 
            currentPeriodNumber={gameState.currentPeriodNumber}
            formation={gameState.formation}
            setFormation={gameState.setFormation}
            allPlayers={gameState.allPlayers}
            setAllPlayers={gameState.setAllPlayers}
            matchTimerSeconds={timers.matchTimerSeconds}
            subTimerSeconds={timers.subTimerSeconds}
            isSubTimerPaused={timers.isSubTimerPaused}
            pauseSubTimer={timers.pauseSubTimer}
            resumeSubTimer={timers.resumeSubTimer}
            formatTime={formatTime}
            resetSubTimer={timers.resetSubTimer}
            handleUndoSubstitution={handleUndoSubstitution}
            handleEndPeriod={handleEndPeriod}
            nextPhysicalPairToSubOut={gameState.nextPhysicalPairToSubOut}
            nextPlayerToSubOut={gameState.nextPlayerToSubOut}
            nextPlayerIdToSubOut={gameState.nextPlayerIdToSubOut}
            nextNextPlayerIdToSubOut={gameState.nextNextPlayerIdToSubOut}
            setNextNextPlayerIdToSubOut={gameState.setNextNextPlayerIdToSubOut}
            selectedSquadPlayers={selectedSquadPlayers}
            setNextPhysicalPairToSubOut={gameState.setNextPhysicalPairToSubOut}
            setNextPlayerToSubOut={gameState.setNextPlayerToSubOut}
            setNextPlayerIdToSubOut={gameState.setNextPlayerIdToSubOut}
            teamConfig={gameState.teamConfig}
            selectedFormation={gameState.selectedFormation}
            alertMinutes={gameState.alertMinutes}
            togglePlayerInactive={gameState.togglePlayerInactive}
            switchPlayerPositions={gameState.switchPlayerPositions}
            rotationQueue={gameState.rotationQueue}
            setRotationQueue={gameState.setRotationQueue}
            switchGoalie={gameState.switchGoalie}
            setLastSubstitutionTimestamp={gameState.setLastSubstitutionTimestamp}
            getOutfieldPlayers={gameState.getOutfieldPlayers}
            pushNavigationState={pushNavigationState}
            removeFromNavigationStack={removeFromNavigationStack}
            homeScore={gameState.homeScore}
            awayScore={gameState.awayScore}
            opponentTeamName={gameState.opponentTeamName}
            addHomeGoal={gameState.addHomeGoal}
            addAwayGoal={gameState.addAwayGoal}
            setScore={gameState.setScore}
          />
        );
      case VIEWS.STATS:
        return (
          <StatsScreen 
            allPlayers={gameState.gameLog[gameState.gameLog.length-1]?.finalStatsSnapshotForAllPlayers || selectedSquadPlayers}
            formatTime={formatTime}
            setView={gameState.setView}
            setAllPlayers={gameState.setAllPlayers}
            setSelectedSquadIds={gameState.setSelectedSquadIds}
            setPeriodGoalieIds={gameState.setPeriodGoalieIds}
            setGameLog={gameState.setGameLog}
            initializePlayers={initializePlayers}
            initialRoster={initialRoster}
            clearStoredState={gameState.clearStoredState}
            clearTimerState={timers.clearTimerState}
            homeScore={gameState.homeScore}
            awayScore={gameState.awayScore}
            opponentTeamName={gameState.opponentTeamName}
            resetScore={gameState.resetScore}
            setOpponentTeamName={gameState.setOpponentTeamName}
            navigateToMatchReport={gameState.navigateToMatchReport}
          />
        );
      case VIEWS.MATCH_REPORT:
        return (
          <MatchReportScreen 
            matchEvents={gameState.matchEvents || []}
            matchStartTime={gameState.matchStartTime}
            allPlayers={gameState.allPlayers}
            gameLog={gameState.gameLog}
            homeScore={gameState.homeScore}
            awayScore={gameState.awayScore}
            periodDurationMinutes={gameState.periodDurationMinutes}
            teamConfig={gameState.teamConfig}
            homeTeamName={selectedSquadPlayers ? 'Djurgården' : 'Home'}
            awayTeamName={gameState.opponentTeamName || 'Opponent'}
            onNavigateToStats={() => gameState.setView(VIEWS.STATS)}
            onBackToGame={() => gameState.setView(VIEWS.GAME)}
            goalScorers={gameState.goalScorers || {}}
            getPlayerName={(playerId) => {
              const player = gameState.allPlayers.find(p => p.id === playerId);
              return player ? formatPlayerName(player) : 'Unknown Player';
            }}
            formatTime={formatTime}
            selectedSquadIds={gameState.selectedSquadIds}
            formation={gameState.formation}
            debugMode={debugMode}
          />
        );
      case VIEWS.TACTICAL_BOARD:
        return (
          <TacticalBoardScreen 
            onNavigateBack={handleNavigateFromTacticalBoard}
            pushNavigationState={pushNavigationState}
            removeFromNavigationStack={removeFromNavigationStack}
            fromView={fromView}
          />
        );
      default:
        return <div>Unknown view</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center p-2 sm:p-4 font-sans">
      <header className="w-full max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl relative text-center mb-4">
        <div className="absolute top-0 right-0">
          <HamburgerMenu 
            onRestartMatch={handleRestartMatch} 
            onAddPlayer={handleAddPlayer}
            onNavigateToTacticalBoard={handleNavigateToTacticalBoard}
            currentView={gameState.view}
            teamConfig={gameState.teamConfig}
            onSplitPairs={gameState.splitPairs}
            onFormPairs={gameState.formPairs}
            allPlayers={gameState.allPlayers}
            selectedSquadIds={gameState.selectedSquadIds}
          />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-sky-400">Sport Wizard</h1>
      </header>
      <main className="w-full max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl bg-slate-800 p-3 sm:p-6 rounded-lg shadow-xl">
        {renderView()}
      </main>
      <footer className="mt-8 text-center text-sm text-slate-500">
        <p>&copy; {new Date().getFullYear()} Coach App by Codewizard</p>
      </footer>
      
      <ConfirmationModal
        isOpen={showConfirmModal}
        onConfirm={handleConfirmEndPeriod}
        onCancel={handleCancelEndPeriod}
        title="End Period Early?"
        message={`There are still ${confirmModalData.timeString} remaining in this period. Are you sure you want to end the period early?`}
      />
      
      <AddPlayerModal
        isOpen={showAddPlayerModal}
        onClose={handleAddPlayerCancel}
        onAddPlayer={handleAddPlayerConfirm}
      />
      
      <ThreeOptionModal
        isOpen={showNewGameModal}
        onPrimary={handleCancelNewGame}
        onSecondary={handleConfirmNewGame}
        onTertiary={handleLeaveSportWizard}
        title="Start a new game?"
        message="Are you sure you want to start a new game? This will reset all progress and take you back to the configuration screen."
        primaryText="Stay on page"
        secondaryText="Yes, start new game"
        tertiaryText="Leave Sport Wizard"
        primaryVariant="accent"
        secondaryVariant="primary"
        tertiaryVariant="danger"
      />
    </div>
  );
}

export default App;