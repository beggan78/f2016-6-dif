import {
  analyzePairsRotationState,
  createIndividualQueueFromPairs,
  analyzePairsFromIndividualQueue,
  createPrioritizedRotationQueue,
  convertToPairFormation
} from '../queueStateUtils';

describe('queueStateUtils', () => {
  const mockPeriodFormation = {
    leftPair: { defender: '1', attacker: '2' },
    rightPair: { defender: '3', attacker: '4' },
    subPair: { defender: '5', attacker: '6' },
    goalie: '7',
    leftDefender: '1',
    rightDefender: '3',
    leftAttacker: '2',
    rightAttacker: '4',
    substitute_1: '5',
    substitute_2: '6'
  };

  describe('analyzePairsRotationState', () => {
    it('should prioritize left pair when left pair is next', () => {
      const result = analyzePairsRotationState('leftPair', mockPeriodFormation);
      
      expect(result.nextPair).toBe('leftPair');
      expect(result.priorityOrder).toEqual(['leftPair', 'rightPair', 'subPair']);
      expect(result.nextPairPlayers).toEqual(['1', '2']);
    });

    it('should prioritize right pair when right pair is next', () => {
      const result = analyzePairsRotationState('rightPair', mockPeriodFormation);
      
      expect(result.nextPair).toBe('rightPair');
      expect(result.priorityOrder).toEqual(['rightPair', 'subPair', 'leftPair']);
      expect(result.nextPairPlayers).toEqual(['3', '4']);
    });

    it('should prioritize sub pair when sub pair is next', () => {
      const result = analyzePairsRotationState('subPair', mockPeriodFormation);
      
      expect(result.nextPair).toBe('subPair');
      expect(result.priorityOrder).toEqual(['subPair', 'leftPair', 'rightPair']);
      expect(result.nextPairPlayers).toEqual(['5', '6']);
    });

    it('should default to left pair for invalid input', () => {
      const result = analyzePairsRotationState('invalidPair', mockPeriodFormation);
      
      expect(result.nextPair).toBe('leftPair');
      expect(result.priorityOrder).toEqual(['leftPair', 'rightPair', 'subPair']);
      expect(result.nextPairPlayers).toEqual(['1', '2']);
    });

    it('should handle missing pair members gracefully', () => {
      const incompleteFormation = {
        leftPair: { defender: '1', attacker: null },
        rightPair: { defender: '3', attacker: '4' },
        subPair: { defender: null, attacker: '6' }
      };
      
      const result = analyzePairsRotationState('leftPair', incompleteFormation);
      
      expect(result.nextPair).toBe('leftPair');
      expect(result.nextPairPlayers).toEqual(['1']); // Only defender, attacker filtered out
    });
  });

  describe('createIndividualQueueFromPairs', () => {
    it('should create queue respecting left pair priority', () => {
      const pairsAnalysis = {
        priorityOrder: ['leftPair', 'rightPair', 'subPair'],
        nextPairPlayers: ['1', '2']
      };
      
      const result = createIndividualQueueFromPairs(pairsAnalysis, mockPeriodFormation);
      
      expect(result.queue).toEqual(['1', '2', '3', '4', '5', '6']);
      expect(result.nextPlayerId).toBe('1');
      expect(result.nextNextPlayerId).toBe('2');
    });

    it('should create queue respecting right pair priority', () => {
      const pairsAnalysis = {
        priorityOrder: ['rightPair', 'subPair', 'leftPair'],
        nextPairPlayers: ['3', '4']
      };
      
      const result = createIndividualQueueFromPairs(pairsAnalysis, mockPeriodFormation);
      
      expect(result.queue).toEqual(['3', '4', '5', '6', '1', '2']);
      expect(result.nextPlayerId).toBe('3');
      expect(result.nextNextPlayerId).toBe('4');
    });

    it('should create queue respecting sub pair priority', () => {
      const pairsAnalysis = {
        priorityOrder: ['subPair', 'leftPair', 'rightPair'],
        nextPairPlayers: ['5', '6']
      };
      
      const result = createIndividualQueueFromPairs(pairsAnalysis, mockPeriodFormation);
      
      expect(result.queue).toEqual(['5', '6', '1', '2', '3', '4']);
      expect(result.nextPlayerId).toBe('5');
      expect(result.nextNextPlayerId).toBe('6');
    });

    it('should filter out null/undefined players', () => {
      const incompleteFormation = {
        leftPair: { defender: '1', attacker: null },
        rightPair: { defender: null, attacker: '4' },
        subPair: { defender: '5', attacker: '6' }
      };
      
      const pairsAnalysis = {
        priorityOrder: ['leftPair', 'rightPair', 'subPair'],
        nextPairPlayers: ['1']
      };
      
      const result = createIndividualQueueFromPairs(pairsAnalysis, incompleteFormation);
      
      expect(result.queue).toEqual(['1', '4', '5', '6']);
      expect(result.nextPlayerId).toBe('1');
      expect(result.nextNextPlayerId).toBe('4');
    });

    it('should handle empty queue scenario', () => {
      const emptyFormation = {
        leftPair: { defender: null, attacker: null },
        rightPair: { defender: null, attacker: null },
        subPair: { defender: null, attacker: null }
      };
      
      const pairsAnalysis = {
        priorityOrder: ['leftPair', 'rightPair', 'subPair'],
        nextPairPlayers: []
      };
      
      const result = createIndividualQueueFromPairs(pairsAnalysis, emptyFormation);
      
      expect(result.queue).toEqual([]);
      expect(result.nextPlayerId).toBeNull();
      expect(result.nextNextPlayerId).toBeNull();
    });
  });

  describe('analyzePairsFromIndividualQueue', () => {
    it('should identify left pair when left defender is next', () => {
      const rotationQueue = ['1', '3', '2', '4', '5', '6'];
      
      const result = analyzePairsFromIndividualQueue(rotationQueue, mockPeriodFormation);
      
      expect(result.nextPair).toBe('leftPair');
      expect(result.reasoning).toBe('next-player-match');
    });

    it('should identify right pair when right attacker is next', () => {
      const rotationQueue = ['4', '1', '2', '3', '5', '6'];
      
      const result = analyzePairsFromIndividualQueue(rotationQueue, mockPeriodFormation);
      
      expect(result.nextPair).toBe('rightPair');
      expect(result.reasoning).toBe('next-player-match');
    });

    it('should identify sub pair when substitute is next', () => {
      const rotationQueue = ['5', '6', '1', '2', '3', '4'];
      
      const result = analyzePairsFromIndividualQueue(rotationQueue, mockPeriodFormation);
      
      expect(result.nextPair).toBe('subPair');
      expect(result.reasoning).toBe('next-two-players-match'); // Both sub pair players are first
    });

    it('should match when next two players form a complete pair', () => {
      const rotationQueue = ['1', '2', '3', '4', '5', '6'];
      
      const result = analyzePairsFromIndividualQueue(rotationQueue, mockPeriodFormation);
      
      expect(result.nextPair).toBe('leftPair');
      expect(result.reasoning).toBe('next-two-players-match');
    });

    it('should default to left pair for empty queue', () => {
      const result = analyzePairsFromIndividualQueue([], mockPeriodFormation);
      
      expect(result.nextPair).toBe('leftPair');
      expect(result.reasoning).toBe('default');
    });

    it('should default to left pair when no match found', () => {
      const rotationQueue = ['99', '98', '97']; // Non-existent players
      
      const result = analyzePairsFromIndividualQueue(rotationQueue, mockPeriodFormation);
      
      expect(result.nextPair).toBe('leftPair');
      expect(result.reasoning).toBe('fallback');
    });

    it('should handle null/undefined queue', () => {
      const result = analyzePairsFromIndividualQueue(null, mockPeriodFormation);
      
      expect(result.nextPair).toBe('leftPair');
      expect(result.reasoning).toBe('default');
    });
  });

  describe('createPrioritizedRotationQueue', () => {
    it('should prioritize left pair players first', () => {
      const result = createPrioritizedRotationQueue('leftPair', mockPeriodFormation);
      
      expect(result).toEqual(['1', '2', '3', '4', '5', '6']);
    });

    it('should prioritize right pair players first', () => {
      const result = createPrioritizedRotationQueue('rightPair', mockPeriodFormation);
      
      expect(result).toEqual(['3', '4', '5', '6', '1', '2']);
    });

    it('should prioritize sub pair players first', () => {
      const result = createPrioritizedRotationQueue('subPair', mockPeriodFormation);
      
      expect(result).toEqual(['5', '6', '1', '2', '3', '4']);
    });

    it('should filter out null/undefined players', () => {
      const incompleteFormation = {
        leftPair: { defender: '1', attacker: null },
        rightPair: { defender: null, attacker: '4' },
        subPair: { defender: '5', attacker: '6' }
      };
      
      const result = createPrioritizedRotationQueue('leftPair', incompleteFormation);
      
      expect(result).toEqual(['1', '4', '5', '6']);
    });
  });

  describe('convertToPairFormation', () => {
    it('should convert individual formation to pair structure', () => {
      const result = convertToPairFormation(mockPeriodFormation);
      
      expect(result).toEqual({
        leftPair: { defender: '1', attacker: '2' },
        rightPair: { defender: '3', attacker: '4' },
        subPair: { defender: '5', attacker: '6' },
        goalie: '7'
      });
    });

    it('should handle missing individual positions', () => {
      const incompleteFormation = {
        leftDefender: '1',
        rightDefender: null,
        leftAttacker: '2',
        rightAttacker: '4',
        substitute_1: null,
        substitute_2: '6',
        goalie: '7'
      };
      
      const result = convertToPairFormation(incompleteFormation);
      
      expect(result).toEqual({
        leftPair: { defender: '1', attacker: '2' },
        rightPair: { defender: null, attacker: '4' },
        subPair: { defender: null, attacker: '6' },
        goalie: '7'
      });
    });
  });

  describe('integration scenarios', () => {
    it('should preserve rotation order through splitPairs flow', () => {
      // Scenario: rightPair is next to substitute in pairs mode
      const pairsAnalysis = analyzePairsRotationState('rightPair', mockPeriodFormation);
      const individualQueue = createIndividualQueueFromPairs(pairsAnalysis, mockPeriodFormation);
      
      // Right pair players should be first in individual queue
      expect(individualQueue.queue.slice(0, 2)).toEqual(['3', '4']);
      expect(individualQueue.nextPlayerId).toBe('3');
      expect(individualQueue.nextNextPlayerId).toBe('4');
    });

    it('should restore rotation order through formPairs flow', () => {
      // Scenario: Individual queue has right pair players first
      const rotationQueue = ['3', '4', '5', '6', '1', '2'];
      const pairsAnalysis = analyzePairsFromIndividualQueue(rotationQueue, mockPeriodFormation);
      
      // Should identify right pair as next
      expect(pairsAnalysis.nextPair).toBe('rightPair');
      expect(pairsAnalysis.reasoning).toBe('next-two-players-match');
    });

    it('should handle round-trip conversion consistency', () => {
      // Start with sub pair as next
      const originalPairsAnalysis = analyzePairsRotationState('subPair', mockPeriodFormation);
      const individualQueue = createIndividualQueueFromPairs(originalPairsAnalysis, mockPeriodFormation);
      
      // Convert back to pairs
      const restoredPairsAnalysis = analyzePairsFromIndividualQueue(individualQueue.queue, mockPeriodFormation);
      
      // Should restore original sub pair priority
      expect(restoredPairsAnalysis.nextPair).toBe('subPair');
    });
  });
});