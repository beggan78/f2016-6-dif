/**
 * Integration Test: Session Persistence
 * 
 * Verifies that the application state is correctly saved to and loaded from
 * localStorage across the main user workflows.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../../App';
import { GamePersistenceManager } from '../../utils/persistenceManager';
import { TEAM_MODES } from '../../constants/playerConstants';
import { initialRoster } from '../../constants/defaultData';

// Mock the main screen components to isolate the App-level state management
jest.mock('../../components/setup/ConfigurationScreen', () => ({
  __esModule: true,
  ConfigurationScreen: (props) => (
    <div data-testid="config-screen">
      <button onClick={() => props.handleStartPeriodSetup()}>
        Mock Config Complete
      </button>
    </div>
  ),
}));

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

jest.mock('../../components/game/GameScreen', () => ({
  __esModule: true,
  GameScreen: (props) => (
    <div data-testid="game-screen">
      <button onClick={() => props.handleEndPeriod()}>
        Mock End Game
      </button>
    </div>
  ),
}));

jest.mock('../../components/stats/StatsScreen', () => ({
  __esModule: true,
  StatsScreen: (props) => (
    <div data-testid="stats-screen">
      <button onClick={() => props.clearStoredState()}>
        Mock New Game
      </button>
    </div>
  ),
}));

describe('Integration: Session Persistence', () => {
  let setItemSpy;
  let getItemSpy;

  beforeEach(() => {
    // Spy on localStorage methods to track persistence
    setItemSpy = jest.spyOn(window.localStorage.__proto__, 'setItem');
    getItemSpy = jest.spyOn(window.localStorage.__proto__, 'getItem');
    
    // Mock window.alert
    jest.spyOn(window, 'alert').mockImplementation(() => {});

    // Ensure a clean slate before each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore mocks and clear localStorage after each test
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('should load initial state from localStorage if it exists', async () => {
    // Arrange: Create a mock game state and save it to localStorage
    const mockGameState = {
      view: 'game',
      teamMode: TEAM_MODES.PAIRS_7,
      allPlayers: initialRoster.slice(0, 7),
      selectedSquadIds: initialRoster.slice(0, 7).map(p => p.id),
      // ... other necessary state properties
    };
    const persistenceManager = new GamePersistenceManager();
    localStorage.setItem(persistenceManager.storageKey, JSON.stringify(mockGameState));

    // Act: Render the App component
    render(<App />);

    // Assert: Verify that the app loaded the state from localStorage
    // The app should render the GameScreen directly because view is 'game'
    await waitFor(() => {
      expect(getItemSpy).toHaveBeenCalledWith(new GamePersistenceManager().storageKey);
      expect(screen.getByTestId('game-screen')).toBeInTheDocument();
    });
  });

  it('should save state to localStorage when configuration is completed', async () => {
    // Arrange
    render(<App />);

    // Act: Simulate completing the configuration screen
    await act(async () => {
      fireEvent.click(screen.getByText('Mock Config Complete'));
    });

    // Assert: Verify that the new state (view: 'period-setup') was saved
    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalledWith(
        new GamePersistenceManager().storageKey,
        expect.stringContaining('"view":"period-setup"')
      );
    });
  });

  it('should persist state correctly when navigating from setup to game', async () => {
    // Arrange: Start the app and navigate to the setup screen
    render(<App />);
    await act(async () => {
      fireEvent.click(screen.getByText('Mock Config Complete'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('period-setup-screen')).toBeInTheDocument();
    });

    // Act: Simulate starting the game from the setup screen
    await act(async () => {
      fireEvent.click(screen.getByText('Mock Start Game'));
    });

    // Assert: The app should now be in the 'game' view and this should be persisted
    await waitFor(() => {
      expect(screen.getByTestId('game-screen')).toBeInTheDocument();
      expect(setItemSpy).toHaveBeenCalledWith(
        new GamePersistenceManager().storageKey,
        expect.stringContaining('"view":"game"')
      );
    });
  });

  it('should clear localStorage and reset state when a new game is started', async () => {
    // Arrange: Start in the stats screen (simulating a completed game)
    const mockGameState = { view: 'stats' };
    const persistenceManager = new GamePersistenceManager();
    localStorage.setItem(persistenceManager.storageKey, JSON.stringify(mockGameState));
    
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('stats-screen')).toBeInTheDocument();
    });

    // Act: Click the "Start New Game" button
    await act(async () => {
      fireEvent.click(screen.getByText('Mock New Game'));
    });

    // Assert: The app should return to the config screen and localStorage should be cleared
    await waitFor(() => {
      expect(screen.getByTestId('config-screen')).toBeInTheDocument();
      // Check that the state was cleared and then re-initialized
      const lastCall = setItemSpy.mock.calls.find(call => call[0] === new GamePersistenceManager().storageKey);
      expect(lastCall[1]).stringContaining('"view":"config"');
    });
  });
});