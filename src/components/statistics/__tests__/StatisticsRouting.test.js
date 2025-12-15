import React from 'react';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { useStatisticsRouting } from '../../../hooks/useStatisticsRouting';
import { VIEWS } from '../../../constants/viewConstants';
import { StatisticsScreen } from '../StatisticsScreen';

const mockUseAuth = jest.fn();
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

const mockUseTeam = jest.fn();
jest.mock('../../../contexts/TeamContext', () => ({
  useTeam: () => mockUseTeam()
}));

const mockUseAuthModalIntegration = jest.fn();
jest.mock('../../../hooks/useAuthModalIntegration', () => ({
  useAuthModalIntegration: (modal) => mockUseAuthModalIntegration(modal)
}));

describe('Statistics Routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ loading: false, isAuthenticated: true });
    mockUseTeam.mockReturnValue({
      loading: false,
      currentTeam: { id: 'team-1' },
      userTeams: [{ id: 'team-1' }],
      canViewStatistics: true
    });
    mockUseAuthModalIntegration.mockReturnValue({
      openLogin: jest.fn(),
      openSignup: jest.fn()
    });
    window.history.replaceState({}, '', '/');
  });

  it('navigates to statistics on /stats URL', async () => {
    const navigateToView = jest.fn();
    window.history.replaceState({}, '', '/stats');

    renderHook(() => useStatisticsRouting(VIEWS.CONFIG, navigateToView));

    await waitFor(() => {
      expect(navigateToView).toHaveBeenCalledWith(VIEWS.STATISTICS);
    });
  });

  it('updates URL when navigating to statistics', async () => {
    const navigateToView = jest.fn();
    const replaceSpy = jest.spyOn(window.history, 'replaceState');
    window.history.replaceState({}, '', '/');

    const { rerender } = renderHook(
      ({ view }) => useStatisticsRouting(view, navigateToView),
      { initialProps: { view: VIEWS.CONFIG } }
    );

    rerender({ view: VIEWS.STATISTICS });

    await waitFor(() => {
      const updated = replaceSpy.mock.calls.some(call => call[2] === '/stats');
      expect(updated).toBe(true);
    });

    expect(replaceSpy).toHaveBeenCalled();

    replaceSpy.mockRestore();
  });

  it('handles authentication required state', () => {
    mockUseAuth.mockReturnValue({ loading: false, isAuthenticated: false });

    render(
      <StatisticsScreen
        onNavigateBack={jest.fn()}
      />
    );

    expect(
      screen.getByText('Sign in with your parent account to explore match history, player stats, and team trends.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('handles no team membership state', () => {
    mockUseAuth.mockReturnValue({ loading: false, isAuthenticated: true });
    mockUseTeam.mockReturnValue({
      loading: false,
      currentTeam: null,
      userTeams: [],
      canViewStatistics: true
    });

    render(
      <StatisticsScreen
        onNavigateBack={jest.fn()}
      />
    );

    expect(
      screen.getByText('You need a team membership before you can view statistics. Ask a coach or admin to add you to the team.')
    ).toBeInTheDocument();
  });

  it('does not override live match URLs', async () => {
    const navigateToView = jest.fn();
    const liveMatchId = 'ad125c2d-46b9-4940-9664-cac9ff24e1f4';
    window.history.replaceState({}, '', `/live/${liveMatchId}`);

    renderHook(() => useStatisticsRouting(VIEWS.CONFIG, navigateToView));

    await waitFor(() => {
      expect(window.location.pathname).toBe(`/live/${liveMatchId}`);
    });
    expect(navigateToView).not.toHaveBeenCalled();
  });
});
