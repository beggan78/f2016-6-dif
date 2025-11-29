import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamPreferences } from '../TeamManagement';
import { useTeam } from '../../../contexts/TeamContext';

jest.mock('../../../contexts/TeamContext', () => ({
  useTeam: jest.fn()
}));

jest.mock('../../connectors/ConnectorsSection', () => ({
  ConnectorsSection: () => <div data-testid="connectors-section" />
}));

const mockTeam = { id: 'team-1' };

const buildRoster = () => ([
  {
    id: 'player-1',
    first_name: 'Alex',
    last_name: 'Morgan',
    display_name: 'Alex Morgan',
    jersey_number: 10,
    on_roster: true
  },
  {
    id: 'player-2',
    first_name: 'Sam',
    last_name: 'Kerr',
    display_name: 'Sam Kerr',
    jersey_number: 9,
    on_roster: true
  }
]);

describe('TeamPreferences - Team Captain', () => {
  const loadTeamPreferences = jest.fn();
  const saveTeamPreferences = jest.fn();
  const getTeamRoster = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    loadTeamPreferences.mockResolvedValue({});
    saveTeamPreferences.mockResolvedValue(true);
    getTeamRoster.mockResolvedValue(buildRoster());

    useTeam.mockReturnValue({
      loadTeamPreferences,
      saveTeamPreferences,
      getTeamRoster
    });
  });

  const findTeamCaptainSelect = async () => {
    const selects = await screen.findAllByRole('combobox');
    const target = selects.find((select) =>
      within(select).queryByRole('option', { name: /Permanent Team Captain/i })
    );
    expect(target).toBeDefined();
    return target;
  };

  const findPermanentCaptainSelect = async () => {
    const selects = screen.getAllByRole('combobox');
    const target = selects.find((select) =>
      within(select).queryByRole('option', { name: /Select Team Captain/i })
    );
    expect(target).toBeDefined();
    return target;
  };

  it('requires selecting a player when permanent captain is chosen', async () => {
    render(<TeamPreferences team={mockTeam} />);

    const captainModeSelect = await findTeamCaptainSelect();
    await userEvent.selectOptions(captainModeSelect, 'permanent');

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/Please select a player to serve as the permanent team captain/i)).toBeInTheDocument();
    expect(saveTeamPreferences).not.toHaveBeenCalled();
  });

  it('saves the selected player id when using a permanent captain', async () => {
    render(<TeamPreferences team={mockTeam} />);

    const captainModeSelect = await findTeamCaptainSelect();
    await userEvent.selectOptions(captainModeSelect, 'permanent');

    const permanentCaptainSelect = await waitFor(findPermanentCaptainSelect);
    await waitFor(() => expect(permanentCaptainSelect).not.toBeDisabled());
    await userEvent.selectOptions(permanentCaptainSelect, 'player-1');

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(saveTeamPreferences).toHaveBeenCalled());
    expect(saveTeamPreferences).toHaveBeenCalledWith(
      mockTeam.id,
      expect.objectContaining({ teamCaptain: 'player-1' })
    );
  });
});
