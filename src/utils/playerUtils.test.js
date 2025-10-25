/**
 * Tests for player utility functions
 */

import {
  hasInactivePlayersInSquad,
  findPlayerById,
  getPlayerName,
  getPlayerDisplayName,
  getPlayerDisplayNameById,
  getSelectedSquadPlayers,
  getOutfieldPlayers,
  createPlayerLookup,
  getPlayersByStatus,
  isPlayerInactive
} from './playerUtils';

describe('Player Utilities', () => {
  const mockPlayers = [
    {
      id: '1',
      displayName: 'Alice',
      firstName: 'Alice',
      stats: {
        isInactive: false,
        currentStatus: 'on_field'
      }
    },
    {
      id: '2',
      displayName: 'Bob',
      firstName: 'Bob',
      stats: {
        isInactive: true,
        currentStatus: 'substitute'
      }
    },
    {
      id: '3',
      displayName: 'Charlie',
      firstName: 'Charlie',
      stats: {
        isInactive: false,
        currentStatus: 'goalie'
      }
    },
    {
      id: '4',
      displayName: 'Diana',
      firstName: 'Diana',
      stats: {
        isInactive: false,
        currentStatus: 'substitute'
      }
    },
    {
      id: '5',
      displayName: 'Eve',
      firstName: 'Eve',
      stats: {
        isInactive: false,
        currentStatus: 'on_field'
      }
    }
  ];

  const selectedSquadIds = ['1', '2', '3', '4'];

  describe('hasInactivePlayersInSquad', () => {
    test('returns true when squad has inactive players', () => {
      expect(hasInactivePlayersInSquad(mockPlayers, selectedSquadIds)).toBe(true);
    });

    test('returns false when squad has no inactive players', () => {
      const squadWithoutInactive = ['1', '3', '4', '5'];
      expect(hasInactivePlayersInSquad(mockPlayers, squadWithoutInactive)).toBe(false);
    });

    test('returns false for empty inputs', () => {
      expect(hasInactivePlayersInSquad([], [])).toBe(false);
      expect(hasInactivePlayersInSquad(null, null)).toBe(false);
    });
  });

  describe('findPlayerById', () => {
    test('finds player by ID', () => {
      const player = findPlayerById(mockPlayers, '2');
      expect(player).toEqual(mockPlayers[1]);
    });

    test('returns undefined for non-existent player', () => {
      const player = findPlayerById(mockPlayers, 'nonexistent');
      expect(player).toBeUndefined();
    });
  });

  describe('getPlayerName', () => {
    test('returns player name for valid ID', () => {
      expect(getPlayerName(mockPlayers, '1')).toBe('Alice');
    });

    test('returns default fallback for non-existent player', () => {
      expect(getPlayerName(mockPlayers, 'nonexistent')).toBe('N/A');
    });

    test('returns custom fallback for non-existent player', () => {
      expect(getPlayerName(mockPlayers, 'nonexistent', 'Unknown')).toBe('Unknown');
    });
  });

  describe('getPlayerDisplayName', () => {
    test('returns display name when available', () => {
      expect(getPlayerDisplayName(mockPlayers[0])).toBe('Alice');
    });

    test('returns fallback when player missing', () => {
      expect(getPlayerDisplayName(null, 'Fallback')).toBe('Fallback');
    });

    test('returns fallback when display name missing', () => {
      const player = { firstName: 'No Display' };
      expect(getPlayerDisplayName(player)).toBe('Unknown Player');
    });
  });

  describe('getPlayerDisplayNameById', () => {
    test('returns display name for valid ID', () => {
      expect(getPlayerDisplayNameById(mockPlayers, '2')).toBe('Bob');
    });

    test('returns fallback for non-existent player', () => {
      expect(getPlayerDisplayNameById(mockPlayers, 'nonexistent', 'Fallback')).toBe('Fallback');
    });
  });

  describe('getSelectedSquadPlayers', () => {
    test('returns only selected squad players', () => {
      const selectedPlayers = getSelectedSquadPlayers(mockPlayers, selectedSquadIds);
      expect(selectedPlayers).toHaveLength(4);
      expect(selectedPlayers.map(p => p.id)).toEqual(['1', '2', '3', '4']);
    });

    test('returns empty array for empty squad', () => {
      const selectedPlayers = getSelectedSquadPlayers(mockPlayers, []);
      expect(selectedPlayers).toEqual([]);
    });
  });

  describe('getOutfieldPlayers', () => {
    test('returns outfield players excluding goalie', () => {
      const outfieldPlayers = getOutfieldPlayers(mockPlayers, selectedSquadIds, '3');
      expect(outfieldPlayers).toHaveLength(3);
      expect(outfieldPlayers.map(p => p.id)).toEqual(['1', '2', '4']);
    });

    test('returns all selected players when no goalie specified', () => {
      const outfieldPlayers = getOutfieldPlayers(mockPlayers, selectedSquadIds, null);
      expect(outfieldPlayers).toHaveLength(4);
    });
  });

  describe('createPlayerLookup', () => {
    test('creates function that looks up players by ID', () => {
      const lookupFn = createPlayerLookup(mockPlayers);
      expect(lookupFn('1')).toEqual(mockPlayers[0]);
      expect(lookupFn('nonexistent')).toBeUndefined();
    });
  });

  describe('getPlayersByStatus', () => {
    test('returns players with on_field status', () => {
      const onFieldPlayers = getPlayersByStatus(mockPlayers, selectedSquadIds, 'on_field');
      expect(onFieldPlayers).toHaveLength(1);
      expect(onFieldPlayers[0].id).toBe('1');
    });

    test('returns players with substitute status', () => {
      const substitutePlayers = getPlayersByStatus(mockPlayers, selectedSquadIds, 'substitute');
      expect(substitutePlayers).toHaveLength(2);
      expect(substitutePlayers.map(p => p.id)).toEqual(['2', '4']);
    });

    test('returns players with goalie status', () => {
      const goaliePlayers = getPlayersByStatus(mockPlayers, selectedSquadIds, 'goalie');
      expect(goaliePlayers).toHaveLength(1);
      expect(goaliePlayers[0].id).toBe('3');
    });

    test('returns empty array for non-existent status', () => {
      const players = getPlayersByStatus(mockPlayers, selectedSquadIds, 'invalid_status');
      expect(players).toEqual([]);
    });
  });

  describe('isPlayerInactive', () => {
    test('returns true for inactive player', () => {
      expect(isPlayerInactive(mockPlayers, '2')).toBe(true);
    });

    test('returns false for active player', () => {
      expect(isPlayerInactive(mockPlayers, '1')).toBe(false);
    });

    test('returns false for non-existent player', () => {
      expect(isPlayerInactive(mockPlayers, 'nonexistent')).toBe(false);
    });

    test('returns false for player without stats', () => {
      const playersWithoutStats = [{ id: '1', name: 'Test' }];
      expect(isPlayerInactive(playersWithoutStats, '1')).toBe(false);
    });
  });
});
