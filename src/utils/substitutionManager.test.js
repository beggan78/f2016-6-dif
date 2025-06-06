import { createSubstitutionManager, SubstitutionManager, calculatePlayerTimeStats } from './substitutionManager';
import { FORMATION_TYPES, PLAYER_ROLES } from './gameLogic';

describe('SubstitutionManager', () => {
  let manager;
  let mockPlayers;
  let mockFormation;

  beforeEach(() => {
    mockPlayers = [
      { id: '1', stats: { currentPeriodStatus: 'on_field', currentPeriodRole: PLAYER_ROLES.DEFENDER, lastStintStartTimeEpoch: 1000 } },
      { id: '2', stats: { currentPeriodStatus: 'on_field', currentPeriodRole: PLAYER_ROLES.ATTACKER, lastStintStartTimeEpoch: 1000 } },
      { id: '3', stats: { currentPeriodStatus: 'substitute', currentPeriodRole: PLAYER_ROLES.SUBSTITUTE, lastStintStartTimeEpoch: 1000 } },
    ];
  });

  describe('7-player pairs formation', () => {
    beforeEach(() => {
      manager = new SubstitutionManager(FORMATION_TYPES.PAIRS_7);
      mockFormation = {
        leftPair: { defender: '1', attacker: '2' },
        rightPair: { defender: '4', attacker: '5' },
        subPair: { defender: '3', attacker: '6' },
        goalie: '7'
      };
    });

    test('handles pairs substitution correctly', () => {
      const context = {
        periodFormation: mockFormation,
        nextPhysicalPairToSubOut: 'leftPair',
        allPlayers: mockPlayers,
        currentTimeEpoch: 2000
      };

      const result = manager.executeSubstitution(context);

      expect(result.newFormation.leftPair.defender).toBe('3');
      expect(result.newFormation.leftPair.attacker).toBe('6');
      expect(result.newFormation.subPair.defender).toBe('1');
      expect(result.newFormation.subPair.attacker).toBe('2');
      expect(result.newNextPhysicalPairToSubOut).toBe('rightPair');
    });
  });

  describe('6-player individual formation', () => {
    beforeEach(() => {
      manager = new SubstitutionManager(FORMATION_TYPES.INDIVIDUAL_6);
      mockFormation = {
        leftDefender: '1',
        rightDefender: '2',
        leftAttacker: '3',
        rightAttacker: '4',
        substitute: '5',
        goalie: '6'
      };
    });

    test('handles individual substitution correctly', () => {
      const context = {
        periodFormation: mockFormation,
        nextPlayerIdToSubOut: '1',
        allPlayers: mockPlayers,
        rotationQueue: ['1', '2', '3', '4', '5'],
        currentTimeEpoch: 2000
      };

      const result = manager.executeSubstitution(context);

      expect(result.newFormation.leftDefender).toBe('5');
      expect(result.newFormation.substitute).toBe('1');
      expect(result.newRotationQueue).toEqual(['2', '3', '4', '5', '1']);
    });
  });

  describe('utility functions', () => {
    beforeEach(() => {
      manager = new SubstitutionManager(FORMATION_TYPES.PAIRS_7);
    });

    test('getPositionRole returns correct roles', () => {
      expect(manager.getPositionRole('leftDefender')).toBe(PLAYER_ROLES.DEFENDER);
      expect(manager.getPositionRole('rightAttacker')).toBe(PLAYER_ROLES.ATTACKER);
      expect(manager.getPositionRole('substitute')).toBe(PLAYER_ROLES.SUBSTITUTE);
      expect(manager.getPositionRole('goalie')).toBe(PLAYER_ROLES.GOALIE);
    });

    test('calculateTimeStats updates time correctly', () => {
      const player = {
        stats: {
          currentPeriodStatus: 'on_field',
          currentPeriodRole: PLAYER_ROLES.DEFENDER,
          lastStintStartTimeEpoch: 1000,
          timeOnFieldSeconds: 0,
          timeAsDefenderSeconds: 0
        }
      };

      const updatedStats = manager.calculateTimeStats(player, 2000);

      expect(updatedStats.timeOnFieldSeconds).toBe(1);
      expect(updatedStats.timeAsDefenderSeconds).toBe(1);
      expect(updatedStats.lastStintStartTimeEpoch).toBe(2000);
    });

    test('calculatePlayerTimeStats standalone function works', () => {
      const player = {
        stats: {
          currentPeriodStatus: 'substitute',
          currentPeriodRole: PLAYER_ROLES.SUBSTITUTE,
          lastStintStartTimeEpoch: 1000,
          timeAsSubSeconds: 5
        }
      };

      const updatedStats = calculatePlayerTimeStats(player, 3000);

      expect(updatedStats.timeAsSubSeconds).toBe(7); // 5 + 2 seconds
      expect(updatedStats.lastStintStartTimeEpoch).toBe(3000);
    });
  });

  test('createSubstitutionManager factory function works', () => {
    const manager = createSubstitutionManager(FORMATION_TYPES.INDIVIDUAL_6);
    expect(manager).toBeInstanceOf(SubstitutionManager);
    expect(manager.formationType).toBe(FORMATION_TYPES.INDIVIDUAL_6);
  });
});