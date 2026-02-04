import { renderHook, act } from '@testing-library/react';
import { PLAYER_ROLES, PLAYER_STATUS } from '../../constants/playerConstants';
import { VIEWS } from '../../constants/viewConstants';
import { DEFAULT_MATCH_TYPE } from '../../constants/matchTypes';
import { DEFAULT_VENUE_TYPE } from '../../constants/matchVenues';

jest.mock('../../utils/persistenceManager', () => {
  const mockManager = {
    loadState: jest.fn(),
    saveGameState: jest.fn(),
    clearState: jest.fn()
  };

  return {
    __esModule: true,
    createGamePersistenceManager: jest.fn(() => mockManager),
    _mockManager: mockManager
  };
});

const { _mockManager: mockPersistenceManager } = jest.requireMock('../../utils/persistenceManager');

jest.mock('../usePlayerState', () => ({
  usePlayerState: jest.fn()
}));

jest.mock('../useTeamConfig', () => ({
  useTeamConfig: jest.fn()
}));

jest.mock('../useMatchEvents', () => {
  const legacyMock = jest.fn();
  return {
    __esModule: true,
    useLegacyMatchEvents: legacyMock,
    useMatchEvents: jest.fn()
  };
});

jest.mock('../useMatchPersistence', () => ({
  useMatchPersistence: jest.fn()
}));

jest.mock('../useMatchAudio', () => {
  const mockHook = jest.fn(() => ({
    requestWakeLock: jest.fn(),
    releaseWakeLock: jest.fn(),
    playAlertSounds: jest.fn()
  }));

  return {
    __esModule: true,
    useMatchAudio: mockHook,
    default: mockHook
  };
});

jest.mock('../../contexts/TeamContext', () => ({
  useTeam: () => ({ currentTeam: { id: 'team-1' } })
}));

jest.mock('../../contexts/PreferencesContext', () => ({
  usePreferences: () => ({ audioPreferences: {} })
}));

jest.mock('../../game/queue/rotationQueue', () => ({
  createRotationQueue: jest.fn(() => ({
    toArray: jest.fn(() => [])
  }))
}));

jest.mock('../../game/logic/substitutionManager', () => ({
  createSubstitutionManager: jest.fn(() => ({
    initialize: jest.fn(() => ({
      rotationQueue: []
    })),
    getRotationQueue: jest.fn(() => [])
  })),
  handleRoleChange: jest.fn()
}));

jest.mock('../../game/time/stintManager', () => ({
  updatePlayerTimeStats: jest.fn()
}));

jest.mock('../../game/logic/positionUtils', () => ({
  getPositionRole: jest.fn(() => 'defender')
}));

jest.mock('../../services/matchStateManager', () => ({
  createMatch: jest.fn(),
  formatMatchDataFromGameState: jest.fn(() => ({})),
  updateMatchToFinished: jest.fn(),
  updateMatchToRunning: jest.fn(),
  formatFinalStatsFromGameState: jest.fn(() => ({})),
  updateExistingMatch: jest.fn(() => Promise.resolve({ success: true })),
  upsertPlayerMatchStats: jest.fn(() => Promise.resolve({ success: true })),
  saveInitialMatchConfig: jest.fn(() => Promise.resolve({ success: true }))
}));

jest.mock('../../utils/formationGenerator', () => ({
  generateIndividualFormationRecommendation: jest.fn()
}));

import { usePlayerState } from '../usePlayerState';
import { useTeamConfig } from '../useTeamConfig';
import { useLegacyMatchEvents as useMatchEvents } from '../useMatchEvents';
import { useMatchPersistence } from '../useMatchPersistence';
import { useMatchAudio } from '../useMatchAudio';
import { updatePlayerTimeStats } from '../../game/time/stintManager';
import { updateMatchToFinished, formatFinalStatsFromGameState } from '../../services/matchStateManager';
import { useGameState } from '../useGameState';

const baseTeamConfig = {
  format: '5v5',
  formation: '2-2',
  squadSize: 6
};

const baseFormation = {
  goalie: 'p1',
  leftDefender: 'p2',
  rightDefender: 'p3',
  leftAttacker: 'p4',
  rightAttacker: 'p5',
  substitute_1: 'p6',
  substitute_2: null
};

const createPlayer = (id, overrides = {}) => ({
  id,
  displayName: overrides.displayName || `Player ${id}`,
  firstName: overrides.firstName || `Player${id}`,
  lastName: overrides.lastName || `Last${id}`,
  stats: {
    startedMatchAs: PLAYER_ROLES.FIELD_PLAYER,
    startedAtPosition: 'leftDefender',
    currentRole: PLAYER_ROLES.DEFENDER,
    currentStatus: PLAYER_STATUS.ON_FIELD,
    periodsAsGoalie: 0,
    periodsAsDefender: 0,
    periodsAsAttacker: 0,
    periodsAsMidfielder: 0,
    goals: 0,
    substitutionsIn: 0,
    substitutionsOut: 0,
    timeOnFieldSeconds: 0,
    timeAsGoalieSeconds: 0,
    timeAsDefenderSeconds: 0,
    timeAsMidfielderSeconds: 0,
    timeAsAttackerSeconds: 0,
    timeAsSubSeconds: 0,
    ...overrides.stats
  }
});

const basePlayers = [
  createPlayer('p1', { displayName: 'Sophie', stats: { currentRole: PLAYER_ROLES.GOALIE } }),
  createPlayer('p2', { displayName: 'Rebecka' }),
  createPlayer('p3', { displayName: 'Elise' }),
  createPlayer('p4', { displayName: 'Filippa', stats: { currentRole: PLAYER_ROLES.ATTACKER } }),
  createPlayer('p5', { displayName: 'Tyra', stats: { currentRole: PLAYER_ROLES.ATTACKER } }),
  createPlayer('p6', { displayName: 'Nicole', stats: { currentRole: PLAYER_ROLES.SUBSTITUTE, currentStatus: PLAYER_STATUS.SUBSTITUTE } })
];

const buildInitialState = (overrides = {}) => ({
  view: VIEWS.GAME,
  numPeriods: 1,
  periodDurationMinutes: 10,
  periodGoalieIds: { 1: 'p1' },
  teamConfig: baseTeamConfig,
  selectedFormation: baseTeamConfig.formation,
  alertMinutes: 2,
  currentPeriodNumber: 1,
  formation: baseFormation,
  selectedSquadIds: basePlayers.map(player => player.id),
  nextPlayerToSubOut: null,
  nextPlayerIdToSubOut: null,
  nextNextPlayerIdToSubOut: null,
  rotationQueue: [],
  gameLog: [],
  opponentTeam: 'Rivals',
  matchType: DEFAULT_MATCH_TYPE,
  venueType: DEFAULT_VENUE_TYPE,
  lastSubstitutionTimestamp: null,
  matchEvents: [],
  matchStartTime: 1000,
  goalScorers: [],
  eventSequenceNumber: 0,
  lastEventBackup: null,
  ownScore: 1,
  opponentScore: 0,
  timerPauseStartTime: null,
  totalMatchPausedDuration: 0,
  captainId: 'p1',
  currentMatchId: 'match-123',
  matchCreated: true,
  matchState: 'running',
  hasActiveConfiguration: false,
  trackGoalScorer: true,
  ...overrides
});

const buildMatchEventsState = (overrides = {}) => ({
  matchEvents: [],
  matchStartTime: 1000,
  goalScorers: [],
  eventSequenceNumber: 0,
  lastEventBackup: null,
  ownScore: 1,
  opponentScore: 0,
  ...overrides
});

const setupHook = ({
  players = basePlayers,
  initialStateOverrides = {},
  matchEventsOverrides = {}
} = {}) => {
  const selectedSquadIds = players.map(player => player.id);
  const matchEventsState = buildMatchEventsState(matchEventsOverrides);
  const initialState = buildInitialState({
    selectedSquadIds,
    matchStartTime: matchEventsState.matchStartTime,
    ownScore: matchEventsState.ownScore,
    opponentScore: matchEventsState.opponentScore,
    ...initialStateOverrides
  });

  mockPersistenceManager.loadState.mockReturnValue(initialState);

  usePlayerState.mockReturnValue({
    allPlayers: players,
    selectedSquadIds,
    captainId: initialState.captainId,
    setAllPlayers: jest.fn(),
    setSelectedSquadIds: jest.fn(),
    setCaptainId: jest.fn(),
    addTemporaryPlayer: jest.fn(),
    setCaptain: jest.fn(),
    clearCaptain: jest.fn(),
    togglePlayerInactive: jest.fn(),
    syncPlayersFromTeamRoster: jest.fn(),
    updatePlayerRolesFromFormation: jest.fn(),
    getPlayerState: () => ({
      allPlayers: players,
      selectedSquadIds,
      captainId: initialState.captainId
    })
  });

  useTeamConfig.mockReturnValue({
    teamConfig: baseTeamConfig,
    selectedFormation: baseTeamConfig.formation,
    setTeamConfig: jest.fn(),
    setSelectedFormation: jest.fn(),
    updateTeamConfig: jest.fn(),
    updateFormationSelection: jest.fn(),
    createTeamConfigFromSquadSize: jest.fn(),
    getFormationAwareTeamConfig: jest.fn(() => baseTeamConfig),
    getTeamConfigState: () => ({
      teamConfig: baseTeamConfig,
      selectedFormation: baseTeamConfig.formation
    })
  });

  useMatchEvents.mockReturnValue({
    ...matchEventsState,
    setMatchEvents: jest.fn(),
    setMatchStartTime: jest.fn(),
    setGoalScorers: jest.fn(),
    setEventSequenceNumber: jest.fn(),
    setLastEventBackup: jest.fn(),
    addGoalScored: jest.fn(),
    addGoalConceded: jest.fn(),
    setScore: jest.fn(),
    resetScore: jest.fn(),
    clearAllMatchEvents: jest.fn(() => true),
    syncMatchDataFromEventLogger: jest.fn(),
    getEventState: () => matchEventsState
  });

  useMatchPersistence.mockReturnValue({
    loadPersistedState: jest.fn(),
    clearPersistedState: jest.fn(),
    saveMatchConfiguration: jest.fn()
  });

  updatePlayerTimeStats.mockImplementation(player => ({ ...player.stats }));

  return renderHook(() => useGameState());
};

describe('useGameState match persistence error handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useMatchAudio.mockReturnValue({
      requestWakeLock: jest.fn(),
      releaseWakeLock: jest.fn(),
      playAlertSounds: jest.fn()
    });
  });

  it('formats persistence errors with player names', async () => {
    formatFinalStatsFromGameState.mockReturnValue({
      matchDurationSeconds: 60,
      goalsScored: 2,
      goalsConceded: 1,
      outcome: 'win'
    });

    updateMatchToFinished.mockResolvedValue({
      success: false,
      error: 'Network down',
      playerStats: {
        failures: [{ playerId: 'p2' }, { playerId: 'p5' }]
      }
    });

    const { result } = setupHook();

    await act(async () => {
      await result.current.handleEndPeriod();
    });

    expect(result.current.showMatchPersistenceError).toBe(true);
    expect(result.current.persistenceErrorMessage).toBe(
      'Failed to save match: Network down Player stats failed for: Rebecka, Tyra'
    );
    expect(result.current.isMatchPersistenceRetrying).toBe(false);
    expect(result.current.matchPersistenceRetryAttempt).toBe(0);
  });

  it('formats persistence errors with fallback player counts', async () => {
    formatFinalStatsFromGameState.mockReturnValue({
      matchDurationSeconds: 60,
      goalsScored: 1,
      goalsConceded: 0,
      outcome: 'win'
    });

    updateMatchToFinished.mockResolvedValue({
      success: false,
      error: 'Timeout',
      playerStats: {
        failures: [{ playerId: 'unknown-1' }]
      }
    });

    const { result } = setupHook();

    await act(async () => {
      await result.current.handleEndPeriod();
    });

    expect(result.current.showMatchPersistenceError).toBe(true);
    expect(result.current.persistenceErrorMessage).toBe(
      'Failed to save match: Timeout Player stats failed for 1 player(s)'
    );
  });

  it('validates missing match ID when completing a match', async () => {
    formatFinalStatsFromGameState.mockReturnValue({
      matchDurationSeconds: 60,
      goalsScored: 1,
      goalsConceded: 0,
      outcome: 'win'
    });

    const { result } = setupHook({
      initialStateOverrides: {
        currentMatchId: null
      }
    });

    await act(async () => {
      await result.current.handleEndPeriod();
    });

    expect(updateMatchToFinished).not.toHaveBeenCalled();
    expect(result.current.showMatchPersistenceError).toBe(true);
    expect(result.current.persistenceErrorMessage).toBe('Cannot save match: No match ID.');
    expect(result.current.matchState).not.toBe('finished');
  });

  it('validates missing player data when completing a match', async () => {
    formatFinalStatsFromGameState.mockReturnValue({
      matchDurationSeconds: 60,
      goalsScored: 1,
      goalsConceded: 0,
      outcome: 'win'
    });

    const { result } = setupHook({
      players: []
    });

    await act(async () => {
      await result.current.handleEndPeriod();
    });

    expect(result.current.showMatchPersistenceError).toBe(true);
    expect(result.current.persistenceErrorMessage).toBe('Cannot save match: No player data available.');
  });

  it('validates missing start time when completing a match', async () => {
    const { result } = setupHook({
      matchEventsOverrides: {
        matchStartTime: null
      }
    });

    await act(async () => {
      await result.current.handleEndPeriod();
    });

    expect(result.current.showMatchPersistenceError).toBe(true);
    expect(result.current.persistenceErrorMessage).toBe('Cannot save match: Missing start time.');
  });

  it('validates incomplete final stats when completing a match', async () => {
    formatFinalStatsFromGameState.mockReturnValue({
      goalsScored: 1,
      goalsConceded: 0,
      outcome: 'win'
    });

    const { result } = setupHook();

    await act(async () => {
      await result.current.handleEndPeriod();
    });

    expect(result.current.showMatchPersistenceError).toBe(true);
    expect(result.current.persistenceErrorMessage).toBe(
      'Cannot save match: Incomplete match data (matchDurationSeconds)'
    );
  });

  it('validates participating players when completing a match', async () => {
    const playersWithoutParticipation = basePlayers.map(player => ({
      ...player,
      stats: {
        ...player.stats,
        startedMatchAs: null,
        startedAtPosition: null
      }
    }));

    formatFinalStatsFromGameState.mockReturnValue({
      matchDurationSeconds: 60,
      goalsScored: 1,
      goalsConceded: 0,
      outcome: 'win'
    });

    const { result } = setupHook({
      players: playersWithoutParticipation
    });

    await act(async () => {
      await result.current.handleEndPeriod();
    });

    expect(result.current.showMatchPersistenceError).toBe(true);
    expect(result.current.persistenceErrorMessage).toBe('Cannot save match: No participating players found.');
  });

  it('completes match persistence successfully and clears errors', async () => {
    formatFinalStatsFromGameState.mockReturnValue({
      matchDurationSeconds: 60,
      goalsScored: 3,
      goalsConceded: 1,
      outcome: 'win'
    });

    updateMatchToFinished.mockResolvedValue({ success: true });

    const { result } = setupHook();

    await act(async () => {
      await result.current.handleEndPeriod();
    });

    expect(updateMatchToFinished).toHaveBeenCalled();
    expect(result.current.showMatchPersistenceError).toBe(false);
    expect(result.current.persistenceErrorMessage).toBe('');
    expect(result.current.matchState).toBe('finished');
    expect(result.current.view).toBe(VIEWS.STATS);
  });

  it('allows continuing without saving a failed match', async () => {
    formatFinalStatsFromGameState.mockReturnValue({
      matchDurationSeconds: 60,
      goalsScored: 2,
      goalsConceded: 1,
      outcome: 'win'
    });

    updateMatchToFinished.mockResolvedValue({ success: false, error: 'Network down' });

    const { result } = setupHook();

    await act(async () => {
      await result.current.handleEndPeriod();
    });

    expect(result.current.showMatchPersistenceError).toBe(true);

    act(() => {
      result.current.continueWithoutSavingMatch();
    });

    expect(result.current.showMatchPersistenceError).toBe(false);
    expect(result.current.persistenceErrorMessage).toBe('');
    expect(result.current.matchState).toBe('finished');
    expect(result.current.view).toBe(VIEWS.STATS);
  });

  it('shows error when retrying without pending match data', async () => {
    const { result } = setupHook();

    await act(async () => {
      await result.current.retryMatchPersistence();
    });

    expect(result.current.showMatchPersistenceError).toBe(true);
    expect(result.current.persistenceErrorMessage).toBe('Cannot retry: No pending match data found.');
    expect(result.current.isMatchPersistenceRetrying).toBe(false);
    expect(result.current.matchPersistenceRetryAttempt).toBe(0);
  });

  it('retries match persistence with backoff and succeeds', async () => {
    formatFinalStatsFromGameState.mockReturnValue({
      matchDurationSeconds: 60,
      goalsScored: 1,
      goalsConceded: 0,
      outcome: 'win'
    });

    const timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
      callback();
      return 0;
    });

    updateMatchToFinished
      .mockResolvedValueOnce({ success: false, error: 'Temporary failure' })
      .mockResolvedValueOnce({ success: false, error: 'Temporary failure' })
      .mockResolvedValueOnce({ success: true });

    const { result } = setupHook();

    await act(async () => {
      await result.current.handleEndPeriod();
    });

    expect(result.current.showMatchPersistenceError).toBe(true);

    await act(async () => {
      await result.current.retryMatchPersistence(2);
    });

    expect(updateMatchToFinished).toHaveBeenCalledTimes(3);
    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
    expect(result.current.isMatchPersistenceRetrying).toBe(false);
    expect(result.current.matchPersistenceRetryAttempt).toBe(0);
    expect(result.current.showMatchPersistenceError).toBe(false);
    expect(result.current.matchState).toBe('finished');
    expect(result.current.view).toBe(VIEWS.STATS);

    timeoutSpy.mockRestore();
  });
});
