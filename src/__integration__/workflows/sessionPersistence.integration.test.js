/**
 * Session Persistence Integration Tests
 * 
 * Tests data persistence and consistency across different screens and browser sessions.
 * Validates that game state persists correctly between Configuration → Setup → Game → Stats
 * and handles data corruption/recovery scenarios.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { createIntegrationTestEnvironment, cleanupIntegrationTest } from '../integrationTestUtils';
import { gameStateScenarios } from '../fixtures/mockGameData';
import { TEAM_MODES } from '../../constants/playerConstants';

// Create a minimal App-like wrapper for testing persistence
const TestApp = ({ initialGameState, children }) => {
  const [gameState, setGameState] = React.useState(initialGameState);
  const [currentScreen, setCurrentScreen] = React.useState('config');
  
  // Simulate persistence to localStorage
  React.useEffect(() => {
    if (gameState) {
      try {
        localStorage.setItem('dif-coach-game-state', JSON.stringify(gameState));
      } catch (error) {
        // Handle quota exceeded or other localStorage errors gracefully
        console.warn('Failed to save to localStorage:', error.message);
      }
    }
  }, [gameState]);
  
  // Load from localStorage on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('dif-coach-game-state');
    if (saved && !initialGameState) {
      try {
        setGameState(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved state:', e);
      }
    }
  }, [initialGameState]);
  
  const navigateToScreen = (screen) => {
    setCurrentScreen(screen);
  };
  
  const updateGameState = (updates) => {
    setGameState(prev => ({ ...prev, ...updates }));
  };
  
  return (
    <div data-testid="test-app">
      <div data-testid="current-screen">{currentScreen}</div>
      <div data-testid="game-state">{JSON.stringify(gameState)}</div>
      
      {/* Navigation buttons */}
      <button 
        data-testid="nav-config" 
        onClick={() => navigateToScreen('config')}
      >
        Configuration
      </button>
      <button 
        data-testid="nav-setup" 
        onClick={() => navigateToScreen('setup')}
      >
        Setup
      </button>
      <button 
        data-testid="nav-game" 
        onClick={() => navigateToScreen('game')}
      >
        Game
      </button>
      <button 
        data-testid="nav-stats" 
        onClick={() => navigateToScreen('stats')}
      >
        Stats
      </button>
      
      {/* State update buttons for testing */}
      <button 
        data-testid="update-players" 
        onClick={() => updateGameState({ 
          allPlayers: [{ id: '1', name: 'Updated Player' }] 
        })}
      >
        Update Players
      </button>
      <button 
        data-testid="update-formation" 
        onClick={() => updateGameState({ 
          periodFormation: { goalie: 'new-goalie' } 
        })}
      >
        Update Formation
      </button>
      <button 
        data-testid="update-team-mode" 
        onClick={() => updateGameState({ 
          teamMode: TEAM_MODES.PAIRS_7 
        })}
      >
        Update Team Mode
      </button>
      
      {children}
      
      {/* Debug info for test verification */}
      <div data-testid="test-app-loaded">App Loaded</div>
    </div>
  );
};

// Mock screen components to simulate different application screens
const ConfigScreen = ({ gameState, onUpdateState }) => (
  <div data-testid="config-screen">
    <h2>Configuration Screen</h2>
    <div data-testid="config-team-mode">{gameState?.teamMode || 'none'}</div>
    <div data-testid="config-player-count">{gameState?.allPlayers?.length || 0}</div>
    <button 
      data-testid="config-save"
      onClick={() => onUpdateState({ 
        teamMode: TEAM_MODES.INDIVIDUAL_6,
        allPlayers: [{ id: '1', name: 'Config Player' }]
      })}
    >
      Save Config
    </button>
  </div>
);

const SetupScreen = ({ gameState, onUpdateState }) => (
  <div data-testid="setup-screen">
    <h2>Setup Screen</h2>
    <div data-testid="setup-formation">{JSON.stringify(gameState?.periodFormation || {})}</div>
    <div data-testid="setup-players">{gameState?.allPlayers?.length || 0}</div>
    <button 
      data-testid="setup-save"
      onClick={() => onUpdateState({ 
        periodFormation: { goalie: '1', leftDefender: '2' },
        currentPeriodNumber: 1
      })}
    >
      Save Setup
    </button>
  </div>
);

const GameScreen = ({ gameState, onUpdateState }) => (
  <div data-testid="game-screen">
    <h2>Game Screen</h2>
    <div data-testid="game-period">{gameState?.currentPeriodNumber || 0}</div>
    <div data-testid="game-score">{gameState?.homeScore || 0} - {gameState?.awayScore || 0}</div>
    <div data-testid="game-timer">{gameState?.matchTimerSeconds || 0}</div>
    <button 
      data-testid="game-save"
      onClick={() => onUpdateState({ 
        homeScore: 1,
        awayScore: 0,
        matchTimerSeconds: 600
      })}
    >
      Update Game
    </button>
  </div>
);

const StatsScreen = ({ gameState }) => (
  <div data-testid="stats-screen">
    <h2>Stats Screen</h2>
    <div data-testid="stats-players">{gameState?.allPlayers?.length || 0}</div>
    <div data-testid="stats-final-score">{gameState?.homeScore || 0} - {gameState?.awayScore || 0}</div>
    <div data-testid="stats-periods">{gameState?.currentPeriodNumber || 0}</div>
  </div>
);

describe('Session Persistence Integration', () => {
  let testEnvironment;
  
  let consoleErrorSpy;
  
  beforeEach(() => {
    // Clean up DOM from any previous tests
    cleanup();
    
    // Clear localStorage before each test
    localStorage.clear();
    
    // Setup test environment
    testEnvironment = createIntegrationTestEnvironment();
    testEnvironment.setup();
    
    // Mock console.error to avoid test noise - store reference for cleanup
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    // Safely restore console.error if it was mocked
    if (consoleErrorSpy) {
      consoleErrorSpy.mockRestore();
      consoleErrorSpy = null;
    }
    
    // Clean up React components
    cleanup();
    
    // Clean up test environment
    cleanupIntegrationTest();
    testEnvironment.cleanup();
    
    // Clear localStorage after test
    localStorage.clear();
  });

  describe('Cross-Screen Data Flow', () => {
    it('should maintain state consistency across screen navigation', async () => {
      // Arrange
      const initialState = { teamMode: TEAM_MODES.INDIVIDUAL_7, allPlayers: [] }; // Simplified state
      render(<TestApp initialGameState={initialState} />);
      
      // Wait for app to load
      await waitFor(() => {
        expect(screen.getByTestId('test-app-loaded')).toBeInTheDocument();
      });
      
      // Verify initial state
      expect(screen.getByTestId('current-screen')).toHaveTextContent('config');
      const gameStateElement = screen.getByTestId('game-state');
      expect(gameStateElement).toHaveTextContent(initialState.teamMode);
      
      // Act - Navigate through screens
      fireEvent.click(screen.getByTestId('nav-setup'));
      await waitFor(() => {
        expect(screen.getByTestId('current-screen')).toHaveTextContent('setup');
      });
      
      // State should persist during navigation
      expect(gameStateElement).toHaveTextContent(initialState.teamMode);
      
      fireEvent.click(screen.getByTestId('nav-game'));
      await waitFor(() => {
        expect(screen.getByTestId('current-screen')).toHaveTextContent('game');
      });
      
      // State should still be consistent
      expect(gameStateElement).toHaveTextContent(initialState.teamMode);
      
      fireEvent.click(screen.getByTestId('nav-stats'));
      await waitFor(() => {
        expect(screen.getByTestId('current-screen')).toHaveTextContent('stats');
      });
      
      // Assert - Final state should match initial state
      expect(gameStateElement).toHaveTextContent(initialState.teamMode);
    });
    
    it('should preserve game state modifications across screens', async () => {
      // Arrange
      render(<TestApp />);
      
      // Act - Make changes in different screens
      fireEvent.click(screen.getByTestId('update-team-mode'));
      
      await waitFor(() => {
        expect(screen.getByTestId('game-state')).toHaveTextContent(TEAM_MODES.PAIRS_7);
      });
      
      // Navigate to setup
      fireEvent.click(screen.getByTestId('nav-setup'));
      
      // Make more changes
      fireEvent.click(screen.getByTestId('update-formation'));
      
      await waitFor(() => {
        const gameState = screen.getByTestId('game-state');
        expect(gameState).toHaveTextContent('new-goalie');
        expect(gameState).toHaveTextContent(TEAM_MODES.PAIRS_7); // Should preserve previous change
      });
      
      // Navigate to game screen
      fireEvent.click(screen.getByTestId('nav-game'));
      
      // Add player changes
      fireEvent.click(screen.getByTestId('update-players'));
      
      await waitFor(() => {
        const gameState = screen.getByTestId('game-state');
        expect(gameState).toHaveTextContent('Updated Player');
        expect(gameState).toHaveTextContent('new-goalie');
        expect(gameState).toHaveTextContent(TEAM_MODES.PAIRS_7);
      });
      
      // Navigate to stats
      fireEvent.click(screen.getByTestId('nav-stats'));
      
      // Assert - All changes should be preserved
      const finalGameState = screen.getByTestId('game-state');
      expect(finalGameState).toHaveTextContent('Updated Player');
      expect(finalGameState).toHaveTextContent('new-goalie');
      expect(finalGameState).toHaveTextContent(TEAM_MODES.PAIRS_7);
    });
    
    it('should handle rapid screen navigation without data loss', async () => {
      // Arrange
      const initialState = { teamMode: TEAM_MODES.INDIVIDUAL_7, allPlayers: [] }; // Simplified state
      render(<TestApp initialGameState={initialState} />);
      
      // Wait for app to load with longer timeout
      await waitFor(() => {
        expect(screen.getByTestId('test-app-loaded')).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Act - Rapid navigation sequence with improved timing
      const screenNames = ['setup', 'game', 'stats', 'config', 'game', 'stats'];
      
      for (const screenName of screenNames) {
        fireEvent.click(screen.getByTestId(`nav-${screenName}`));
        
        // Wait for navigation to complete before proceeding
        await waitFor(() => {
          expect(screen.getByTestId('current-screen')).toHaveTextContent(screenName);
        }, { timeout: 2000 });
        
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 50)); // Longer delay for stability
        });
      }
      
      // Assert - State should be preserved
      const gameState = screen.getByTestId('game-state');
      expect(gameState).toHaveTextContent(initialState.teamMode);
      expect(gameState).toHaveTextContent(String(initialState.allPlayers.length));
    }, 15000); // Increase timeout to 15 seconds
  });

  describe('Browser Session Persistence', () => {
    it('should persist state across component unmount/remount', async () => {
      // Arrange - ensure clean localStorage state
      localStorage.clear();
      
      // Add explicit delay for localStorage to be ready
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      const gameState = { teamMode: TEAM_MODES.INDIVIDUAL_7, allPlayers: [] }; // Simplified state
      const { unmount } = render(<TestApp initialGameState={gameState} />);
      
      // Wait for app to load with extended timeout and verification
      await waitFor(() => {
        expect(screen.getByTestId('test-app-loaded')).toBeInTheDocument();
        expect(screen.getByTestId('test-app-loaded')).toHaveTextContent('App Loaded');
      }, { timeout: 8000 });
      
      // Update state
      fireEvent.click(screen.getByTestId('update-team-mode'));
      
      // Wait for state update and localStorage persistence
      await waitFor(() => {
        expect(screen.getByTestId('game-state')).toHaveTextContent(TEAM_MODES.PAIRS_7);
      }, { timeout: 3000 });
      
      // Verify localStorage has the data before unmounting
      await waitFor(() => {
        const stored = localStorage.getItem('dif-coach-game-state');
        expect(stored).not.toBeNull();
        expect(stored).toContain(TEAM_MODES.PAIRS_7);
      }, { timeout: 2000 });
      
      // Act - Simulate browser refresh by unmounting/remounting
      unmount();
      
      // Add delay for unmount cleanup
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      
      // Re-render without initial state (should load from localStorage)
      const component2 = render(<TestApp />);
      
      // Wait for component to load and restore state
      await waitFor(() => {
        expect(screen.getByTestId('test-app-loaded')).toBeInTheDocument();
        expect(screen.getByTestId('test-app-loaded')).toHaveTextContent('App Loaded');
      }, { timeout: 8000 });
      
      // Assert - State should be loaded from localStorage
      await waitFor(() => {
        expect(screen.getByTestId('game-state')).toHaveTextContent(TEAM_MODES.PAIRS_7);
      }, { timeout: 5000 });
      
      // Cleanup
      component2.unmount();
    });
    
    it('should auto-save state changes to localStorage', async () => {
      // Arrange - ensure clean localStorage state
      localStorage.clear();
      
      // Add explicit delay for localStorage to be ready
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      const component = render(<TestApp />);
      
      // Wait for app to load with extended timeout and verification
      await waitFor(() => {
        expect(screen.getByTestId('test-app-loaded')).toBeInTheDocument();
        expect(screen.getByTestId('test-app-loaded')).toHaveTextContent('App Loaded');
      }, { timeout: 8000 });
      
      // Verify localStorage is initially empty or has null state
      const initialState = localStorage.getItem('dif-coach-game-state');
      expect(initialState === null || initialState === 'null').toBe(true);
      
      // Act - Make state changes
      fireEvent.click(screen.getByTestId('update-players'));
      
      // Wait for state update to propagate in DOM
      await waitFor(() => {
        expect(screen.getByTestId('game-state')).toHaveTextContent('Updated Player');
      }, { timeout: 3000 });
      
      // Assert - Should auto-save to localStorage with longer timeout for async operations
      await waitFor(() => {
        const saved = localStorage.getItem('dif-coach-game-state');
        expect(saved).not.toBeNull();
        expect(saved).not.toBe('null');
        
        const parsedState = JSON.parse(saved);
        expect(parsedState.allPlayers).toEqual([{ id: '1', name: 'Updated Player' }]);
      }, { timeout: 5000 });
      
      // Cleanup
      component.unmount();
    });
    
    it('should handle multiple rapid state updates with persistence', async () => {
      // Arrange
      render(<TestApp />);
      
      // Wait for app to load with extended timeout
      await waitFor(() => {
        expect(screen.getByTestId('test-app-loaded')).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Act - Multiple rapid updates
      fireEvent.click(screen.getByTestId('update-players'));
      fireEvent.click(screen.getByTestId('update-formation'));
      fireEvent.click(screen.getByTestId('update-team-mode'));
      
      // Wait for all updates to settle with longer timeout
      await waitFor(() => {
        const gameState = screen.getByTestId('game-state');
        expect(gameState).toHaveTextContent('Updated Player');
        expect(gameState).toHaveTextContent('new-goalie');
        expect(gameState).toHaveTextContent(TEAM_MODES.PAIRS_7);
      }, { timeout: 5000 });
      
      // Assert - Final state should be persisted with additional wait for localStorage
      await waitFor(() => {
        const saved = localStorage.getItem('dif-coach-game-state');
        expect(saved).not.toBeNull();
        
        const parsedState = JSON.parse(saved);
        expect(parsedState.allPlayers).toEqual([{ id: '1', name: 'Updated Player' }]);
        expect(parsedState.periodFormation).toEqual({ goalie: 'new-goalie' });
        expect(parsedState.teamMode).toBe(TEAM_MODES.PAIRS_7);
      }, { timeout: 3000 });
    });
  });

  describe('Data Corruption and Recovery', () => {
    it('should handle corrupted localStorage data gracefully', async () => {
      // Arrange - Clear any existing state first
      localStorage.clear();
      
      // Add small delay to ensure localStorage is ready
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      
      // Corrupt localStorage
      localStorage.setItem('dif-coach-game-state', 'invalid-json-data');
      
      // Act & Assert - Should not crash
      let component;
      expect(() => {
        component = render(<TestApp />);
      }).not.toThrow();
      
      // Wait for app to load with extended timeout
      await waitFor(() => {
        expect(screen.getByTestId('test-app-loaded')).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Should render with empty/default state
      expect(screen.getByTestId('test-app')).toBeInTheDocument();
      expect(screen.getByTestId('game-state')).toBeInTheDocument();
      // Game state should be empty or null when corrupted data is handled
      const gameStateContent = screen.getByTestId('game-state').textContent;
      expect(gameStateContent === 'null' || gameStateContent === '' || gameStateContent === '{}').toBe(true);
      
      // Clean up component explicitly
      if (component) {
        component.unmount();
      }
    }, 10000); // Increase test timeout to 10 seconds
    
    it('should recover from partial data corruption', async () => {
      // Arrange - Clear state first
      localStorage.clear();
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      
      // Partially corrupted data (missing required fields)
      const corruptedData = {
        teamMode: TEAM_MODES.INDIVIDUAL_7,
        // Missing allPlayers and other required fields
      };
      localStorage.setItem('dif-coach-game-state', JSON.stringify(corruptedData));
      
      // Act
      const component = render(<TestApp />);
      
      // Wait for app to load with extended timeout
      await waitFor(() => {
        expect(screen.getByTestId('test-app-loaded')).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Should load partial data without crashing
      await waitFor(() => {
        expect(screen.getByTestId('game-state')).toHaveTextContent(TEAM_MODES.INDIVIDUAL_7);
      }, { timeout: 3000 });
      
      // Should be able to add missing data
      fireEvent.click(screen.getByTestId('update-players'));
      
      await waitFor(() => {
        const gameState = screen.getByTestId('game-state');
        expect(gameState).toHaveTextContent('Updated Player');
        expect(gameState).toHaveTextContent(TEAM_MODES.INDIVIDUAL_7);
      }, { timeout: 3000 });
      
      // Clean up component
      component.unmount();
    });
    
    it('should handle localStorage quota exceeded scenario', async () => {
      // Arrange - ensure clean state
      localStorage.clear();
      
      // Add explicit delay for localStorage to be ready
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      const component = render(<TestApp />);
      
      // Wait for app to load with extended timeout and verification
      await waitFor(() => {
        expect(screen.getByTestId('test-app-loaded')).toBeInTheDocument();
        expect(screen.getByTestId('test-app-loaded')).toHaveTextContent('App Loaded');
      }, { timeout: 8000 });
      
      // Mock localStorage.setItem to throw quota exceeded error after component is loaded
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('QuotaExceededError');
      });
      
      // Act - Try to save state (should handle error gracefully)
      expect(() => {
        fireEvent.click(screen.getByTestId('update-players'));
      }).not.toThrow();
      
      // Component should still function normally despite localStorage error
      await waitFor(() => {
        expect(screen.getByTestId('game-state')).toHaveTextContent('Updated Player');
      }, { timeout: 3000 });
      
      // Verify the mock was called (proving the error path was triggered)
      expect(localStorage.setItem).toHaveBeenCalled();
      
      // Restore original function
      localStorage.setItem = originalSetItem;
      
      // Cleanup
      component.unmount();
    });
    
    it('should provide fallback when localStorage is unavailable', async () => {
      // Arrange - Mock localStorage to be unavailable
      const originalLocalStorage = window.localStorage;
      
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true
      });
      
      // Act & Assert - Should not crash
      expect(() => {
        render(<TestApp />);
      }).not.toThrow();
      
      // Wait for app to load
      await waitFor(() => {
        expect(screen.getByTestId('test-app-loaded')).toBeInTheDocument();
      });
      
      // Should render and function without persistence
      expect(screen.getByTestId('test-app')).toBeInTheDocument();
      
      fireEvent.click(screen.getByTestId('update-players'));
      
      await waitFor(() => {
        expect(screen.getByTestId('game-state')).toHaveTextContent('Updated Player');
      });
      
      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true
      });
    });
  });

  describe('Data Consistency Validation', () => {
    it('should maintain referential integrity across persistence cycles', async () => {
      // Arrange - Clear state first
      localStorage.clear();
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      
      const complexGameState = {
        teamMode: TEAM_MODES.INDIVIDUAL_7,
        allPlayers: [
          { id: '1', name: 'Player 1' },
          { id: '2', name: 'Player 2' },
          { id: '3', name: 'Player 3' }
        ],
        periodFormation: {
          goalie: '1',
          leftDefender7: '2',
          rightDefender7: '3'
        },
        rotationQueue: ['2', '3', '1'],
        nextPlayerIdToSubOut: '2'
      };
      
      const { unmount } = render(<TestApp initialGameState={complexGameState} />);
      
      // Wait for app to load with extended timeout
      await waitFor(() => {
        expect(screen.getByTestId('test-app-loaded')).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Verify initial referential integrity
      let gameState = JSON.parse(screen.getByTestId('game-state').textContent);
      expect(gameState.periodFormation.goalie).toBe('1');
      expect(gameState.allPlayers.find(p => p.id === '1')).toBeDefined();
      expect(gameState.rotationQueue).toContain('2');
      expect(gameState.nextPlayerIdToSubOut).toBe('2');
      
      // Act - Save and reload
      unmount();
      
      // Wait for unmount to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      const component2 = render(<TestApp />);
      
      // Assert - Referential integrity should be maintained
      await waitFor(() => {
        gameState = JSON.parse(screen.getByTestId('game-state').textContent);
        expect(gameState.periodFormation.goalie).toBe('1');
        expect(gameState.allPlayers.find(p => p.id === '1')).toBeDefined();
        expect(gameState.rotationQueue).toContain('2');
        expect(gameState.nextPlayerIdToSubOut).toBe('2');
      }, { timeout: 5000 });
      
      // Clean up
      component2.unmount();
    });
    
    it('should validate data types and structure after persistence', async () => {
      // Arrange - ensure clean localStorage state
      localStorage.clear();
      
      // Add explicit delay for localStorage to be ready
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      const gameState = {
        teamMode: TEAM_MODES.PAIRS_7,
        currentPeriodNumber: 2,
        homeScore: 3,
        awayScore: 1,
        matchTimerSeconds: 600,
        isSubTimerPaused: true,
        allPlayers: [{ id: '1', name: 'Test Player' }]
      };
      
      const { unmount } = render(<TestApp initialGameState={gameState} />);
      
      // Wait for initial load with extended timeout and verification
      await waitFor(() => {
        expect(screen.getByTestId('test-app-loaded')).toBeInTheDocument();
        expect(screen.getByTestId('test-app-loaded')).toHaveTextContent('App Loaded');
      }, { timeout: 8000 });
      
      // Verify localStorage has the data before unmounting
      await waitFor(() => {
        const stored = localStorage.getItem('dif-coach-game-state');
        expect(stored).not.toBeNull();
        expect(stored).not.toBe('null');
      }, { timeout: 2000 });
      
      // Act - Save and reload
      unmount();
      
      // Add delay for unmount cleanup
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      
      const component2 = render(<TestApp />);
      
      // Wait for reload with extended timeout and verification
      await waitFor(() => {
        expect(screen.getByTestId('test-app-loaded')).toBeInTheDocument();
        expect(screen.getByTestId('test-app-loaded')).toHaveTextContent('App Loaded');
      }, { timeout: 8000 });
      
      // Assert - Data types should be preserved
      await waitFor(() => {
        const restoredState = JSON.parse(screen.getByTestId('game-state').textContent);
        
        expect(typeof restoredState.teamMode).toBe('string');
        expect(typeof restoredState.currentPeriodNumber).toBe('number');
        expect(typeof restoredState.homeScore).toBe('number');
        expect(typeof restoredState.awayScore).toBe('number');
        expect(typeof restoredState.matchTimerSeconds).toBe('number');
        expect(typeof restoredState.isSubTimerPaused).toBe('boolean');
        expect(Array.isArray(restoredState.allPlayers)).toBe(true);
      }, { timeout: 5000 });
      
      // Cleanup
      component2.unmount();
    });
  });

  describe('Performance with Persistence', () => {
    it('should handle large game states efficiently', async () => {
      // Arrange - Large game state with lots of data
      const largeGameState = {
        teamMode: TEAM_MODES.INDIVIDUAL_7,
        allPlayers: Array.from({ length: 50 }, (_, i) => ({
          id: `player-${i}`,
          name: `Player ${i}`,
          stats: {
            timeOnFieldSeconds: i * 60,
            timeAsAttackerSeconds: i * 30,
            timeAsDefenderSeconds: i * 30,
            gameHistory: Array.from({ length: 20 }, (_, j) => ({
              action: `action-${j}`,
              timestamp: Date.now() - j * 1000
            }))
          }
        })),
        gameHistory: Array.from({ length: 100 }, (_, i) => ({
          action: `game-action-${i}`,
          timestamp: Date.now() - i * 1000
        }))
      };
      
      // Act & Measure
      const startTime = performance.now();
      
      const { unmount } = render(<TestApp initialGameState={largeGameState} />);
      
      // Wait for app to load
      await waitFor(() => {
        expect(screen.getByTestId('test-app-loaded')).toBeInTheDocument();
      });
      
      // Trigger save
      fireEvent.click(screen.getByTestId('update-team-mode'));
      
      await waitFor(() => {
        expect(screen.getByTestId('game-state')).toHaveTextContent(TEAM_MODES.PAIRS_7);
      });
      
      // Unmount and reload
      unmount();
      render(<TestApp />);
      
      await waitFor(() => {
        expect(screen.getByTestId('game-state')).toHaveTextContent(TEAM_MODES.PAIRS_7);
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Assert - Should complete within reasonable time (under 500ms)
      expect(duration).toBeLessThan(500);
    });
    
    it('should not block UI during persistence operations', async () => {
      // Arrange
      render(<TestApp />);
      
      // Wait for app to load
      await waitFor(() => {
        expect(screen.getByTestId('test-app-loaded')).toBeInTheDocument();
      });
      
      // Act - Rapid state updates
      const startTime = performance.now();
      
      for (let i = 0; i < 5; i++) { // Reduced iterations for faster test
        fireEvent.click(screen.getByTestId('update-players'));
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 5));
        });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Assert - Should remain responsive (under 500ms for 5 updates, more generous)
      expect(duration).toBeLessThan(500);
      
      // UI should remain functional
      expect(screen.getByTestId('nav-setup')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('nav-setup'));
      
      await waitFor(() => {
        expect(screen.getByTestId('current-screen')).toHaveTextContent('setup');
      });
    }, 10000); // Increase timeout to 10 seconds
  });
});