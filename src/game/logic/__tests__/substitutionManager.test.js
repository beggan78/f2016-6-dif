import { createSubstitutionManager, SubstitutionManager } from '../substitutionManager';
import { updatePlayerTimeStats } from '../../time/stintManager';
import { TEAM_MODES, PLAYER_ROLES } from '../../../constants/playerConstants';

describe('SubstitutionManager', () => {
  let manager;
  let mockPlayers;
  let mockFormation;

  beforeEach(() => {
    mockPlayers = [
      { id: '1', stats: { currentStatus: 'on_field', currentRole: PLAYER_ROLES.DEFENDER, lastStintStartTimeEpoch: 1000 } },
      { id: '2', stats: { currentStatus: 'on_field', currentRole: PLAYER_ROLES.ATTACKER, lastStintStartTimeEpoch: 1000 } },
      { id: '3', stats: { currentStatus: 'substitute', currentRole: PLAYER_ROLES.SUBSTITUTE, lastStintStartTimeEpoch: 1000 } },
    ];
  });

  describe('7-player pair mode', () => {
    beforeEach(() => {
      manager = new SubstitutionManager(TEAM_MODES.PAIRS_7);
      mockFormation = {
        leftPair: { defender: '1', attacker: '2' },
        rightPair: { defender: '4', attacker: '5' },
        subPair: { defender: '3', attacker: '6' },
        goalie: '7'
      };
    });

    test('handles pairs substitution correctly', () => {
      const context = {
        formation: mockFormation,
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
      manager = new SubstitutionManager(TEAM_MODES.INDIVIDUAL_6);
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
      // Create realistic player data with playing times
      const playersWithTime = [
        { id: '1', stats: { currentStatus: 'on_field', currentRole: PLAYER_ROLES.DEFENDER, lastStintStartTimeEpoch: 1000, timeOnFieldSeconds: 300, isInactive: false } },
        { id: '2', stats: { currentStatus: 'on_field', currentRole: PLAYER_ROLES.DEFENDER, lastStintStartTimeEpoch: 1000, timeOnFieldSeconds: 250, isInactive: false } },
        { id: '3', stats: { currentStatus: 'on_field', currentRole: PLAYER_ROLES.ATTACKER, lastStintStartTimeEpoch: 1000, timeOnFieldSeconds: 200, isInactive: false } },
        { id: '4', stats: { currentStatus: 'on_field', currentRole: PLAYER_ROLES.ATTACKER, lastStintStartTimeEpoch: 1000, timeOnFieldSeconds: 150, isInactive: false } },
        { id: '5', stats: { currentStatus: 'substitute', currentRole: PLAYER_ROLES.SUBSTITUTE, lastStintStartTimeEpoch: 1000, timeOnFieldSeconds: 100, isInactive: false } },
        { id: '6', stats: { currentStatus: 'goalie', currentRole: PLAYER_ROLES.GOALIE, lastStintStartTimeEpoch: 1000, timeOnFieldSeconds: 0, isInactive: false } }
      ];

      const context = {
        formation: mockFormation,
        nextPlayerIdToSubOut: '1', // Player with most time (300s) should rotate off
        allPlayers: playersWithTime,
        rotationQueue: ['1', '2', '3', '4', '5'],
        currentTimeEpoch: 2000
      };

      const result = manager.executeSubstitution(context);

      expect(result.newFormation.leftDefender).toBe('5');
      expect(result.newFormation.substitute).toBe('1');
      
      // With new logic, rotation queue should be rebuilt based on accumulated time
      // After substitution:
      // - Player '1': ~301s (300 + 1s from stint) - most time, should be first
      // - Player '2': ~251s (250 + 1s from stint)  
      // - Player '3': ~201s (200 + 1s from stint)
      // - Player '4': ~151s (150 + 1s from stint)
      // - Player '5': ~101s (100 + 1s from stint) - least time
      // The 4 with least time (2,3,4,5) go on field, ordered by most time first: [2,3,4,5]
      // Player 1 with most time becomes substitute
      expect(result.newRotationQueue).toEqual(['2', '3', '4', '5', '1']);
    });
  });

  describe('utility functions', () => {
    beforeEach(() => {
      manager = new SubstitutionManager(TEAM_MODES.PAIRS_7);
    });

    test('getPositionRole delegates to shared utility', () => {
      expect(manager.getPositionRole('leftDefender')).toBe(PLAYER_ROLES.DEFENDER);
      expect(manager.getPositionRole('rightAttacker')).toBe(PLAYER_ROLES.ATTACKER);
      expect(manager.getPositionRole('substitute_1')).toBe(PLAYER_ROLES.SUBSTITUTE);
      // Note: goalie and pairs don't have direct role mapping
      expect(manager.getPositionRole('goalie')).toBe(PLAYER_ROLES.GOALIE);
    });

    test('updatePlayerTimeStats from time module works', () => {
      const player = {
        stats: {
          currentStatus: 'substitute',
          currentRole: PLAYER_ROLES.SUBSTITUTE,
          lastStintStartTimeEpoch: 1000,
          timeAsSubSeconds: 5
        }
      };

      const updatedStats = updatePlayerTimeStats(player, 3000);

      expect(updatedStats.timeAsSubSeconds).toBe(7); // 5 + 2 seconds
      expect(updatedStats.lastStintStartTimeEpoch).toBe(3000);
    });
  });

  test('createSubstitutionManager factory function works', () => {
    const manager = createSubstitutionManager(TEAM_MODES.INDIVIDUAL_6);
    expect(manager).toBeInstanceOf(SubstitutionManager);
    expect(manager.teamMode).toBe(TEAM_MODES.INDIVIDUAL_6);
  });

  describe('conditional time tracking fix', () => {
    describe('normal substitution (timer not paused)', () => {
      test('should accumulate time during pairs substitution', () => {
        const manager = new SubstitutionManager(TEAM_MODES.PAIRS_7);
        const mockPlayersWithTime = [
          { 
            id: '1', 
            stats: { 
              currentStatus: 'on_field',
              currentRole: PLAYER_ROLES.DEFENDER,
              lastStintStartTimeEpoch: 1000,
              timeOnFieldSeconds: 50,
              timeAsDefenderSeconds: 30
            } 
          },
          { 
            id: '2', 
            stats: { 
              currentStatus: 'on_field',
              currentRole: PLAYER_ROLES.ATTACKER,
              lastStintStartTimeEpoch: 1000,
              timeOnFieldSeconds: 40,
              timeAsAttackerSeconds: 25
            } 
          },
          { 
            id: '3', 
            stats: { 
              currentStatus: 'substitute',
              currentRole: PLAYER_ROLES.SUBSTITUTE,
              lastStintStartTimeEpoch: 1000,
              timeOnFieldSeconds: 20,
              timeAsSubSeconds: 15
            } 
          },
        ];

        const context = {
          formation: {
            leftPair: { defender: '1', attacker: '2' },
            rightPair: { defender: '4', attacker: '5' },
            subPair: { defender: '3', attacker: '6' },
            goalie: '7'
          },
          nextPhysicalPairToSubOut: 'leftPair',
          allPlayers: mockPlayersWithTime,
          currentTimeEpoch: 11000, // 10 seconds later
          isSubTimerPaused: false // Normal substitution
        };

        const result = manager.executeSubstitution(context);

        // Player 1 (going off) should have accumulated 10 seconds
        const player1 = result.updatedPlayers.find(p => p.id === '1');
        expect(player1.stats.timeOnFieldSeconds).toBe(60); // 50 + 10
        expect(player1.stats.timeAsDefenderSeconds).toBe(40); // 30 + 10

        // Player 3 (coming on) should have accumulated substitute time
        const player3 = result.updatedPlayers.find(p => p.id === '3');
        expect(player3.stats.timeAsSubSeconds).toBe(25); // 15 + 10
      });

      test('should accumulate time during individual6 substitution', () => {
        const manager = new SubstitutionManager(TEAM_MODES.INDIVIDUAL_6);
        const mockPlayersWithTime = [
          { 
            id: '1', 
            stats: { 
              currentStatus: 'on_field',
              currentRole: PLAYER_ROLES.DEFENDER,
              lastStintStartTimeEpoch: 2000,
              timeOnFieldSeconds: 120,
              timeAsDefenderSeconds: 80
            } 
          },
          { 
            id: '5', 
            stats: { 
              currentStatus: 'substitute',
              currentRole: PLAYER_ROLES.SUBSTITUTE,
              lastStintStartTimeEpoch: 2000,
              timeAsSubSeconds: 60
            } 
          },
        ];

        const context = {
          formation: {
            leftDefender: '1',
            rightDefender: '2',
            leftAttacker: '3',
            rightAttacker: '4',
            substitute: '5',
            goalie: '6'
          },
          nextPlayerIdToSubOut: '1',
          allPlayers: mockPlayersWithTime,
          rotationQueue: ['1', '2', '3', '4', '5'],
          currentTimeEpoch: 17000, // 15 seconds later
          isSubTimerPaused: false
        };

        const result = manager.executeSubstitution(context);

        // Player 1 (going off) should have accumulated 15 seconds
        const player1 = result.updatedPlayers.find(p => p.id === '1');
        expect(player1.stats.timeOnFieldSeconds).toBe(135); // 120 + 15
        expect(player1.stats.timeAsDefenderSeconds).toBe(95); // 80 + 15

        // Player 5 (coming on) should have accumulated substitute time
        const player5 = result.updatedPlayers.find(p => p.id === '5');
        expect(player5.stats.timeAsSubSeconds).toBe(75); // 60 + 15
      });
    });

    describe('pause substitution (timer paused)', () => {
      test('should NOT accumulate time during pairs substitution when paused', () => {
        const manager = new SubstitutionManager(TEAM_MODES.PAIRS_7);
        const mockPlayersWithTime = [
          { 
            id: '1', 
            stats: { 
              currentStatus: 'on_field',
              currentRole: PLAYER_ROLES.DEFENDER,
              lastStintStartTimeEpoch: 1000,
              timeOnFieldSeconds: 100,
              timeAsDefenderSeconds: 70
            } 
          },
          { 
            id: '3', 
            stats: { 
              currentStatus: 'substitute',
              currentRole: PLAYER_ROLES.SUBSTITUTE,
              lastStintStartTimeEpoch: 1000,
              timeAsSubSeconds: 30
            } 
          },
        ];

        const context = {
          formation: {
            leftPair: { defender: '1', attacker: '2' },
            subPair: { defender: '3', attacker: '6' }
          },
          nextPhysicalPairToSubOut: 'leftPair',
          allPlayers: mockPlayersWithTime,
          currentTimeEpoch: 31000, // 30 seconds later (during pause)
          isSubTimerPaused: true // Pause substitution
        };

        const result = manager.executeSubstitution(context);

        // Player 1 (going off) should NOT have accumulated the 30 seconds
        const player1 = result.updatedPlayers.find(p => p.id === '1');
        expect(player1.stats.timeOnFieldSeconds).toBe(100); // unchanged
        expect(player1.stats.timeAsDefenderSeconds).toBe(70); // unchanged

        // Player 3 (coming on) should NOT have accumulated substitute time
        const player3 = result.updatedPlayers.find(p => p.id === '3');
        expect(player3.stats.timeAsSubSeconds).toBe(30); // unchanged
      });

      test('should NOT accumulate time during individual7 substitution when paused', () => {
        const manager = new SubstitutionManager(TEAM_MODES.INDIVIDUAL_7);
        const mockPlayersWithTime = [
          { 
            id: '1', 
            stats: { 
              currentStatus: 'on_field',
              currentRole: PLAYER_ROLES.ATTACKER,
              lastStintStartTimeEpoch: 5000,
              timeOnFieldSeconds: 200,
              timeAsAttackerSeconds: 150
            } 
          },
          { 
            id: '8', 
            stats: { 
              currentStatus: 'substitute',
              currentRole: PLAYER_ROLES.SUBSTITUTE,
              lastStintStartTimeEpoch: 5000,
              timeAsSubSeconds: 50
            } 
          },
        ];

        const context = {
          formation: {
            leftDefender: '1',
            substitute_1: '8',
            substitute_2: '9'
          },
          nextPlayerIdToSubOut: '1',
          allPlayers: mockPlayersWithTime,
          rotationQueue: ['1', '2', '3', '4', '8', '9'],
          currentTimeEpoch: 25000, // 20 seconds later (during pause)
          isSubTimerPaused: true // Pause substitution
        };

        const result = manager.executeSubstitution(context);

        // Player 1 (going off) should NOT have accumulated the 20 seconds
        const player1 = result.updatedPlayers.find(p => p.id === '1');
        expect(player1.stats.timeOnFieldSeconds).toBe(200); // unchanged
        expect(player1.stats.timeAsAttackerSeconds).toBe(150); // unchanged

        // Player 8 (coming on) should NOT have accumulated substitute time
        const player8 = result.updatedPlayers.find(p => p.id === '8');
        expect(player8.stats.timeAsSubSeconds).toBe(50); // unchanged
      });
    });
  });
});