/**
 * Integration Test: Score Persistence
 * 
 * Verifies that game scores (homeScore and awayScore) are correctly saved to and 
 * loaded from localStorage across page refreshes and application restarts.
 * 
 * This test reproduces the bug where scores reset to 0-0 after page refresh.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../../App';
import { GamePersistenceManager } from '../../utils/persistenceManager';
import { TEAM_MODES } from '../../constants/playerConstants';
import { initialRoster } from '../../constants/defaultData';

// Mock the main screen components to isolate score persistence testing
jest.mock('../../components/setup/ConfigurationScreen', () => {
  const React = require('react');
  return {
    __esModule: true,
    ConfigurationScreen: (props) => {
      const [isConfigured, setIsConfigured] = React.useState(false);

      const handleComplete = () => {
        // Simulate proper configuration setup
        props.setSelectedSquadIds(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7']);
        props.setNumPeriods(3);
        props.setPeriodDurationMinutes(15);
        props.setPeriodGoalieIds({ 1: 'p1', 2: 'p2', 3: 'p3' });
        props.setTeamMode('INDIVIDUAL_7');
        props.setAlertMinutes(2);
        props.setOpponentTeamName('Test Opponent');
        setIsConfigured(true);
      };

      React.useEffect(() => {
        if (isConfigured) {
          props.handleStartPeriodSetup();
        }
      }, [isConfigured, props]);

      return (
        <div data-testid="config-screen">
          <button onClick={handleComplete}>
            Mock Config Complete
          </button>
        </div>
      );
    },
  };
});

jest.mock('../../components/setup/PeriodSetupScreen', () => ({
  __esModule: true,
  PeriodSetupScreen: (props) => (
    <div data-testid="period-setup-screen">
      <button onClick={() => props.handleStartGame()}>
        Mock Start Game
      </button>
    </div>
  ),
}));

// Mock GameScreen component that simulates score interactions
jest.mock('../../components/game/GameScreen', () => ({
  __esModule: true,
  GameScreen: (props) => {
    return (
      <div data-testid="game-screen">
        <div data-testid="score-display">
          {props.homeScore} - {props.awayScore}
        </div>
        <button 
          data-testid="home-goal-button"
          onClick={props.addHomeGoal}
        >
          Add Home Goal
        </button>
        <button 
          data-testid="away-goal-button"
          onClick={props.addAwayGoal}
        >
          Add Away Goal
        </button>
        <button 
          data-testid="edit-score-button"
          onClick={() => props.setScore(2, 1)}
        >
          Set Score to 2-1
        </button>
        <button onClick={() => props.handleEndPeriod()}>
          Mock End Game
        </button>
      </div>
    );
  },
}));

jest.mock('../../components/stats/StatsScreen', () => ({
  __esModule: true,
  StatsScreen: (props) => (
    <div data-testid="stats-screen">
      <div data-testid="final-score">
        Final Score: {props.homeScore} - {props.awayScore}
      </div>
    </div>
  ),
}));

describe('Integration: Score Persistence', () => {
  let setItemSpy;
  let getItemSpy;
  let persistenceManager;

  beforeEach(() => {
    // Spy on localStorage methods to track persistence
    setItemSpy = jest.spyOn(window.localStorage.__proto__, 'setItem');
    getItemSpy = jest.spyOn(window.localStorage.__proto__, 'getItem');
    
    // Mock window.alert
    jest.spyOn(window, 'alert').mockImplementation(() => {});

    // Ensure a clean slate before each test
    localStorage.clear();
    jest.clearAllMocks();

    // Initialize persistenceManager once per test
    persistenceManager = new GamePersistenceManager();
  });

  afterEach(() => {
    // Restore mocks and clear localStorage after each test
    jest.restoreAllMocks();
    localStorage.clear();
  });

  describe('Home Team Scoring', () => {
    it('should persist home team goals after page refresh', async () => {
      // Navigate to game screen
      const { unmount } = render(<App />);
      await navigateToGameScreen();

      // Add a home team goal
      const homeGoalButton = screen.getByTestId('home-goal-button');
      await act(async () => {
        fireEvent.click(homeGoalButton);
      });

      // Verify score is displayed as 1-0
      expect(screen.getByTestId('score-display')).toHaveTextContent('1 - 0');

      // Verify scores were saved to localStorage
      expect(setItemSpy).toHaveBeenCalledWith(
        persistenceManager.storageKey,
        expect.stringContaining('"homeScore":1')
      );
      expect(setItemSpy).toHaveBeenCalledWith(
        persistenceManager.storageKey,
        expect.stringContaining('"awayScore":0')
      );

      // Unmount current app
      unmount();
      
      // Clear localStorage spy calls to focus on load behavior
      getItemSpy.mockClear();
      
      // Re-render app to simulate page refresh
      render(<App />);
      
      // Verify state is loaded from localStorage
      expect(getItemSpy).toHaveBeenCalledWith(persistenceManager.storageKey);
      
      // Verify scores persist after refresh
      await waitFor(() => {
        const scoreDisplay = screen.getByTestId('score-display');
        expect(scoreDisplay).toHaveTextContent('1 - 0');
      });
    });

    it('should persist multiple home team goals', async () => {
      const { unmount } = render(<App />);
      await navigateToGameScreen();

      // Add three home team goals
      const homeGoalButton = screen.getByTestId('home-goal-button');
      await act(async () => {
        fireEvent.click(homeGoalButton);
        fireEvent.click(homeGoalButton);
        fireEvent.click(homeGoalButton);
      });

      // Verify score is displayed as 3-0
      expect(screen.getByTestId('score-display')).toHaveTextContent('3 - 0');

      // Verify scores were saved to localStorage
      expect(setItemSpy).toHaveBeenCalledWith(
        persistenceManager.storageKey,
        expect.stringContaining('"homeScore":3')
      );

      // Simulate page refresh
      unmount();
      getItemSpy.mockClear();
      render(<App />);

      // Verify scores persist after refresh
      await waitFor(() => {
        const scoreDisplay = screen.getByTestId('score-display');
        expect(scoreDisplay).toHaveTextContent('3 - 0');
      });
    });
  });

  describe('Away Team Scoring', () => {
    it('should persist away team goals after page refresh', async () => {
      render(<App />);
      await navigateToGameScreen();

      // Add an away team goal
      const awayGoalButton = screen.getByTestId('away-goal-button');
      await act(async () => {
        fireEvent.click(awayGoalButton);
      });

      // Verify score is displayed as 0-1
      expect(screen.getByTestId('score-display')).toHaveTextContent('0 - 1');

      // Simulate page refresh
      await simulatePageRefresh();

      // BUG REPRODUCTION: Score should be 0-1 but will be 0-0
      await waitFor(() => {
        const scoreDisplay = screen.getByTestId('score-display');
        expect(scoreDisplay).toHaveTextContent('0 - 1');
      });
    });
  });

  describe('Mixed Scoring Scenarios', () => {
    it('should persist mixed home and away goals', async () => {
      render(<App />);
      await navigateToGameScreen();

      // Add goals for both teams: home 2, away 1
      const homeGoalButton = screen.getByTestId('home-goal-button');
      const awayGoalButton = screen.getByTestId('away-goal-button');
      
      await act(async () => {
        fireEvent.click(homeGoalButton);
        fireEvent.click(awayGoalButton);
        fireEvent.click(homeGoalButton);
      });

      // Verify score is displayed as 2-1
      expect(screen.getByTestId('score-display')).toHaveTextContent('2 - 1');

      // Simulate page refresh
      await simulatePageRefresh();

      // BUG REPRODUCTION: Score should be 2-1 but will be 0-0
      await waitFor(() => {
        const scoreDisplay = screen.getByTestId('score-display');
        expect(scoreDisplay).toHaveTextContent('2 - 1');
      });
    });
  });

  describe('Score Editing', () => {
    it('should persist manually edited scores', async () => {
      render(<App />);
      await navigateToGameScreen();

      // Edit score to 2-1 using the edit functionality
      const editScoreButton = screen.getByTestId('edit-score-button');
      await act(async () => {
        fireEvent.click(editScoreButton);
      });

      // Verify score is displayed as 2-1
      expect(screen.getByTestId('score-display')).toHaveTextContent('2 - 1');

      // Simulate page refresh
      await simulatePageRefresh();

      // BUG REPRODUCTION: Score should be 2-1 but will be 0-0
      await waitFor(() => {
        const scoreDisplay = screen.getByTestId('score-display');
        expect(scoreDisplay).toHaveTextContent('2 - 1');
      });
    });
  });

  describe('Score Persistence with Existing Game State', () => {
    it('should load scores when resuming from existing game state', async () => {
      // Arrange: Create mock game state with existing score
      const mockGameState = {
        view: 'game',
        homeScore: 3,
        awayScore: 2,
        teamMode: TEAM_MODES.INDIVIDUAL_7,
        allPlayers: initialRoster.slice(0, 7),
        selectedSquadIds: initialRoster.slice(0, 7).map(p => p.id),
        periodFormation: {
          goalie: 'p1',
          leftDefender: 'p2',
          rightDefender: 'p3',
          leftAttacker: 'p4',
          rightAttacker: 'p5',
          substitute_1: 'p6',
          substitute_2: 'p7'
        }
      };

      // Save the mock state to localStorage
      localStorage.setItem(persistenceManager.storageKey, JSON.stringify(mockGameState));

      // Act: Render the App component (simulating app restart)
      render(<App />);

      // Assert: Verify the app loads with the correct score
      await waitFor(() => {
        expect(getItemSpy).toHaveBeenCalledWith(persistenceManager.storageKey);
        expect(screen.getByTestId('game-screen')).toBeInTheDocument();
        
        // BUG REPRODUCTION: This should show 3-2 but will show 0-0
        const scoreDisplay = screen.getByTestId('score-display');
        expect(scoreDisplay).toHaveTextContent('3 - 2');
      });
    });
  });

  // Helper functions
  async function navigateToGameScreen() {
    // Navigate through the configuration flow to reach the game screen
    await act(async () => {
      fireEvent.click(screen.getByText('Mock Config Complete'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('period-setup-screen')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Mock Start Game'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('game-screen')).toBeInTheDocument();
    });
  }

  async function simulatePageRefresh() {
    // Get the current container
    const currentContainer = screen.getByTestId('game-screen').closest('div');
    
    // Unmount the current app by clearing the body
    document.body.innerHTML = '';
    
    // Clear spy calls to focus on load behavior
    getItemSpy.mockClear();
    
    // Re-render app to simulate page refresh
    render(<App />);
    
    // Verify state is loaded from localStorage
    expect(getItemSpy).toHaveBeenCalledWith(persistenceManager.storageKey);
    
    // Wait for game screen to appear
    await waitFor(() => {
      expect(screen.getByTestId('game-screen')).toBeInTheDocument();
    });
  }
});