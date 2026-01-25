import { buildNameParts, createTemporaryPlayer, getTemporaryPlayersForMatch } from '../playerService';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

const createInsertChain = ({ data = { id: 'player-1' }, error = null } = {}) => {
  const single = jest.fn().mockResolvedValue({ data, error });
  const select = jest.fn(() => ({ single }));
  const insert = jest.fn(() => ({ select }));

  supabase.from.mockReturnValue({ insert });

  return { insert, select, single };
};

const createSelectChain = ({ data = [], error = null } = {}) => {
  const eqOnRoster = jest.fn().mockResolvedValue({ data, error });
  const eqMatch = jest.fn(() => ({ eq: eqOnRoster }));
  const select = jest.fn(() => ({ eq: eqMatch }));

  supabase.from.mockReturnValue({ select });

  return { select, eqMatch, eqOnRoster };
};

describe('playerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('buildNameParts', () => {
    it('throws when name is empty after trimming', () => {
      expect(() => buildNameParts('   ')).toThrow('Player name is required');
    });

    it('throws when name exceeds the maximum length', () => {
      const longName = 'a'.repeat(101);
      expect(() => buildNameParts(longName)).toThrow('Player name too long');
    });

    it('sanitizes angle brackets and splits name parts', () => {
      const result = buildNameParts('  Sam <The-Man> Smith  ');

      expect(result).toEqual({
        displayName: 'Sam The-Man Smith',
        firstName: 'Sam',
        lastName: 'The-Man Smith'
      });
    });
  });

  describe('createTemporaryPlayer', () => {
    it('returns an error when teamId or matchId is missing', async () => {
      const result = await createTemporaryPlayer({
        teamId: null,
        matchId: 'match-1',
        displayName: 'Player'
      });

      expect(result).toEqual({
        success: false,
        error: 'Team ID and match ID are required'
      });
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('returns an error when displayName is missing', async () => {
      const result = await createTemporaryPlayer({
        teamId: 'team-1',
        matchId: 'match-1',
        displayName: '   '
      });

      expect(result).toEqual({
        success: false,
        error: 'Player name is required'
      });
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('creates a temporary player with normalized name parts', async () => {
      const chain = createInsertChain({
        data: { id: 'player-1', display_name: 'Sam The-Man Smith' },
        error: null
      });

      const result = await createTemporaryPlayer({
        teamId: 'team-1',
        matchId: 'match-1',
        displayName: '  Sam <The-Man> Smith  '
      });

      expect(supabase.from).toHaveBeenCalledWith('player');
      expect(chain.insert).toHaveBeenCalledWith({
        team_id: 'team-1',
        match_id: 'match-1',
        first_name: 'Sam',
        last_name: 'The-Man Smith',
        display_name: 'Sam The-Man Smith',
        on_roster: false,
        jersey_number: null
      });
      expect(chain.select).toHaveBeenCalledWith();
      expect(chain.single).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        player: { id: 'player-1', display_name: 'Sam The-Man Smith' }
      });
    });

    it('returns an error when supabase insert fails', async () => {
      createInsertChain({ data: null, error: { message: 'Insert failed' } });

      const result = await createTemporaryPlayer({
        teamId: 'team-1',
        matchId: 'match-1',
        displayName: 'Player One'
      });

      expect(result).toEqual({
        success: false,
        error: 'Insert failed'
      });
      expect(console.error).toHaveBeenCalledWith(
        'Failed to create temporary player:',
        { message: 'Insert failed' }
      );
    });

    it('returns an error when an exception is thrown', async () => {
      supabase.from.mockImplementation(() => {
        throw new Error('Unexpected failure');
      });

      const result = await createTemporaryPlayer({
        teamId: 'team-1',
        matchId: 'match-1',
        displayName: 'Player One'
      });

      expect(result).toEqual({
        success: false,
        error: 'Unexpected failure'
      });
      expect(console.error).toHaveBeenCalledWith(
        'Exception creating temporary player:',
        expect.any(Error)
      );
    });
  });

  describe('getTemporaryPlayersForMatch', () => {
    it('returns an error when matchId is missing', async () => {
      const result = await getTemporaryPlayersForMatch(null);

      expect(result).toEqual({
        success: false,
        error: 'Match ID is required'
      });
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('fetches temporary players for a match', async () => {
      const chain = createSelectChain({
        data: [{ id: 'player-1' }, { id: 'player-2' }],
        error: null
      });

      const result = await getTemporaryPlayersForMatch('match-1');

      expect(supabase.from).toHaveBeenCalledWith('player');
      expect(chain.select).toHaveBeenCalledWith('*');
      expect(chain.eqMatch).toHaveBeenCalledWith('match_id', 'match-1');
      expect(chain.eqOnRoster).toHaveBeenCalledWith('on_roster', false);
      expect(result).toEqual({
        success: true,
        players: [{ id: 'player-1' }, { id: 'player-2' }]
      });
    });

    it('returns empty players when data is null', async () => {
      createSelectChain({ data: null, error: null });

      const result = await getTemporaryPlayersForMatch('match-1');

      expect(result).toEqual({
        success: true,
        players: []
      });
    });

    it('returns an error when supabase query fails', async () => {
      createSelectChain({ data: null, error: { message: 'Query failed' } });

      const result = await getTemporaryPlayersForMatch('match-1');

      expect(result).toEqual({
        success: false,
        error: 'Query failed'
      });
    });

    it('returns an error when an exception is thrown', async () => {
      supabase.from.mockImplementation(() => {
        throw new Error('Unexpected failure');
      });

      const result = await getTemporaryPlayersForMatch('match-1');

      expect(result).toEqual({
        success: false,
        error: 'Unexpected failure'
      });
    });
  });
});
