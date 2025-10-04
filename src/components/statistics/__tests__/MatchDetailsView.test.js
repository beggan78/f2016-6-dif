import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
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
        teamPlayers={[{ id: 'player-1', name: 'Player One' }]}
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
        ]}
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

    await act(async () => {
      fireEvent.click(confirmButton);
    });

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

    await act(async () => {
      fireEvent.click(cancelButton);
    });

    expect(deleteConfirmedMatch).not.toHaveBeenCalled();
    expect(handleMatchDeleted).not.toHaveBeenCalled();
    expect(handleNavigateBack).not.toHaveBeenCalled();
  });
});
