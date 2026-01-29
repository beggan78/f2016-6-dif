import {
  autoSelectMultipleMatches,
  autoSelectSingleMatch,
  buildSortedRoster
} from '../autoSelectAlgorithms';
import { AUTO_SELECT_STRATEGY } from '../../constants/planMatchesConstants';

const roster = [
  {
    id: 'p1',
    displayName: 'Anna',
    practicesPerMatch: 1,
    attendanceRate: 90
  },
  {
    id: 'p2',
    displayName: 'Bella',
    practicesPerMatch: 3,
    attendanceRate: 70
  },
  {
    id: 'p3',
    displayName: 'Cara',
    practicesPerMatch: 2,
    attendanceRate: 80
  }
];

describe('autoSelectAlgorithms', () => {
  describe('buildSortedRoster', () => {
    it('should sort by practices per match by default', () => {
      const sorted = buildSortedRoster(roster, AUTO_SELECT_STRATEGY.PRACTICES);
      expect(sorted.map(player => player.id)).toEqual(['p2', 'p3', 'p1']);
    });

    it('should sort by attendance when attendance metric selected', () => {
      const sorted = buildSortedRoster(roster, AUTO_SELECT_STRATEGY.ATTENDANCE);
      expect(sorted.map(player => player.id)).toEqual(['p1', 'p3', 'p2']);
    });
  });

  describe('autoSelectSingleMatch', () => {
    it('should select top players and skip unavailable ones', () => {
      const selected = autoSelectSingleMatch({
        rosterWithStats: roster,
        metric: AUTO_SELECT_STRATEGY.PRACTICES,
        targetCount: 2,
        unavailableIds: ['p2']
      });

      expect(selected).toEqual(['p3', 'p1']);
    });
  });

  describe('autoSelectMultipleMatches', () => {
    it('should ensure coverage when enabled and slots allow it', () => {
      const selections = autoSelectMultipleMatches({
        rosterWithStats: roster,
        metric: AUTO_SELECT_STRATEGY.PRACTICES,
        matches: [{ id: 'm1' }, { id: 'm2' }],
        targetCounts: { m1: 2, m2: 2 },
        unavailableByMatch: {},
        ensureCoverage: true
      });

      const allSelected = new Set([...selections.m1, ...selections.m2]);
      expect(allSelected.has('p1')).toBe(true);
      expect(allSelected.has('p2')).toBe(true);
      expect(allSelected.has('p3')).toBe(true);
      expect(selections.m1.length).toBe(2);
      expect(selections.m2.length).toBe(2);
    });

    it('should respect unavailable players per match', () => {
      const selections = autoSelectMultipleMatches({
        rosterWithStats: roster,
        metric: AUTO_SELECT_STRATEGY.PRACTICES,
        matches: [{ id: 'm1' }, { id: 'm2' }],
        targetCounts: { m1: 2, m2: 1 },
        unavailableByMatch: { m2: ['p2'] },
        ensureCoverage: false
      });

      expect(selections.m2).toEqual(['p3']);
    });
  });
});
