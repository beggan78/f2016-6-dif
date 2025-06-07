import React, { useMemo, useState } from 'react';
import './App.css';
import { useGameState } from './hooks/useGameState';
import { useTimers } from './hooks/useTimers';
import { formatTime } from './utils/timeCalculations';
import { initializePlayers, initialRoster } from './utils/gameLogic';
import { ConfigurationScreen } from './components/ConfigurationScreen';
import { PeriodSetupScreen } from './components/PeriodSetupScreen';
import { GameScreen } from './components/GameScreen';
import { StatsScreen } from './components/StatsScreen';
import { ConfirmationModal } from './components/UI';
import { HamburgerMenu } from './components/HamburgerMenu';
import { AddPlayerModal } from './components/AddPlayerModal';

// Main App Component
function App() {
  const gameState = useGameState();
  const timers = useTimers(gameState.periodDurationMinutes);
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState({ timeString: '' });
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);

  const selectedSquadPlayers = useMemo(() => {
    return gameState.allPlayers.filter(p => gameState.selectedSquadIds.includes(p.id));
  }, [gameState.allPlayers, gameState.selectedSquadIds]);

  const availableForPairing = useMemo(() => {
    if (!gameState.periodFormation.goalie) return [];
    return selectedSquadPlayers.filter(p => p.id !== gameState.periodFormation.goalie);
  }, [selectedSquadPlayers, gameState.periodFormation.goalie]);

  // Enhanced game handlers that integrate with timers
  const handleStartGame = () => {
    gameState.handleStartGame();
    timers.startTimers();
  };

  const handleSubstitution = () => {
    if (!timers.isPeriodActive) return;
    gameState.handleSubstitution(timers.isSubTimerPaused);
    timers.resetSubTimer();
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
      return;
    }
    
    // Proceed with ending the period
    timers.stopTimers();
    gameState.handleEndPeriod(timers.isSubTimerPaused);
  };

  const handleConfirmEndPeriod = () => {
    setShowConfirmModal(false);
    timers.stopTimers();
    gameState.handleEndPeriod(timers.isSubTimerPaused);
  };

  const handleCancelEndPeriod = () => {
    setShowConfirmModal(false);
  };

  const handleRestartMatch = () => {
    gameState.setView('config');
    gameState.setCurrentPeriodNumber(1);
    gameState.setGameLog([]);
    gameState.setAllPlayers(initializePlayers(initialRoster));
    gameState.setSelectedSquadIds([]);
    gameState.setPeriodGoalieIds({});
    gameState.setPeriodFormation({
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
    gameState.clearStoredState();
    timers.clearTimerState();
  };

  const handleAddPlayer = () => {
    setShowAddPlayerModal(true);
  };

  const handleAddPlayerConfirm = (playerName) => {
    gameState.addTemporaryPlayer(playerName);
    setShowAddPlayerModal(false);
  };

  const handleAddPlayerCancel = () => {
    setShowAddPlayerModal(false);
  };

  // Render logic
  const renderView = () => {
    switch (gameState.view) {
      case 'config':
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
            formationType={gameState.formationType}
            setFormationType={gameState.setFormationType}
            alertMinutes={gameState.alertMinutes}
            setAlertMinutes={gameState.setAlertMinutes}
            handleStartPeriodSetup={gameState.handleStartPeriodSetup}
            selectedSquadPlayers={selectedSquadPlayers}
          />
        );
      case 'periodSetup':
        return (
          <PeriodSetupScreen 
            currentPeriodNumber={gameState.currentPeriodNumber}
            periodFormation={gameState.periodFormation}
            setPeriodFormation={gameState.setPeriodFormation}
            availableForPairing={availableForPairing}
            allPlayers={gameState.allPlayers}
            handleStartGame={handleStartGame}
            gameLog={gameState.gameLog}
            selectedSquadPlayers={selectedSquadPlayers}
            periodGoalieIds={gameState.periodGoalieIds}
            setPeriodGoalieIds={gameState.setPeriodGoalieIds}
            numPeriods={gameState.numPeriods}
            formationType={gameState.formationType}
            setView={gameState.setView}
          />
        );
      case 'game':
        return (
          <GameScreen 
            currentPeriodNumber={gameState.currentPeriodNumber}
            periodFormation={gameState.periodFormation}
            allPlayers={gameState.allPlayers}
            setAllPlayers={gameState.setAllPlayers}
            matchTimerSeconds={timers.matchTimerSeconds}
            subTimerSeconds={timers.subTimerSeconds}
            isSubTimerPaused={timers.isSubTimerPaused}
            pauseSubTimer={timers.pauseSubTimer}
            resumeSubTimer={timers.resumeSubTimer}
            formatTime={formatTime}
            handleSubstitution={handleSubstitution}
            handleEndPeriod={handleEndPeriod}
            nextPhysicalPairToSubOut={gameState.nextPhysicalPairToSubOut}
            nextPlayerToSubOut={gameState.nextPlayerToSubOut}
            nextPlayerIdToSubOut={gameState.nextPlayerIdToSubOut}
            nextNextPlayerIdToSubOut={gameState.nextNextPlayerIdToSubOut}
            selectedSquadPlayers={selectedSquadPlayers}
            setNextPhysicalPairToSubOut={gameState.setNextPhysicalPairToSubOut}
            setNextPlayerToSubOut={gameState.setNextPlayerToSubOut}
            formationType={gameState.formationType}
            alertMinutes={gameState.alertMinutes}
            togglePlayerInactive={gameState.togglePlayerInactive}
            switchPlayerPositions={gameState.switchPlayerPositions}
            switchGoalie={gameState.switchGoalie}
            getOutfieldPlayers={gameState.getOutfieldPlayers}
          />
        );
      case 'stats':
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
          />
        );
      default:
        return <div>Unknown view</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center p-2 sm:p-4 font-sans">
      <header className="w-full max-w-2xl relative text-center mb-4">
        <div className="absolute top-0 right-0">
          <HamburgerMenu 
            onRestartMatch={handleRestartMatch} 
            onAddPlayer={handleAddPlayer}
            currentView={gameState.view}
            formationType={gameState.formationType}
            onSplitPairs={gameState.splitPairs}
            onFormPairs={gameState.formPairs}
          />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-sky-400">DIF F16-6 Coach</h1>
      </header>
      <main className="w-full max-w-2xl bg-slate-800 p-3 sm:p-6 rounded-lg shadow-xl">
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
    </div>
  );
}

export default App;