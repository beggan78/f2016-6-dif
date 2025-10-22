import { SubstitutionManager, createSubstitutionManager } from '../substitutionManager';
import { PAIRED_ROLE_STRATEGY_TYPES, FORMATS, FORMATIONS, SUBSTITUTION_TYPES } from '../../../constants/teamConfiguration';
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

  // Helper to create pairs formation
  const createPairsFormation = () => ({
    goalie: 'p1',
    leftPair: { defender: 'p2', attacker: 'p3' },
    rightPair: { defender: 'p4', attacker: 'p5' },
    subPair: { defender: 'p6', attacker: 'p7' }
  });

  // Helper to create test players for pairs formation
  const createPairsPlayers = () => [
    createTestPlayer('p1', PLAYER_ROLES.GOALIE, 'goalie', 'goalie'),
    createTestPlayer('p2', PLAYER_ROLES.DEFENDER, 'leftPair'),
    createTestPlayer('p3', PLAYER_ROLES.ATTACKER, 'leftPair'),
    createTestPlayer('p4', PLAYER_ROLES.DEFENDER, 'rightPair'),
    createTestPlayer('p5', PLAYER_ROLES.ATTACKER, 'rightPair'),
    createTestPlayer('p6', PLAYER_ROLES.DEFENDER, 'subPair', 'substitute'),
    createTestPlayer('p7', PLAYER_ROLES.ATTACKER, 'subPair', 'substitute')
  ];

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

  describe('Role Rotation Disabled (keep_throughout_period)', () => {
    const teamConfig = {
      format: '5v5',
      squadSize: 7,
      formation: '2-2',
      substitutionType: 'pairs',
      pairedRoleStrategy: PAIRED_ROLE_STRATEGY_TYPES.KEEP_THROUGHOUT_PERIOD
    };

    it('should maintain player roles during substitution', () => {
      const manager = new SubstitutionManager(teamConfig);
      const formation = createPairsFormation();
      const allPlayers = createPairsPlayers();

      const context = {
        formation,
        nextPhysicalPairToSubOut: 'leftPair',
        allPlayers,
        currentTimeEpoch: mockCurrentTime,
        isSubTimerPaused: false
      };

      const result = manager.handlePairsSubstitution(context);

      // Verify formation updates - no role swapping
      expect(result.newFormation.leftPair.defender).toBe('p6'); // Sub defender stays defender
      expect(result.newFormation.leftPair.attacker).toBe('p7'); // Sub attacker stays attacker
      expect(result.newFormation.subPair.defender).toBe('p2'); // Field defender stays defender 
      expect(result.newFormation.subPair.attacker).toBe('p3'); // Field attacker stays attacker
    });

    it('should update player stats with correct roles', () => {
      const manager = new SubstitutionManager(teamConfig);
      const formation = createPairsFormation();
      const allPlayers = createPairsPlayers();

      const context = {
        formation,
        nextPhysicalPairToSubOut: 'leftPair',
        allPlayers,
        currentTimeEpoch: mockCurrentTime,
        isSubTimerPaused: false
      };

      const result = manager.handlePairsSubstitution(context);

      // Find players in result
      const p6 = result.updatedPlayers.find(p => p.id === 'p6');
      const p7 = result.updatedPlayers.find(p => p.id === 'p7');

      // Verify players coming on keep their original roles
      expect(p6.stats.currentRole).toBe(PLAYER_ROLES.DEFENDER);
      expect(p7.stats.currentRole).toBe(PLAYER_ROLES.ATTACKER);
      expect(p6.stats.currentStatus).toBe('on_field');
      expect(p7.stats.currentStatus).toBe('on_field');
    });
  });

  describe('Role Rotation Enabled (swap_every_rotation)', () => {
    const teamConfig = {
      format: '5v5',
      squadSize: 7,
      formation: '2-2',
      substitutionType: 'pairs',
      pairedRoleStrategy: PAIRED_ROLE_STRATEGY_TYPES.SWAP_EVERY_ROTATION
    };

    it('should swap roles only for outgoing pair (becoming substitutes)', () => {
      const manager = new SubstitutionManager(teamConfig);
      const formation = createPairsFormation();
      const allPlayers = createPairsPlayers();

      const context = {
        formation,
        nextPhysicalPairToSubOut: 'leftPair',
        allPlayers,
        currentTimeEpoch: mockCurrentTime,
        isSubTimerPaused: false
      };

      const result = manager.handlePairsSubstitution(context);

      // Verify incoming pair keeps their existing roles (no swap)
      expect(result.newFormation.leftPair.defender).toBe('p6'); // Sub defender stays defender
      expect(result.newFormation.leftPair.attacker).toBe('p7'); // Sub attacker stays attacker

      // Verify outgoing pair gets swapped roles in substitute position
      expect(result.newFormation.subPair.defender).toBe('p3'); // Former attacker becomes defender
      expect(result.newFormation.subPair.attacker).toBe('p2'); // Former defender becomes attacker
    });

    it('should update player stats correctly for role-swapped substitutes', () => {
      const manager = new SubstitutionManager(teamConfig);
      const formation = createPairsFormation();
      const allPlayers = createPairsPlayers();

      const context = {
        formation,
        nextPhysicalPairToSubOut: 'leftPair', 
        allPlayers,
        currentTimeEpoch: mockCurrentTime,
        isSubTimerPaused: false
      };

      const result = manager.handlePairsSubstitution(context);

      // Find players going off (they should have SUBSTITUTE role when off field)
      const p2 = result.updatedPlayers.find(p => p.id === 'p2');
      const p3 = result.updatedPlayers.find(p => p.id === 'p3');

      // Players going off always have SUBSTITUTE role when off field
      expect(p2.stats.currentRole).toBe(PLAYER_ROLES.SUBSTITUTE);
      expect(p3.stats.currentRole).toBe(PLAYER_ROLES.SUBSTITUTE);
      expect(p2.stats.currentStatus).toBe('substitute');
      expect(p3.stats.currentStatus).toBe('substitute');
    });

    it('should maintain correct roles for players coming on field', () => {
      const manager = new SubstitutionManager(teamConfig);
      const formation = createPairsFormation();
      const allPlayers = createPairsPlayers();

      const context = {
        formation,
        nextPhysicalPairToSubOut: 'leftPair',
        allPlayers,
        currentTimeEpoch: mockCurrentTime,
        isSubTimerPaused: false
      };

      const result = manager.handlePairsSubstitution(context);

      // Find players coming on
      const p6 = result.updatedPlayers.find(p => p.id === 'p6');
      const p7 = result.updatedPlayers.find(p => p.id === 'p7');

      // They should keep their substitute roles (which were already set correctly)
      expect(p6.stats.currentRole).toBe(PLAYER_ROLES.DEFENDER);
      expect(p7.stats.currentRole).toBe(PLAYER_ROLES.ATTACKER);
      expect(p6.stats.currentStatus).toBe('on_field');
      expect(p7.stats.currentStatus).toBe('on_field');
    });
  });

  describe('Individual paired rotation with multi-substitutions', () => {
    const baseTeamConfig = {
      format: '5v5',
      squadSize: 9,
      formation: '2-2',
      substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL
    };

    it('maintains defender/attacker alignment when strategy is keep_throughout_period', () => {
      const manager = new SubstitutionManager({
        ...baseTeamConfig,
        pairedRoleStrategy: PAIRED_ROLE_STRATEGY_TYPES.KEEP_THROUGHOUT_PERIOD
      });
      const formation = createFiveVFiveFormation();
      const allPlayers = createFiveVFivePlayers();
      const rotationQueue = ['f1', 'f3', 'f2', 'f4', 's1', 's2', 's3', 's4'];

      const context = {
        formation,
        nextPlayerIdToSubOut: 'f1',
        allPlayers,
        rotationQueue,
        currentTimeEpoch: mockCurrentTime,
        isSubTimerPaused: false,
        substitutionCount: 2
      };

      const result = manager.handleIndividualModeSubstitution(context);

      expect(result.newFormation.leftDefender).toBe('s1');
      expect(result.newFormation.leftAttacker).toBe('s2');
      expect(result.newFormation.rightDefender).toBe('f2');
      expect(result.newFormation.rightAttacker).toBe('f4');

      expect(result.newFormation.substitute_1).toBe('s3');
      expect(result.newFormation.substitute_2).toBe('s4');
      expect(result.newFormation.substitute_3).toBe('f1');
      expect(result.newFormation.substitute_4).toBe('f3');

      expect(result.newRotationQueue).toEqual(['f2', 'f4', 's1', 's2', 's3', 's4', 'f1', 'f3']);
    });

    it('swaps defender/attacker roles when strategy is swap_every_rotation', () => {
      const manager = new SubstitutionManager({
        ...baseTeamConfig,
        pairedRoleStrategy: PAIRED_ROLE_STRATEGY_TYPES.SWAP_EVERY_ROTATION
      });
      const formation = createFiveVFiveFormation();
      const allPlayers = createFiveVFivePlayers();
      const rotationQueue = ['f1', 'f3', 'f2', 'f4', 's1', 's2', 's3', 's4'];

      const context = {
        formation,
        nextPlayerIdToSubOut: 'f1',
        allPlayers,
        rotationQueue,
        currentTimeEpoch: mockCurrentTime,
        isSubTimerPaused: false,
        substitutionCount: 2
      };

      const result = manager.handleIndividualModeSubstitution(context);

      expect(result.newFormation.leftDefender).toBe('s1');
      expect(result.newFormation.leftAttacker).toBe('s2');

      expect(result.newRotationQueue).toEqual(['f2', 'f4', 's1', 's2', 's3', 's4', 'f1', 'f3']);
    });
  });

  describe('Multiple Substitution Cycles', () => {
    const teamConfig = {
      format: '5v5',
      squadSize: 7,
      formation: '2-2',
      substitutionType: 'pairs',
      pairedRoleStrategy: PAIRED_ROLE_STRATEGY_TYPES.SWAP_EVERY_ROTATION
    };

    it('should properly alternate roles across multiple substitutions', () => {
      const manager = new SubstitutionManager(teamConfig);
      let formation = createPairsFormation();
      let allPlayers = createPairsPlayers();

      // First substitution: leftPair out, subPair in
      const context1 = {
        formation,
        nextPhysicalPairToSubOut: 'leftPair',
        allPlayers,
        currentTimeEpoch: mockCurrentTime,
        isSubTimerPaused: false
      };

      const result1 = manager.handlePairsSubstitution(context1);

      // After first substitution:
      // - p6/p7 are now on field in leftPair with original roles
      // - p2/p3 are now substitutes with swapped roles
      expect(result1.newFormation.leftPair.defender).toBe('p6');
      expect(result1.newFormation.leftPair.attacker).toBe('p7');
      expect(result1.newFormation.subPair.defender).toBe('p3'); // Was attacker, now defender position
      expect(result1.newFormation.subPair.attacker).toBe('p2'); // Was defender, now attacker position

      // Second substitution: use result from first substitution
      const context2 = {
        formation: result1.newFormation,
        nextPhysicalPairToSubOut: 'leftPair', // Sub leftPair out again
        allPlayers: result1.updatedPlayers,
        currentTimeEpoch: mockCurrentTime + 60000,
        isSubTimerPaused: false
      };

      const result2 = manager.handlePairsSubstitution(context2);

      // After second substitution:
      // - p2/p3 should be back on field with their NEW roles (they were swapped when they went out)
      // - p6/p7 should be substitutes with swapped roles
      expect(result2.newFormation.leftPair.defender).toBe('p3'); // Former attacker, now defender
      expect(result2.newFormation.leftPair.attacker).toBe('p2'); // Former defender, now attacker
      expect(result2.newFormation.subPair.defender).toBe('p7'); // Was attacker, swapped to defender position
      expect(result2.newFormation.subPair.attacker).toBe('p6'); // Was defender, swapped to attacker position
    });
  });

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

  describe('Edge Cases and Error Handling', () => {
    it('should handle paused timer correctly', () => {
      // Mock the specific behavior when timer is paused - resetPlayerStintTimer returns player object
      const { resetPlayerStintTimer } = require('../../time/stintManager');
      resetPlayerStintTimer.mockImplementation((player, currentTime) => ({
        ...player,
        stats: {
          ...player.stats,
          lastStintStartTimeEpoch: currentTime
        }
      }));

      const teamConfig = {
        format: '5v5',
        squadSize: 7,
        formation: '2-2', 
        substitutionType: 'pairs',
        pairedRoleStrategy: PAIRED_ROLE_STRATEGY_TYPES.SWAP_EVERY_ROTATION
      };

      const manager = new SubstitutionManager(teamConfig);
      const formation = createPairsFormation();
      const allPlayers = createPairsPlayers();

      const context = {
        formation,
        nextPhysicalPairToSubOut: 'leftPair',
        allPlayers,
        currentTimeEpoch: mockCurrentTime,
        isSubTimerPaused: true // Timer is paused
      };

      const result = manager.handlePairsSubstitution(context);

      // Should still perform role swapping logic even when paused
      expect(result.newFormation.subPair.defender).toBe('p3');
      expect(result.newFormation.subPair.attacker).toBe('p2');

      // Verify resetPlayerStintTimer was called for paused timer
      expect(resetPlayerStintTimer).toHaveBeenCalled();
    });

    it('should handle missing team config gracefully', () => {
      const manager = new SubstitutionManager(null);
      const formation = createPairsFormation();
      const allPlayers = createPairsPlayers();

      const context = {
        formation,
        nextPhysicalPairToSubOut: 'leftPair',
        allPlayers,
        currentTimeEpoch: mockCurrentTime,
        isSubTimerPaused: false
      };

      const result = manager.handlePairsSubstitution(context);

      // Should default to keep roles behavior
      expect(result.newFormation.leftPair.defender).toBe('p6');
      expect(result.newFormation.leftPair.attacker).toBe('p7');
      expect(result.newFormation.subPair.defender).toBe('p2');
      expect(result.newFormation.subPair.attacker).toBe('p3');
    });
  });

  describe('Factory Function', () => {
    it('should create substitution manager with team config', () => {
      const teamConfig = {
        format: '5v5',
        squadSize: 7,
        formation: '2-2',
        substitutionType: 'pairs',
        pairedRoleStrategy: PAIRED_ROLE_STRATEGY_TYPES.SWAP_EVERY_ROTATION
      };

      const manager = createSubstitutionManager(teamConfig);
      expect(manager).toBeInstanceOf(SubstitutionManager);
      expect(manager.teamConfig).toBe(teamConfig);
    });
  });
});
