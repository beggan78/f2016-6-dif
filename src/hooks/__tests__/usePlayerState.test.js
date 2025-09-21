import { renderHook, act } from '@testing-library/react';
import { usePlayerState } from '../usePlayerState';
import { PLAYER_ROLES, PLAYER_STATUS } from '../../constants/playerConstants';

describe('usePlayerState', () => {
  it('resets match-start markers when players are removed from the squad', () => {
    const initialState = {
      allPlayers: [
        {
          id: 'p1',
          name: 'Goalie',
          stats: {
            startedMatchAs: PLAYER_ROLES.GOALIE,
            startedAtRole: PLAYER_ROLES.GOALIE,
            startedAtPosition: 'goalie',
            currentRole: PLAYER_ROLES.GOALIE,
            currentStatus: PLAYER_STATUS.GOALIE,
            currentPairKey: 'goalie',
            lastStintStartTimeEpoch: 1234,
            timeOnFieldSeconds: 300,
            timeAsGoalieSeconds: 300
          }
        },
        {
          id: 'p2',
          name: 'Defender',
          stats: {
            startedMatchAs: PLAYER_ROLES.FIELD_PLAYER,
            startedAtRole: PLAYER_ROLES.DEFENDER,
            startedAtPosition: 'leftDefender',
            currentRole: PLAYER_ROLES.DEFENDER,
            currentStatus: PLAYER_STATUS.ON_FIELD,
            currentPairKey: 'leftDefender',
            lastStintStartTimeEpoch: 5678,
            timeOnFieldSeconds: 280,
            timeAsDefenderSeconds: 280
          }
        }
      ],
      selectedSquadIds: ['p1', 'p2']
    };

    const { result } = renderHook(() => usePlayerState(initialState));

    act(() => {
      result.current.setSelectedSquadIds(['p2']);
    });

    expect(result.current.selectedSquadIds).toEqual(['p2']);

    const goalie = result.current.allPlayers.find(player => player.id === 'p1');
    expect(goalie.stats.startedMatchAs).toBeNull();
    expect(goalie.stats.startedAtRole).toBeNull();
    expect(goalie.stats.startedAtPosition).toBeNull();
    expect(goalie.stats.currentRole).toBeNull();
    expect(goalie.stats.currentStatus).toBe(PLAYER_STATUS.SUBSTITUTE);
    expect(goalie.stats.currentPairKey).toBeNull();
    expect(goalie.stats.lastStintStartTimeEpoch).toBeNull();
    expect(goalie.stats.timeOnFieldSeconds).toBe(300);
    expect(goalie.stats.timeAsGoalieSeconds).toBe(300);

    const defender = result.current.allPlayers.find(player => player.id === 'p2');
    expect(defender.stats.startedMatchAs).toBe(PLAYER_ROLES.FIELD_PLAYER);
    expect(defender.stats.currentRole).toBe(PLAYER_ROLES.DEFENDER);
  });
});
