import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfigurationScreen } from '../ConfigurationScreen';
import { VENUE_TYPES } from '../../../constants/matchVenues';
import { FORMATS, FORMATIONS } from '../../../constants/teamConfiguration';
import { STORAGE_KEYS } from '../../../constants/storageKeys';
import { checkForPendingMatches } from '../../../services/pendingMatchService';
import { getPlayerStats } from '../../../services/matchStateManager';
import { DETECTION_TYPES } from '../../../services/sessionDetectionService';

const mockUseAuth = jest.fn(() => ({
  isAuthenticated: true,
  user: { id: 'user-1' },
  sessionDetectionResult: { type: DETECTION_TYPES.NEW_SIGN_IN }
}));

const mockUseTeam = jest.fn(() => ({
  currentTeam: { id: 'team-1' },
  teamPlayers: [],
  hasTeams: true,
  hasClubs: true,
  loading: false,
  loadTeamPreferences: jest.fn(() => Promise.resolve({}))
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
  Share2: (props) => <svg data-testid="icon-share" {...props} />,
  Home: (props) => <svg data-testid="icon-home" {...props} />,
  Plane: (props) => <svg data-testid="icon-plane" {...props} />,
  Globe2: (props) => <svg data-testid="icon-globe" {...props} />,
  MapPin: (props) => <svg data-testid="icon-pin" {...props} />,
  Search: (props) => <svg data-testid="icon-search" {...props} />,
  History: (props) => <svg data-testid="icon-history" {...props} />
}));

jest.mock('../../shared/UI', () => {
  const mockReact = require('react');

  return {
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
    NotificationModal: ({ isOpen, title, message, onClose }) => (
      isOpen ? (
        <div data-testid="notification-modal">
          <div>{title}</div>
          <div>{message}</div>
          <button onClick={onClose}>Close</button>
        </div>
      ) : null
    ),
    Input: mockReact.forwardRef(({ value = '', onChange, ...props }, ref) => (
      <input data-testid="mock-input" value={value} onChange={onChange} ref={ref} {...props} />
    ))
  };
});

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


jest.mock('../../../services/pendingMatchService', () => ({
  checkForPendingMatches: jest.fn(() => Promise.resolve({ shouldShow: false, pendingMatches: [] })),
  createResumeDataForConfiguration: jest.fn(() => ({}))
}));

const mockSuggestUpcomingOpponent = jest.fn(() => Promise.resolve({ opponent: null }));

jest.mock('../../../services/opponentPrefillService', () => ({
  suggestUpcomingOpponent: (...args) => mockSuggestUpcomingOpponent(...args)
}));

jest.mock('../../../services/matchStateManager', () => ({
  discardPendingMatch: jest.fn(() => Promise.resolve()),
  getPlayerStats: jest.fn(() => Promise.resolve({ success: true, players: [] }))
}));

jest.mock('../../match/PendingMatchResumeModal', () => ({
  PendingMatchResumeModal: () => null
}));

beforeEach(() => {
  mockUseAuth.mockReset();
  mockUseAuth.mockImplementation(() => ({
    isAuthenticated: true,
    user: { id: 'user-1' },
    sessionDetectionResult: { type: DETECTION_TYPES.NEW_SIGN_IN }
  }));

  mockUseTeam.mockReset();
  mockUseTeam.mockImplementation(() => ({
    currentTeam: { id: 'team-1' },
    teamPlayers: [],
    hasTeams: true,
    hasClubs: true,
    loading: false,
    loadTeamPreferences: jest.fn(() => Promise.resolve({}))
  }));

  checkForPendingMatches.mockResolvedValue({ shouldShow: false, pendingMatches: [] });
  getPlayerStats.mockResolvedValue({ success: true, players: [] });

  mockUseOpponentNameSuggestions.mockReset();
  mockUseOpponentNameSuggestions.mockReturnValue({
    names: ['Alpha FC', 'Beta United', 'Gamma City'],
    loading: false,
    error: null,
    refresh: jest.fn()
  });

  mockSuggestUpcomingOpponent.mockReset();
  mockSuggestUpcomingOpponent.mockResolvedValue({ opponent: null });

  localStorage.clear();
});

describe('ConfigurationScreen team preferences', () => {
  it('applies saved preferences on new configuration session', async () => {
    const loadTeamPreferences = jest.fn(() => Promise.resolve({
      matchFormat: FORMATS.FORMAT_7V7,
      formation: FORMATIONS.FORMATION_2_3_1,
      numPeriods: 2,
      periodLength: 20
    }));

    mockUseTeam.mockImplementation(() => ({
      currentTeam: { id: 'team-1' },
      teamPlayers: [],
      hasTeams: true,
      hasClubs: true,
      loading: false,
      loadTeamPreferences
    }));

    const props = buildProps({
      configurationSessionId: 1,
      teamConfig: {
        format: FORMATS.FORMAT_5V5,
        squadSize: 7,
        formation: FORMATIONS.FORMATION_2_2
      }
    });

    render(<ConfigurationScreen {...props} />);

    await waitFor(() => {
      expect(loadTeamPreferences).toHaveBeenCalledWith('team-1', { forceRefresh: true });
    });

    expect(props.updateTeamConfig).toHaveBeenCalledWith({
      format: FORMATS.FORMAT_7V7,
      formation: FORMATIONS.FORMATION_2_3_1,
      squadSize: 7
    });
    expect(props.setSelectedFormation).toHaveBeenCalledWith(FORMATIONS.FORMATION_2_3_1);
    expect(props.setNumPeriods).toHaveBeenCalledWith(2);
    expect(props.setPeriodDurationMinutes).toHaveBeenCalledWith(20);
  });

  it('skips applying preferences when configuration is already active', async () => {
    const loadTeamPreferences = jest.fn(() => Promise.resolve({
      matchFormat: FORMATS.FORMAT_7V7,
      formation: FORMATIONS.FORMATION_2_3_1,
      numPeriods: 2,
      periodLength: 20
    }));

    mockUseTeam.mockImplementation(() => ({
      currentTeam: { id: 'team-1' },
      teamPlayers: [],
      hasTeams: true,
      hasClubs: true,
      loading: false,
      loadTeamPreferences
    }));

    const props = buildProps({
      configurationSessionId: 2,
      hasActiveConfiguration: true
    });

    render(<ConfigurationScreen {...props} />);

    await waitFor(() => {
      expect(loadTeamPreferences).toHaveBeenCalled();
    });

    expect(props.updateTeamConfig).not.toHaveBeenCalled();
    expect(props.setSelectedFormation).not.toHaveBeenCalled();
    expect(props.setNumPeriods).not.toHaveBeenCalledWith(2);
    expect(props.setPeriodDurationMinutes).not.toHaveBeenCalledWith(20);
  });

  it('still captures permanent captain while skipping config overrides when active configuration exists', async () => {
    const preferredCaptainId = '00000000-0000-4000-8000-000000000099';
    const loadTeamPreferences = jest.fn(() => Promise.resolve({
      teamCaptain: preferredCaptainId,
      matchFormat: FORMATS.FORMAT_7V7
    }));

    mockUseTeam.mockImplementation(() => ({
      currentTeam: { id: 'team-1' },
      teamPlayers: [],
      hasTeams: true,
      hasClubs: true,
      loading: false,
      loadTeamPreferences
    }));

    const players = Array.from({ length: 8 }, (_, index) => ({
      id: index === 7 ? preferredCaptainId : `player-${index}`,
      displayName: `Player ${index + 1}`
    }));

    const setCaptain = jest.fn();

    const props = buildProps({
      configurationSessionId: 12,
      hasActiveConfiguration: true,
      selectedSquadIds: players.slice(0, 7).map(player => player.id), // preferred captain not yet selected
      selectedSquadPlayers: players.slice(0, 7),
      setCaptain
    });

    const { rerender } = render(<ConfigurationScreen {...props} />);

    await waitFor(() => {
      expect(loadTeamPreferences).toHaveBeenCalled();
    });

    expect(setCaptain).not.toHaveBeenCalled();

    // Add preferred captain after minimum size reached
    rerender(<ConfigurationScreen {...{ ...props, selectedSquadIds: players.map(p => p.id), selectedSquadPlayers: players }} />);

    await waitFor(() => {
      expect(setCaptain).toHaveBeenCalledWith(preferredCaptainId);
    });
  });

  it('does not reapply preferences on page refresh to preserve user changes', async () => {
    const loadTeamPreferences = jest.fn(() => Promise.resolve({
      matchFormat: FORMATS.FORMAT_7V7,
      formation: FORMATIONS.FORMATION_2_3_1,
      numPeriods: 2,
      periodLength: 20
    }));

    mockUseAuth.mockImplementation(() => ({
      isAuthenticated: true,
      user: { id: 'user-1' },
      sessionDetectionResult: { type: DETECTION_TYPES.PAGE_REFRESH }
    }));

    mockUseTeam.mockImplementation(() => ({
      currentTeam: { id: 'team-1' },
      teamPlayers: [],
      hasTeams: true,
      hasClubs: true,
      loading: false,
      loadTeamPreferences
    }));

    const props = buildProps({
      configurationSessionId: 3,
      updateTeamConfig: jest.fn(),
      setSelectedFormation: jest.fn(),
      setNumPeriods: jest.fn(),
      setPeriodDurationMinutes: jest.fn()
    });

    render(<ConfigurationScreen {...props} />);

    await waitFor(() => {
      expect(loadTeamPreferences).not.toHaveBeenCalled();
    });

    expect(props.updateTeamConfig).not.toHaveBeenCalled();
    expect(props.setSelectedFormation).not.toHaveBeenCalled();
    expect(props.setNumPeriods).not.toHaveBeenCalled();
    expect(props.setPeriodDurationMinutes).not.toHaveBeenCalled();
  });

  it('falls back to default formation when preference formation is unavailable', async () => {
    const loadTeamPreferences = jest.fn(() => Promise.resolve({
      matchFormat: FORMATS.FORMAT_5V5,
      formation: '1-3',
      numPeriods: 3,
      periodLength: 15
    }));

    mockUseTeam.mockImplementation(() => ({
      currentTeam: { id: 'team-1' },
      teamPlayers: [],
      hasTeams: true,
      hasClubs: true,
      loading: false,
      loadTeamPreferences
    }));

    const props = buildProps({
      configurationSessionId: 3,
      teamConfig: {
        format: FORMATS.FORMAT_5V5,
        squadSize: 7,
        formation: FORMATIONS.FORMATION_2_2
      }
    });

    render(<ConfigurationScreen {...props} />);

    await waitFor(() => {
      expect(loadTeamPreferences).toHaveBeenCalled();
    });

    expect(props.setSelectedFormation).toHaveBeenCalledWith(FORMATIONS.FORMATION_2_2);
    expect(props.updateTeamConfig).toHaveBeenCalledWith({
      format: FORMATS.FORMAT_5V5,
      formation: FORMATIONS.FORMATION_2_2,
      squadSize: 7
    });
  });

  it('hides captain assignment when team preferences disable captains', async () => {
    const loadTeamPreferences = jest.fn(() => Promise.resolve({
      teamCaptain: 'none'
    }));

    mockUseTeam.mockImplementation(() => ({
      currentTeam: { id: 'team-1' },
      teamPlayers: [],
      hasTeams: true,
      hasClubs: true,
      loading: false,
      loadTeamPreferences
    }));

    const players = Array.from({ length: 5 }, (_, index) => ({
      id: `player-${index + 1}`,
      displayName: `Player ${index + 1}`
    }));

    const props = buildProps({
      selectedSquadIds: players.map(player => player.id),
      selectedSquadPlayers: players
    });

    render(<ConfigurationScreen {...props} />);

    await waitFor(() => {
      expect(loadTeamPreferences).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByText('Assign Captain')).not.toBeInTheDocument();
    });
  });

  it('sorts captain options by recent captain count ascending', async () => {
    const loadTeamPreferences = jest.fn(() => Promise.resolve({}));
    const roster = [
      { id: 'player-1', display_name: 'Echo', first_name: 'Echo', last_name: '', jersey_number: null },
      { id: 'player-2', display_name: 'Alpha', first_name: 'Alpha', last_name: '', jersey_number: null },
      { id: 'player-3', display_name: 'Charlie', first_name: 'Charlie', last_name: '', jersey_number: null },
      { id: 'player-4', display_name: 'Bravo', first_name: 'Bravo', last_name: '', jersey_number: null },
      { id: 'player-5', display_name: 'Delta', first_name: 'Delta', last_name: '', jersey_number: null }
    ];

    const syncPlayersFromTeamRoster = jest.fn(() => ({ success: true, message: 'No sync needed' }));

    const currentTeam = { id: 'team-1' };
    const teamContextValue = {
      currentTeam,
      teamPlayers: roster,
      hasTeams: true,
      hasClubs: true,
      loading: false,
      loadTeamPreferences
    };

    mockUseTeam.mockImplementation(() => teamContextValue);

    getPlayerStats.mockResolvedValue({
      success: true,
      players: [
        { playerId: 'player-3', matchesAsCaptain: 3 },
        { playerId: 'player-2', matchesAsCaptain: 1 },
        { playerId: 'player-5', matchesAsCaptain: 1 },
        { playerId: 'player-4', matchesAsCaptain: 2 },
        { playerId: 'player-1', matchesAsCaptain: 5 }
      ]
    });

    const props = buildProps({
      selectedSquadIds: roster.map(player => player.id),
      selectedSquadPlayers: roster.map(player => ({
        id: player.id,
        displayName: player.display_name
      })),
      syncPlayersFromTeamRoster
    });

    render(<ConfigurationScreen {...props} />);

    await waitFor(() => {
      expect(screen.getByText('Echo (5)')).toBeInTheDocument();
    });

    const optionTexts = Array.from(screen.getByTestId('captain').querySelectorAll('option'))
      .map(option => option.textContent);

    expect(optionTexts).toEqual([
      'No Captain',
      'Alpha (1)',
      'Delta (1)',
      'Bravo (2)',
      'Charlie (3)',
      'Echo (5)'
    ]);
  });

  it('pre-populates captain from UUID preference when none is selected', async () => {
    const preferredCaptainId = '00000000-0000-4000-8000-000000000001';
    const loadTeamPreferences = jest.fn(() => Promise.resolve({
      teamCaptain: preferredCaptainId
    }));

    mockUseTeam.mockImplementation(() => ({
      currentTeam: { id: 'team-1' },
      teamPlayers: [],
      hasTeams: true,
      hasClubs: true,
      loading: false,
      loadTeamPreferences
    }));

    const players = Array.from({ length: 5 }, (_, index) => ({
      id: index === 0 ? preferredCaptainId : `player-${index}`,
      displayName: `Player ${index + 1}`
    }));

    const setCaptain = jest.fn();

    const props = buildProps({
      selectedSquadIds: players.map(player => player.id),
      selectedSquadPlayers: players,
      setCaptain
    });

    render(<ConfigurationScreen {...props} />);

    await waitFor(() => {
      expect(loadTeamPreferences).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(setCaptain).toHaveBeenCalledWith(preferredCaptainId);
    });
  });

  it('auto-assigns permanent captain when added later without extra preference fetches', async () => {
    const preferredCaptainId = '00000000-0000-4000-8000-000000000003';
    const loadTeamPreferences = jest.fn(() => Promise.resolve({
      teamCaptain: preferredCaptainId
    }));

    mockUseTeam.mockImplementation(() => ({
      currentTeam: { id: 'team-1' },
      teamPlayers: [],
      hasTeams: true,
      hasClubs: true,
      loading: false,
      loadTeamPreferences
    }));

    const players = Array.from({ length: 5 }, (_, index) => ({
      id: index === 0 ? preferredCaptainId : `player-${index}`,
      displayName: `Player ${index + 1}`
    }));

    const setCaptain = jest.fn();

    const props = buildProps({
      selectedSquadIds: players.slice(0, 3).map(player => player.id), // preferred captain not selected yet
      selectedSquadPlayers: players.slice(0, 3),
      setCaptain,
      configurationSessionId: 10
    });

    const { rerender } = render(<ConfigurationScreen {...props} />);

    await waitFor(() => {
      expect(loadTeamPreferences).toHaveBeenCalled();
    });

    expect(setCaptain).not.toHaveBeenCalledWith(preferredCaptainId);
    expect(loadTeamPreferences).toHaveBeenCalledTimes(1);

    // Rerender with squad including preferred captain (regardless of selection order)
    rerender(<ConfigurationScreen {...{ ...props, selectedSquadIds: players.map(player => player.id), selectedSquadPlayers: players }} />);

    await waitFor(() => {
      expect(setCaptain).toHaveBeenCalledWith(preferredCaptainId);
    });

    expect(loadTeamPreferences).toHaveBeenCalledTimes(1);
  });

  it('does not auto-assign captain until the minimum squad size is met', async () => {
    const preferredCaptainId = '00000000-0000-4000-8000-000000000055';
    const loadTeamPreferences = jest.fn(() => Promise.resolve({
      teamCaptain: preferredCaptainId
    }));

    mockUseTeam.mockImplementation(() => ({
      currentTeam: { id: 'team-1' },
      teamPlayers: [],
      hasTeams: true,
      hasClubs: true,
      loading: false,
      loadTeamPreferences
    }));

    const players = Array.from({ length: 5 }, (_, index) => ({
      id: index === 0 ? preferredCaptainId : `player-${index}`,
      displayName: `Player ${index + 1}`
    }));

    const setCaptain = jest.fn();

    const props = buildProps({
      selectedSquadIds: players.slice(0, 3).map(player => player.id), // includes captain but under minimum
      selectedSquadPlayers: players.slice(0, 3),
      setCaptain,
      configurationSessionId: 11
    });

    const { rerender } = render(<ConfigurationScreen {...props} />);

    await waitFor(() => {
      expect(loadTeamPreferences).toHaveBeenCalled();
    });

    expect(setCaptain).not.toHaveBeenCalledWith(preferredCaptainId);

    rerender(<ConfigurationScreen {...{ ...props, selectedSquadIds: players.map(player => player.id), selectedSquadPlayers: players }} />);

    await waitFor(() => {
      expect(setCaptain).toHaveBeenCalledWith(preferredCaptainId);
    });
  });

  it('does not override an existing captain selection with preference value', async () => {
    const preferredCaptainId = '00000000-0000-4000-8000-000000000002';
    const loadTeamPreferences = jest.fn(() => Promise.resolve({
      teamCaptain: preferredCaptainId
    }));

    mockUseTeam.mockImplementation(() => ({
      currentTeam: { id: 'team-1' },
      teamPlayers: [],
      hasTeams: true,
      hasClubs: true,
      loading: false,
      loadTeamPreferences
    }));

    const players = Array.from({ length: 5 }, (_, index) => ({
      id: index === 0 ? preferredCaptainId : `player-${index}`,
      displayName: `Player ${index + 1}`
    }));

    const setCaptain = jest.fn();

    mockUseAuth.mockImplementation(() => ({
      isAuthenticated: true,
      user: { id: 'user-1' },
      sessionDetectionResult: { type: DETECTION_TYPES.PAGE_REFRESH }
    }));

    const props = buildProps({
      selectedSquadIds: players.map(player => player.id),
      selectedSquadPlayers: players,
      setCaptain,
      captainId: 'existing-captain'
    });

    render(<ConfigurationScreen {...props} />);

    // On page refresh we skip preference reapplication, so no calls and no overrides
    expect(loadTeamPreferences).not.toHaveBeenCalled();
    expect(setCaptain).not.toHaveBeenCalled();
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
    formation: FORMATIONS.FORMATION_2_2
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
    expect(lastConfigCall).toEqual([expectedIds.length, FORMATS.FORMAT_5V5]);

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

  it('does not restore a cleared opponent when refocusing the input', async () => {
    const props = buildProps({ setOpponentTeam: jest.fn(), opponentTeam: '' });

    const { rerender } = render(<ConfigurationScreen {...props} />);

    const opponentInput = screen.getByLabelText(/opponent team name/i);
    fireEvent.focus(opponentInput);
    fireEvent.change(opponentInput, { target: { value: 'A' } });

    await waitFor(() => {
      expect(screen.getByText('Alpha FC')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Alpha FC'));
    expect(props.setOpponentTeam).toHaveBeenCalledWith('Alpha FC');

    rerender(<ConfigurationScreen {...{ ...props, opponentTeam: 'Alpha FC' }} />);

    const updatedInput = screen.getByLabelText(/opponent team name/i);
    fireEvent.change(updatedInput, { target: { value: '' } });
    expect(props.setOpponentTeam).toHaveBeenCalledWith('');

    rerender(<ConfigurationScreen {...{ ...props, opponentTeam: '' }} />);

    fireEvent.blur(updatedInput);
    fireEvent.focus(updatedInput);

    expect(updatedInput.value).toBe('');
  });

  it('prefills opponent when connector suggestion is available', async () => {
    mockSuggestUpcomingOpponent.mockResolvedValue({ opponent: 'Auto FC', reason: 'matched' });
    const props = buildProps({ setOpponentTeam: jest.fn(), opponentTeam: '' });

    render(<ConfigurationScreen {...props} />);

    const initialHasActive = props.setHasActiveConfiguration.mock.calls.length;

    await waitFor(() => {
      expect(props.setOpponentTeam).toHaveBeenCalledWith('Auto FC');
    });

    expect(mockSuggestUpcomingOpponent).toHaveBeenCalledWith('team-1');
    expect(props.setHasActiveConfiguration.mock.calls.length).toBe(initialHasActive);
  });

  it('does not prefill opponent when a value already exists', async () => {
    mockSuggestUpcomingOpponent.mockResolvedValue({ opponent: 'Auto FC', reason: 'matched' });
    const props = buildProps({ setOpponentTeam: jest.fn(), opponentTeam: 'Existing Club' });

    render(<ConfigurationScreen {...props} />);

    await waitFor(() => {
      expect(mockSuggestUpcomingOpponent).not.toHaveBeenCalled();
    });

    expect(props.setOpponentTeam).not.toHaveBeenCalledWith('Auto FC');
  });

  it('prefill attempt resets when configurationSessionId changes', async () => {
    mockSuggestUpcomingOpponent
      .mockResolvedValueOnce({ opponent: 'Auto FC', reason: 'matched' })
      .mockResolvedValue({ opponent: 'Next FC', reason: 'matched' });

    const props = buildProps({ setOpponentTeam: jest.fn(), opponentTeam: '', configurationSessionId: 1 });

    const { rerender } = render(<ConfigurationScreen {...props} />);

    await waitFor(() => {
      expect(props.setOpponentTeam).toHaveBeenCalledWith('Auto FC');
    });

    rerender(<ConfigurationScreen {...{ ...props, opponentTeam: 'Auto FC' }} />);
    props.setOpponentTeam.mockClear();

    rerender(<ConfigurationScreen {...{ ...props, configurationSessionId: 2, opponentTeam: '' }} />);

    await waitFor(() => {
      expect(props.setOpponentTeam).toHaveBeenCalledWith('Next FC');
    });

    expect(mockSuggestUpcomingOpponent).toHaveBeenCalledTimes(2);
  });

  it('does not re-prefill when opponent cleared within same session', async () => {
    mockSuggestUpcomingOpponent.mockResolvedValue({ opponent: 'Auto FC', reason: 'matched' });
    const props = buildProps({ setOpponentTeam: jest.fn(), opponentTeam: '' });

    const { rerender } = render(<ConfigurationScreen {...props} />);

    await waitFor(() => {
      expect(props.setOpponentTeam).toHaveBeenCalledWith('Auto FC');
    });

    expect(mockSuggestUpcomingOpponent).toHaveBeenCalledTimes(1);

    // Simulate clearing the input while remaining in same session
    rerender(<ConfigurationScreen {...{ ...props, opponentTeam: '' }} />);

    await waitFor(() => {
      expect(mockSuggestUpcomingOpponent).toHaveBeenCalledTimes(1);
    });
  });

  it('does not auto-prefill when field starts with existing value and is cleared once', async () => {
    mockSuggestUpcomingOpponent.mockResolvedValue({ opponent: 'Auto FC', reason: 'matched' });
    const props = buildProps({ setOpponentTeam: jest.fn(), opponentTeam: 'Saved Opponent', configurationSessionId: 3 });

    const { rerender } = render(<ConfigurationScreen {...props} />);

    await waitFor(() => {
      expect(mockSuggestUpcomingOpponent).not.toHaveBeenCalled();
    });

    rerender(<ConfigurationScreen {...{ ...props, opponentTeam: '' }} />);

    await waitFor(() => {
      expect(mockSuggestUpcomingOpponent).not.toHaveBeenCalled();
    });

    rerender(<ConfigurationScreen {...{ ...props, configurationSessionId: 4, opponentTeam: '' }} />);

    await waitFor(() => {
      expect(mockSuggestUpcomingOpponent).toHaveBeenCalledWith('team-1');
      expect(mockSuggestUpcomingOpponent).toHaveBeenCalledTimes(1);
    });
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

describe('ConfigurationScreen formation visibility', () => {
  beforeEach(() => {
    mockUseAuth.mockImplementation(() => ({
      isAuthenticated: false,
      user: null,
      sessionDetectionResult: null
    }));

    mockUseTeam.mockImplementation(() => ({
      currentTeam: { id: 'team-1' },
      teamPlayers: [],
      hasTeams: true,
      hasClubs: true,
      loading: false,
      loadTeamPreferences: jest.fn(() => Promise.resolve({}))
    }));
  });

  it('shows formation controls with fewer than 5 players selected', () => {
    const props = buildProps({
      selectedSquadIds: ['player-1', 'player-2', 'player-3']
    });

    render(<ConfigurationScreen {...props} />);

    expect(screen.getByTestId('formation')).toBeInTheDocument();
    expect(screen.getByTestId('formation-preview')).toBeInTheDocument();
    expect(screen.queryByText(/Add between/i)).not.toBeInTheDocument();
  });

  it('shows formation controls with more than max players selected', () => {
    const allPlayers = Array.from({ length: 12 }).map((_, i) => ({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`
    }));

    const props = buildProps({
      allPlayers,
      selectedSquadIds: allPlayers.map(p => p.id),
      teamConfig: {
        format: FORMATS.FORMAT_5V5,
        squadSize: 12,
        formation: FORMATIONS.FORMATION_2_2
      }
    });

    render(<ConfigurationScreen {...props} />);

    expect(screen.getByTestId('formation')).toBeInTheDocument();
    expect(screen.getByTestId('formation-preview')).toBeInTheDocument();
    const validationMessages = screen.getAllByText(/You have selected 12 players, which exceeds the/i);
    expect(validationMessages.length).toBeGreaterThan(0);
  });

  it('hides validation message with valid player count', () => {
    const allPlayers = Array.from({ length: 6 }).map((_, i) => ({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`
    }));

    const props = buildProps({
      allPlayers,
      selectedSquadIds: allPlayers.map(p => p.id),
      teamConfig: {
        format: FORMATS.FORMAT_5V5,
        squadSize: 6,
        formation: FORMATIONS.FORMATION_2_2
      }
    });

    render(<ConfigurationScreen {...props} />);

    expect(screen.getByTestId('formation')).toBeInTheDocument();
    expect(screen.getByTestId('formation-preview')).toBeInTheDocument();
    expect(screen.queryByText(/Add between/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/exceeds the/i)).not.toBeInTheDocument();
  });

  it('allows formation selection with invalid player count', () => {
    const props = buildProps({
      selectedSquadIds: ['player-1', 'player-2', 'player-3']
    });

    render(<ConfigurationScreen {...props} />);

    const formationSelect = screen.getByTestId('formation');
    expect(formationSelect).toBeInTheDocument();
    expect(formationSelect).not.toBeDisabled();

    fireEvent.change(formationSelect, { target: { value: FORMATIONS.FORMATION_1_2_1 } });

    expect(props.updateFormationSelection).toHaveBeenCalledWith(FORMATIONS.FORMATION_1_2_1);
  });

  it('keeps Save Configuration button disabled with invalid player count', () => {
    mockUseAuth.mockImplementation(() => ({
      isAuthenticated: true,
      user: { id: 'user-1' },
      sessionDetectionResult: null
    }));

    mockUseTeam.mockImplementation(() => ({
      currentTeam: { id: 'team-1' },
      teamPlayers: [],
      hasTeams: true,
      hasClubs: true,
      loading: false,
      loadTeamPreferences: jest.fn(() => Promise.resolve({}))
    }));

    const props = buildProps({
      selectedSquadIds: ['player-1', 'player-2', 'player-3']
    });

    render(<ConfigurationScreen {...props} />);

    const buttons = screen.getAllByTestId('mock-button');
    const saveButton = buttons.find(btn => btn.textContent.includes('Save Configuration'));

    expect(saveButton).toBeDefined();
    expect(saveButton).toBeDisabled();
  });

  it('keeps Proceed to Period Setup button disabled with invalid player count', () => {
    const props = buildProps({
      selectedSquadIds: ['player-1', 'player-2', 'player-3']
    });

    render(<ConfigurationScreen {...props} />);

    const buttons = screen.getAllByTestId('mock-button');
    const proceedButton = buttons.find(btn => btn.textContent.includes('Proceed to Period Setup'));

    expect(proceedButton).toBeDefined();
    expect(proceedButton).toBeDisabled();
  });
});
