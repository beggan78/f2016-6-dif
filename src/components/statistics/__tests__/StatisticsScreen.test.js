import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatisticsScreen } from '../StatisticsScreen';
import { AuthProvider } from '../../../contexts/AuthContext';
import { TeamProvider } from '../../../contexts/TeamContext';

// Mock the contexts
const mockTeamContext = {
  canManageTeam: false,
  currentTeam: { id: 1, name: 'Test Team' },
  teamPlayers: []
};

const mockAuthContext = {
  isAuthenticated: true,
  user: { id: 1, email: 'test@example.com' },
  userProfile: { name: 'Test User' }
};

const TestWrapper = ({ children }) => (
  <AuthProvider value={mockAuthContext}>
    <TeamProvider value={mockTeamContext}>
      {children}
    </TeamProvider>
  </AuthProvider>
);

describe('StatisticsScreen', () => {
  const mockOnNavigateBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders statistics dashboard by default', () => {
    render(
      <TestWrapper>
        <StatisticsScreen onNavigateBack={mockOnNavigateBack} />
      </TestWrapper>
    );

    expect(screen.getByText('Team Statistics')).toBeInTheDocument();
    expect(screen.getByText('Performance overview and detailed statistics')).toBeInTheDocument();
  });

  test('renders back button and calls onNavigateBack when clicked', () => {
    render(
      <TestWrapper>
        <StatisticsScreen onNavigateBack={mockOnNavigateBack} />
      </TestWrapper>
    );

    const backButton = screen.getByText('Back to Main Menu');
    fireEvent.click(backButton);

    expect(mockOnNavigateBack).toHaveBeenCalledTimes(1);
  });

  test('navigates to match list when view all matches is clicked', () => {
    render(
      <TestWrapper>
        <StatisticsScreen onNavigateBack={mockOnNavigateBack} />
      </TestWrapper>
    );

    const viewAllButton = screen.getByText('View All');
    fireEvent.click(viewAllButton);

    expect(screen.getByText('Match History')).toBeInTheDocument();
  });

  test('shows admin mode indicator when user can manage team', () => {
    const adminTeamContext = {
      ...mockTeamContext,
      canManageTeam: true
    };

    render(
      <AuthProvider value={mockAuthContext}>
        <TeamProvider value={adminTeamContext}>
          <StatisticsScreen onNavigateBack={mockOnNavigateBack} />
        </TeamProvider>
      </AuthProvider>
    );

    expect(screen.getByText(/Admin Mode/)).toBeInTheDocument();
  });
});