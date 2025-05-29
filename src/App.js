import React, { useMemo } from 'react';
import { useGameState } from './hooks/useGameState';
import { useTimers } from './hooks/useTimers';
import { formatTime } from './utils/timeCalculations';
import { initializePlayers, initialRoster } from './utils/gameLogic';
import { ConfigurationScreen } from './components/ConfigurationScreen';
import { PeriodSetupScreen } from './components/PeriodSetupScreen';
import { GameScreen } from './components/GameScreen';
import { StatsScreen } from './components/StatsScreen';

// Main App Component
function App() {
  const gameState = useGameState();
  const timers = useTimers(gameState.periodDurationMinutes);

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
    gameState.handleSubstitution();
    timers.resetSubTimer();
  };

  const handleEndPeriod = () => {
    timers.stopTimers();
    gameState.handleEndPeriod();
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
          />
        );
      case 'game':
        return (
          <GameScreen 
            currentPeriodNumber={gameState.currentPeriodNumber}
            periodFormation={gameState.periodFormation}
            allPlayers={gameState.allPlayers}
            matchTimerSeconds={timers.matchTimerSeconds}
            subTimerSeconds={timers.subTimerSeconds}
            formatTime={formatTime}
            handleSubstitution={handleSubstitution}
            handleEndPeriod={handleEndPeriod}
            nextPhysicalPairToSubOut={gameState.nextPhysicalPairToSubOut}
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
      <header className="w-full max-w-2xl text-center mb-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-sky-400">DIF F16-6 Coach</h1>
      </header>
      <main className="w-full max-w-2xl bg-slate-800 p-3 sm:p-6 rounded-lg shadow-xl">
        {renderView()}
      </main>
      <footer className="mt-8 text-center text-sm text-slate-500">
        <p>&copy; {new Date().getFullYear()} Coach App by Codewizard.</p>
      </footer>
    </div>
  );
}

export default App;