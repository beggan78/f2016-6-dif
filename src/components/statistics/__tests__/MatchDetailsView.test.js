import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MatchDetailsView } from '../MatchDetailsView';
import {
  createManualMatch,
  getMatchDetails,
  updateMatchDetails,
  updatePlayerMatchStatsBatch,
  deleteConfirmedMatch
} from '../../../services/matchStateManager';

jest.mock('../../../services/matchStateManager', () => ({
  getMatchDetails: jest.fn(),
  updateMatchDetails: jest.fn(),
  updatePlayerMatchStatsBatch: jest.fn(),
  createManualMatch: jest.fn(),
  deleteConfirmedMatch: jest.fn()
}));

const buildTeamPlayer = (player) => {
  const { name, displayName, display_name, firstName, first_name, lastName, last_name, ...rest } = player;
  const resolvedDisplayName = displayName || display_name || name || 'Unnamed Player';
  const [first, ...lastParts] = (firstName || first_name || resolvedDisplayName).split(/\s+/);
  const resolvedFirstName = first || resolvedDisplayName;
  const resolvedLastName = lastName ?? last_name ?? (lastParts.length ? lastParts.join(' ') : null);

  return {
    ...rest,
    displayName: resolvedDisplayName,
    display_name: resolvedDisplayName,
    firstName: resolvedFirstName,
    first_name: resolvedFirstName,
    lastName: resolvedLastName,
    last_name: resolvedLastName
  };
};

const buildPlayerStats = (playerStats) => {
  const { name, displayName, ...rest } = playerStats;
  const resolvedDisplayName = displayName || name || 'Unnamed Player';

  return {
    ...rest,
    displayName: resolvedDisplayName
  };
};

describe('MatchDetailsView - manual creation mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMatchDetails.mockResolvedValue({ success: true, match: {}, playerStats: [] });
    updateMatchDetails.mockResolvedValue({ success: true });
    updatePlayerMatchStatsBatch.mockResolvedValue({ success: true });
    deleteConfirmedMatch.mockResolvedValue({ success: true });
  });

  it('creates a manual match and notifies parent', async () => {
    createManualMatch.mockResolvedValue({ success: true, matchId: 'manual-123' });
    const handleNavigateBack = jest.fn();
    const handleManualMatchCreated = jest.fn();

    render(
      <MatchDetailsView
        matchId={null}
        mode="create"
        teamId="team-xyz"
        teamPlayers={[{ id: 'player-1', name: 'Player One' }].map(buildTeamPlayer)}
        onManualMatchCreated={handleManualMatchCreated}
        onNavigateBack={handleNavigateBack}
      />
    );

    const saveButton = await screen.findByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(createManualMatch).toHaveBeenCalledTimes(1);
    });

    expect(createManualMatch.mock.calls[0][0]).toMatchObject({
      teamId: 'team-xyz',
      format: '5v5',
      periods: 3,
      periodDuration: 15,
      goalsScored: 0,
      goalsConceded: 0
    });
    expect(createManualMatch.mock.calls[0][0].matchDurationSeconds).toBe(2700);
    expect(Array.isArray(createManualMatch.mock.calls[0][1])).toBe(true);
    expect(createManualMatch.mock.calls[0][1]).toHaveLength(1);
    await waitFor(() => {
      expect(handleManualMatchCreated).toHaveBeenCalledWith('manual-123');
    });
    expect(getMatchDetails).not.toHaveBeenCalled();
  });

  it('allows removing players before saving a manual match', async () => {
    createManualMatch.mockResolvedValue({ success: true, matchId: 'manual-456' });
    const handleNavigateBack = jest.fn();
    const handleManualMatchCreated = jest.fn();

    render(
      <MatchDetailsView
        matchId={null}
        mode="create"
        teamId="team-xyz"
        teamPlayers={[
          { id: 'player-1', name: 'Player One' },
          { id: 'player-2', name: 'Player Two' }
        ].map(buildTeamPlayer)}
        onManualMatchCreated={handleManualMatchCreated}
        onNavigateBack={handleNavigateBack}
      />
    );

    const removeButtons = await screen.findAllByRole('button', { name: /Remove/i });
    expect(removeButtons).toHaveLength(2);
    fireEvent.click(removeButtons[1]);

    const table = screen.getByRole('table');
    expect(within(table).queryByText('Player Two')).not.toBeInTheDocument();

    const saveButton = await screen.findByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(createManualMatch).toHaveBeenCalledTimes(1);
    });

    const [, submittedPlayerStats] = createManualMatch.mock.calls[0];
    expect(submittedPlayerStats).toHaveLength(1);
    expect(submittedPlayerStats[0].playerId).toBe('player-1');
    await waitFor(() => {
      expect(handleManualMatchCreated).toHaveBeenCalledWith('manual-456');
    });
  });

  it('cancels creation and navigates back', async () => {
    createManualMatch.mockResolvedValue({ success: true, matchId: 'manual-123' });
    const handleNavigateBack = jest.fn();

    render(
      <MatchDetailsView
        matchId={null}
        mode="create"
        teamId="team-xyz"
        teamPlayers={[]}
        onNavigateBack={handleNavigateBack}
      />
    );

    const cancelButton = await screen.findByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(handleNavigateBack).toHaveBeenCalledTimes(1);
    expect(createManualMatch).not.toHaveBeenCalled();
  });
});

describe('MatchDetailsView - existing match mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMatchDetails.mockResolvedValue({
      success: true,
      match: {
        id: 'match-1',
        opponent: 'Opponents',
        goalsScored: 2,
        goalsConceded: 1,
        venueType: 'home',
        type: 'league',
        format: '5v5',
        formation: '2-2',
        periods: 3,
        periodDuration: 15,
        matchDurationSeconds: 2700,
        date: '2024-03-10',
        time: '14:00',
        outcome: 'W'
      },
      playerStats: []
    });
    updateMatchDetails.mockResolvedValue({ success: true });
    updatePlayerMatchStatsBatch.mockResolvedValue({ success: true });
    deleteConfirmedMatch.mockResolvedValue({ success: true });
  });

  it('deletes a match after confirmation', async () => {
    const handleNavigateBack = jest.fn();
    const handleMatchDeleted = jest.fn();

    render(
      <MatchDetailsView
        matchId="match-1"
        teamId="team-xyz"
        onNavigateBack={handleNavigateBack}
        onMatchDeleted={handleMatchDeleted}
      />
    );

    await screen.findByRole('button', { name: /Edit Match/i });

    const deleteButton = screen.getByRole('button', { name: /Delete Match/i });
    fireEvent.click(deleteButton);

    const modal = await screen.findByRole('dialog');
    const confirmButton = within(modal).getByRole('button', { name: /Delete Match/i });

    await userEvent.click(confirmButton);

    await waitFor(() => expect(deleteConfirmedMatch).toHaveBeenCalledWith('match-1'));
    await waitFor(() => expect(handleMatchDeleted).toHaveBeenCalledWith('match-1'));
    await waitFor(() => expect(handleNavigateBack).toHaveBeenCalled());
  });

  it('does not delete when user cancels confirmation', async () => {
    const handleNavigateBack = jest.fn();
    const handleMatchDeleted = jest.fn();

    render(
      <MatchDetailsView
        matchId="match-1"
        teamId="team-xyz"
        onNavigateBack={handleNavigateBack}
        onMatchDeleted={handleMatchDeleted}
      />
    );

    await screen.findByRole('button', { name: /Edit Match/i });

    const deleteButton = screen.getByRole('button', { name: /Delete Match/i });
    fireEvent.click(deleteButton);

    const modal = await screen.findByRole('dialog');
    const cancelButton = within(modal).getByRole('button', { name: /Cancel/i });

    await userEvent.click(cancelButton);

    expect(deleteConfirmedMatch).not.toHaveBeenCalled();
    expect(handleMatchDeleted).not.toHaveBeenCalled();
    expect(handleNavigateBack).not.toHaveBeenCalled();
  });

  it('preserves total match time when period count changes during edit', async () => {
    getMatchDetails.mockResolvedValueOnce({
      success: true,
      match: {
        id: 'match-1',
        opponent: 'Opponents',
        goalsScored: 2,
        goalsConceded: 1,
        venueType: 'home',
        type: 'league',
        format: '5v5',
        formation: '2-2',
        periods: 3,
        periodDuration: 15,
        matchDurationSeconds: 2772,
        date: '2024-03-10',
        time: '14:00',
        outcome: 'W'
      },
      playerStats: []
    });

    render(
      <MatchDetailsView
        matchId="match-1"
        teamId="team-xyz"
        onNavigateBack={jest.fn()}
      />
    );

    const editButton = await screen.findByRole('button', { name: /Edit Match/i });
    await userEvent.click(editButton);

    const totalTimeInput = await screen.findByDisplayValue('46:12');
    const periodsInput = screen.getByDisplayValue('3');

    fireEvent.change(periodsInput, { target: { value: '4' } });
    fireEvent.blur(periodsInput);

    expect(totalTimeInput.value).toBe('46:12');

    await userEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => expect(updateMatchDetails).toHaveBeenCalled());
    const [, payload] = updateMatchDetails.mock.calls[0];
    expect(payload.matchDurationSeconds).toBe(2772);
  });

  it('displays and allows editing of period duration', async () => {
    getMatchDetails.mockResolvedValueOnce({
      success: true,
      match: {
        id: 'match-1',
        opponent: 'Opponents',
        goalsScored: 2,
        goalsConceded: 1,
        venueType: 'home',
        type: 'league',
        format: '5v5',
        formation: '2-2',
        periods: 3,
        periodDuration: 15,
        matchDurationSeconds: 2700,
        date: '2024-03-10',
        time: '14:00',
        outcome: 'W'
      },
      playerStats: []
    });

    render(
      <MatchDetailsView
        matchId="match-1"
        teamId="team-xyz"
        onNavigateBack={jest.fn()}
      />
    );

    await screen.findByRole('button', { name: /Edit Match/i });

    expect(screen.getByText('15 min')).toBeInTheDocument();

    const editButton = screen.getByRole('button', { name: /Edit Match/i });
    await userEvent.click(editButton);

    const periodDurationInput = screen.getByDisplayValue('15');
    fireEvent.change(periodDurationInput, { target: { value: '20' } });
    fireEvent.blur(periodDurationInput);

    await userEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => expect(updateMatchDetails).toHaveBeenCalled());
    const [, payload] = updateMatchDetails.mock.calls[0];
    expect(payload.periodDuration).toBe(20);
  });

  it('shows warning immediately when entering edit mode if player goals exceed team total', async () => {
    getMatchDetails.mockResolvedValueOnce({
      success: true,
      match: {
        id: 'match-1',
        opponent: 'Opponents',
        goalsScored: 2,
        goalsConceded: 1,
        venueType: 'home',
        type: 'league',
        format: '5v5',
        formation: '2-2',
        periods: 3,
        periodDuration: 15,
        matchDurationSeconds: 2700,
        date: '2024-03-10',
        time: '14:00',
        outcome: 'W'
      },
      playerStats: [
        {
          id: 'player-stat-1',
          playerId: 'player-1',
          name: 'Player One',
          goalsScored: 2,
          totalTimePlayed: 0,
          timeAsDefender: 0,
          timeAsMidfielder: 0,
          timeAsAttacker: 0,
          timeAsGoalkeeper: 0,
          startingRole: 'defender',
          wasCaptain: false,
          receivedFairPlayAward: false
        },
        {
          id: 'player-stat-2',
          playerId: 'player-2',
          name: 'Player Two',
          goalsScored: 2,
          totalTimePlayed: 0,
          timeAsDefender: 0,
          timeAsMidfielder: 0,
          timeAsAttacker: 0,
          timeAsGoalkeeper: 0,
          startingRole: 'defender',
          wasCaptain: false,
          receivedFairPlayAward: false
        }
      ].map(buildPlayerStats)
    });

    render(
      <MatchDetailsView
        matchId="match-1"
        teamId="team-xyz"
        onNavigateBack={jest.fn()}
      />
    );

    const editButton = await screen.findByRole('button', { name: /Edit Match/i });

    // Warning should not be visible before entering edit mode
    expect(screen.queryByText(/Player goals \(4\) exceed team total \(2\)/)).not.toBeInTheDocument();

    await userEvent.click(editButton);

    // Warning should appear immediately upon entering edit mode
    await screen.findByText('Player goals (4) exceed team total (2).');

    const saveButton = await screen.findByRole('button', { name: /Save Changes/i });
    await userEvent.click(saveButton);

    await waitFor(() => expect(updateMatchDetails).toHaveBeenCalled());
  });

  it('shows a warning when player goals exceed the team total but allows saving', async () => {
    getMatchDetails.mockResolvedValueOnce({
      success: true,
      match: {
        id: 'match-1',
        opponent: 'Opponents',
        goalsScored: 2,
        goalsConceded: 1,
        venueType: 'home',
        type: 'league',
        format: '5v5',
        formation: '2-2',
        periods: 3,
        periodDuration: 15,
        matchDurationSeconds: 2700,
        date: '2024-03-10',
        time: '14:00',
        outcome: 'W'
      },
      playerStats: [
        {
          id: 'player-stat-1',
          playerId: 'player-1',
          name: 'Player One',
          goalsScored: 2,
          totalTimePlayed: 0,
          timeAsDefender: 0,
          timeAsMidfielder: 0,
          timeAsAttacker: 0,
          timeAsGoalkeeper: 0,
          startingRole: 'defender',
          wasCaptain: false,
          receivedFairPlayAward: false
        },
        {
          id: 'player-stat-2',
          playerId: 'player-2',
          name: 'Player Two',
          goalsScored: 2,
          totalTimePlayed: 0,
          timeAsDefender: 0,
          timeAsMidfielder: 0,
          timeAsAttacker: 0,
          timeAsGoalkeeper: 0,
          startingRole: 'defender',
          wasCaptain: false,
          receivedFairPlayAward: false
        }
      ].map(buildPlayerStats)
    });

    render(
      <MatchDetailsView
        matchId="match-1"
        teamId="team-xyz"
        onNavigateBack={jest.fn()}
      />
    );

    const editButton = await screen.findByRole('button', { name: /Edit Match/i });
    await userEvent.click(editButton);

    const playerOneRow = screen.getByText('Player One').closest('tr');
    expect(playerOneRow).not.toBeNull();

    const playerGoalsInput = within(playerOneRow).getByDisplayValue('2');
    fireEvent.blur(playerGoalsInput);

    await screen.findByText('Player goals (4) exceed team total (2).');

    const saveButton = await screen.findByRole('button', { name: /Save Changes/i });
    await userEvent.click(saveButton);

    await waitFor(() => expect(updateMatchDetails).toHaveBeenCalled());
  });

  it('shows role validation warning when entering edit mode with invalid starting roles', async () => {
    getMatchDetails.mockResolvedValue({
      success: true,
      match: {
        id: 'match-1',
        opponent: 'Opponent Team',
        goalsScored: 2,
        goalsConceded: 1,
        date: '2024-01-15',
        time: '10:00',
        type: 'league',
        venueType: 'home',
        outcome: 'W',
        format: '5v5',
        formation: '2-2',
        periods: 3,
        periodDuration: 15,
        matchDurationSeconds: 2700
      },
      playerStats: [
        {
          id: 'player-1',
          playerId: 'player-1',
          name: 'Player One',
          goalsScored: 1,
          totalTimePlayed: 30,
          timeAsDefender: 15,
          timeAsMidfielder: 0,
          timeAsAttacker: 15,
          timeAsGoalkeeper: 0,
          startingRole: 'Goalkeeper',
          wasCaptain: false,
          receivedFairPlayAward: false
        },
        {
          id: 'player-2',
          playerId: 'player-2',
          name: 'Player Two',
          goalsScored: 1,
          totalTimePlayed: 30,
          timeAsDefender: 15,
          timeAsMidfielder: 0,
          timeAsAttacker: 15,
          timeAsGoalkeeper: 0,
          startingRole: 'Goalkeeper',
          wasCaptain: false,
          receivedFairPlayAward: false
        }
      ].map(buildPlayerStats)
    });

    render(
      <MatchDetailsView
        matchId="match-1"
        teamId="team-xyz"
        onNavigateBack={jest.fn()}
      />
    );

    const editButton = await screen.findByRole('button', { name: /Edit Match/i });
    await userEvent.click(editButton);

    await screen.findByText(/Starting role inconsistency: 2 goalkeepers \(expected 1\), 0 outfield players \(expected 4 for 5v5\)/i);
  });

  it('shows role validation warning when changing starting roles', async () => {
    getMatchDetails.mockResolvedValue({
      success: true,
      match: {
        id: 'match-1',
        opponent: 'Opponent Team',
        goalsScored: 2,
        goalsConceded: 1,
        date: '2024-01-15',
        time: '10:00',
        type: 'league',
        venueType: 'home',
        outcome: 'W',
        format: '5v5',
        formation: '2-2',
        periods: 3,
        periodDuration: 15,
        matchDurationSeconds: 2700
      },
      playerStats: [
        {
          id: 'player-1',
          playerId: 'player-1',
          name: 'Player One',
          goalsScored: 1,
          totalTimePlayed: 30,
          timeAsDefender: 15,
          timeAsMidfielder: 0,
          timeAsAttacker: 15,
          timeAsGoalkeeper: 0,
          startingRole: 'Goalkeeper',
          wasCaptain: false,
          receivedFairPlayAward: false
        },
        {
          id: 'player-2',
          playerId: 'player-2',
          name: 'Player Two',
          goalsScored: 1,
          totalTimePlayed: 30,
          timeAsDefender: 15,
          timeAsMidfielder: 0,
          timeAsAttacker: 15,
          timeAsGoalkeeper: 0,
          startingRole: 'Defender',
          wasCaptain: false,
          receivedFairPlayAward: false
        },
        {
          id: 'player-3',
          playerId: 'player-3',
          name: 'Player Three',
          goalsScored: 0,
          totalTimePlayed: 30,
          timeAsDefender: 15,
          timeAsMidfielder: 0,
          timeAsAttacker: 15,
          timeAsGoalkeeper: 0,
          startingRole: 'Defender',
          wasCaptain: false,
          receivedFairPlayAward: false
        },
        {
          id: 'player-4',
          playerId: 'player-4',
          name: 'Player Four',
          goalsScored: 0,
          totalTimePlayed: 30,
          timeAsDefender: 15,
          timeAsMidfielder: 0,
          timeAsAttacker: 15,
          timeAsGoalkeeper: 0,
          startingRole: 'Attacker',
          wasCaptain: false,
          receivedFairPlayAward: false
        },
        {
          id: 'player-5',
          playerId: 'player-5',
          name: 'Player Five',
          goalsScored: 0,
          totalTimePlayed: 30,
          timeAsDefender: 15,
          timeAsMidfielder: 0,
          timeAsAttacker: 15,
          timeAsGoalkeeper: 0,
          startingRole: 'Attacker',
          wasCaptain: false,
          receivedFairPlayAward: false
        }
      ].map(buildPlayerStats)
    });

    render(
      <MatchDetailsView
        matchId="match-1"
        teamId="team-xyz"
        onNavigateBack={jest.fn()}
      />
    );

    const editButton = await screen.findByRole('button', { name: /Edit Match/i });
    await userEvent.click(editButton);

    const playerTwoRow = screen.getByText('Player Two').closest('tr');
    const roleSelect = within(playerTwoRow).getByRole('combobox');

    await userEvent.selectOptions(roleSelect, 'Goalkeeper');

    await screen.findByText(/Starting role inconsistency: 2 goalkeepers \(expected 1\), 3 outfield players \(expected 4 for 5v5\)/i);
  });

  it('allows saving match with role inconsistencies', async () => {
    getMatchDetails.mockResolvedValue({
      success: true,
      match: {
        id: 'match-1',
        opponent: 'Opponent Team',
        goalsScored: 2,
        goalsConceded: 1,
        date: '2024-01-15',
        time: '10:00',
        type: 'league',
        venueType: 'home',
        outcome: 'W',
        format: '5v5',
        formation: '2-2',
        periods: 3,
        periodDuration: 15,
        matchDurationSeconds: 2700
      },
      playerStats: [
        {
          id: 'player-1',
          playerId: 'player-1',
          name: 'Player One',
          goalsScored: 1,
          totalTimePlayed: 30,
          timeAsDefender: 15,
          timeAsMidfielder: 0,
          timeAsAttacker: 15,
          timeAsGoalkeeper: 0,
          startingRole: 'Goalkeeper',
          wasCaptain: false,
          receivedFairPlayAward: false
        },
        {
          id: 'player-2',
          playerId: 'player-2',
          name: 'Player Two',
          goalsScored: 1,
          totalTimePlayed: 30,
          timeAsDefender: 15,
          timeAsMidfielder: 0,
          timeAsAttacker: 15,
          timeAsGoalkeeper: 0,
          startingRole: 'Goalkeeper',
          wasCaptain: false,
          receivedFairPlayAward: false
        }
      ]
    });

    updateMatchDetails.mockResolvedValue({ success: true });
    updatePlayerMatchStatsBatch.mockResolvedValue({ success: true });

    render(
      <MatchDetailsView
        matchId="match-1"
        teamId="team-xyz"
        onNavigateBack={jest.fn()}
      />
    );

    const editButton = await screen.findByRole('button', { name: /Edit Match/i });
    await userEvent.click(editButton);

    await screen.findByText(/Starting role inconsistency/i);

    const saveButton = await screen.findByRole('button', { name: /Save Changes/i });
    await userEvent.click(saveButton);

    await waitFor(() => expect(updateMatchDetails).toHaveBeenCalled());
    await waitFor(() => expect(updatePlayerMatchStatsBatch).toHaveBeenCalled());
  });
});
