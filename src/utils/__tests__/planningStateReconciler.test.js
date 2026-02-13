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
        plannedMatchIds: ['stored'],
        inviteSeededMatchIds: ['stored']
      }
    });

    expect(result.matches).toEqual([{ id: 'm1' }]);
    expect(result.selectedPlayersByMatch).toEqual({});
    expect(result.sortMetric).toBe(AUTO_SELECT_STRATEGY.PRACTICES);
    expect(result.plannedMatchIds).toEqual([]);
    expect(result.inviteSeededMatchIds).toEqual([]);
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
        plannedMatchIds: ['m2', 'm3'],
        inviteSeededMatchIds: ['m1', 'm3']
      }
    });

    expect(result.matches.map(match => match.id)).toEqual(['m1', 'm2']);
    expect(result.selectedPlayersByMatch).toEqual({ m1: ['p1'], m3: ['p2'] });
    expect(result.sortMetric).toBe(AUTO_SELECT_STRATEGY.ATTENDANCE);
    expect(result.plannedMatchIds).toEqual(['m2', 'm3']);
    expect(result.inviteSeededMatchIds).toEqual(['m1', 'm3']);
    expect(result.planningStatus).toEqual({ m2: 'done', m3: 'done' });
  });

  it('should preserve selections when switching matches on the same team', () => {
    const result = reconcilePlanProgress({
      currentTeamId: 'team-1',
      matchesToPlan: [{ id: 'm2' }],
      planProgress: {
        teamId: 'team-1',
        matches: [{ id: 'm1' }],
        selectedPlayersByMatch: { m1: ['p1'] },
        sortMetric: AUTO_SELECT_STRATEGY.ATTENDANCE,
        plannedMatchIds: ['m1'],
        inviteSeededMatchIds: ['m1']
      }
    });

    expect(result.matches.map(match => match.id)).toEqual(['m2']);
    expect(result.selectedPlayersByMatch).toEqual({ m1: ['p1'] });
    expect(result.sortMetric).toBe(AUTO_SELECT_STRATEGY.ATTENDANCE);
    expect(result.plannedMatchIds).toEqual(['m1']);
    expect(result.inviteSeededMatchIds).toEqual(['m1']);
    expect(result.planningStatus).toEqual({ m1: 'done' });
  });

  it('should preserve progress across full round-trip between matches', () => {
    // Step 1: Plan match 1
    const afterMatch1 = reconcilePlanProgress({
      currentTeamId: 'team-1',
      matchesToPlan: [{ id: 'm1' }],
      planProgress: {
        teamId: 'team-1',
        matches: [{ id: 'm1' }],
        selectedPlayersByMatch: { m1: ['p1', 'p2'] },
        sortMetric: AUTO_SELECT_STRATEGY.ATTENDANCE,
        plannedMatchIds: ['m1'],
        inviteSeededMatchIds: ['m1']
      }
    });

    expect(afterMatch1.selectedPlayersByMatch).toEqual({ m1: ['p1', 'p2'] });

    // Step 2: Switch to match 2 — match 1 selections must survive
    const afterSwitch = reconcilePlanProgress({
      currentTeamId: 'team-1',
      matchesToPlan: [{ id: 'm2' }],
      planProgress: {
        teamId: 'team-1',
        matches: afterMatch1.matches,
        selectedPlayersByMatch: afterMatch1.selectedPlayersByMatch,
        sortMetric: afterMatch1.sortMetric,
        plannedMatchIds: afterMatch1.plannedMatchIds,
        inviteSeededMatchIds: afterMatch1.inviteSeededMatchIds
      }
    });

    expect(afterSwitch.selectedPlayersByMatch).toEqual({ m1: ['p1', 'p2'] });
    expect(afterSwitch.plannedMatchIds).toEqual(['m1']);

    // Step 3: Return to match 1 — selections still intact
    const afterReturn = reconcilePlanProgress({
      currentTeamId: 'team-1',
      matchesToPlan: [{ id: 'm1' }],
      planProgress: {
        teamId: 'team-1',
        matches: afterSwitch.matches,
        selectedPlayersByMatch: afterSwitch.selectedPlayersByMatch,
        sortMetric: afterSwitch.sortMetric,
        plannedMatchIds: afterSwitch.plannedMatchIds,
        inviteSeededMatchIds: afterSwitch.inviteSeededMatchIds
      }
    });

    expect(afterReturn.selectedPlayersByMatch).toEqual({ m1: ['p1', 'p2'] });
    expect(afterReturn.plannedMatchIds).toEqual(['m1']);
    expect(afterReturn.planningStatus).toEqual({ m1: 'done' });
  });

  it('should start fresh when switching teams', () => {
    const result = reconcilePlanProgress({
      currentTeamId: 'team-2',
      matchesToPlan: [{ id: 'm3' }],
      planProgress: {
        teamId: 'team-1',
        matches: [{ id: 'm1' }],
        selectedPlayersByMatch: { m1: ['p1'] },
        sortMetric: AUTO_SELECT_STRATEGY.ATTENDANCE,
        plannedMatchIds: ['m1'],
        inviteSeededMatchIds: ['m1']
      }
    });

    expect(result.matches.map(match => match.id)).toEqual(['m3']);
    expect(result.selectedPlayersByMatch).toEqual({});
    expect(result.sortMetric).toBe(AUTO_SELECT_STRATEGY.PRACTICES);
    expect(result.plannedMatchIds).toEqual([]);
    expect(result.inviteSeededMatchIds).toEqual([]);
    expect(result.planningStatus).toEqual({});
  });
});
