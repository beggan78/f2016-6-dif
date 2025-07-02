/**
 * Complete Game Workflow Integration Tests
 * 
 * Tests end-to-end user journeys from game configuration through completion.
 * Validates complex game scenarios including substitutions, role changes,
 * goalie switches, and multi-period progression.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { createIntegrationTestEnvironment, cleanupIntegrationTest } from '../integrationTestUtils';
import { gameStateScenarios } from '../fixtures/mockGameData';
import { TEAM_MODES } from '../../constants/playerConstants';

// Mock complete application workflow
const CompleteGameApp = ({ 
  onConfigComplete,
  onSetupComplete, 
  onGameAction,
  onStatsView 
}) => {
  const [currentScreen, setCurrentScreen] = React.useState('config');
  const [gameState, setGameState] = React.useState({
    // Configuration state
    selectedPlayers: [],
    teamMode: null,
    numPeriods: 2,
    periodDuration: 15,
    opponentName: '',
    
    // Setup state  
    periodFormation: null,
    goalieAssignments: {},
    
    // Game state
    currentPeriodNumber: 0,
    homeScore: 0,
    awayScore: 0,
    matchTimerSeconds: 0,
    subTimerSeconds: 0,
    isSubTimerPaused: false,
    substitutionHistory: [],
    
    // Player state
    allPlayers: [],
    rotationQueue: [],
    nextPlayerIdToSubOut: null,
    
    // Game history
    gameHistory: [],
    completedPeriods: []
  });
  
  const navigateToScreen = (screen) => {
    setCurrentScreen(screen);
  };
  
  const updateGameState = (updates) => {
    setGameState(prev => {
      const newState = { ...prev, ...updates };
      
      // Record game history
      if (updates.substitutionHistory || updates.homeScore !== prev.homeScore || updates.awayScore !== prev.awayScore) {
        newState.gameHistory = [
          ...prev.gameHistory,
          {
            timestamp: Date.now(),
            action: 'state_update',
            data: updates
          }
        ];
      }
      
      return newState;
    });
  };
  
  return (
    <div data-testid="complete-game-app">
      <div data-testid="current-screen">{currentScreen}</div>
      <div data-testid="game-state">{JSON.stringify(gameState)}</div>
      <div data-testid="app-loaded">Complete Game App Loaded</div>
      
      {/* Navigation */}
      <div data-testid="navigation">
        <button onClick={() => navigateToScreen('config')}>Config</button>
        <button onClick={() => navigateToScreen('setup')}>Setup</button>
        <button onClick={() => navigateToScreen('game')}>Game</button>
        <button onClick={() => navigateToScreen('stats')}>Stats</button>
      </div>
      
      {/* Configuration Screen */}
      {currentScreen === 'config' && (
        <ConfigurationWorkflow 
          gameState={gameState} 
          updateGameState={updateGameState}
          onComplete={() => {
            onConfigComplete?.(gameState);
            navigateToScreen('setup');
          }}
        />
      )}
      
      {/* Setup Screen */}
      {currentScreen === 'setup' && (
        <SetupWorkflow 
          gameState={gameState} 
          updateGameState={updateGameState}
          onComplete={() => {
            onSetupComplete?.(gameState);
            navigateToScreen('game');
          }}
        />
      )}
      
      {/* Game Screen */}
      {currentScreen === 'game' && (
        <GameWorkflow 
          gameState={gameState} 
          updateGameState={updateGameState}
          onAction={onGameAction}
          onComplete={() => navigateToScreen('stats')}
        />
      )}
      
      {/* Stats Screen */}
      {currentScreen === 'stats' && (
        <StatsWorkflow 
          gameState={gameState}
          onView={onStatsView}
        />
      )}
    </div>
  );
};

// Configuration workflow component
const ConfigurationWorkflow = ({ gameState, updateGameState, onComplete }) => {
  const handlePlayerSelection = (playerIds) => {
    updateGameState({ 
      selectedPlayers: playerIds,
      teamMode: playerIds.length === 6 ? TEAM_MODES.INDIVIDUAL_6 : 
               playerIds.length === 7 ? TEAM_MODES.INDIVIDUAL_7 : null
    });
  };
  
  const handleGameConfig = (config) => {
    updateGameState(config);
  };
  
  return (
    <div data-testid="config-workflow">
      <h2>Game Configuration</h2>
      
      {/* Player Selection */}
      <div data-testid="player-selection">
        <button 
          data-testid="select-6-players"
          onClick={() => handlePlayerSelection(['1', '2', '3', '4', '5', '6'])}
        >
          Select 6 Players
        </button>
        <button 
          data-testid="select-7-players"
          onClick={() => handlePlayerSelection(['1', '2', '3', '4', '5', '6', '7'])}
        >
          Select 7 Players
        </button>
      </div>
      
      {/* Team Mode Display */}
      <div data-testid="team-mode-display">
        Team Mode: {gameState.teamMode || 'None'}
      </div>
      
      {/* Game Settings */}
      <div data-testid="game-settings">
        <button 
          data-testid="set-3-periods"
          onClick={() => handleGameConfig({ numPeriods: 3 })}
        >
          3 Periods
        </button>
        <button 
          data-testid="set-opponent"
          onClick={() => handleGameConfig({ opponentName: 'Test Opponent' })}
        >
          Set Opponent
        </button>
      </div>
      
      {/* Proceed Button */}
      <button 
        data-testid="config-proceed"
        onClick={onComplete}
        disabled={!gameState.selectedPlayers.length || !gameState.teamMode}
      >
        Proceed to Setup
      </button>
    </div>
  );
};

// Setup workflow component
const SetupWorkflow = ({ gameState, updateGameState, onComplete }) => {
  const handleFormationSetup = () => {
    if (gameState.teamMode === TEAM_MODES.INDIVIDUAL_6) {
      updateGameState({
        periodFormation: {
          goalie: '6',
          leftDefender: '1',
          rightDefender: '2', 
          leftAttacker: '3',
          rightAttacker: '4',
          substitute: '5'
        },
        allPlayers: gameState.selectedPlayers.map(id => ({
          id,
          name: `Player ${id}`,
          stats: {
            timeOnFieldSeconds: 0,
            currentPeriodStatus: id === '6' ? 'goalie' : id === '5' ? 'substitute' : 'on_field',
            currentPeriodRole: id === '6' ? 'goalie' : id === '5' ? 'substitute' : 
                              ['1', '2'].includes(id) ? 'defender' : 'attacker'
          }
        })),
        rotationQueue: ['5', '1', '2', '3', '4'],
        nextPlayerIdToSubOut: '1'
      });
    } else if (gameState.teamMode === TEAM_MODES.INDIVIDUAL_7) {
      updateGameState({
        periodFormation: {
          goalie: '7',
          leftDefender7: '1',
          rightDefender7: '2',
          leftAttacker7: '3', 
          rightAttacker7: '4',
          substitute7_1: '5',
          substitute7_2: '6'
        },
        allPlayers: gameState.selectedPlayers.map(id => ({
          id,
          name: `Player ${id}`,
          stats: {
            timeOnFieldSeconds: 0,
            currentPeriodStatus: id === '7' ? 'goalie' : ['5', '6'].includes(id) ? 'substitute' : 'on_field',
            currentPeriodRole: id === '7' ? 'goalie' : ['5', '6'].includes(id) ? 'substitute' :
                              ['1', '2'].includes(id) ? 'defender' : 'attacker'
          }
        })),
        rotationQueue: ['5', '6', '1', '2', '3', '4'],
        nextPlayerIdToSubOut: '1'
      });
    }
  };
  
  return (
    <div data-testid="setup-workflow">
      <h2>Formation Setup</h2>
      
      <div data-testid="formation-display">
        Formation: {gameState.periodFormation ? 'Set' : 'Not Set'}
      </div>
      
      <button 
        data-testid="setup-formation"
        onClick={handleFormationSetup}
      >
        Setup Formation
      </button>
      
      <button 
        data-testid="setup-proceed"
        onClick={onComplete}
        disabled={!gameState.periodFormation}
      >
        Start Game
      </button>
    </div>
  );
};

// Game workflow component  
const GameWorkflow = ({ gameState, updateGameState, onAction, onComplete }) => {
  const handleSubstitution = () => {
    const currentPlayer = gameState.nextPlayerIdToSubOut;
    const substitutePlayer = gameState.rotationQueue[0];
    
    if (currentPlayer && substitutePlayer) {
      // Update formation
      const newFormation = { ...gameState.periodFormation };
      Object.keys(newFormation).forEach(position => {
        if (newFormation[position] === currentPlayer) {
          newFormation[position] = substitutePlayer;
        }
      });
      
      // Update rotation queue
      const newQueue = [...gameState.rotationQueue.slice(1), currentPlayer];
      
      // Record substitution
      const substitution = {
        timestamp: Date.now(),
        playerOut: currentPlayer,
        playerIn: substitutePlayer,
        period: gameState.currentPeriodNumber
      };
      
      updateGameState({
        periodFormation: newFormation,
        rotationQueue: newQueue,
        nextPlayerIdToSubOut: newQueue[0],
        substitutionHistory: [...gameState.substitutionHistory, substitution]
      });
      
      onAction?.('substitution', substitution);
    }
  };
  
  const handleGoalieChange = () => {
    const currentGoalie = gameState.periodFormation?.goalie;
    const newGoalie = gameState.rotationQueue[0];
    
    if (currentGoalie && newGoalie) {
      const newFormation = { 
        ...gameState.periodFormation, 
        goalie: newGoalie 
      };
      
      updateGameState({
        periodFormation: newFormation,
        rotationQueue: [...gameState.rotationQueue.slice(1), currentGoalie]
      });
      
      onAction?.('goalie_change', { from: currentGoalie, to: newGoalie });
    }
  };
  
  const handleScore = (team) => {
    const scoreUpdate = team === 'home' 
      ? { homeScore: gameState.homeScore + 1 }
      : { awayScore: gameState.awayScore + 1 };
      
    updateGameState(scoreUpdate);
    onAction?.('score', { team, newScore: scoreUpdate });
  };
  
  const handleTimerUpdate = (timerUpdate) => {
    updateGameState(timerUpdate);
  };
  
  const handleEndPeriod = () => {
    const completedPeriod = {
      periodNumber: gameState.currentPeriodNumber,
      finalFormation: gameState.periodFormation,
      finalScore: { home: gameState.homeScore, away: gameState.awayScore },
      substitutions: gameState.substitutionHistory.filter(
        sub => sub.period === gameState.currentPeriodNumber
      )
    };
    
    updateGameState({
      completedPeriods: [...gameState.completedPeriods, completedPeriod],
      currentPeriodNumber: gameState.currentPeriodNumber + 1
    });
    
    onAction?.('end_period', completedPeriod);
    
    // If all periods complete, go to stats
    if (gameState.currentPeriodNumber >= gameState.numPeriods) {
      onComplete();
    }
  };
  
  // Start first period if not started
  React.useEffect(() => {
    if (gameState.currentPeriodNumber === 0 && gameState.periodFormation) {
      updateGameState({ 
        currentPeriodNumber: 1,
        matchTimerSeconds: gameState.periodDuration * 60,
        subTimerSeconds: 0
      });
    }
  }, [gameState.periodFormation, gameState.currentPeriodNumber, gameState.periodDuration, updateGameState]);
  
  return (
    <div data-testid="game-workflow">
      <h2>Period {gameState.currentPeriodNumber}</h2>
      
      {/* Score Display */}
      <div data-testid="score-display">
        Score: {gameState.homeScore} - {gameState.awayScore}
      </div>
      
      {/* Timer Display */}
      <div data-testid="timer-display">
        Match Timer: {Math.floor(gameState.matchTimerSeconds / 60)}:{(gameState.matchTimerSeconds % 60).toString().padStart(2, '0')}
        <br />
        Sub Timer: {Math.floor(gameState.subTimerSeconds / 60)}:{(gameState.subTimerSeconds % 60).toString().padStart(2, '0')}
      </div>
      
      {/* Formation Display */}
      <div data-testid="formation-display">
        Goalie: {gameState.periodFormation?.goalie}
        <br />
        Next Sub: {gameState.nextPlayerIdToSubOut}
      </div>
      
      {/* Game Actions */}
      <div data-testid="game-actions">
        <button 
          data-testid="substitute-player"
          onClick={handleSubstitution}
        >
          Substitute Player
        </button>
        
        <button 
          data-testid="change-goalie"
          onClick={handleGoalieChange}
        >
          Change Goalie
        </button>
        
        <button 
          data-testid="home-goal"
          onClick={() => handleScore('home')}
        >
          Home Goal
        </button>
        
        <button 
          data-testid="away-goal"
          onClick={() => handleScore('away')}
        >
          Away Goal
        </button>
        
        <button 
          data-testid="pause-timer"
          onClick={() => handleTimerUpdate({ isSubTimerPaused: !gameState.isSubTimerPaused })}
        >
          {gameState.isSubTimerPaused ? 'Resume' : 'Pause'} Timer
        </button>
        
        <button 
          data-testid="end-period"
          onClick={handleEndPeriod}
        >
          End Period
        </button>
      </div>
      
      {/* Substitution History */}
      <div data-testid="substitution-history">
        <h3>Substitutions: {gameState.substitutionHistory.length}</h3>
        {gameState.substitutionHistory.slice(-3).map((sub, index) => (
          <div key={index} data-testid={`substitution-${index}`}>
            {sub.playerOut} → {sub.playerIn}
          </div>
        ))}
      </div>
    </div>
  );
};

// Stats workflow component
const StatsWorkflow = ({ gameState, onView }) => {
  React.useEffect(() => {
    onView?.(gameState);
  }, [gameState, onView]);
  
  const totalSubstitutions = gameState.substitutionHistory.length;
  const totalGoals = gameState.homeScore + gameState.awayScore;
  const periodsCompleted = gameState.completedPeriods.length;
  
  return (
    <div data-testid="stats-workflow">
      <h2>Game Statistics</h2>
      
      <div data-testid="game-summary">
        <div data-testid="final-score">
          Final Score: {gameState.homeScore} - {gameState.awayScore}
        </div>
        <div data-testid="periods-played">
          Periods Played: {periodsCompleted}
        </div>
        <div data-testid="total-substitutions">
          Total Substitutions: {totalSubstitutions}
        </div>
        <div data-testid="total-goals">
          Total Goals: {totalGoals}
        </div>
      </div>
      
      <div data-testid="player-stats">
        <h3>Player Statistics</h3>
        {gameState.allPlayers.map(player => (
          <div key={player.id} data-testid={`player-stat-${player.id}`}>
            {player.name}: {player.stats.timeOnFieldSeconds}s played
          </div>
        ))}
      </div>
      
      <div data-testid="period-history">
        <h3>Period History</h3>
        {gameState.completedPeriods.map((period, index) => (
          <div key={index} data-testid={`period-${period.periodNumber}`}>
            Period {period.periodNumber}: {period.substitutions.length} substitutions
          </div>
        ))}
      </div>
    </div>
  );
};

describe('Complete Game Workflow Integration', () => {
  let testEnvironment;
  let workflowCallbacks;
  
  beforeEach(() => {
    // Clean up any existing DOM components
    cleanup();
    
    // Clear localStorage
    localStorage.clear();
    
    // Setup test environment
    testEnvironment = createIntegrationTestEnvironment();
    testEnvironment.setup();
    
    // Reset all mock functions
    jest.clearAllMocks();
    
    workflowCallbacks = {
      onConfigComplete: jest.fn(),
      onSetupComplete: jest.fn(),
      onGameAction: jest.fn(),
      onStatsView: jest.fn()
    };
  });
  
  afterEach(() => {
    // Clean up React components
    cleanup();
    
    // Clean up test environment
    cleanupIntegrationTest();
    testEnvironment.cleanup();
    
    // Clear localStorage
    localStorage.clear();
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Complete 6-Player Game Session', () => {
    it('should complete full 6-player game workflow successfully', async () => {
      // Arrange
      render(<CompleteGameApp {...workflowCallbacks} />);
      
      // Assert initial state
      expect(screen.getByTestId('current-screen')).toHaveTextContent('config');
      
      // STEP 1: Configuration
      fireEvent.click(screen.getByTestId('select-6-players'));
      
      await waitFor(() => {
        expect(screen.getByTestId('team-mode-display')).toHaveTextContent(TEAM_MODES.INDIVIDUAL_6);
      });
      
      fireEvent.click(screen.getByTestId('set-3-periods'));
      fireEvent.click(screen.getByTestId('set-opponent'));
      fireEvent.click(screen.getByTestId('config-proceed'));
      
      // Verify transition to setup
      await waitFor(() => {
        expect(screen.getByTestId('current-screen')).toHaveTextContent('setup');
        expect(workflowCallbacks.onConfigComplete).toHaveBeenCalled();
      });
      
      // STEP 2: Setup
      fireEvent.click(screen.getByTestId('setup-formation'));
      
      await waitFor(() => {
        expect(screen.getByTestId('formation-display')).toHaveTextContent('Set');
      });
      
      fireEvent.click(screen.getByTestId('setup-proceed'));
      
      // Verify transition to game
      await waitFor(() => {
        expect(screen.getByTestId('current-screen')).toHaveTextContent('game');
        expect(workflowCallbacks.onSetupComplete).toHaveBeenCalled();
      });
      
      // STEP 3: Game Play
      // Wait for first period to start
      await waitFor(() => {
        expect(screen.getByText('Period 1')).toBeInTheDocument();
      });
      
      // Make substitutions
      fireEvent.click(screen.getByTestId('substitute-player'));
      
      await waitFor(() => {
        expect(workflowCallbacks.onGameAction).toHaveBeenCalledWith(
          'substitution', 
          expect.objectContaining({
            playerOut: expect.any(String),
            playerIn: expect.any(String)
          })
        );
      });
      
      // Score some goals
      fireEvent.click(screen.getByTestId('home-goal'));
      fireEvent.click(screen.getByTestId('away-goal'));
      
      await waitFor(() => {
        expect(screen.getByTestId('score-display')).toHaveTextContent('1 - 1');
      });
      
      // End first period
      fireEvent.click(screen.getByTestId('end-period'));
      
      await waitFor(() => {
        expect(screen.getByText('Period 2')).toBeInTheDocument();
      });
      
      // Play second period
      fireEvent.click(screen.getByTestId('substitute-player'));
      fireEvent.click(screen.getByTestId('home-goal'));
      
      // End second period
      fireEvent.click(screen.getByTestId('end-period'));
      
      await waitFor(() => {
        expect(screen.getByText('Period 3')).toBeInTheDocument();
      });
      
      // Play final period
      fireEvent.click(screen.getByTestId('away-goal'));
      fireEvent.click(screen.getByTestId('end-period'));
      
      // STEP 4: Verify transition to stats
      await waitFor(() => {
        expect(screen.getByTestId('current-screen')).toHaveTextContent('stats');
        expect(workflowCallbacks.onStatsView).toHaveBeenCalled();
      });
      
      // Verify final statistics
      expect(screen.getByTestId('final-score')).toHaveTextContent('2 - 2');
      expect(screen.getByTestId('periods-played')).toHaveTextContent('3');
      expect(screen.getByTestId('total-substitutions')).toHaveTextContent('2');
      expect(screen.getByTestId('total-goals')).toHaveTextContent('4');
    });
  });

  describe('Complex 7-Player Game Scenarios', () => {
    it('should handle 7-player game with complex substitutions', async () => {
      // Arrange
      render(<CompleteGameApp {...workflowCallbacks} />);
      
      // Wait for app to load with extended timeout
      await waitFor(() => {
        expect(screen.getByTestId('app-loaded')).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Configuration for 7 players
      fireEvent.click(screen.getByTestId('select-7-players'));
      
      await waitFor(() => {
        expect(screen.getByTestId('team-mode-display')).toHaveTextContent(TEAM_MODES.INDIVIDUAL_7);
      }, { timeout: 3000 });
      
      fireEvent.click(screen.getByTestId('config-proceed'));
      
      // Setup
      await waitFor(() => {
        expect(screen.getByTestId('current-screen')).toHaveTextContent('setup');
      }, { timeout: 3000 });
      
      fireEvent.click(screen.getByTestId('setup-formation'));
      fireEvent.click(screen.getByTestId('setup-proceed'));
      
      // Game with complex scenarios
      await waitFor(() => {
        expect(screen.getByTestId('current-screen')).toHaveTextContent('game');
      }, { timeout: 3000 });
      
      // Multiple substitutions with better timing control
      for (let i = 0; i < 4; i++) {
        fireEvent.click(screen.getByTestId('substitute-player'));
        
        // Wait for each substitution to complete before proceeding
        await waitFor(() => {
          expect(workflowCallbacks.onGameAction).toHaveBeenCalledTimes(i + 1);
        }, { timeout: 2000 });
        
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 100)); // Longer delay for stability
        });
      }
      
      // Goalie changes
      fireEvent.click(screen.getByTestId('change-goalie'));
      
      await waitFor(() => {
        expect(workflowCallbacks.onGameAction).toHaveBeenCalledWith(
          'goalie_change',
          expect.objectContaining({
            from: expect.any(String),
            to: expect.any(String)
          })
        );
      }, { timeout: 3000 });
      
      // Timer operations
      fireEvent.click(screen.getByTestId('pause-timer'));
      fireEvent.click(screen.getByTestId('pause-timer')); // Resume
      
      // Verify substitution history with improved timing
      await waitFor(() => {
        expect(screen.getByTestId('substitution-history')).toHaveTextContent('4');
      }, { timeout: 3000 });
      
      // End period and verify state
      fireEvent.click(screen.getByTestId('end-period'));
      
      await waitFor(() => {
        expect(screen.getByText('Period 2')).toBeInTheDocument();
      }, { timeout: 3000 });
    }, 20000); // Increase timeout to 20 seconds for complex operations
    
    it('should maintain player rotation integrity throughout game', async () => {
      // Arrange
      const component = render(<CompleteGameApp {...workflowCallbacks} />);
      
      // Wait for app to load with extended timeout
      await waitFor(() => {
        expect(screen.getByTestId('app-loaded')).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Setup 7-player game
      fireEvent.click(screen.getByTestId('select-7-players'));
      fireEvent.click(screen.getByTestId('config-proceed'));
      
      await waitFor(() => {
        expect(screen.getByTestId('current-screen')).toHaveTextContent('setup');
      }, { timeout: 3000 });
      
      fireEvent.click(screen.getByTestId('setup-formation'));
      fireEvent.click(screen.getByTestId('setup-proceed'));
      
      await waitFor(() => {
        expect(screen.getByTestId('current-screen')).toHaveTextContent('game');
      }, { timeout: 3000 });
      
      // Track rotation through multiple substitutions
      const initialGameState = JSON.parse(screen.getByTestId('game-state').textContent);
      const initialQueue = initialGameState.rotationQueue;
      const initialNext = initialGameState.nextPlayerIdToSubOut;
      
      // First substitution
      fireEvent.click(screen.getByTestId('substitute-player'));
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      
      let gameState = JSON.parse(screen.getByTestId('game-state').textContent);
      
      // Verify rotation logic after first substitution
      expect(gameState.rotationQueue).toContain(initialNext); // Previous next player should be in queue
      expect(gameState.nextPlayerIdToSubOut).toBe(initialQueue[1]); // Next in queue should be new next
      
      // Store state after first substitution
      const firstSubNext = gameState.nextPlayerIdToSubOut;
      
      // Second substitution
      fireEvent.click(screen.getByTestId('substitute-player'));
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      
      gameState = JSON.parse(screen.getByTestId('game-state').textContent);
      
      // Verify continued rotation - after 2 substitutions, next player should be different from first sub
      expect(gameState.rotationQueue).toHaveLength(initialQueue.length);
      expect(gameState.nextPlayerIdToSubOut).not.toBe(firstSubNext);
      
      // Clean up component
      component.unmount();
    }, 12000); // Increase timeout
  });

  describe('Multi-Period Game Progression', () => {
    it('should handle multi-period game with statistics tracking', async () => {
      // Arrange
      render(<CompleteGameApp {...workflowCallbacks} />);
      
      // Wait for app to load with extended timeout
      await waitFor(() => {
        expect(screen.getByTestId('app-loaded')).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Quick setup
      fireEvent.click(screen.getByTestId('select-6-players'));
      fireEvent.click(screen.getByTestId('set-3-periods'));
      fireEvent.click(screen.getByTestId('config-proceed'));
      
      await waitFor(() => {
        expect(screen.getByTestId('current-screen')).toHaveTextContent('setup');
      }, { timeout: 3000 });
      
      fireEvent.click(screen.getByTestId('setup-formation'));
      fireEvent.click(screen.getByTestId('setup-proceed'));
      
      await waitFor(() => {
        expect(screen.getByTestId('current-screen')).toHaveTextContent('game');
      }, { timeout: 3000 });
      
      // Play through 3 periods with tracking and improved timing
      for (let period = 1; period <= 3; period++) {
        await waitFor(() => {
          expect(screen.getByText(`Period ${period}`)).toBeInTheDocument();
        }, { timeout: 3000 });
        
        // Actions per period
        fireEvent.click(screen.getByTestId('substitute-player'));
        
        // Wait for substitution to complete
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
        });
        
        if (period === 1) {
          fireEvent.click(screen.getByTestId('home-goal'));
        } else if (period === 2) {
          fireEvent.click(screen.getByTestId('away-goal'));
          fireEvent.click(screen.getByTestId('substitute-player'));
          
          // Wait for second substitution
          await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
          });
        } else {
          fireEvent.click(screen.getByTestId('home-goal'));
          fireEvent.click(screen.getByTestId('change-goalie'));
        }
        
        // End period
        fireEvent.click(screen.getByTestId('end-period'));
        
        // Verify period completion
        if (period < 3) {
          await waitFor(() => {
            expect(screen.getByText(`Period ${period + 1}`)).toBeInTheDocument();
          }, { timeout: 3000 });
        }
      }
      
      // Should transition to stats after final period
      await waitFor(() => {
        expect(screen.getByTestId('current-screen')).toHaveTextContent('stats');
      }, { timeout: 3000 });
      
      // Verify comprehensive stats with timeout
      await waitFor(() => {
        expect(screen.getByTestId('final-score')).toHaveTextContent('2 - 1');
        expect(screen.getByTestId('periods-played')).toHaveTextContent('3');
        expect(screen.getByTestId('total-substitutions')).toHaveTextContent('4'); // 1+2+1
      }, { timeout: 2000 });
      
      // Verify period history
      expect(screen.getByTestId('period-1')).toHaveTextContent('1 substitutions');
      expect(screen.getByTestId('period-2')).toHaveTextContent('2 substitutions');
      expect(screen.getByTestId('period-3')).toHaveTextContent('1 substitutions');
    });
  });

  describe('Error Recovery During Workflow', () => {
    it('should handle errors gracefully and allow workflow continuation', async () => {
      // Arrange
      render(<CompleteGameApp {...workflowCallbacks} />);
      
      // Wait for app to load with extended timeout
      await waitFor(() => {
        expect(screen.getByTestId('app-loaded')).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Setup game normally
      fireEvent.click(screen.getByTestId('select-6-players'));
      fireEvent.click(screen.getByTestId('config-proceed'));
      
      await waitFor(() => {
        expect(screen.getByTestId('current-screen')).toHaveTextContent('setup');
      }, { timeout: 3000 });
      
      fireEvent.click(screen.getByTestId('setup-formation'));
      fireEvent.click(screen.getByTestId('setup-proceed'));
      
      await waitFor(() => {
        expect(screen.getByTestId('current-screen')).toHaveTextContent('game');
      }, { timeout: 3000 });
      
      // Attempt rapid operations that might cause issues
      const buttons = [
        'substitute-player',
        'home-goal',
        'pause-timer',
        'substitute-player',
        'away-goal'
      ];
      
      // Rapid fire clicks
      for (const buttonId of buttons) {
        fireEvent.click(screen.getByTestId(buttonId));
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        });
      }
      
      // Should still be functional
      expect(screen.getByTestId('game-workflow')).toBeInTheDocument();
      expect(screen.getByTestId('score-display')).toBeInTheDocument();
      
      // Should be able to end period normally
      fireEvent.click(screen.getByTestId('end-period'));
      
      await waitFor(() => {
        expect(screen.getByText('Period 2')).toBeInTheDocument();
      });
    });
    
    it('should handle navigation away and back during game', async () => {
      // Arrange
      render(<CompleteGameApp {...workflowCallbacks} />);
      
      // Wait for app to load with extended timeout
      await waitFor(() => {
        expect(screen.getByTestId('app-loaded')).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Setup game
      fireEvent.click(screen.getByTestId('select-7-players'));
      fireEvent.click(screen.getByTestId('config-proceed'));
      
      await waitFor(() => {
        expect(screen.getByTestId('current-screen')).toHaveTextContent('setup');
      }, { timeout: 3000 });
      
      fireEvent.click(screen.getByTestId('setup-formation'));
      fireEvent.click(screen.getByTestId('setup-proceed'));
      
      await waitFor(() => {
        expect(screen.getByTestId('current-screen')).toHaveTextContent('game');
      }, { timeout: 3000 });
      
      // Make some game progress
      fireEvent.click(screen.getByTestId('substitute-player'));
      fireEvent.click(screen.getByTestId('home-goal'));
      
      const gameStateBeforeNav = JSON.parse(screen.getByTestId('game-state').textContent);
      
      // Navigate away to stats
      fireEvent.click(screen.getByTestId('navigation')).querySelector('button:last-child').click();
      
      await waitFor(() => {
        expect(screen.getByTestId('current-screen')).toHaveTextContent('stats');
      });
      
      // Navigate back to game
      fireEvent.click(screen.getByTestId('navigation')).querySelector('button:nth-child(3)').click();
      
      await waitFor(() => {
        expect(screen.getByTestId('current-screen')).toHaveTextContent('game');
      });
      
      // Verify state preservation
      const gameStateAfterNav = JSON.parse(screen.getByTestId('game-state').textContent);
      expect(gameStateAfterNav.homeScore).toBe(gameStateBeforeNav.homeScore);
      expect(gameStateAfterNav.substitutionHistory.length).toBe(gameStateBeforeNav.substitutionHistory.length);
      
      // Should be able to continue game
      fireEvent.click(screen.getByTestId('substitute-player'));
      
      await waitFor(() => {
        const updatedState = JSON.parse(screen.getByTestId('game-state').textContent);
        expect(updatedState.substitutionHistory.length).toBe(gameStateBeforeNav.substitutionHistory.length + 1);
      });
    });
  });

  describe('Performance During Complete Workflow', () => {
    it('should complete workflow within performance expectations', async () => {
      // Arrange
      const startTime = performance.now();
      render(<CompleteGameApp {...workflowCallbacks} />);
      
      // Wait for app to load with extended timeout
      await waitFor(() => {
        expect(screen.getByTestId('app-loaded')).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Execute rapid workflow
      fireEvent.click(screen.getByTestId('select-6-players'));
      fireEvent.click(screen.getByTestId('config-proceed'));
      
      await waitFor(() => {
        expect(screen.getByTestId('current-screen')).toHaveTextContent('setup');
      }, { timeout: 3000 });
      
      fireEvent.click(screen.getByTestId('setup-formation'));
      fireEvent.click(screen.getByTestId('setup-proceed'));
      
      await waitFor(() => {
        expect(screen.getByTestId('current-screen')).toHaveTextContent('game');
      }, { timeout: 3000 });
      
      // Rapid game actions
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByTestId('substitute-player'));
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        });
      }
      
      fireEvent.click(screen.getByTestId('end-period'));
      fireEvent.click(screen.getByTestId('end-period'));
      
      await waitFor(() => {
        expect(screen.getByTestId('current-screen')).toHaveTextContent('stats');
      });
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should complete within reasonable time (under 1 second)
      expect(totalTime).toBeLessThan(1000);
      
      // Verify final state is complete and correct
      expect(screen.getByTestId('periods-played')).toHaveTextContent('2');
      expect(screen.getByTestId('total-substitutions')).toHaveTextContent('5');
    });
  });
});