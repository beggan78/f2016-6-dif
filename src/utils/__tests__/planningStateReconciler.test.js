import { reconcilePlanProgress } from '../planningStateReconciler';
import { AUTO_SELECT_STRATEGY } from '../../constants/planMatchesConstants';

describe('reconcilePlanProgress', () => {
  it('should reset state when no team is selected', () => {
    const result = reconcilePlanProgress({
      currentTeamId: null,
      matchesToPlan: [{ id: 'm1' }],
      planProgress: {
        teamId: 'team-1',
        matches: [{ id: 'stored' }],
        selectedPlayersByMatch: { stored: ['p1'] },
        sortMetric: AUTO_SELECT_STRATEGY.ATTENDANCE,
        plannedMatchIds: ['stored']
      }
    });

    expect(result.matches).toEqual([{ id: 'm1' }]);
    expect(result.selectedPlayersByMatch).toEqual({});
    expect(result.sortMetric).toBe(AUTO_SELECT_STRATEGY.PRACTICES);
    expect(result.plannedMatchIds).toEqual([]);
    expect(result.planningStatus).toEqual({});
  });

  it('should apply stored selections when stored matches align', () => {
    const result = reconcilePlanProgress({
      currentTeamId: 'team-1',
      matchesToPlan: [],
      planProgress: {
        teamId: 'team-1',
        matches: [{ id: 'm1' }, { id: 'm2' }],
        selectedPlayersByMatch: { m1: ['p1'], m3: ['p2'] },
        sortMetric: AUTO_SELECT_STRATEGY.ATTENDANCE,
        plannedMatchIds: ['m2', 'm3']
      }
    });

    expect(result.matches.map(match => match.id)).toEqual(['m1', 'm2']);
    expect(result.selectedPlayersByMatch).toEqual({ m1: ['p1'] });
    expect(result.sortMetric).toBe(AUTO_SELECT_STRATEGY.ATTENDANCE);
    expect(result.plannedMatchIds).toEqual(['m2']);
    expect(result.planningStatus).toEqual({ m2: 'done' });
  });

  it('should reset selections when incoming matches differ', () => {
    const result = reconcilePlanProgress({
      currentTeamId: 'team-1',
      matchesToPlan: [{ id: 'm2' }],
      planProgress: {
        teamId: 'team-1',
        matches: [{ id: 'm1' }],
        selectedPlayersByMatch: { m1: ['p1'] },
        sortMetric: AUTO_SELECT_STRATEGY.ATTENDANCE,
        plannedMatchIds: ['m1']
      }
    });

    expect(result.matches.map(match => match.id)).toEqual(['m2']);
    expect(result.selectedPlayersByMatch).toEqual({});
    expect(result.sortMetric).toBe(AUTO_SELECT_STRATEGY.PRACTICES);
    expect(result.plannedMatchIds).toEqual([]);
    expect(result.planningStatus).toEqual({});
  });
});
