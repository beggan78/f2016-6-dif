import {
  areMatchListsEqual,
  areSelectionMapsEqual,
  areStatusMapsEqual,
  areIdListsEqual
} from '../comparisonUtils';

describe('comparisonUtils', () => {
  describe('areMatchListsEqual', () => {
    it('returns true for the same reference', () => {
      const matches = [{ id: 1, opponent: 'A', matchDate: '2030-01-01', matchTime: '10:00' }];
      expect(areMatchListsEqual(matches, matches)).toBe(true);
    });

    it('returns false when inputs are not arrays', () => {
      expect(areMatchListsEqual(null, [])).toBe(false);
      expect(areMatchListsEqual([], undefined)).toBe(false);
    });

    it('returns false for different lengths', () => {
      const left = [{ id: 1, opponent: 'A', matchDate: '2030-01-01', matchTime: '10:00' }];
      const right = [...left, { id: 2, opponent: 'B', matchDate: '2030-01-02', matchTime: '12:00' }];
      expect(areMatchListsEqual(left, right)).toBe(false);
    });

    it('compares match fields with id coercion', () => {
      const left = [{ id: 1, opponent: 'A', matchDate: '2030-01-01', matchTime: '10:00' }];
      const right = [{ id: '1', opponent: 'A', matchDate: '2030-01-01', matchTime: '10:00' }];
      expect(areMatchListsEqual(left, right)).toBe(true);
    });

    it('detects mismatched match details', () => {
      const base = [{ id: 1, opponent: 'A', matchDate: '2030-01-01', matchTime: '10:00' }];
      const opponentDiff = [{ id: 1, opponent: 'B', matchDate: '2030-01-01', matchTime: '10:00' }];
      const dateDiff = [{ id: 1, opponent: 'A', matchDate: '2030-01-02', matchTime: '10:00' }];
      const timeDiff = [{ id: 1, opponent: 'A', matchDate: '2030-01-01', matchTime: '11:00' }];

      expect(areMatchListsEqual(base, opponentDiff)).toBe(false);
      expect(areMatchListsEqual(base, dateDiff)).toBe(false);
      expect(areMatchListsEqual(base, timeDiff)).toBe(false);
    });

    it('returns false when any match entry is missing', () => {
      const left = [{ id: 1, opponent: 'A', matchDate: '2030-01-01', matchTime: '10:00' }];
      const right = [null];
      expect(areMatchListsEqual(left, right)).toBe(false);
    });
  });

  describe('areSelectionMapsEqual', () => {
    it('returns true for the same reference', () => {
      const map = { match1: ['p1'] };
      expect(areSelectionMapsEqual(map, map)).toBe(true);
    });

    it('treats null or undefined maps as empty', () => {
      expect(areSelectionMapsEqual(null, undefined)).toBe(true);
      expect(areSelectionMapsEqual(null, { match1: [] })).toBe(false);
    });

    it('returns false when keys differ', () => {
      expect(areSelectionMapsEqual({ match1: ['p1'] }, { match2: ['p1'] })).toBe(false);
    });

    it('compares selections with id coercion', () => {
      const left = { match1: [1, '2'] };
      const right = { match1: ['1', 2] };
      expect(areSelectionMapsEqual(left, right)).toBe(true);
    });

    it('returns false when selection lengths differ', () => {
      const left = { match1: ['p1'] };
      const right = { match1: ['p1', 'p2'] };
      expect(areSelectionMapsEqual(left, right)).toBe(false);
    });

    it('treats non-array values as empty lists', () => {
      const left = { match1: 'not-an-array' };
      const right = { match1: [] };
      expect(areSelectionMapsEqual(left, right)).toBe(true);
    });
  });

  describe('areStatusMapsEqual', () => {
    it('returns true for the same reference', () => {
      const map = { match1: 'done' };
      expect(areStatusMapsEqual(map, map)).toBe(true);
    });

    it('treats null or undefined as empty map', () => {
      expect(areStatusMapsEqual(null, undefined)).toBe(true);
      expect(areStatusMapsEqual(null, { match1: 'done' })).toBe(false);
    });

    it('returns false when keys or values differ', () => {
      expect(areStatusMapsEqual({ match1: 'done' }, { match2: 'done' })).toBe(false);
      expect(areStatusMapsEqual({ match1: 'done' }, { match1: 'todo' })).toBe(false);
    });
  });

  describe('areIdListsEqual', () => {
    it('returns true for the same reference', () => {
      const list = ['1', '2'];
      expect(areIdListsEqual(list, list)).toBe(true);
    });

    it('returns false when inputs are not arrays', () => {
      expect(areIdListsEqual(null, [])).toBe(false);
      expect(areIdListsEqual([], undefined)).toBe(false);
    });

    it('compares list values with id coercion', () => {
      expect(areIdListsEqual([1, '2'], ['1', 2])).toBe(true);
    });

    it('returns false when order differs', () => {
      expect(areIdListsEqual(['1', '2'], ['2', '1'])).toBe(false);
    });
  });
});
