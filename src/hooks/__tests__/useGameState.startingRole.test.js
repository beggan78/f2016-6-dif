import { renderHook, act } from '@testing-library/react';
import { PLAYER_ROLES, PLAYER_STATUS } from '../../constants/playerConstants';
import { FORMATIONS } from '../../constants/teamConfiguration';

jest.mock('../../utils/persistenceManager', () => {
  const mockManager = {
    loadState: jest.fn(),
    saveGameState: jest.fn()
  };

  return {
    __esModule: true,
    createGamePersistenceManager: jest.fn(() => mockManager),
    _mockManager: mockManager
  };
});

const { _mockManager: mockPersistenceManager } = jest.requireMock('../../utils/persistenceManager');

const setAllPlayersMock = jest.fn();

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
import { upsertPlayerMatchStats } from '../../services/matchStateManager';
import { useGameState } from '../useGameState';

describe('useGameState starting role persistence', () => {
  const selectedSquadIds = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  const baseFormation = {
    goalie: 'p1',
    leftDefender: 'p2',
    rightDefender: 'p3',
    leftAttacker: 'p4',
    rightAttacker: 'p5',
    substitute_1: 'p6',
    substitute_2: null
  };

  const mockInitialState = {
    view: 'setup',
    numPeriods: 3,
    periodDurationMinutes: 20,
    periodGoalieIds: { 1: 'p1', 2: 'p1', 3: 'p1' },
    teamConfig: {
      format: '5v5',
      formation: FORMATIONS.FORMATION_2_2,
      squadSize: 6
    },
    selectedFormation: FORMATIONS.FORMATION_2_2,
    currentPeriodNumber: 1,
    formation: baseFormation,
    selectedSquadIds,
    periodGoalies: { 1: 'p1', 2: 'p1', 3: 'p1' },
    currentMatchId: 'match-123',
    matchCreated: true
  };

  const buildPlayer = (id, name, startedAsRole, startedPosition, currentRole, currentStatus) => ({
    id,
    name,
    stats: {
      startedMatchAs:
        startedAsRole === PLAYER_ROLES.GOALIE
          ? PLAYER_ROLES.GOALIE
          : startedAsRole === PLAYER_ROLES.SUBSTITUTE
            ? PLAYER_ROLES.SUBSTITUTE
            : PLAYER_ROLES.FIELD_PLAYER,
      startedAtRole: startedAsRole,
      startedAtPosition: startedPosition,
      startLocked: false,
      currentRole,
      currentStatus,
      goals: 0,
      substitutionsIn: 0,
      substitutionsOut: 0,
      timeOnFieldSeconds: 0,
      timeAsGoalieSeconds: 0,
      timeAsDefenderSeconds: 0,
      timeAsMidfielderSeconds: 0,
      timeAsAttackerSeconds: 0,
      timeAsSubSeconds: 0,
      isCaptain: id === 'p1'
    }
  });

  let currentPlayers;

  beforeEach(() => {
    jest.clearAllMocks();

    const { useMatchAudio } = require('../useMatchAudio');
    useMatchAudio.mockReturnValue({
      requestWakeLock: jest.fn(),
      releaseWakeLock: jest.fn(),
      playAlertSounds: jest.fn()
    });

    const matchStateManager = require('../../services/matchStateManager');
    matchStateManager.updateExistingMatch.mockResolvedValue({ success: true });
    matchStateManager.saveInitialMatchConfig.mockResolvedValue({ success: true });
    matchStateManager.upsertPlayerMatchStats.mockResolvedValue({ success: true });
    matchStateManager.createMatch.mockResolvedValue({ success: true, matchId: 'match-123' });
    matchStateManager.updateMatchToRunning.mockResolvedValue({ success: true });

    currentPlayers = [
      buildPlayer('p1', 'Sophie', PLAYER_ROLES.GOALIE, 'goalie', PLAYER_ROLES.GOALIE, PLAYER_STATUS.GOALIE),
      buildPlayer('p2', 'Rebecka', PLAYER_ROLES.DEFENDER, 'leftDefender', PLAYER_ROLES.DEFENDER, PLAYER_STATUS.ON_FIELD),
      buildPlayer('p3', 'Elise', PLAYER_ROLES.DEFENDER, 'rightDefender', PLAYER_ROLES.DEFENDER, PLAYER_STATUS.ON_FIELD),
      buildPlayer('p4', 'Filippa', PLAYER_ROLES.ATTACKER, 'leftAttacker', PLAYER_ROLES.ATTACKER, PLAYER_STATUS.ON_FIELD),
      buildPlayer('p5', 'Tyra', PLAYER_ROLES.ATTACKER, 'rightAttacker', PLAYER_ROLES.ATTACKER, PLAYER_STATUS.ON_FIELD),
      buildPlayer('p6', 'Nicole', PLAYER_ROLES.SUBSTITUTE, 'substitute_1', PLAYER_ROLES.SUBSTITUTE, PLAYER_STATUS.SUBSTITUTE)
    ];

    setAllPlayersMock.mockImplementation((updater) => {
      if (typeof updater === 'function') {
        currentPlayers = updater(currentPlayers);
      } else {
        currentPlayers = updater;
      }
      return currentPlayers;
    });

    mockPersistenceManager.loadState.mockReturnValue({ ...mockInitialState });

    usePlayerState.mockReturnValue({
      allPlayers: currentPlayers,
      selectedSquadIds,
      captainId: 'p1',
      setAllPlayers: setAllPlayersMock,
      setSelectedSquadIds: jest.fn(),
      setCaptainId: jest.fn(),
      addTemporaryPlayer: jest.fn(),
      setCaptain: jest.fn(),
      clearCaptain: jest.fn(),
      togglePlayerInactive: jest.fn(),
      syncPlayersFromTeamRoster: jest.fn(),
      updatePlayerRolesFromFormation: jest.fn()
    });

    useTeamConfig.mockReturnValue({
      teamConfig: mockInitialState.teamConfig,
      selectedFormation: mockInitialState.selectedFormation,
      setTeamConfig: jest.fn(),
      setSelectedFormation: jest.fn(),
      updateTeamConfig: jest.fn(),
      updateFormationSelection: jest.fn(),
      createTeamConfigFromSquadSize: jest.fn(),
      getFormationAwareTeamConfig: jest.fn(() => ({
        ...mockInitialState.teamConfig,
        formation: mockInitialState.selectedFormation
      }))
    });

    useMatchEvents.mockReturnValue({
      matchEvents: [],
      matchStartTime: null,
      goalScorers: {},
      eventSequenceNumber: 0,
      lastEventBackup: null,
      ownScore: 0,
      opponentScore: 0,
      setMatchEvents: jest.fn(),
      setMatchStartTime: jest.fn(),
      setGoalScorers: jest.fn(),
      setEventSequenceNumber: jest.fn(),
      setLastEventBackup: jest.fn(),
      addGoalScored: jest.fn(),
      addGoalConceded: jest.fn(),
      setScore: jest.fn(),
      resetScore: jest.fn(),
      clearAllMatchEvents: jest.fn(),
      syncMatchDataFromEventLogger: jest.fn()
    });

    useMatchPersistence.mockReturnValue({
      clearPersistedState: jest.fn()
    });

    upsertPlayerMatchStats.mockResolvedValue({ success: true });
  });

  it('preserves startedAtRole across successive configuration saves', async () => {
    const { result } = renderHook(() => useGameState());

    await act(async () => {
      await result.current.handleSavePeriodConfiguration();
    });

    expect(setAllPlayersMock).toHaveBeenCalled();
    const firstCallPlayers = setAllPlayersMock.mock.calls[0][0];
    const defender = firstCallPlayers.find(player => player.id === 'p2');
    expect(defender.stats.startedAtRole).toBe(PLAYER_ROLES.DEFENDER);

    // Simulate a role change later in the match (defender moves to goalie)
    currentPlayers[1].stats.currentRole = PLAYER_ROLES.GOALIE;
    currentPlayers[1].stats.currentStatus = PLAYER_STATUS.GOALIE;

    await act(async () => {
      await result.current.handleSavePeriodConfiguration();
    });

    const latestCallPlayers = setAllPlayersMock.mock.calls[setAllPlayersMock.mock.calls.length - 1][0];
    const defenderAfterChange = latestCallPlayers.find(player => player.id === 'p2');
    expect(defenderAfterChange.stats.startedAtRole).toBe(PLAYER_ROLES.DEFENDER);

    // Ensure we are still issuing non-destructive upserts
    expect(upsertPlayerMatchStats).toHaveBeenCalled();
    const lastUpsertCall = upsertPlayerMatchStats.mock.calls[upsertPlayerMatchStats.mock.calls.length - 1];
    const upsertPlayers = lastUpsertCall[1];
    const upsertedDefender = upsertPlayers.find(player => player.id === 'p2');
    expect(upsertedDefender.stats.startedAtRole).toBe(PLAYER_ROLES.DEFENDER);
  });

  it('allows pre-match edits but locks roles after match start', async () => {
    const { result } = renderHook(() => useGameState());

    await act(async () => {
      await result.current.handleSavePeriodConfiguration();
    });

    // Update formation before match start: move defender to goalie
    await act(async () => {
      result.current.setFormation({
        ...baseFormation,
        goalie: 'p2',
        leftDefender: 'p3',
        rightDefender: 'p4',
        leftAttacker: 'p5',
        rightAttacker: 'p6',
        substitute_1: 'p1'
      });
      await result.current.handleSavePeriodConfiguration();
    });

    await act(async () => {
      await result.current.handleActualMatchStart();
    });

    const lockedPlayer = currentPlayers.find(player => player.id === 'p2');
    expect(lockedPlayer.stats.startedMatchAs).toBe(PLAYER_ROLES.GOALIE);
    expect(lockedPlayer.stats.startLocked).toBe(true);

    // Attempt to change roles after match start
    await act(async () => {
      result.current.setFormation({
        ...baseFormation,
        goalie: 'p3',
        leftDefender: 'p2'
      });
      await result.current.handleSavePeriodConfiguration();
    });

    const lockedPlayerAfterChange = currentPlayers.find(player => player.id === 'p2');
    expect(lockedPlayerAfterChange.stats.startedMatchAs).toBe(PLAYER_ROLES.GOALIE);
    expect(lockedPlayerAfterChange.stats.startedAtRole).toBe(PLAYER_ROLES.GOALIE);
  });
});
