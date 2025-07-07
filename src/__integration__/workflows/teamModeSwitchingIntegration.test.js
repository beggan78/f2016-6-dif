/**
 * Integration tests for team mode switching functionality
 * Tests rotation queue preservation during PAIRS_7 ↔ INDIVIDUAL_7 transitions
 */

import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../../hooks/useGameState';
import { TEAM_MODES } from '../../constants/playerConstants';

describe('Team Mode Switching Integration', () => {
  let result;

  const initializeWith7Players = () => {
    act(() => {
      // Initialize with 7 players
      const players = Array.from({ length: 7 }, (_, i) => ({
        id: (i + 1).toString(),
        name: `Player ${i + 1}`,
        stats: {
          isInactive: false,
          currentPeriodStatus: i < 4 ? 'on_field' : i < 6 ? 'sub' : 'goalie',
          currentPeriodRole: i < 2 ? 'Defender' : i < 4 ? 'Attacker' : i < 6 ? 'Substitute' : 'Goalie',
          currentPairKey: i < 2 ? 'leftPair' : i < 4 ? 'rightPair' : i < 6 ? 'subPair' : 'goalie',
          lastStintStartTimeEpoch: Date.now(),
          timeOnFieldSeconds: 0,
          timeAsAttackerSeconds: 0,
          timeAsDefenderSeconds: 0,
          timeAsSubSeconds: 0,
          timeAsGoalieSeconds: 0,
          startedMatchAs: 'ON_FIELD'
        }
      }));

      result.current.setAllPlayers(players);
      result.current.setSelectedSquadIds(players.map(p => p.id));
      result.current.setTeamMode(TEAM_MODES.PAIRS_7);
      
      // Set up pairs formation
      result.current.setPeriodFormation({
        leftPair: { defender: '1', attacker: '2' },
        rightPair: { defender: '3', attacker: '4' },
        subPair: { defender: '5', attacker: '6' },
        goalie: '7',
        leftDefender: null,
        rightDefender: null,
        leftAttacker: null,
        rightAttacker: null,
        substitute: null,
        leftDefender7: null,
        rightDefender7: null,
        leftAttacker7: null,
        rightAttacker7: null,
        substitute7_1: null,
        substitute7_2: null
      });
    });
  };

  beforeEach(() => {
    // Clear any existing localStorage
    localStorage.clear();
    
    ({ result } = renderHook(() => useGameState()));
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('PAIRS_7 → INDIVIDUAL_7 (splitPairs)', () => {
    it('should preserve rotation order when leftPair is next to substitute', () => {
      initializeWith7Players();
      
      act(() => {
        // Set leftPair as next to substitute
        result.current.setNextPhysicalPairToSubOut('leftPair');
      });

      act(() => {
        // Split pairs to individual mode
        result.current.splitPairs();
      });

      // Verify team mode changed
      expect(result.current.teamMode).toBe(TEAM_MODES.INDIVIDUAL_7);

      // Verify formation conversion
      const formation = result.current.periodFormation;
      expect(formation.leftDefender7).toBe('1');
      expect(formation.leftAttacker7).toBe('2');
      expect(formation.rightDefender7).toBe('3');
      expect(formation.rightAttacker7).toBe('4');
      expect(formation.substitute7_1).toBe('5');
      expect(formation.substitute7_2).toBe('6');

      // Verify rotation queue preserves leftPair priority
      const queue = result.current.rotationQueue;
      expect(queue.slice(0, 2)).toEqual(['1', '2']); // leftPair first
      expect(result.current.nextPlayerIdToSubOut).toBe('1');
      expect(result.current.nextNextPlayerIdToSubOut).toBe('2');
    });

    it('should preserve rotation order when rightPair is next to substitute', () => {
      initializeWith7Players();
      
      act(() => {
        // Set rightPair as next to substitute
        result.current.setNextPhysicalPairToSubOut('rightPair');
      });

      act(() => {
        // Split pairs to individual mode
        result.current.splitPairs();
      });

      // Verify rotation queue preserves rightPair priority
      const queue = result.current.rotationQueue;
      expect(queue.slice(0, 2)).toEqual(['3', '4']); // rightPair first
      expect(result.current.nextPlayerIdToSubOut).toBe('3');
      expect(result.current.nextNextPlayerIdToSubOut).toBe('4');
    });

    it('should preserve rotation order when subPair is next to substitute', () => {
      initializeWith7Players();
      
      act(() => {
        // Set subPair as next to substitute
        result.current.setNextPhysicalPairToSubOut('subPair');
      });

      act(() => {
        // Split pairs to individual mode
        result.current.splitPairs();
      });

      // Verify rotation queue preserves subPair priority
      const queue = result.current.rotationQueue;
      expect(queue.slice(0, 2)).toEqual(['5', '6']); // subPair first
      expect(result.current.nextPlayerIdToSubOut).toBe('5');
      expect(result.current.nextNextPlayerIdToSubOut).toBe('6');
    });

    it('should update player currentPairKey mappings correctly', () => {
      initializeWith7Players();
      
      act(() => {
        result.current.splitPairs();
      });

      const players = result.current.allPlayers;
      
      // Verify currentPairKey mappings
      expect(players.find(p => p.id === '1').stats.currentPairKey).toBe('leftDefender7');
      expect(players.find(p => p.id === '2').stats.currentPairKey).toBe('leftAttacker7');
      expect(players.find(p => p.id === '3').stats.currentPairKey).toBe('rightDefender7');
      expect(players.find(p => p.id === '4').stats.currentPairKey).toBe('rightAttacker7');
      expect(players.find(p => p.id === '5').stats.currentPairKey).toBe('substitute7_1');
      expect(players.find(p => p.id === '6').stats.currentPairKey).toBe('substitute7_2');
      expect(players.find(p => p.id === '7').stats.currentPairKey).toBe('goalie');
    });
  });

  describe('INDIVIDUAL_7 → PAIRS_7 (formPairs)', () => {
    const setupIndividualMode = (rotationQueue) => {
      act(() => {
        // Initialize with 7 players in individual mode
        const players = Array.from({ length: 7 }, (_, i) => ({
          id: (i + 1).toString(),
          name: `Player ${i + 1}`,
          stats: {
            isInactive: false,
            currentPeriodStatus: i < 4 ? 'on_field' : i < 6 ? 'sub' : 'goalie',
            currentPeriodRole: i < 2 ? 'Defender' : i < 4 ? 'Attacker' : i < 6 ? 'Substitute' : 'Goalie',
            currentPairKey: i === 0 ? 'leftDefender7' : i === 1 ? 'leftAttacker7' : 
                           i === 2 ? 'rightDefender7' : i === 3 ? 'rightAttacker7' :
                           i === 4 ? 'substitute7_1' : i === 5 ? 'substitute7_2' : 'goalie',
            lastStintStartTimeEpoch: Date.now(),
            timeOnFieldSeconds: 0,
            timeAsAttackerSeconds: 0,
            timeAsDefenderSeconds: 0,
            timeAsSubSeconds: 0,
            timeAsGoalieSeconds: 0,
            startedMatchAs: 'ON_FIELD'
          }
        }));

        result.current.setAllPlayers(players);
        result.current.setSelectedSquadIds(players.map(p => p.id));
        result.current.setTeamMode(TEAM_MODES.INDIVIDUAL_7);
        
        // Set up individual formation
        result.current.setPeriodFormation({
          leftPair: { defender: null, attacker: null },
          rightPair: { defender: null, attacker: null },
          subPair: { defender: null, attacker: null },
          goalie: '7',
          leftDefender: null,
          rightDefender: null,
          leftAttacker: null,
          rightAttacker: null,
          substitute: null,
          leftDefender7: '1',
          rightDefender7: '3',
          leftAttacker7: '2',
          rightAttacker7: '4',
          substitute7_1: '5',
          substitute7_2: '6'
        });

        // Set rotation queue
        result.current.setRotationQueue(rotationQueue);
      });
    };

    it('should identify leftPair as next when leftPair players lead rotation queue', () => {
      setupIndividualMode(['1', '2', '3', '4', '5', '6']); // leftPair first

      act(() => {
        result.current.formPairs();
      });

      // Verify team mode changed
      expect(result.current.teamMode).toBe(TEAM_MODES.PAIRS_7);

      // Verify leftPair is set as next to substitute
      expect(result.current.nextPhysicalPairToSubOut).toBe('leftPair');

      // Verify formation conversion
      const formation = result.current.periodFormation;
      expect(formation.leftPair).toEqual({ defender: '1', attacker: '2' });
      expect(formation.rightPair).toEqual({ defender: '3', attacker: '4' });
      expect(formation.subPair).toEqual({ defender: '5', attacker: '6' });
    });

    it('should identify rightPair as next when rightPair players lead rotation queue', () => {
      setupIndividualMode(['3', '4', '5', '6', '1', '2']); // rightPair first

      act(() => {
        result.current.formPairs();
      });

      // Verify rightPair is set as next to substitute
      expect(result.current.nextPhysicalPairToSubOut).toBe('rightPair');
    });

    it('should identify subPair as next when substitute players lead rotation queue', () => {
      setupIndividualMode(['5', '6', '1', '2', '3', '4']); // subPair first

      act(() => {
        result.current.formPairs();
      });

      // Verify subPair is set as next to substitute
      expect(result.current.nextPhysicalPairToSubOut).toBe('subPair');
    });

    it('should handle single player from pair leading queue', () => {
      setupIndividualMode(['3', '1', '2', '4', '5', '6']); // rightDefender first

      act(() => {
        result.current.formPairs();
      });

      // Should still identify rightPair since player 3 belongs to rightPair
      expect(result.current.nextPhysicalPairToSubOut).toBe('rightPair');
    });

    it('should default to leftPair for unrecognizable queue patterns', () => {
      setupIndividualMode(['99', '98', '1', '2', '3', '4']); // Unknown players first

      act(() => {
        result.current.formPairs();
      });

      // Should default to leftPair
      expect(result.current.nextPhysicalPairToSubOut).toBe('leftPair');
    });

    it('should update player currentPairKey mappings correctly', () => {
      setupIndividualMode(['1', '2', '3', '4', '5', '6']);

      act(() => {
        result.current.formPairs();
      });

      const players = result.current.allPlayers;
      
      // Verify currentPairKey mappings
      expect(players.find(p => p.id === '1').stats.currentPairKey).toBe('leftPair');
      expect(players.find(p => p.id === '2').stats.currentPairKey).toBe('leftPair');
      expect(players.find(p => p.id === '3').stats.currentPairKey).toBe('rightPair');
      expect(players.find(p => p.id === '4').stats.currentPairKey).toBe('rightPair');
      expect(players.find(p => p.id === '5').stats.currentPairKey).toBe('subPair');
      expect(players.find(p => p.id === '6').stats.currentPairKey).toBe('subPair');
      expect(players.find(p => p.id === '7').stats.currentPairKey).toBe('goalie');
    });

    it('should clear individual mode tracking fields', () => {
      setupIndividualMode(['1', '2', '3', '4', '5', '6']);

      act(() => {
        result.current.formPairs();
      });

      // Verify individual mode fields are cleared
      expect(result.current.rotationQueue).toEqual([]);
      expect(result.current.nextPlayerIdToSubOut).toBeNull();
      expect(result.current.nextNextPlayerIdToSubOut).toBeNull();
      expect(result.current.nextPlayerToSubOut).toBeNull();
    });
  });

  describe('Round-trip consistency', () => {
    it('should maintain rotation order through complete round-trip conversion', () => {
      initializeWith7Players();
      
      // Start with rightPair as next
      act(() => {
        result.current.setNextPhysicalPairToSubOut('rightPair');
      });

      // Split to individual
      act(() => {
        result.current.splitPairs();
      });

      // Verify rightPair players are first in queue
      const individualQueue = result.current.rotationQueue;
      expect(individualQueue.slice(0, 2)).toEqual(['3', '4']);

      // Form pairs again
      act(() => {
        result.current.formPairs();
      });

      // Should restore rightPair as next
      expect(result.current.nextPhysicalPairToSubOut).toBe('rightPair');
    });

    it('should handle edge case with mixed rotation queue order', () => {
      initializeWith7Players();
      
      // Start with subPair as next
      act(() => {
        result.current.setNextPhysicalPairToSubOut('subPair');
      });

      // Split to individual
      act(() => {
        result.current.splitPairs();
      });

      // Manually modify queue to mixed order (simulating manual changes)
      act(() => {
        result.current.setRotationQueue(['5', '1', '6', '2', '3', '4']);
      });

      // Form pairs again
      act(() => {
        result.current.formPairs();
      });

      // Should identify subPair as next since player 5 (substitute7_1) is first
      expect(result.current.nextPhysicalPairToSubOut).toBe('subPair');
    });
  });

  describe('Error handling', () => {
    it('should handle splitPairs when not in PAIRS_7 mode', () => {
      // Start in INDIVIDUAL_6 mode
      act(() => {
        result.current.setTeamMode(TEAM_MODES.INDIVIDUAL_6);
      });

      act(() => {
        result.current.splitPairs();
      });

      // Should remain in INDIVIDUAL_6 mode
      expect(result.current.teamMode).toBe(TEAM_MODES.INDIVIDUAL_6);
    });

    it('should handle formPairs when not in INDIVIDUAL_7 mode', () => {
      // Start in PAIRS_7 mode
      act(() => {
        result.current.setTeamMode(TEAM_MODES.PAIRS_7);
      });

      act(() => {
        result.current.formPairs();
      });

      // Should remain in PAIRS_7 mode
      expect(result.current.teamMode).toBe(TEAM_MODES.PAIRS_7);
    });

    it('should handle incomplete formation data gracefully', () => {
      initializeWith7Players();
      
      // Set incomplete formation
      act(() => {
        result.current.setPeriodFormation({
          leftPair: { defender: '1', attacker: null },
          rightPair: { defender: null, attacker: '4' },
          subPair: { defender: '5', attacker: '6' },
          goalie: '7'
        });
        result.current.setNextPhysicalPairToSubOut('leftPair');
      });

      act(() => {
        result.current.splitPairs();
      });

      // Should handle gracefully and create valid queue
      const queue = result.current.rotationQueue;
      expect(queue).toContain('1'); // leftPair defender should be included
      expect(queue).toContain('4'); // rightPair attacker should be included
      expect(queue).toContain('5'); // subPair defender should be included
      expect(queue).toContain('6'); // subPair attacker should be included
      expect(queue).not.toContain(null);
      expect(queue).not.toContain(undefined);
    });
  });
});