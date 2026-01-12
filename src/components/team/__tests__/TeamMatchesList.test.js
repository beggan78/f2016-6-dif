/**
 * TeamMatchesList Component Tests
 *
 * Comprehensive testing suite for the TeamMatchesList component - displays active matches
 * for a team with loading, error, empty, and populated states.
 *
 * Test Coverage: 35+ tests covering:
 * - Component rendering (loading, error, empty, populated states)
 * - User interactions (navigation, copy link, notifications)
 * - Error handling and retry functionality
 * - Edge cases (missing data, timestamps, state badges)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TeamMatchesList } from '../TeamMatchesList';
import { VIEWS } from '../../../constants/viewConstants';

// Mock dependencies
jest.mock('../../../contexts/TeamContext', () => ({
  useTeam: jest.fn()
}));

jest.mock('../../../hooks/useRealtimeTeamMatches', () => ({
  useRealtimeTeamMatches: jest.fn()
}));

jest.mock('../../../hooks/useUpcomingTeamMatches', () => ({
  useUpcomingTeamMatches: jest.fn()
}));

jest.mock('../../../utils/liveMatchLinkUtils', () => ({
  copyLiveMatchUrlToClipboard: jest.fn()
}));

jest.mock('../../../services/matchStateManager', () => ({
  discardPendingMatch: jest.fn()
}));

describe('TeamMatchesList', () => {
  let defaultProps;
  let mockUseTeam;
  let mockUseRealtimeTeamMatches;
  let mockUseUpcomingTeamMatches;
  let mockCopyLiveMatchUrlToClipboard;
  let mockDiscardPendingMatch;

  const mockTeam = {
    id: 'team-123',
    name: 'Test Team'
  };

  const mockMatches = [
    {
      id: 'match-1',
      opponent: 'Opponent Team A',
      state: 'running',
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      type: 'league',
      venueType: 'home'
    },
    {
      id: 'match-2',
      opponent: 'Internal Match',
      state: 'pending',
      createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      startedAt: null,
      type: 'friendly',
      venueType: 'away'
    }
  ];

  const mockUpcomingMatches = [
    {
      id: 'upcoming-1',
      opponent: 'Future FC',
      matchDate: '2030-05-01',
      matchTime: '18:00:00',
      venue: 'Main Field'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockUseTeam = require('../../../contexts/TeamContext').useTeam;
    mockUseRealtimeTeamMatches = require('../../../hooks/useRealtimeTeamMatches').useRealtimeTeamMatches;
    mockUseUpcomingTeamMatches = require('../../../hooks/useUpcomingTeamMatches').useUpcomingTeamMatches;
    mockCopyLiveMatchUrlToClipboard = require('../../../utils/liveMatchLinkUtils').copyLiveMatchUrlToClipboard;
    mockDiscardPendingMatch = require('../../../services/matchStateManager').discardPendingMatch;

    // Default mock returns
    mockUseTeam.mockReturnValue({ currentTeam: mockTeam });
    mockUseRealtimeTeamMatches.mockReturnValue({
      matches: [],
      loading: false,
      error: null,
      refetch: jest.fn()
    });
    mockUseUpcomingTeamMatches.mockReturnValue({
      matches: [],
      loading: false,
      error: null,
      refetch: jest.fn()
    });
    mockCopyLiveMatchUrlToClipboard.mockResolvedValue({
      success: true,
      url: 'https://example.com/live/match-123'
    });
    mockDiscardPendingMatch.mockResolvedValue({ success: true });

    // Default props
    defaultProps = {
      onNavigateBack: jest.fn(),
      onNavigateTo: jest.fn(),
      pushNavigationState: jest.fn(),
      removeFromNavigationStack: jest.fn()
    };

    // Mock console methods for clean test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering - Loading State', () => {
    it('should render loading state with spinner', () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [],
        loading: true,
        error: null,
        refetch: jest.fn()
      });

      render(<TeamMatchesList {...defaultProps} />);

      expect(screen.getByText('Team Matches')).toBeInTheDocument();
      expect(screen.getByText('Loading matches...')).toBeInTheDocument();
      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('should display spinner animation in loading state', () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [],
        loading: true,
        error: null,
        refetch: jest.fn()
      });

      render(<TeamMatchesList {...defaultProps} />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('border-sky-400');
    });
  });

  describe('Component Rendering - Error State', () => {
    it('should render error state with error message', () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [],
        loading: false,
        error: 'Database connection failed',
        refetch: jest.fn()
      });

      render(<TeamMatchesList {...defaultProps} />);

      expect(screen.getByText('Failed to load matches')).toBeInTheDocument();
      expect(screen.getByText('Database connection failed')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should display error icon in error state', () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [],
        loading: false,
        error: 'Error',
        refetch: jest.fn()
      });

      const { container } = render(<TeamMatchesList {...defaultProps} />);

      // Check for AlertCircle icon
      const svgElements = container.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThan(0);
    });

    it('should call refetch when Try Again button is clicked', () => {
      const mockRefetch = jest.fn();
      const mockUpcomingRefetch = jest.fn();
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [],
        loading: false,
        error: 'Network error',
        refetch: mockRefetch
      });
      mockUseUpcomingTeamMatches.mockReturnValue({
        matches: [],
        loading: false,
        error: null,
        refetch: mockUpcomingRefetch
      });

      render(<TeamMatchesList {...defaultProps} />);

      const tryAgainButton = screen.getByText('Try Again');
      fireEvent.click(tryAgainButton);

      expect(mockRefetch).toHaveBeenCalled();
      expect(mockUpcomingRefetch).toHaveBeenCalled();
    });
  });

  describe('Component Rendering - Empty State', () => {
    it('should render empty state when no matches', () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<TeamMatchesList {...defaultProps} />);

      expect(screen.getByText('No Active Matches')).toBeInTheDocument();
      expect(screen.getByText('Your team has no pending or running matches at the moment.')).toBeInTheDocument();
    });

    it('should display calendar icon in empty state', () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      const { container } = render(<TeamMatchesList {...defaultProps} />);

      // Check for Calendar icon
      const svgElements = container.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThan(0);
    });
  });

  describe('Component Rendering - Populated State', () => {
    it('should render matches list when matches are present', () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: mockMatches,
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<TeamMatchesList {...defaultProps} />);

      expect(screen.getByText('vs Opponent Team A')).toBeInTheDocument();
      expect(screen.getByText('vs Internal Match')).toBeInTheDocument(); // null opponent
    });

    it('should display match opponent names', () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: mockMatches,
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<TeamMatchesList {...defaultProps} />);

      expect(screen.getByText('vs Opponent Team A')).toBeInTheDocument();
    });

    it('should display "Internal Match" for internal matches', () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [mockMatches[1]], // Match with "Internal Match" opponent
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<TeamMatchesList {...defaultProps} />);

      expect(screen.getByText('vs Internal Match')).toBeInTheDocument();
    });

    it('should show Running badge for running matches', () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [mockMatches[0]],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<TeamMatchesList {...defaultProps} />);

      const runningBadge = screen.getByText('Running');
      expect(runningBadge).toBeInTheDocument();
      expect(runningBadge).toHaveClass('bg-emerald-600');
    });

    it('should show Pending badge for pending matches', () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [mockMatches[1]],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<TeamMatchesList {...defaultProps} />);

      const pendingBadge = screen.getByText('Pending');
      expect(pendingBadge).toBeInTheDocument();
      expect(pendingBadge).toHaveClass('bg-sky-600');
    });

    it('should show Resume Setup and Delete buttons for pending matches', () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [mockMatches[1]],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<TeamMatchesList {...defaultProps} />);

      expect(screen.getByText('Resume Setup')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should not show Resume Setup or Delete buttons for running matches', () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [mockMatches[0]],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<TeamMatchesList {...defaultProps} />);

      expect(screen.queryByText('Resume Setup')).not.toBeInTheDocument();
      expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    });

    it('should display match type badge when present', () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [mockMatches[0]],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<TeamMatchesList {...defaultProps} />);

      expect(screen.getByText('League')).toBeInTheDocument();
    });

    it('should display venue type badge when present', () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [mockMatches[0]],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<TeamMatchesList {...defaultProps} />);

      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    it('should capitalize match type and venue type in badges', () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: mockMatches,
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<TeamMatchesList {...defaultProps} />);

      expect(screen.getByText('League')).toBeInTheDocument();
      expect(screen.getByText('Friendly')).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Away')).toBeInTheDocument();
    });

    it('should format timestamp as "Today at" for today\'s matches', () => {
      const todayMatch = {
        ...mockMatches[0],
        createdAt: new Date().toISOString()
      };

      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [todayMatch],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<TeamMatchesList {...defaultProps} />);

      expect(screen.getByText(/Today at/)).toBeInTheDocument();
    });

    it('should format timestamp as "Yesterday at" for yesterday\'s matches', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayMatch = {
        ...mockMatches[0],
        createdAt: yesterday.toISOString()
      };

      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [yesterdayMatch],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<TeamMatchesList {...defaultProps} />);

      expect(screen.getByText(/Yesterday at/)).toBeInTheDocument();
    });

    it('should format timestamp with date for older matches', () => {
      const olderDate = new Date('2026-01-01T10:00:00Z');
      const olderMatch = {
        ...mockMatches[0],
        createdAt: olderDate.toISOString()
      };

      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [olderMatch],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<TeamMatchesList {...defaultProps} />);

      expect(screen.getByText('2026-01-01')).toBeInTheDocument();
    });

    it('should render multiple matches correctly', () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: mockMatches,
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<TeamMatchesList {...defaultProps} />);

      expect(screen.getByText('vs Opponent Team A')).toBeInTheDocument();
      expect(screen.getByText('vs Internal Match')).toBeInTheDocument();
    });
  });

  describe('Component Rendering - Upcoming Matches', () => {
    it('should render upcoming matches with plan button', () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [],
        loading: false,
        error: null,
        refetch: jest.fn()
      });
      mockUseUpcomingTeamMatches.mockReturnValue({
        matches: mockUpcomingMatches,
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<TeamMatchesList {...defaultProps} />);

      expect(screen.getByText('Upcoming Matches')).toBeInTheDocument();
      expect(screen.getByText('vs Future FC')).toBeInTheDocument();
      expect(screen.getByText('Upcoming')).toBeInTheDocument();
      expect(screen.getByText('Not planned yet')).toBeInTheDocument();
      expect(screen.getByText('2030-05-01 18:00')).toBeInTheDocument();
      expect(screen.getByText('Plan')).toBeInTheDocument();
    });
  });

  describe('User Interactions - Navigation', () => {
    it('should call onNavigateBack when Back button is clicked', () => {
      render(<TeamMatchesList {...defaultProps} />);

      const backButton = screen.getByText('Back');
      fireEvent.click(backButton);

      expect(defaultProps.onNavigateBack).toHaveBeenCalled();
    });

    it('should call onNavigateTo with VIEWS.LIVE_MATCH and navigation data when "Open Live" is clicked', () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [mockMatches[0]],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<TeamMatchesList {...defaultProps} />);

      const openLiveButton = screen.getByText('Open Live');
      fireEvent.click(openLiveButton);

      expect(defaultProps.onNavigateTo).toHaveBeenCalledWith(VIEWS.LIVE_MATCH, {
        matchId: 'match-1',
        entryPoint: VIEWS.TEAM_MATCHES
      });
    });

    it('should call onNavigateTo with VIEWS.CONFIG and resumeMatchId when "Resume Setup" is clicked', () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [mockMatches[1]],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<TeamMatchesList {...defaultProps} />);

      const resumeButton = screen.getByText('Resume Setup');
      fireEvent.click(resumeButton);

      expect(defaultProps.onNavigateTo).toHaveBeenCalledWith(VIEWS.CONFIG, {
        resumeMatchId: 'match-2'
      });
    });
  });

  describe('User Interactions - Copy Link', () => {
    it('should trigger copyLiveMatchUrlToClipboard when "Copy Link" is clicked', async () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [mockMatches[0]],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<TeamMatchesList {...defaultProps} />);

      const copyLinkButton = screen.getByText('Copy Link');
      fireEvent.click(copyLinkButton);

      await waitFor(() => {
        expect(mockCopyLiveMatchUrlToClipboard).toHaveBeenCalledWith('match-1');
      });
    });

    it('should show "Copying..." state while copy operation is in progress', async () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [mockMatches[0]],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      // Delay the resolution to capture the copying state
      mockCopyLiveMatchUrlToClipboard.mockReturnValue(
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      render(<TeamMatchesList {...defaultProps} />);

      const copyLinkButton = screen.getByText('Copy Link');
      fireEvent.click(copyLinkButton);

      expect(await screen.findByText('Copying...')).toBeInTheDocument();
    });

    it('should display success notification when link copy succeeds', async () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [mockMatches[0]],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      mockCopyLiveMatchUrlToClipboard.mockResolvedValue({
        success: true,
        url: 'https://example.com/live/match-1'
      });

      render(<TeamMatchesList {...defaultProps} />);

      const copyLinkButton = screen.getByText('Copy Link');
      fireEvent.click(copyLinkButton);

      await waitFor(() => {
        expect(screen.getByText('Link Copied')).toBeInTheDocument();
        expect(screen.getByText('Live match link copied to clipboard!')).toBeInTheDocument();
      });
    });

    it('should display fallback notification when clipboard API unavailable', async () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [mockMatches[0]],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      mockCopyLiveMatchUrlToClipboard.mockResolvedValue({
        success: false,
        url: 'https://example.com/live/match-1'
      });

      render(<TeamMatchesList {...defaultProps} />);

      const copyLinkButton = screen.getByText('Copy Link');
      fireEvent.click(copyLinkButton);

      await waitFor(() => {
        expect(screen.getByText('Live Match URL')).toBeInTheDocument();
        expect(screen.getByText('https://example.com/live/match-1')).toBeInTheDocument();
      });
    });

    it('should display error notification when copy fails', async () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [mockMatches[0]],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      mockCopyLiveMatchUrlToClipboard.mockRejectedValue(new Error('Copy failed'));

      render(<TeamMatchesList {...defaultProps} />);

      const copyLinkButton = screen.getByText('Copy Link');
      fireEvent.click(copyLinkButton);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to copy link')).toBeInTheDocument();
      });

      expect(console.error).toHaveBeenCalledWith('Failed to copy link:', expect.any(Error));
    });

    it('should close notification modal when OK button is clicked', async () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [mockMatches[0]],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      mockCopyLiveMatchUrlToClipboard.mockResolvedValue({
        success: true,
        url: 'https://example.com/live/match-1'
      });

      render(<TeamMatchesList {...defaultProps} />);

      const copyLinkButton = screen.getByText('Copy Link');
      fireEvent.click(copyLinkButton);

      await waitFor(() => {
        expect(screen.getByText('Link Copied')).toBeInTheDocument();
      });

      // Close the notification
      const okButton = screen.getByText('OK');
      fireEvent.click(okButton);

      await waitFor(() => {
        expect(screen.queryByText('Link Copied')).not.toBeInTheDocument();
      });
    });

    it('should disable copy button while copying', async () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [mockMatches[0]],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      mockCopyLiveMatchUrlToClipboard.mockReturnValue(
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      render(<TeamMatchesList {...defaultProps} />);

      const copyLinkButton = screen.getByText('Copy Link');
      fireEvent.click(copyLinkButton);

      // Find the button by its text content and check if it's disabled
      await waitFor(() => {
        const button = screen.getByText('Copying...').closest('button');
        expect(button).toBeDisabled();
      });
    });
  });

  describe('User Interactions - Pending Match Actions', () => {
    it('should call discardPendingMatch and refetch when "Delete" is clicked', async () => {
      const mockRefetch = jest.fn();
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [mockMatches[1]],
        loading: false,
        error: null,
        refetch: mockRefetch
      });

      render(<TeamMatchesList {...defaultProps} />);

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockDiscardPendingMatch).toHaveBeenCalledWith('match-2');
      });

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing team context gracefully', () => {
      mockUseTeam.mockReturnValue({ currentTeam: null });

      render(<TeamMatchesList {...defaultProps} />);

      // Should still render without crashing
      expect(screen.getByText('Team Matches')).toBeInTheDocument();
    });

    it('should handle matches without type', () => {
      const matchWithoutType = {
        ...mockMatches[0],
        type: null
      };

      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [matchWithoutType],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<TeamMatchesList {...defaultProps} />);

      // Should render without crashing, type badge should not appear
      expect(screen.getByText('vs Opponent Team A')).toBeInTheDocument();
    });

    it('should handle matches without venue type', () => {
      const matchWithoutVenue = {
        ...mockMatches[0],
        venueType: null
      };

      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [matchWithoutVenue],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<TeamMatchesList {...defaultProps} />);

      // Should render without crashing
      expect(screen.getByText('vs Opponent Team A')).toBeInTheDocument();
    });

    it('should handle invalid timestamp gracefully', () => {
      const matchWithInvalidDate = {
        ...mockMatches[0],
        createdAt: null
      };

      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [matchWithInvalidDate],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<TeamMatchesList {...defaultProps} />);

      expect(screen.getByText('No date')).toBeInTheDocument();
    });

    it('should handle copy link errors without crashing', async () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [mockMatches[0]],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      mockCopyLiveMatchUrlToClipboard.mockRejectedValue(new Error('Network error'));

      render(<TeamMatchesList {...defaultProps} />);

      const copyLinkButton = screen.getByText('Copy Link');
      fireEvent.click(copyLinkButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to copy link')).toBeInTheDocument();
      });

      // Component should still be functional
      expect(screen.getByText('vs Opponent Team A')).toBeInTheDocument();
    });

    it('should handle empty matches array', () => {
      mockUseRealtimeTeamMatches.mockReturnValue({
        matches: [],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<TeamMatchesList {...defaultProps} />);

      expect(screen.getByText('No Active Matches')).toBeInTheDocument();
    });
  });
});
