import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfigurationScreen } from '../ConfigurationScreen';
import { VENUE_TYPES } from '../../../constants/matchVenues';
import { FORMATS, FORMATIONS, SUBSTITUTION_TYPES } from '../../../constants/teamConfiguration';

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
  MapPin: (props) => <svg data-testid="icon-pin" {...props} />
}));

jest.mock('../../shared/UI', () => ({
  Select: ({ value, onChange, options, id }) => (
    <select data-testid={id || 'select'} value={value || ''} onChange={(e) => onChange && onChange(e.target.value)}>
      {options && options.map(option => (
        typeof option === 'object'
          ? <option key={option.value} value={option.value}>{option.label}</option>
          : <option key={option} value={option}>{option}</option>
      ))}
    </select>
  ),
  Button: ({ children, onClick, disabled, type = 'button', ...props }) => (
    <button data-testid="mock-button" type={type} onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  Input: ({ value = '', onChange, ...props }) => (
    <input data-testid="mock-input" value={value} onChange={onChange} {...props} />
  )
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: 'user-1' }, sessionDetectionResult: null })
}));

jest.mock('../../../contexts/TeamContext', () => ({
  useTeam: () => ({
    currentTeam: { id: 'team-1' },
    teamPlayers: [],
    hasTeams: true,
    hasClubs: true,
    loading: false
  })
}));

jest.mock('../../../hooks/useFormationVotes', () => ({
  useFormationVotes: () => ({
    isLoading: false,
    votes: {},
    openVoteModal: jest.fn(),
    closeVoteModal: jest.fn()
  })
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
  ...overrides
});

describe('ConfigurationScreen venue selection', () => {
  it('renders all venue options with home selected by default', () => {
    const props = buildProps();
    render(<ConfigurationScreen {...props} />);

    const homeOption = screen.getByTestId('venue-option-home');
    const awayOption = screen.getByTestId('venue-option-away');
    const neutralOption = screen.getByTestId('venue-option-neutral');

    expect(homeOption).toHaveAttribute('aria-checked', 'true');
    expect(homeOption).toHaveTextContent('Selected');
    expect(awayOption).toHaveAttribute('aria-checked', 'false');
    expect(neutralOption).toHaveAttribute('aria-checked', 'false');
  });

  it('falls back to home selection when venueType prop is undefined', () => {
    const props = buildProps({ venueType: undefined });
    render(<ConfigurationScreen {...props} />);

    expect(screen.getByTestId('venue-option-home')).toHaveAttribute('aria-checked', 'true');
  });

  it('invokes callbacks and updates selection when choosing a new venue', () => {
    const props = buildProps();
    const { rerender } = render(<ConfigurationScreen {...props} />);

    const awayOption = screen.getByTestId('venue-option-away');
    const initialCalls = props.setHasActiveConfiguration.mock.calls.length;

    fireEvent.click(awayOption);

    expect(props.setVenueType).toHaveBeenCalledWith(VENUE_TYPES.AWAY);
    expect(props.setHasActiveConfiguration.mock.calls.length).toBeGreaterThan(initialCalls);
    const lastCallArgs = props.setHasActiveConfiguration.mock.calls[props.setHasActiveConfiguration.mock.calls.length - 1];
    expect(lastCallArgs[0]).toBe(true);

    rerender(<ConfigurationScreen {...{ ...props, venueType: VENUE_TYPES.AWAY }} />);
    expect(screen.getByTestId('venue-option-away')).toHaveAttribute('aria-checked', 'true');
  });
});
