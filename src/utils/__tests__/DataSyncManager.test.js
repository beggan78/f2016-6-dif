import { DataSyncManager } from '../DataSyncManager';
import { PLAYER_ROLES } from '../../constants/playerConstants';

const insertMock = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

import { supabase } from '../../lib/supabase';

describe('DataSyncManager savePlayerStats', () => {
  beforeEach(() => {
    insertMock.mockReset();
    insertMock.mockResolvedValue({ error: null });
    supabase.from.mockReturnValue({
      insert: insertMock
    });
  });

  it('prefers startedAtRole when persisting player stats', async () => {
    const manager = new DataSyncManager('user-1');

    const players = [
      {
        cloudId: 'player-1',
        stats: {
          startedMatchAs: PLAYER_ROLES.FIELD_PLAYER,
          startedAtRole: PLAYER_ROLES.DEFENDER,
          startedAtPosition: 'leftDefender',
          goals: 0,
          substitutionsIn: 0,
          substitutionsOut: 0,
          timeOnFieldSeconds: 0,
          timeAsGoalieSeconds: 0,
          timeAsDefenderSeconds: 0,
          timeAsMidfielderSeconds: 0,
          timeAsAttackerSeconds: 0,
          totalTimeSeconds: 0
        },
        isCaptain: false,
        fairPlayAward: false
      }
    ];

    await manager.savePlayerStats('match-123', players, 'team-1');

    expect(insertMock).toHaveBeenCalledTimes(1);
    const payload = insertMock.mock.calls[0][0];
    expect(payload).toHaveLength(1);
    expect(payload[0].started_as).toBe('defender');
  });

  it('falls back to substitute when role cannot be determined', async () => {
    const manager = new DataSyncManager('user-1');

    const players = [
      {
        cloudId: 'player-2',
        stats: {
          startedMatchAs: PLAYER_ROLES.SUBSTITUTE,
          startedAtRole: null,
          startedAtPosition: null,
          totalTimeSeconds: 0,
          timeOnFieldSeconds: 0,
          timeAsGoalieSeconds: 0,
          timeAsDefenderSeconds: 0,
          timeAsMidfielderSeconds: 0,
          timeAsAttackerSeconds: 0,
          substitutionsIn: 0,
          substitutionsOut: 0
        },
        isCaptain: false,
        fairPlayAward: false
      }
    ];

    await manager.savePlayerStats('match-456', players, 'team-1');

    const payload = insertMock.mock.calls[0][0];
    expect(payload[0].started_as).toBe('substitute');
  });
});
