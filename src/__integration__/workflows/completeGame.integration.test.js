/**
 * Integration Test: Complete Game Workflow
 * 
 * Tests the end-to-end user journey from configuration to stats, 
 * ensuring all parts of the application work together as expected.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../../App';

// Mock the screen components to simplify the test and focus on the workflow
jest.mock('../../components/setup/ConfigurationScreen', () => ({
  __esModule: true,
  ConfigurationScreen: (props) => (
    <div data-testid="config-screen">
      <button onClick={() => props.handleStartPeriodSetup()}>
        Complete Configuration
      </button>
    </div>
  ),
}));

jest.mock('../../components/setup/PeriodSetupScreen', () => ({
  __esModule: true,
  PeriodSetupScreen: (props) => (
    <div data-testid="period-setup-screen">
      <button onClick={() => props.handleStartGame()}>
        Start Game
      </button>
    </div>
  ),
}));

jest.mock('../../components/game/GameScreen', () => ({
  __esModule: true,
  GameScreen: (props) => (
    <div data-testid="game-screen">
      <button onClick={() => props.handleEndPeriod()}>
        End Period
      </button>
    </div>
  ),
}));

jest.mock('../../components/stats/StatsScreen', () => ({
  __esModule: true,
  StatsScreen: (props) => (
    <div data-testid="stats-screen">
      <button onClick={() => props.clearStoredState()}>
        Start New Game
      </button>
    </div>
  ),
}));

describe('Integration: Complete Game Workflow', () => {
  beforeEach(() => {
    // Mock window.alert before each test
    jest.spyOn(window, 'alert').mockImplementation(() => {});
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('should navigate through the entire game workflow from config to stats', async () => {
    render(<App />);

    // 1. Start on the Configuration Screen
    await waitFor(() => {
        expect(screen.getByTestId('config-screen')).toBeInTheDocument();
    });

    // 2. Complete configuration and move to Period Setup
    await act(async () => {
      fireEvent.click(screen.getByText('Complete Configuration'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('period-setup-screen')).toBeInTheDocument();
    });

    // 3. Start the game and move to the Game Screen
    await act(async () => {
      fireEvent.click(screen.getByText('Start Game'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('game-screen')).toBeInTheDocument();
    });

    // 4. End the game and move to the Stats Screen
    await act(async () => {
      fireEvent.click(screen.getByText('End Period'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('stats-screen')).toBeInTheDocument();
    });

    // 5. Start a new game and return to the Configuration Screen
    await act(async () => {
      fireEvent.click(screen.getByText('Start New Game'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('config-screen')).toBeInTheDocument();
    });
  });
});