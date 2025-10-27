import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfigurationScreen } from '../ConfigurationScreen';
import { VENUE_TYPES } from '../../../constants/matchVenues';
import { FORMATS, FORMATIONS, SUBSTITUTION_TYPES, PAIRED_ROLE_STRATEGY_TYPES } from '../../../constants/teamConfiguration';
import { checkForPendingMatches } from '../../../services/pendingMatchService';

const mockUseAuth = jest.fn(() => ({
  isAuthenticated: true,
  user: { id: 'user-1' },
  sessionDetectionResult: null
}));

const mockUseTeam = jest.fn(() => ({
  currentTeam: { id: 'team-1' },
  teamPlayers: [],
  hasTeams: true,
  hasClubs: true,
  loading: false
}));

jest.mock('lucide-react', () => ({
  Settings: (props) => <svg data-testid="icon-settings" {...props} />,
  Play: (props) => <svg data-testid="icon-play" {...props} />,
  Shuffle: (props) => <svg data-testid="icon-shuffle" {...props} />,
  Cloud: (props) => <svg data-testid="icon-cloud" {...props} />,
  Upload: (props) => <svg data-testid="icon-upload" {...props} />,
  Layers: (props) => <svg data-testid="icon-layers" {...props} />,
  UserPlus: (props) => <svg data-testid="icon-user-plus" {...props} />,
  HelpCircle: (props) => <svg data-testid="icon-help" {...props} />,
  Save: (props) => <svg data-testid="icon-save" {...props} />,
  Home: (props) => <svg data-testid="icon-home" {...props} />,
  Plane: (props) => <svg data-testid="icon-plane" {...props} />,
  Globe2: (props) => <svg data-testid="icon-globe" {...props} />,
  MapPin: (props) => <svg data-testid="icon-pin" {...props} />,
  Search: (props) => <svg data-testid="icon-search" {...props} />,
  History: (props) => <svg data-testid="icon-history" {...props} />
}));

jest.mock('../../shared/UI', () => ({
  Select: ({ value, onChange, options, id }) => (
    <select id={id} data-testid={id || 'select'} value={value || ''} onChange={(e) => onChange && onChange(e.target.value)}>
      {options && options.map(option => (
        typeof option === 'object'
          ? <option key={option.value} value={option.value}>{option.label}</option>
          : <option key={option} value={option}>{option}</option>
      ))}
    </select>
  ),
  Button: ({ children, onClick, disabled, type = 'button', Icon: IconComponent, ...props }) => (
    <button
      data-testid="mock-button"
      type={type}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {IconComponent ? <IconComponent data-testid="mock-button-icon" /> : null}
      {children}
    </button>
  ),
  Input: React.forwardRef(({ value = '', onChange, ...props }, ref) => (
    <input data-testid="mock-input" value={value} onChange={onChange} ref={ref} {...props} />
  ))
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

jest.mock('../../../contexts/TeamContext', () => ({
  useTeam: () => mockUseTeam()
}));

jest.mock('../../../hooks/useFormationVotes', () => ({
  useFormationVotes: () => ({
    isLoading: false,
    votes: {},
    openVoteModal: jest.fn(),
    closeVoteModal: jest.fn()
  })
}));

const mockUseOpponentNameSuggestions = jest.fn();

jest.mock('../../../hooks/useOpponentNameSuggestions', () => ({
  useOpponentNameSuggestions: (...args) => mockUseOpponentNameSuggestions(...args)
}));

jest.mock('../../team/TeamManagement', () => ({
  TeamManagement: () => null
}));

jest.mock('../../../utils/DataSyncManager', () => ({
  __esModule: true,
  dataSyncManager: {
    setUserId: jest.fn(),
    getLocalMatches: jest.fn(() => []),
    migrateLocalDataToCloud: jest.fn(() => Promise.resolve({ migratedMatches: 0 }))
  }
}));

jest.mock('../../auth/FeatureGate', () => ({
  FeatureGate: ({ children }) => <>{children}</>
}));

jest.mock('../FormationPreview', () => ({
  FormationPreview: () => <div data-testid="formation-preview" />
}));

jest.mock('../../shared/FeatureVoteModal', () => ({
  __esModule: true,
  default: () => null
}));

jest.mock('../../shared/PairRoleRotationHelpModal', () => ({
  __esModule: true,
  default: () => null
}));

jest.mock('../../../services/pendingMatchService', () => ({
  checkForPendingMatches: jest.fn(() => Promise.resolve({ shouldShow: false, pendingMatches: [] })),
  createResumeDataForConfiguration: jest.fn(() => ({}))
}));

jest.mock('../../../services/matchStateManager', () => ({
  discardPendingMatch: jest.fn(() => Promise.resolve())
}));

jest.mock('../../match/PendingMatchResumeModal', () => ({
  PendingMatchResumeModal: () => null
}));

beforeEach(() => {
  mockUseAuth.mockReset();
  mockUseAuth.mockImplementation(() => ({
    isAuthenticated: true,
    user: { id: 'user-1' },
    sessionDetectionResult: null
  }));

  mockUseTeam.mockReset();
  mockUseTeam.mockImplementation(() => ({
    currentTeam: { id: 'team-1' },
    teamPlayers: [],
    hasTeams: true,
    hasClubs: true,
    loading: false
  }));

  mockUseOpponentNameSuggestions.mockReset();
  mockUseOpponentNameSuggestions.mockReturnValue({
    names: ['Alpha FC', 'Beta United', 'Gamma City'],
    loading: false,
    error: null,
    refresh: jest.fn()
  });
});

const buildProps = (overrides = {}) => ({
  allPlayers: [],
  setAllPlayers: jest.fn(),
  selectedSquadIds: [],
  setSelectedSquadIds: jest.fn(),
  numPeriods: 3,
  setNumPeriods: jest.fn(),
  periodDurationMinutes: 15,
  setPeriodDurationMinutes: jest.fn(),
  periodGoalieIds: {},
  setPeriodGoalieIds: jest.fn(),
  teamConfig: {
    format: FORMATS.FORMAT_5V5,
    squadSize: 7,
    formation: FORMATIONS.FORMATION_2_2,
    substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL
  },
  updateTeamConfig: jest.fn(),
  selectedFormation: FORMATIONS.FORMATION_2_2,
  setSelectedFormation: jest.fn(),
  updateFormationSelection: jest.fn(),
  createTeamConfigFromSquadSize: jest.fn(),
  formation: { goalie: null },
  setFormation: jest.fn(),
  alertMinutes: 2,
  setAlertMinutes: jest.fn(),
  handleStartPeriodSetup: jest.fn(),
  handleSaveConfiguration: jest.fn(),
  selectedSquadPlayers: [],
  opponentTeam: '',
  setOpponentTeam: jest.fn(),
  matchType: 'league',
  setMatchType: jest.fn(),
  venueType: VENUE_TYPES.HOME,
  setVenueType: jest.fn(),
  captainId: null,
  setCaptain: jest.fn(),
  debugMode: false,
  authModal: { open: jest.fn() },
  setView: jest.fn(),
  syncPlayersFromTeamRoster: jest.fn(),
  setCurrentMatchId: jest.fn(),
  setMatchCreated: jest.fn(),
  hasActiveConfiguration: false,
  setHasActiveConfiguration: jest.fn(),
  clearStoredState: jest.fn(),
  configurationSessionId: 0,
  ...overrides
});

describe('ConfigurationScreen squad selection', () => {
  it('selects the full roster when Select All is pressed', () => {
    mockUseAuth.mockImplementation(() => ({
      isAuthenticated: false,
      user: null,
      sessionDetectionResult: null
    }));

    const allPlayers = Array.from({ length: 6 }).map((_, index) => ({
      id: `player-${index + 1}`,
      name: `Player ${index + 1}`
    }));

    const props = buildProps({
      allPlayers,
      selectedSquadIds: []
    });

    const { rerender } = render(<ConfigurationScreen {...props} />);

    const selectAllButton = screen.getByRole('button', { name: /select all/i });
    expect(selectAllButton).toBeEnabled();

    const initialHasActiveCalls = props.setHasActiveConfiguration.mock.calls.length;
    const initialConfigCalls = props.createTeamConfigFromSquadSize.mock.calls.length;

    fireEvent.click(selectAllButton);

    expect(props.setSelectedSquadIds).toHaveBeenCalledTimes(1);
    const updater = props.setSelectedSquadIds.mock.calls[0][0];
    expect(typeof updater).toBe('function');

    const nextSelection = updater([]);
    const expectedIds = allPlayers.map(player => player.id);
    expect(nextSelection).toEqual(expectedIds);

    expect(props.setHasActiveConfiguration.mock.calls.length).toBeGreaterThan(initialHasActiveCalls);
    const lastHasActiveCall = props.setHasActiveConfiguration.mock.calls[props.setHasActiveConfiguration.mock.calls.length - 1];
    expect(lastHasActiveCall[0]).toBe(true);

    expect(props.createTeamConfigFromSquadSize.mock.calls.length).toBeGreaterThan(initialConfigCalls);
    const lastConfigCall = props.createTeamConfigFromSquadSize.mock.calls[props.createTeamConfigFromSquadSize.mock.calls.length - 1];
    expect(lastConfigCall).toEqual([expectedIds.length, SUBSTITUTION_TYPES.INDIVIDUAL, FORMATS.FORMAT_5V5]);

    rerender(<ConfigurationScreen {...{ ...props, selectedSquadIds: nextSelection }} />);

    const allSelectedButton = screen.getByRole('button', { name: /all selected/i });
    expect(allSelectedButton).toBeDisabled();
  });

  it.skip('shows a warning when selection exceeds the current format maximum', () => {
    const players = Array.from({ length: 12 }).map((_, index) => ({
      id: `player-${index + 1}`,
      name: `Player ${index + 1}`,
      jersey_number: index + 1
    }));

    mockUseTeam.mockImplementation(() => ({
      currentTeam: { id: 'team-1' },
      teamPlayers: players,
      hasTeams: true,
      hasClubs: true,
      loading: false
    }));

    const props = buildProps({
      allPlayers: players,
      selectedSquadIds: players.map(player => player.id),
      selectedSquadPlayers: players
    });

    render(<ConfigurationScreen {...props} />);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(players.length);
    checkboxes.forEach(checkbox => {
      expect(checkbox).toBeEnabled();
    });

    expect(screen.getByText(/exceeds the 5v5 limit of 11/i)).toBeInTheDocument();
  });
});

describe('ConfigurationScreen opponent suggestions', () => {
  it('surfaces previous opponents as suggestions while typing', async () => {
    const props = buildProps({ setOpponentTeam: jest.fn() });

    render(<ConfigurationScreen {...props} />);

    const opponentInput = screen.getByLabelText(/opponent team name/i);
    fireEvent.focus(opponentInput);
    fireEvent.change(opponentInput, { target: { value: 'A' } });

    await waitFor(() => {
      expect(screen.getByText('Alpha FC')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Alpha FC'));

    expect(props.setOpponentTeam).toHaveBeenCalledWith('Alpha FC');
  });

  it('allows navigating suggestions with keyboard arrows and selecting with Enter', async () => {
    const props = buildProps({ setOpponentTeam: jest.fn() });

    render(<ConfigurationScreen {...props} />);

    const opponentInput = screen.getByLabelText(/opponent team name/i);
    fireEvent.focus(opponentInput);
    fireEvent.change(opponentInput, { target: { value: 'B' } });

    await waitFor(() => {
      expect(screen.getByText('Beta United')).toBeInTheDocument();
    });

    fireEvent.keyDown(opponentInput, { key: 'ArrowDown', code: 'ArrowDown' });
    fireEvent.keyDown(opponentInput, { key: 'Enter', code: 'Enter' });

    expect(props.setOpponentTeam).toHaveBeenCalledWith('Beta United');
  });
});

describe('paired role strategy selector', () => {
  it('renders selector for eligible individual configurations', () => {
    const selectedIds = Array.from({ length: 9 }).map((_, index) => `player-${index + 1}`);
    const props = buildProps({
      selectedSquadIds: selectedIds,
      teamConfig: {
        format: FORMATS.FORMAT_5V5,
        squadSize: 9,
        formation: FORMATIONS.FORMATION_2_2,
        substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL,
        pairedRoleStrategy: PAIRED_ROLE_STRATEGY_TYPES.KEEP_THROUGHOUT_PERIOD
      }
    });

    render(<ConfigurationScreen {...props} />);

    expect(screen.getByText(/Role Rotation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Keep roles throughout period/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Swap roles every rotation/i)).toBeInTheDocument();
  });

  it('renders role strategy selector for eligible 7-player squads', () => {
    const selectedIds = Array.from({ length: 7 }).map((_, index) => `player-${index + 1}`);
    const props = buildProps({
      selectedSquadIds: selectedIds,
      teamConfig: {
        format: FORMATS.FORMAT_5V5,
        squadSize: 7,
        formation: FORMATIONS.FORMATION_2_2,
        substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL,
        pairedRoleStrategy: PAIRED_ROLE_STRATEGY_TYPES.KEEP_THROUGHOUT_PERIOD
      }
    });

    render(<ConfigurationScreen {...props} />);

    expect(screen.getByText(/Role Rotation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Keep roles throughout period/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Swap roles every rotation/i)).toBeInTheDocument();
    expect(screen.getByText(/Available for 5v5 2-2 lineups with 7 or 9 players/i)).toBeInTheDocument();
  });

  it('hides role strategy selector for ineligible configurations', () => {
    const selectedIds = Array.from({ length: 6 }).map((_, index) => `player-${index + 1}`);
    const props = buildProps({
      selectedSquadIds: selectedIds,
      teamConfig: {
        format: FORMATS.FORMAT_5V5,
        squadSize: 6,
        formation: FORMATIONS.FORMATION_2_2,
        substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL
      }
    });

    render(<ConfigurationScreen {...props} />);

    expect(screen.queryByText(/Role Rotation/i)).not.toBeInTheDocument();
  });
});

describe('ConfigurationScreen venue selection', () => {
  beforeEach(() => {
    checkForPendingMatches.mockClear();
  });

  it('renders all venue options with home selected by default', () => {
    const props = buildProps();
    render(<ConfigurationScreen {...props} />);

    const venueSelect = screen.getByTestId('venueType');
    const optionValues = Array.from(venueSelect.options).map(option => option.value);

    expect(optionValues).toEqual([VENUE_TYPES.HOME, VENUE_TYPES.AWAY, VENUE_TYPES.NEUTRAL]);
    expect(venueSelect.value).toBe(VENUE_TYPES.HOME);
    expect(screen.queryByTestId('venue-description')).toBeNull();
  });

  it('falls back to home selection when venueType prop is undefined', () => {
    const props = buildProps({ venueType: undefined });
    render(<ConfigurationScreen {...props} />);

    expect(screen.getByTestId('venueType').value).toBe(VENUE_TYPES.HOME);
  });

  it('invokes callbacks and updates selection when choosing a new venue', () => {
    const props = buildProps();
    const { rerender } = render(<ConfigurationScreen {...props} />);

    const venueSelect = screen.getByTestId('venueType');
    const initialCalls = props.setHasActiveConfiguration.mock.calls.length;

    fireEvent.change(venueSelect, { target: { value: VENUE_TYPES.AWAY } });

    expect(props.setVenueType).toHaveBeenCalledWith(VENUE_TYPES.AWAY);
    expect(props.setHasActiveConfiguration.mock.calls.length).toBeGreaterThan(initialCalls);
    const lastCallArgs = props.setHasActiveConfiguration.mock.calls[props.setHasActiveConfiguration.mock.calls.length - 1];
    expect(lastCallArgs[0]).toBe(true);

    rerender(<ConfigurationScreen {...{ ...props, venueType: VENUE_TYPES.AWAY }} />);
    expect(screen.getByTestId('venueType').value).toBe(VENUE_TYPES.AWAY);
    expect(screen.queryByTestId('venue-description')).toBeNull();
  });

  it('checks for pending matches when configurationSessionId changes', async () => {
    const props = buildProps();
    const { rerender } = render(<ConfigurationScreen {...props} />);

    expect(checkForPendingMatches).not.toHaveBeenCalled();

    rerender(<ConfigurationScreen {...{ ...props, configurationSessionId: 1 }} />);

    await waitFor(() => {
      expect(checkForPendingMatches).toHaveBeenCalledWith('team-1');
    });
  });
});
