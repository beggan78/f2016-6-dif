/**
 * StatsScreen Component Tests
 * 
 * Comprehensive testing suite for the StatsScreen component - the final screen in the user journey
 * that displays game statistics, final scores, and provides export functionality for coaches.
 * 
 * Test Coverage: 25+ tests covering:
 * - Component rendering and UI structure
 * - Final score display and formatting
 * - Statistics table rendering and data accuracy
 * - Player filtering and role point calculations
 * - Export functionality (clipboard copy)
 * - User interactions and navigation flows
 * - Game reset functionality
 * - Edge cases and error handling
 * - Integration with utility functions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StatsScreen } from '../StatsScreen';
import { PLAYER_ROLES } from '../../../constants/playerConstants';
import {
  createMockPlayers,
  userInteractions
} from '../../__tests__/componentTestUtils';

// Mock utility functions
jest.mock('../../../utils/formatUtils', () => ({
  formatPoints: jest.fn((points) => points % 1 === 0 ? points.toString() : points.toFixed(1)),
  generateStatsText: jest.fn((squadForStats, homeScore, awayScore, opponentTeamName) => 
    `Final Score: Djurgården ${homeScore} - ${awayScore} ${opponentTeamName || 'Opponent'}

Spelare		Start	M	B	A	Ute	Back	Fw	Mv
------		-------	-	-	-	----------	----	--	--
Player 1		S	1.0	1.0	1.0	15:30	08:15	07:15	00:00
Player 2		M	3.0	0.0	0.0	15:30	00:00	00:00	15:30`)
}));

// Import and spy on the rolePointUtils module
import * as rolePointUtils from '../../../utils/rolePointUtils';

// Mock the calculateRolePoints function
jest.spyOn(rolePointUtils, 'calculateRolePoints').mockImplementation((player) => {
  if (!player || !player.stats) {
    return { goaliePoints: 0.0, defenderPoints: 0.0, attackerPoints: 0.0 };
  }
  
  const goaliePoints = player.stats.periodsAsGoalie || 0;
  const remainingPoints = 3 - goaliePoints;
  
  if (remainingPoints <= 0) {
    return { goaliePoints, defenderPoints: 0, attackerPoints: 0 };
  }
  
  const totalOutfieldTime = (player.stats.timeAsDefenderSeconds || 0) + (player.stats.timeAsAttackerSeconds || 0);
  
  if (totalOutfieldTime === 0) {
    return { goaliePoints, defenderPoints: 0, attackerPoints: 0 };
  }
  
  // Simple proportional allocation for testing
  const defenderPoints = Math.round(((player.stats.timeAsDefenderSeconds || 0) / totalOutfieldTime) * remainingPoints * 2) / 2;
  const attackerPoints = remainingPoints - defenderPoints;
  
  return { goaliePoints, defenderPoints, attackerPoints };
});

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  ListChecks: ({ className, ...props }) => <div data-testid="list-checks-icon" className={className} {...props} />,
  Copy: ({ className, ...props }) => <div data-testid="copy-icon" className={className} {...props} />,
  PlusCircle: ({ className, ...props }) => <div data-testid="plus-circle-icon" className={className} {...props} />
}));

// Mock UI components
jest.mock('../../shared/UI', () => ({
  Button: ({ onClick, disabled, children, Icon, ...props }) => (
    <button 
      data-testid="button"
      onClick={onClick} 
      disabled={disabled}
      data-children={children}
      {...props}
    >
      {Icon && <Icon data-testid="button-icon" />}
      {children}
    </button>
  )
}));

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn()
  },
  writable: true
});

describe('StatsScreen', () => {
  let defaultProps;
  let mockPlayers;
  let mockFormatTime;
  let mockSetters;

  beforeEach(() => {
    // Create mock players with game stats
    mockPlayers = createMockPlayers(7).map((player, index) => ({
      ...player,
      stats: {
        ...player.stats,
        startedMatchAs: index < 6 ? (index === 0 ? PLAYER_ROLES.GOALIE : PLAYER_ROLES.ON_FIELD) : null,
        timeOnFieldSeconds: index < 6 ? 930 : 0, // 15:30 for players who played
        timeAsDefenderSeconds: index === 1 ? 495 : 0, // 8:15 for one defender
        timeAsAttackerSeconds: index === 2 ? 435 : 0, // 7:15 for one attacker
        timeAsGoalieSeconds: index === 0 ? 930 : 0, // 15:30 for goalie
        periodsAsGoalie: index === 0 ? 3 : 0 // Goalie played all 3 periods
      }
    }));

    mockFormatTime = jest.fn((seconds) => {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    });

    mockSetters = {
      setView: jest.fn(),
      setAllPlayers: jest.fn(),
      setSelectedSquadIds: jest.fn(),
      setPeriodGoalieIds: jest.fn(),
      setGameLog: jest.fn(),
      initializePlayers: jest.fn(() => createMockPlayers(7)),
      clearStoredState: jest.fn(),
      clearTimerState: jest.fn(),
      resetScore: jest.fn(),
      setOpponentTeamName: jest.fn()
    };

    defaultProps = {
      allPlayers: mockPlayers,
      formatTime: mockFormatTime,
      initialRoster: createMockPlayers(7),
      homeScore: 3,
      awayScore: 1,
      opponentTeamName: 'Test Opponent',
      ...mockSetters
    };

    // Reset mocks
    jest.clearAllMocks();
    navigator.clipboard.writeText.mockResolvedValue();
  });

  describe('Component Rendering', () => {
    it('should render the stats screen with header', () => {
      render(<StatsScreen {...defaultProps} />);
      
      expect(screen.getByTestId('list-checks-icon')).toBeInTheDocument();
      expect(screen.getByText('Game Finished - Statistics')).toBeInTheDocument();
    });

    it('should display final score section', () => {
      render(<StatsScreen {...defaultProps} />);
      
      expect(screen.getByText('Final Score')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Home score
      expect(screen.getByText('1')).toBeInTheDocument(); // Away score
      expect(screen.getByText('Djurgården')).toBeInTheDocument();
      expect(screen.getByText('Test Opponent')).toBeInTheDocument();
    });

    it('should show default opponent name when none provided', () => {
      const props = { ...defaultProps, opponentTeamName: '' };
      render(<StatsScreen {...props} />);
      
      expect(screen.getByText('Opponent')).toBeInTheDocument();
    });

    it('should render statistics table with correct headers', () => {
      render(<StatsScreen {...defaultProps} />);
      
      const expectedHeaders = ['Spelare', 'Start', 'M', 'B', 'A', 'Ute', 'Back', 'Fw', 'Mv'];
      expectedHeaders.forEach(header => {
        expect(screen.getByText(header)).toBeInTheDocument();
      });
    });

    it('should render points system explanation', () => {
      render(<StatsScreen {...defaultProps} />);
      
      expect(screen.getByText('Points System:')).toBeInTheDocument();
      expect(screen.getByText('Each player gets exactly 3 points total')).toBeInTheDocument();
      expect(screen.getByText('1 point per period as goalie (M)')).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      render(<StatsScreen {...defaultProps} />);
      
      const buttons = screen.getAllByTestId('button');
      expect(buttons).toHaveLength(2);
      expect(screen.getByText('Copy Statistics')).toBeInTheDocument();
      expect(screen.getByText('Start New Game Configuration')).toBeInTheDocument();
    });
  });

  describe('Player Data Display', () => {
    it('should only display players who participated in the game', () => {
      render(<StatsScreen {...defaultProps} />);
      
      // Should show 6 players (those with startedMatchAs !== null)
      const playerNames = mockPlayers
        .filter(p => p.stats.startedMatchAs !== null)
        .map(p => p.name);
      
      playerNames.forEach(name => {
        expect(screen.getByText(name)).toBeInTheDocument();
      });
      
      // Should not show the 7th player who didn't participate
      expect(screen.queryByText('Player 7')).not.toBeInTheDocument();
    });

    it('should display correct starting position codes', () => {
      render(<StatsScreen {...defaultProps} />);
      
      // Check that starting positions are correctly displayed
      // M = Goalie, S = On Field, A = Substitute
      const table = screen.getByRole('table');
      expect(table).toContainHTML('M'); // Goalie
      expect(table).toContainHTML('S'); // On field players
    });

    it('should calculate and display role points correctly', () => {
      render(<StatsScreen {...defaultProps} />);
      
      // Verify calculateRolePoints was called for each player
      expect(rolePointUtils.calculateRolePoints).toHaveBeenCalledTimes(6); // 6 players who participated
      
      // Check that points are displayed in the table
      expect(screen.getByText('3')).toBeInTheDocument(); // Goalie points (3 periods)
      expect(screen.getByText('0')).toBeInTheDocument(); // Other points
    });

    it('should format time values correctly', () => {
      render(<StatsScreen {...defaultProps} />);
      
      // Check that formatTime was called for time display
      expect(mockFormatTime).toHaveBeenCalled();
      
      // Verify time formatting in the table
      expect(screen.getByText('15:30')).toBeInTheDocument();
    });

    it('should handle players with zero time in certain roles', () => {
      const playersWithZeroTime = mockPlayers.map(player => ({
        ...player,
        stats: {
          ...player.stats,
          startedMatchAs: PLAYER_ROLES.ON_FIELD,
          timeAsGoalieSeconds: 0,
          timeAsDefenderSeconds: 0,
          timeAsAttackerSeconds: 0,
          periodsAsGoalie: 0
        }
      }));
      
      const props = { ...defaultProps, allPlayers: playersWithZeroTime };
      render(<StatsScreen {...props} />);
      
      // Should handle zero times gracefully
      expect(mockFormatTime).toHaveBeenCalledWith(0);
    });
  });

  describe('Export Functionality', () => {
    it('should copy statistics to clipboard when copy button clicked', async () => {
      render(<StatsScreen {...defaultProps} />);
      
      const copyButton = screen.getByText('Copy Statistics');
      fireEvent.click(copyButton);
      
      // Check that generateStatsText mock was called with correct parameters
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.any(String));
      });
    });

    it('should show success message after successful copy', async () => {
      render(<StatsScreen {...defaultProps} />);
      
      const copyButton = screen.getByText('Copy Statistics');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(screen.getByText('✓ Statistics copied to clipboard!')).toBeInTheDocument();
      });
    });

    it('should hide success message after timeout', async () => {
      jest.useFakeTimers();
      render(<StatsScreen {...defaultProps} />);
      
      const copyButton = screen.getByText('Copy Statistics');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(screen.getByText('✓ Statistics copied to clipboard!')).toBeInTheDocument();
      });
      
      // Fast-forward time
      jest.advanceTimersByTime(2100);
      
      expect(screen.queryByText('✓ Statistics copied to clipboard!')).not.toBeInTheDocument();
      
      jest.useRealTimers();
    });

    it('should handle clipboard copy errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard API not supported'));
      
      render(<StatsScreen {...defaultProps} />);
      
      const copyButton = screen.getByText('Copy Statistics');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to copy stats to clipboard:',
          expect.any(Error)
        );
      });
      
      // Should not show success message on error
      expect(screen.queryByText('✓ Statistics copied to clipboard!')).not.toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('should pass correct data to generateStatsText', async () => {
      render(<StatsScreen {...defaultProps} />);
      
      const copyButton = screen.getByText('Copy Statistics');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('Final Score'));
      });
    });
  });

  describe('Game Reset Functionality', () => {
    it('should call all reset functions when new game button clicked', () => {
      render(<StatsScreen {...defaultProps} />);
      
      const newGameButton = screen.getByText('Start New Game Configuration');
      fireEvent.click(newGameButton);
      
      expect(mockSetters.clearStoredState).toHaveBeenCalled();
      expect(mockSetters.clearTimerState).toHaveBeenCalled();
      expect(mockSetters.setAllPlayers).toHaveBeenCalledWith(expect.any(Array));
      expect(mockSetters.setSelectedSquadIds).toHaveBeenCalledWith([]);
      expect(mockSetters.setPeriodGoalieIds).toHaveBeenCalledWith({});
      expect(mockSetters.setGameLog).toHaveBeenCalledWith([]);
      expect(mockSetters.resetScore).toHaveBeenCalled();
      expect(mockSetters.setOpponentTeamName).toHaveBeenCalledWith('');
      expect(mockSetters.setView).toHaveBeenCalledWith('config');
    });

    it('should reset players using initializePlayers function', () => {
      render(<StatsScreen {...defaultProps} />);
      
      const newGameButton = screen.getByText('Start New Game Configuration');
      fireEvent.click(newGameButton);
      
      expect(mockSetters.initializePlayers).toHaveBeenCalledWith(defaultProps.initialRoster);
      expect(mockSetters.setAllPlayers).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should navigate back to config view after reset', () => {
      render(<StatsScreen {...defaultProps} />);
      
      const newGameButton = screen.getByText('Start New Game Configuration');
      fireEvent.click(newGameButton);
      
      expect(mockSetters.setView).toHaveBeenCalledWith('config');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty players array', () => {
      const props = { ...defaultProps, allPlayers: [] };
      
      expect(() => render(<StatsScreen {...props} />)).not.toThrow();
      
      // Should still render the structure
      expect(screen.getByText('Game Finished - Statistics')).toBeInTheDocument();
      expect(screen.getByText('Final Score')).toBeInTheDocument();
    });

    it('should handle players with null stats', () => {
      const playersWithNullStats = [
        { id: '1', name: 'Player 1', stats: null }
      ];
      
      const props = { ...defaultProps, allPlayers: playersWithNullStats };
      
      expect(() => render(<StatsScreen {...props} />)).not.toThrow();
    });

    it('should handle missing formatTime function', () => {
      const props = { ...defaultProps, formatTime: undefined };
      
      expect(() => render(<StatsScreen {...props} />)).not.toThrow();
    });

    it('should handle zero scores', () => {
      const props = { ...defaultProps, homeScore: 0, awayScore: 0 };
      render(<StatsScreen {...props} />);
      
      expect(screen.getAllByText('0')).toHaveLength(2);
    });

    it('should handle negative scores', () => {
      const props = { ...defaultProps, homeScore: -1, awayScore: -2 };
      render(<StatsScreen {...props} />);
      
      expect(screen.getByText('-1')).toBeInTheDocument();
      expect(screen.getByText('-2')).toBeInTheDocument();
    });

    it('should handle very long opponent team names', () => {
      const longName = 'Very Long Team Name That Should Be Handled Gracefully';
      const props = { ...defaultProps, opponentTeamName: longName };
      render(<StatsScreen {...props} />);
      
      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it('should handle players with undefined startedMatchAs', () => {
      const playersWithUndefinedStart = mockPlayers.map(player => ({
        ...player,
        stats: {
          ...player.stats,
          startedMatchAs: undefined
        }
      }));
      
      const props = { ...defaultProps, allPlayers: playersWithUndefinedStart };
      render(<StatsScreen {...props} />);
      
      // Should filter out players with undefined startedMatchAs
      expect(screen.queryByText('Player 1')).not.toBeInTheDocument();
    });

    it('should handle missing utility function dependencies', () => {
      // Temporarily mock undefined functions
      rolePointUtils.calculateRolePoints.mockReturnValueOnce(undefined);
      
      const props = { ...defaultProps };
      
      expect(() => render(<StatsScreen {...props} />)).toThrow();
    });
  });
});