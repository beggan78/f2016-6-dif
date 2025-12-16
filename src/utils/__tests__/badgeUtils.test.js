import { getMatchTypeBadgeClasses } from '../badgeUtils';

describe('badgeUtils', () => {
  describe('getMatchTypeBadgeClasses', () => {
    it('returns the tournament variant for lowercase match types', () => {
      const classes = getMatchTypeBadgeClasses('tournament');

      expect(classes).toContain('bg-amber-900/50');
      expect(classes).toContain('w-20');
    });

    it('normalizes casing for internal match types', () => {
      const classes = getMatchTypeBadgeClasses('Internal');

      expect(classes).toContain('bg-teal-900/50');
    });

    it('falls back to default styling for unknown types', () => {
      const classes = getMatchTypeBadgeClasses('charity');

      expect(classes).toContain('bg-slate-700');
    });
  });
});
