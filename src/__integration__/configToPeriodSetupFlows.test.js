/**
 * Integration Tests: ConfigurationScreen → PeriodSetupScreen Flow
 *
 * Tests that the ConfigurationScreen correctly validates squad selection,
 * goalie assignments and match settings before allowing the user to proceed
 * to PeriodSetupScreen via handleStartPeriodSetup.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createTestI18n } from '../test-utils/i18nTestSetup';
import { ConfigurationScreen } from '../components/setup/ConfigurationScreen';
import { FORMATS, FORMATIONS } from '../constants/teamConfiguration';
import { VENUE_TYPES } from '../constants/matchVenues';
import { DETECTION_TYPES } from '../services/sessionDetectionService';
import { createConfigurationProps, testI18n } from './matchLifecycleUtils';

// ===================================================================
// AUTH & TEAM CONTEXT MOCKS
// ===================================================================

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

// ===================================================================
// DEPENDENCY MOCKS
// ===================================================================

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

jest.mock('../components/shared/UI', () => {
  const mockReact = require('react');

  return {
    Select: ({ value, onChange, options, id, placeholder }) => (
      <select id={id} data-testid={id || 'select'} value={value || ''} onChange={(e) => onChange && onChange(e.target.value)}>
        {placeholder && <option value="">{placeholder}</option>}
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
    ThreeOptionModal: ({ isOpen, title, message, onPrimary, onSecondary, onTertiary, primaryText, secondaryText, tertiaryText }) => (
      isOpen ? (
        <div data-testid="three-option-modal">
          <div>{title}</div>
          <div>{message}</div>
          <button onClick={onPrimary}>{primaryText || 'Primary'}</button>
          <button onClick={onSecondary}>{secondaryText || 'Secondary'}</button>
          <button onClick={onTertiary}>{tertiaryText || 'Tertiary'}</button>
        </div>
      ) : null
    ),
    Input: mockReact.forwardRef(({ value = '', onChange, ...props }, ref) => (
      <input data-testid="mock-input" value={value} onChange={onChange} ref={ref} {...props} />
    ))
  };
});

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

jest.mock('../contexts/TeamContext', () => ({
  useTeam: () => mockUseTeam()
}));

jest.mock('../hooks/useFormationVotes', () => ({
  useFormationVotes: () => ({
    isLoading: false,
    votes: {},
    openVoteModal: jest.fn(),
    closeVoteModal: jest.fn()
  })
}));

jest.mock('../services/connectorService', () => ({
  getPlayerConnectionDetails: jest.fn(() => Promise.resolve({
    matchedConnections: new Map(),
    unmatchedExternalPlayers: [],
    hasConnectedProvider: false
  }))
}));

jest.mock('../hooks/useOpponentNameSuggestions', () => ({
  useOpponentNameSuggestions: () => ({
    names: [],
    loading: false,
    error: null,
    refresh: jest.fn()
  })
}));

jest.mock('../components/team/TeamManagement', () => ({
  TeamManagement: () => null
}));

jest.mock('../components/team/RosterConnectorOnboarding', () => ({
  RosterConnectorOnboarding: () => null
}));

jest.mock('../components/team/UnmappedPlayersBanner', () => ({
  UnmappedPlayersBanner: () => null
}));

jest.mock('../utils/DataSyncManager', () => ({
  __esModule: true,
  dataSyncManager: {
    setUserId: jest.fn(),
    getLocalMatches: jest.fn(() => []),
    migrateLocalDataToCloud: jest.fn(() => Promise.resolve({ migratedMatches: 0 }))
  }
}));

jest.mock('../components/auth/FeatureGate', () => ({
  FeatureGate: ({ children }) => <>{children}</>
}));

jest.mock('../components/setup/FormationPreview', () => ({
  FormationPreview: () => <div data-testid="formation-preview" />
}));

jest.mock('../components/shared/FeatureVoteModal', () => ({
  __esModule: true,
  default: () => null
}));

jest.mock('../services/pendingMatchService', () => ({
  checkForPendingMatches: jest.fn(() => Promise.resolve({ shouldShow: false, pendingMatches: [] })),
  createResumeDataForConfiguration: jest.fn(() => ({}))
}));

jest.mock('../services/opponentPrefillService', () => ({
  suggestUpcomingOpponent: jest.fn(() => Promise.resolve({ opponent: null }))
}));

jest.mock('../services/matchStateManager', () => ({
  discardPendingMatch: jest.fn(() => Promise.resolve()),
  getPlayerStats: jest.fn(() => Promise.resolve({ success: true, players: [] }))
}));

jest.mock('../services/playerService', () => ({
  getTemporaryPlayersForMatch: jest.fn(() => Promise.resolve({ success: true, players: [] }))
}));

jest.mock('../components/match/PendingMatchResumeModal', () => ({
  PendingMatchResumeModal: () => null
}));

// ===================================================================
// HELPERS
// ===================================================================

const createPlayers = (count) =>
  Array.from({ length: count }, (_, i) => ({
    id: `player-${i + 1}`,
    displayName: `Player ${i + 1}`
  }));

/**
 * Build goalie assignments for all periods.
 * Assigns the given goalieId to every period from 1..numPeriods.
 */
const buildGoalieIds = (numPeriods, goalieId) => {
  const ids = {};
  for (let p = 1; p <= numPeriods; p++) {
    ids[p] = goalieId;
  }
  return ids;
};

const renderConfigScreen = (props) =>
  render(
    <I18nextProvider i18n={testI18n}>
      <ConfigurationScreen {...props} />
    </I18nextProvider>
  );

const findProceedButton = () => {
  const buttons = screen.getAllByTestId('mock-button');
  return buttons.find(btn => btn.textContent.includes('Proceed to Period Setup'));
};

// ===================================================================
// SETUP / TEARDOWN
// ===================================================================

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

  localStorage.clear();
});

afterEach(() => {
  jest.clearAllMocks();
});

// ===================================================================
// TESTS
// ===================================================================

describe('ConfigurationScreen → PeriodSetup integration flows', () => {
  // -----------------------------------------------------------------
  // 1. 7-player 2-2: goalie assigned per period → proceed enabled → click calls handler
  // -----------------------------------------------------------------
  it('enables proceed and calls handleStartPeriodSetup for 7-player 2-2 with goalies assigned', async () => {
    const players = createPlayers(7);
    const numPeriods = 2;

    const props = createConfigurationProps({
      allPlayers: players,
      selectedSquadIds: players.map(p => p.id),
      selectedSquadPlayers: players,
      numPeriods,
      periodGoalieIds: buildGoalieIds(numPeriods, 'player-7'),
      teamConfig: { format: FORMATS.FORMAT_5V5, squadSize: 7, formation: FORMATIONS.FORMATION_2_2 },
      selectedFormation: FORMATIONS.FORMATION_2_2
    });

    renderConfigScreen(props);

    await waitFor(() => {
      const proceedBtn = findProceedButton();
      expect(proceedBtn).toBeDefined();
      expect(proceedBtn).not.toBeDisabled();
    });

    fireEvent.click(findProceedButton());
    expect(props.handleStartPeriodSetup).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------
  // 2. 6-player 2-2 (minimal, 1 sub): proceed works when goalie assigned
  // -----------------------------------------------------------------
  it('enables proceed for 6-player 2-2 (1 substitute) with goalie assigned', async () => {
    const players = createPlayers(6);
    const numPeriods = 2;

    const props = createConfigurationProps({
      allPlayers: players,
      selectedSquadIds: players.map(p => p.id),
      selectedSquadPlayers: players,
      numPeriods,
      periodGoalieIds: buildGoalieIds(numPeriods, 'player-6'),
      teamConfig: { format: FORMATS.FORMAT_5V5, squadSize: 6, formation: FORMATIONS.FORMATION_2_2 },
      selectedFormation: FORMATIONS.FORMATION_2_2
    });

    renderConfigScreen(props);

    await waitFor(() => {
      const proceedBtn = findProceedButton();
      expect(proceedBtn).toBeDefined();
      expect(proceedBtn).not.toBeDisabled();
    });

    fireEvent.click(findProceedButton());
    expect(props.handleStartPeriodSetup).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------
  // 3. 5-player exact minimum (0 subs): proceed works
  // -----------------------------------------------------------------
  it('enables proceed for 5-player exact minimum (0 substitutes)', async () => {
    const players = createPlayers(5);
    const numPeriods = 2;

    const props = createConfigurationProps({
      allPlayers: players,
      selectedSquadIds: players.map(p => p.id),
      selectedSquadPlayers: players,
      numPeriods,
      periodGoalieIds: buildGoalieIds(numPeriods, 'player-5'),
      teamConfig: { format: FORMATS.FORMAT_5V5, squadSize: 5, formation: FORMATIONS.FORMATION_2_2 },
      selectedFormation: FORMATIONS.FORMATION_2_2
    });

    renderConfigScreen(props);

    await waitFor(() => {
      const proceedBtn = findProceedButton();
      expect(proceedBtn).toBeDefined();
      expect(proceedBtn).not.toBeDisabled();
    });

    fireEvent.click(findProceedButton());
    expect(props.handleStartPeriodSetup).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------
  // 4. Proceed disabled when goalie not assigned for any period
  // -----------------------------------------------------------------
  it('disables proceed when goalie is not assigned for any period', async () => {
    const players = createPlayers(7);
    const numPeriods = 2;

    const props = createConfigurationProps({
      allPlayers: players,
      selectedSquadIds: players.map(p => p.id),
      selectedSquadPlayers: players,
      numPeriods,
      periodGoalieIds: {},  // No goalies assigned
      teamConfig: { format: FORMATS.FORMAT_5V5, squadSize: 7, formation: FORMATIONS.FORMATION_2_2 },
      selectedFormation: FORMATIONS.FORMATION_2_2
    });

    renderConfigScreen(props);

    await waitFor(() => {
      const proceedBtn = findProceedButton();
      expect(proceedBtn).toBeDefined();
      expect(proceedBtn).toBeDisabled();
    });
  });

  // -----------------------------------------------------------------
  // 5. Proceed disabled when too few players selected (below minimum)
  // -----------------------------------------------------------------
  it('disables proceed when fewer than minimum players are selected', async () => {
    const players = createPlayers(4);  // Below 5v5 minimum of 5
    const numPeriods = 2;

    const props = createConfigurationProps({
      allPlayers: players,
      selectedSquadIds: players.map(p => p.id),
      selectedSquadPlayers: players,
      numPeriods,
      periodGoalieIds: buildGoalieIds(numPeriods, 'player-4'),
      teamConfig: { format: FORMATS.FORMAT_5V5, squadSize: 4, formation: FORMATIONS.FORMATION_2_2 },
      selectedFormation: FORMATIONS.FORMATION_2_2
    });

    renderConfigScreen(props);

    await waitFor(() => {
      const proceedBtn = findProceedButton();
      expect(proceedBtn).toBeDefined();
      expect(proceedBtn).toBeDisabled();
    });
  });

  // -----------------------------------------------------------------
  // 6. Multi-period (3 periods): all goalies → enabled; one missing → disabled
  // -----------------------------------------------------------------
  it('enables proceed only when all 3 period goalies are assigned', async () => {
    const players = createPlayers(7);
    const numPeriods = 3;

    // Start with only 2 of 3 goalies assigned
    const incompleteGoalies = { 1: 'player-7', 2: 'player-6' };  // Period 3 missing

    const props = createConfigurationProps({
      allPlayers: players,
      selectedSquadIds: players.map(p => p.id),
      selectedSquadPlayers: players,
      numPeriods,
      periodGoalieIds: incompleteGoalies,
      teamConfig: { format: FORMATS.FORMAT_5V5, squadSize: 7, formation: FORMATIONS.FORMATION_2_2 },
      selectedFormation: FORMATIONS.FORMATION_2_2
    });

    const { rerender } = renderConfigScreen(props);

    // Should be disabled with one goalie missing
    await waitFor(() => {
      const proceedBtn = findProceedButton();
      expect(proceedBtn).toBeDefined();
      expect(proceedBtn).toBeDisabled();
    });

    // Re-render with all 3 goalies assigned
    const completeGoalies = { 1: 'player-7', 2: 'player-6', 3: 'player-5' };
    const updatedProps = { ...props, periodGoalieIds: completeGoalies };

    rerender(
      <I18nextProvider i18n={testI18n}>
        <ConfigurationScreen {...updatedProps} />
      </I18nextProvider>
    );

    await waitFor(() => {
      const proceedBtn = findProceedButton();
      expect(proceedBtn).toBeDefined();
      expect(proceedBtn).not.toBeDisabled();
    });
  });

  // -----------------------------------------------------------------
  // 7. 1-2-1 formation with 7 players: proceed works
  // -----------------------------------------------------------------
  it('enables proceed for 1-2-1 formation with 7 players', async () => {
    const players = createPlayers(7);
    const numPeriods = 2;

    const props = createConfigurationProps({
      allPlayers: players,
      selectedSquadIds: players.map(p => p.id),
      selectedSquadPlayers: players,
      numPeriods,
      periodGoalieIds: buildGoalieIds(numPeriods, 'player-7'),
      teamConfig: { format: FORMATS.FORMAT_5V5, squadSize: 7, formation: FORMATIONS.FORMATION_1_2_1 },
      selectedFormation: FORMATIONS.FORMATION_1_2_1
    });

    renderConfigScreen(props);

    await waitFor(() => {
      const proceedBtn = findProceedButton();
      expect(proceedBtn).toBeDefined();
      expect(proceedBtn).not.toBeDisabled();
    });

    fireEvent.click(findProceedButton());
    expect(props.handleStartPeriodSetup).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------
  // 8. Match type + venue selection values passed through handleStartPeriodSetup
  // -----------------------------------------------------------------
  it('renders match type and venue selections and calls handleStartPeriodSetup with config intact', async () => {
    const players = createPlayers(7);
    const numPeriods = 2;

    const props = createConfigurationProps({
      allPlayers: players,
      selectedSquadIds: players.map(p => p.id),
      selectedSquadPlayers: players,
      numPeriods,
      periodGoalieIds: buildGoalieIds(numPeriods, 'player-7'),
      teamConfig: { format: FORMATS.FORMAT_5V5, squadSize: 7, formation: FORMATIONS.FORMATION_2_2 },
      selectedFormation: FORMATIONS.FORMATION_2_2,
      matchType: 'cup',
      venueType: VENUE_TYPES.AWAY
    });

    renderConfigScreen(props);

    // Verify match type and venue selects are rendered with the provided values
    await waitFor(() => {
      const matchTypeSelect = screen.getByTestId('matchType');
      expect(matchTypeSelect).toBeInTheDocument();
      expect(matchTypeSelect.value).toBe('cup');
    });

    const venueSelect = screen.getByTestId('venueType');
    expect(venueSelect).toBeInTheDocument();
    expect(venueSelect.value).toBe(VENUE_TYPES.AWAY);

    // Change venue to neutral
    fireEvent.change(venueSelect, { target: { value: VENUE_TYPES.NEUTRAL } });
    expect(props.setVenueType).toHaveBeenCalledWith(VENUE_TYPES.NEUTRAL);

    // Proceed button should be enabled and clicking should call handleStartPeriodSetup
    const proceedBtn = findProceedButton();
    expect(proceedBtn).not.toBeDisabled();

    fireEvent.click(proceedBtn);
    expect(props.handleStartPeriodSetup).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------
  // 9. 7v7 format with 2-2-2 formation with 9 players: proceed works
  // -----------------------------------------------------------------
  it('enables proceed for 7v7 2-2-2 formation with 9 players', async () => {
    const players = createPlayers(9);
    const numPeriods = 2;

    const props = createConfigurationProps({
      allPlayers: players,
      selectedSquadIds: players.map(p => p.id),
      selectedSquadPlayers: players,
      numPeriods,
      periodGoalieIds: buildGoalieIds(numPeriods, 'player-9'),
      teamConfig: { format: FORMATS.FORMAT_7V7, squadSize: 9, formation: FORMATIONS.FORMATION_2_2_2 },
      selectedFormation: FORMATIONS.FORMATION_2_2_2
    });

    renderConfigScreen(props);

    await waitFor(() => {
      const proceedBtn = findProceedButton();
      expect(proceedBtn).toBeDefined();
      expect(proceedBtn).not.toBeDisabled();
    });

    fireEvent.click(findProceedButton());
    expect(props.handleStartPeriodSetup).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------
  // 10. 7v7 format with 2-3-1 formation with 10 players: proceed works
  // -----------------------------------------------------------------
  it('enables proceed for 7v7 2-3-1 formation with 10 players', async () => {
    const players = createPlayers(10);
    const numPeriods = 2;

    const props = createConfigurationProps({
      allPlayers: players,
      selectedSquadIds: players.map(p => p.id),
      selectedSquadPlayers: players,
      numPeriods,
      periodGoalieIds: buildGoalieIds(numPeriods, 'player-10'),
      teamConfig: { format: FORMATS.FORMAT_7V7, squadSize: 10, formation: FORMATIONS.FORMATION_2_3_1 },
      selectedFormation: FORMATIONS.FORMATION_2_3_1
    });

    renderConfigScreen(props);

    await waitFor(() => {
      const proceedBtn = findProceedButton();
      expect(proceedBtn).toBeDefined();
      expect(proceedBtn).not.toBeDisabled();
    });

    fireEvent.click(findProceedButton());
    expect(props.handleStartPeriodSetup).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------
  // 11. Partial goalie assignment: only period 1 assigned out of 2 → disabled
  // -----------------------------------------------------------------
  it('disables proceed when only some periods have goalies assigned', async () => {
    const players = createPlayers(7);
    const numPeriods = 2;

    const props = createConfigurationProps({
      allPlayers: players,
      selectedSquadIds: players.map(p => p.id),
      selectedSquadPlayers: players,
      numPeriods,
      periodGoalieIds: { 1: 'player-7' },  // Only period 1 has goalie, period 2 missing
      teamConfig: { format: FORMATS.FORMAT_5V5, squadSize: 7, formation: FORMATIONS.FORMATION_2_2 },
      selectedFormation: FORMATIONS.FORMATION_2_2
    });

    renderConfigScreen(props);

    await waitFor(() => {
      const proceedBtn = findProceedButton();
      expect(proceedBtn).toBeDefined();
      expect(proceedBtn).toBeDisabled();
    });

    // Click should not fire since the button is disabled
    fireEvent.click(findProceedButton());
    expect(props.handleStartPeriodSetup).not.toHaveBeenCalled();
  });
});
