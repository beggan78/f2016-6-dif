import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayerMatchingModal } from '../PlayerMatchingModal';
import { matchPlayerToAttendance } from '../../../services/connectorService';

jest.mock('../../../services/connectorService', () => ({
  matchPlayerToAttendance: jest.fn()
}));

const rosterPlayer = {
  id: 'player-1',
  display_name: 'Alex Morgan',
  first_name: 'Alex',
  last_name: 'Morgan',
  jersey_number: '10'
};

const unmatchedAttendance = [
  {
    attendanceId: 'attendance-1',
    providerName: 'SportAdmin',
    providerId: 'sportadmin',
    playerNameInProvider: 'A. Morgan',
    lastSynced: '2024-01-01T00:00:00Z',
    connectorStatus: 'connected',
    connectorId: 'connector-1'
  }
];

describe('PlayerMatchingModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows validation message when attempting match without selection', async () => {
    const { container } = render(
      <PlayerMatchingModal
        rosterPlayer={rosterPlayer}
        unmatchedAttendance={unmatchedAttendance}
        onClose={jest.fn()}
        onMatched={jest.fn()}
      />
    );

    const form = container.querySelector('form');

    await act(async () => {
      fireEvent.submit(form);
    });
    expect(await screen.findByText(/Please select a player from the provider/i)).toBeInTheDocument();
    expect(matchPlayerToAttendance).not.toHaveBeenCalled();
  });

  it('matches player and notifies callbacks', async () => {
    const onClose = jest.fn();
   const onMatched = jest.fn();
    matchPlayerToAttendance.mockResolvedValue(undefined);

    render(
      <PlayerMatchingModal
        rosterPlayer={rosterPlayer}
        unmatchedAttendance={unmatchedAttendance}
        onClose={onClose}
        onMatched={onMatched}
      />
    );

    const select = screen.getByRole('combobox');
    await act(async () => {
      await userEvent.selectOptions(select, 'attendance-1');
    });
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /match player/i }));
    });

    expect(matchPlayerToAttendance).toHaveBeenCalledWith('attendance-1', 'player-1');
    expect(onMatched).toHaveBeenCalledWith(unmatchedAttendance[0], rosterPlayer);
    expect(onClose).toHaveBeenCalled();
  });

  it('surfaces matching errors in the UI', async () => {
    matchPlayerToAttendance.mockRejectedValue(new Error('Unable to match'));

    render(
      <PlayerMatchingModal
        rosterPlayer={rosterPlayer}
        unmatchedAttendance={unmatchedAttendance}
        onClose={jest.fn()}
        onMatched={jest.fn()}
      />
    );

    await act(async () => {
      await userEvent.selectOptions(screen.getByRole('combobox'), 'attendance-1');
    });
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /match player/i }));
    });

    expect(await screen.findByText(/Unable to match/i)).toBeInTheDocument();
  });
});
