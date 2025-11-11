import { SubstitutionManager, createSubstitutionManager } from '../substitutionManager';
import { FORMATS, FORMATIONS, SUBSTITUTION_TYPES } from '../../../constants/teamConfiguration';
import { PLAYER_ROLES } from '../../../constants/playerConstants';
import { getCurrentTimestamp } from '../../../utils/timeUtils';

// Mock time utilities
jest.mock('../../../utils/timeUtils');
jest.mock('../../time/stintManager', () => ({
  updatePlayerTimeStats: jest.fn((player) => player.stats),
  resetPlayerStintTimer: jest.fn((player, currentTime) => ({ 
    ...player, 
    stats: { 
      ...player.stats, 
      lastStintStartTimeEpoch: currentTime 
    } 
  })),
  startNewStint: jest.fn((player) => player)
}));

describe('SubstitutionManager', () => {
  let mockCurrentTime;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentTime = 60000; // 1 minute
    getCurrentTimestamp.mockReturnValue(mockCurrentTime);
  });

  // Helper to create test players
  const createTestPlayer = (id, role, pairKey, status = 'on_field') => ({
    id,
    name: `Player ${id}`,
    stats: {
      currentRole: role,
      currentStatus: status,
      currentPairKey: pairKey,
      timeOnFieldSeconds: 0,
      timeAsDefenderSeconds: 0,
      timeAsAttackerSeconds: 0,
      timeAsGoalieSeconds: 0,
      timeAsMidfielderSeconds: 0,
      isInactive: false,
      lastStintStartTimeEpoch: mockCurrentTime - 30000 // Started 30s ago
    }
  });

  const createIndividualFormation = () => ({
    goalie: 'g1',
    leftDefender: 'f1',
    rightDefender: 'f2',
    leftMidfielder: 'f3',
    centerMidfielder: 'f4',
    rightMidfielder: 'f5',
    attacker: 'f6',
    substitute_1: 's1',
    substitute_2: 's2',
    substitute_3: 's3'
  });

  const createIndividualPlayers = () => {
    const players = [
      createTestPlayer('g1', PLAYER_ROLES.GOALIE, 'goalie', 'goalie'),
      createTestPlayer('f1', PLAYER_ROLES.DEFENDER, 'leftDefender'),
      createTestPlayer('f2', PLAYER_ROLES.DEFENDER, 'rightDefender'),
      createTestPlayer('f3', PLAYER_ROLES.MIDFIELDER, 'leftMidfielder'),
      createTestPlayer('f4', PLAYER_ROLES.MIDFIELDER, 'centerMidfielder'),
      createTestPlayer('f5', PLAYER_ROLES.MIDFIELDER, 'rightMidfielder'),
      createTestPlayer('f6', PLAYER_ROLES.ATTACKER, 'attacker'),
      createTestPlayer('s1', PLAYER_ROLES.SUBSTITUTE, 'substitute_1', 'substitute'),
      createTestPlayer('s2', PLAYER_ROLES.SUBSTITUTE, 'substitute_2', 'substitute'),
      createTestPlayer('s3', PLAYER_ROLES.SUBSTITUTE, 'substitute_3', 'substitute')
    ];

    const inactivePlayer = players.find(p => p.id === 's3');
    if (inactivePlayer) {
      inactivePlayer.stats.isInactive = true;
    }

    return players;
  };

  const createFiveVFiveFormation = () => ({
    goalie: 'g1',
    leftDefender: 'f1',
    rightDefender: 'f2',
    leftAttacker: 'f3',
    rightAttacker: 'f4',
    substitute_1: 's1',
    substitute_2: 's2',
    substitute_3: 's3',
    substitute_4: 's4'
  });

  const createFiveVFivePlayers = () => [
    createTestPlayer('g1', PLAYER_ROLES.GOALIE, 'goalie', 'goalie'),
    createTestPlayer('f1', PLAYER_ROLES.DEFENDER, 'leftDefender'),
    createTestPlayer('f2', PLAYER_ROLES.DEFENDER, 'rightDefender'),
    createTestPlayer('f3', PLAYER_ROLES.ATTACKER, 'leftAttacker'),
    createTestPlayer('f4', PLAYER_ROLES.ATTACKER, 'rightAttacker'),
    createTestPlayer('s1', PLAYER_ROLES.SUBSTITUTE, 'substitute_1', 'substitute'),
    createTestPlayer('s2', PLAYER_ROLES.SUBSTITUTE, 'substitute_2', 'substitute'),
    createTestPlayer('s3', PLAYER_ROLES.SUBSTITUTE, 'substitute_3', 'substitute'),
    createTestPlayer('s4', PLAYER_ROLES.SUBSTITUTE, 'substitute_4', 'substitute')
  ];

  describe('Individual mode substitutions with inactive players', () => {
    const teamConfig = {
      format: FORMATS.FORMAT_7V7,
      squadSize: 10,
      formation: FORMATIONS.FORMATION_2_3_1,
      substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL
    };

    it('promotes remaining active substitutes when inactive players stay on the bench', () => {
      const manager = new SubstitutionManager(teamConfig);
      const formation = createIndividualFormation();
      const allPlayers = createIndividualPlayers();
      const rotationQueue = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'];

      const context = {
        formation,
        nextPlayerIdToSubOut: 'f1',
        allPlayers,
        rotationQueue,
        currentTimeEpoch: mockCurrentTime,
        isSubTimerPaused: false,
        substitutionCount: 1
      };

      const result = manager.handleIndividualModeSubstitution(context);

      // Player s1 should replace f1 on the field
      expect(result.newFormation.leftDefender).toBe('s1');

      // Active substitutes shift up, and the outgoing player fills the last active slot
      expect(result.newFormation.substitute_1).toBe('s2');
      expect(result.newFormation.substitute_2).toBe('f1');
      expect(result.newFormation.substitute_3).toBe('s3');

      const substituteIds = ['substitute_1', 'substitute_2', 'substitute_3']
        .map(position => result.newFormation[position]);
      expect(substituteIds).not.toContain('s1');

      const updatedS2 = result.updatedPlayers.find(p => p.id === 's2');
      expect(updatedS2.stats.currentPairKey).toBe('substitute_1');

      const updatedF1 = result.updatedPlayers.find(p => p.id === 'f1');
      expect(updatedF1.stats.currentPairKey).toBe('substitute_2');

      // Rotation queue should advance to the next field player
      expect(result.newRotationQueue[0]).toBe('f2');
    });
  });

  describe('Factory Function', () => {
    it('should create substitution manager with team config', () => {
      const teamConfig = {
        format: FORMATS.FORMAT_7V7,
        squadSize: 10,
        formation: FORMATIONS.FORMATION_2_3_1,
        substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL
      };

      const manager = createSubstitutionManager(teamConfig);
      expect(manager).toBeInstanceOf(SubstitutionManager);
      expect(manager.teamConfig).toBe(teamConfig);
    });
  });
});
