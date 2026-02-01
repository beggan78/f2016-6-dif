/**
 * Tests for playerLoanService
 *
 * Comprehensive test suite covering:
 * - CRUD operations for player loans
 * - Batch operations for match loans
 * - Date normalization and validation
 * - Team name normalization
 * - Loan match weight preferences
 * - Weighted match calculations
 */

import {
  recordPlayerLoans,
  recordPlayerLoan,
  updatePlayerLoan,
  updateMatchLoans,
  deletePlayerLoan,
  deleteMatchLoans,
  getPlayerLoans,
  getTeamLoans,
  getTeamLoanMatchWeight,
  updateTeamLoanMatchWeight,
  calculateWeightedMatches,
  getDefaultLoanMatchWeight
} from '../playerLoanService';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn()
    }
  }
}));

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('playerLoanService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('getDefaultLoanMatchWeight', () => {
    it('returns default weight of 0.5', () => {
      expect(getDefaultLoanMatchWeight()).toBe(0.5);
    });
  });

  describe('recordPlayerLoans', () => {
    const teamId = 'team-1';
    const playerIds = ['player-1', 'player-2'];
    const receivingTeamName = 'Other Team';
    const loanDate = '2025-01-15';

    it('validates required parameters', async () => {
      const result1 = await recordPlayerLoans([], { teamId, receivingTeamName, loanDate });
      expect(result1.success).toBe(false);
      expect(result1.error).toBe('At least one player is required');

      const result2 = await recordPlayerLoans(null, { teamId, receivingTeamName, loanDate });
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('At least one player is required');

      const result3 = await recordPlayerLoans(playerIds, { teamId: null, receivingTeamName, loanDate });
      expect(result3.success).toBe(false);
      expect(result3.error).toBe('Team ID is required');

      const result4 = await recordPlayerLoans(playerIds, { teamId, receivingTeamName: '', loanDate });
      expect(result4.success).toBe(false);
      expect(result4.error).toBe('Receiving team name is required');

      const result5 = await recordPlayerLoans(playerIds, { teamId, receivingTeamName, loanDate: null });
      expect(result5.success).toBe(false);
      expect(result5.error).toBe('Loan date is required');
    });

    it('validates receiving team name length', async () => {
      const longName = 'x'.repeat(201);
      const result = await recordPlayerLoans(playerIds, { teamId, receivingTeamName: longName, loanDate });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Receiving team name must be 200 characters or less');
    });

    it('creates loan records for multiple players', async () => {
      const mockLoans = [
        { id: 'loan-1', player_id: 'player-1' },
        { id: 'loan-2', player_id: 'player-2' }
      ];

      const select = jest.fn().mockResolvedValue({ data: mockLoans, error: null });
      const insert = jest.fn(() => ({ select }));
      supabase.from.mockReturnValue({ insert });

      const result = await recordPlayerLoans(playerIds, { teamId, receivingTeamName, loanDate });

      expect(supabase.from).toHaveBeenCalledWith('player_loan');
      expect(insert).toHaveBeenCalledWith([
        {
          player_id: 'player-1',
          team_id: teamId,
          receiving_team_name: receivingTeamName,
          loan_date: loanDate
        },
        {
          player_id: 'player-2',
          team_id: teamId,
          receiving_team_name: receivingTeamName,
          loan_date: loanDate
        }
      ]);
      expect(result.success).toBe(true);
      expect(result.loans).toEqual(mockLoans);
    });

    it('creates loan record for a single player', async () => {
      const select = jest.fn().mockResolvedValue({ data: [], error: null });
      const insert = jest.fn(() => ({ select }));
      supabase.from.mockReturnValue({ insert });

      await recordPlayerLoans(['player-1'], { teamId, receivingTeamName, loanDate });

      expect(insert).toHaveBeenCalledWith([
        {
          player_id: 'player-1',
          team_id: teamId,
          receiving_team_name: receivingTeamName,
          loan_date: loanDate
        }
      ]);
    });

    it('normalizes date from Date object', async () => {
      const mockUser = { id: 'user-123' };
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

      const select = jest.fn().mockResolvedValue({ data: [], error: null });
      const insert = jest.fn(() => ({ select }));
      supabase.from.mockReturnValue({ insert });

      const dateObject = new Date('2025-01-15T10:30:00Z');
      await recordPlayerLoans(playerIds, { teamId, receivingTeamName, loanDate: dateObject });

      const insertCall = insert.mock.calls[0][0];
      expect(insertCall[0].loan_date).toBe('2025-01-15');
    });

    it('rejects invalid Date objects for loan date', async () => {
      const invalidDate = new Date('invalid');
      const result = await recordPlayerLoans(playerIds, {
        teamId,
        receivingTeamName,
        loanDate: invalidDate
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Loan date is required');
    });

    it('trims and normalizes team name', async () => {
      const mockUser = { id: 'user-123' };
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

      const select = jest.fn().mockResolvedValue({ data: [], error: null });
      const insert = jest.fn(() => ({ select }));
      supabase.from.mockReturnValue({ insert });

      await recordPlayerLoans(playerIds, { teamId, receivingTeamName: '  Other Team  ', loanDate });

      const insertCall = insert.mock.calls[0][0];
      expect(insertCall[0].receiving_team_name).toBe('Other Team');
    });

    it('handles database errors', async () => {
      const mockUser = { id: 'user-123' };
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

      const select = jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } });
      const insert = jest.fn(() => ({ select }));
      supabase.from.mockReturnValue({ insert });

      const result = await recordPlayerLoans(playerIds, { teamId, receivingTeamName, loanDate });

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB error');
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('handles exceptions', async () => {
      supabase.from.mockImplementation(() => { throw new Error('Network error'); });

      const result = await recordPlayerLoans(playerIds, { teamId, receivingTeamName, loanDate });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('recordPlayerLoan', () => {
    const playerId = 'player-1';
    const teamId = 'team-1';
    const receivingTeamName = 'Other Team';
    const loanDate = '2025-01-15';

    it('validates required parameters', async () => {
      const result1 = await recordPlayerLoan(null, { teamId, receivingTeamName, loanDate });
      expect(result1.success).toBe(false);
      expect(result1.error).toBe('Player ID and team ID are required');

      const result2 = await recordPlayerLoan(playerId, { teamId: null, receivingTeamName, loanDate });
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('Player ID and team ID are required');
    });

    it('creates single loan record', async () => {
      const mockLoan = { id: 'loan-1', player_id: playerId };

      const single = jest.fn().mockResolvedValue({ data: mockLoan, error: null });
      const select = jest.fn(() => ({ single }));
      const insert = jest.fn(() => ({ select }));
      supabase.from.mockReturnValue({ insert });

      const result = await recordPlayerLoan(playerId, { teamId, receivingTeamName, loanDate });

      expect(supabase.from).toHaveBeenCalledWith('player_loan');
      expect(insert).toHaveBeenCalledWith({
        player_id: playerId,
        team_id: teamId,
        receiving_team_name: receivingTeamName,
        loan_date: loanDate
      });
      expect(result.success).toBe(true);
      expect(result.loan).toEqual(mockLoan);
    });
  });

  describe('updatePlayerLoan', () => {
    const loanId = 'loan-1';

    it('validates loan id', async () => {
      const result = await updatePlayerLoan(null, {});
      expect(result.success).toBe(false);
      expect(result.error).toBe('Loan ID is required');
    });

    it('validates updates provided', async () => {
      const result = await updatePlayerLoan(loanId, {});
      expect(result.success).toBe(false);
      expect(result.error).toBe('No updates provided');
    });

    it('updates receiving team name', async () => {
      const mockLoan = { id: loanId, receiving_team_name: 'New Team' };

      const single = jest.fn().mockResolvedValue({ data: mockLoan, error: null });
      const select = jest.fn(() => ({ single }));
      const eq = jest.fn(() => ({ select }));
      const update = jest.fn(() => ({ eq }));
      supabase.from.mockReturnValue({ update });

      const result = await updatePlayerLoan(loanId, { receivingTeamName: 'New Team' });

      expect(update).toHaveBeenCalledWith({ receiving_team_name: 'New Team' });
      expect(eq).toHaveBeenCalledWith('id', loanId);
      expect(result.success).toBe(true);
      expect(result.loan).toEqual(mockLoan);
    });

    it('updates loan date', async () => {
      const mockLoan = { id: loanId, loan_date: '2025-02-01' };

      const single = jest.fn().mockResolvedValue({ data: mockLoan, error: null });
      const select = jest.fn(() => ({ single }));
      const eq = jest.fn(() => ({ select }));
      const update = jest.fn(() => ({ eq }));
      supabase.from.mockReturnValue({ update });

      const result = await updatePlayerLoan(loanId, { loanDate: '2025-02-01' });

      expect(update).toHaveBeenCalledWith({ loan_date: '2025-02-01' });
      expect(result.success).toBe(true);
    });

    it('normalizes loan date strings with time', async () => {
      const mockLoan = { id: loanId, loan_date: '2025-02-01' };

      const single = jest.fn().mockResolvedValue({ data: mockLoan, error: null });
      const select = jest.fn(() => ({ single }));
      const eq = jest.fn(() => ({ select }));
      const update = jest.fn(() => ({ eq }));
      supabase.from.mockReturnValue({ update });

      await updatePlayerLoan(loanId, { loanDate: '2025-02-01T15:45:00Z' });

      expect(update).toHaveBeenCalledWith({ loan_date: '2025-02-01' });
    });

    it('updates both fields simultaneously', async () => {
      const mockLoan = { id: loanId };

      const single = jest.fn().mockResolvedValue({ data: mockLoan, error: null });
      const select = jest.fn(() => ({ single }));
      const eq = jest.fn(() => ({ select }));
      const update = jest.fn(() => ({ eq }));
      supabase.from.mockReturnValue({ update });

      await updatePlayerLoan(loanId, { receivingTeamName: 'New Team', loanDate: '2025-02-01' });

      expect(update).toHaveBeenCalledWith({
        receiving_team_name: 'New Team',
        loan_date: '2025-02-01'
      });
    });

    it('validates team name length', async () => {
      const longName = 'x'.repeat(201);
      const result = await updatePlayerLoan(loanId, { receivingTeamName: longName });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Receiving team name must be 200 characters or less');
    });

    it('handles database errors', async () => {
      const single = jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } });
      const select = jest.fn(() => ({ single }));
      const eq = jest.fn(() => ({ select }));
      const update = jest.fn(() => ({ eq }));
      supabase.from.mockReturnValue({ update });

      const result = await updatePlayerLoan(loanId, { receivingTeamName: 'New Team' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB error');
    });
  });

  describe('updateMatchLoans', () => {
    const matchKey = {
      teamId: 'team-1',
      receivingTeamName: 'Other Team',
      loanDate: '2025-01-15'
    };

    it('validates match key parameters', async () => {
      const result1 = await updateMatchLoans({ ...matchKey, teamId: null }, { receivingTeamName: 'New' });
      expect(result1.success).toBe(false);
      expect(result1.error).toBe('Team ID is required');

      const result2 = await updateMatchLoans({ ...matchKey, receivingTeamName: '' }, { loanDate: '2025-02-01' });
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('Receiving team name is required');

      const result3 = await updateMatchLoans({ ...matchKey, loanDate: null }, { receivingTeamName: 'New' });
      expect(result3.success).toBe(false);
      expect(result3.error).toBe('Loan date is required');
    });

    it('validates updates provided', async () => {
      const result = await updateMatchLoans(matchKey, {});
      expect(result.success).toBe(false);
      expect(result.error).toBe('No updates provided');
    });

    it('updates all loans matching the criteria', async () => {
      const mockLoans = [
        { id: 'loan-1', receiving_team_name: 'New Team' },
        { id: 'loan-2', receiving_team_name: 'New Team' }
      ];

      const select = jest.fn().mockResolvedValue({ data: mockLoans, error: null });
      const eq3 = jest.fn(() => ({ select }));
      const eq2 = jest.fn(() => ({ eq: eq3 }));
      const eq1 = jest.fn(() => ({ eq: eq2 }));
      const update = jest.fn(() => ({ eq: eq1 }));
      supabase.from.mockReturnValue({ update });

      const result = await updateMatchLoans(matchKey, { receivingTeamName: 'New Team' });

      expect(update).toHaveBeenCalledWith({ receiving_team_name: 'New Team' });
      expect(eq1).toHaveBeenCalledWith('team_id', matchKey.teamId);
      expect(eq2).toHaveBeenCalledWith('receiving_team_name', matchKey.receivingTeamName);
      expect(eq3).toHaveBeenCalledWith('loan_date', matchKey.loanDate);
      expect(result.success).toBe(true);
      expect(result.loans).toEqual(mockLoans);
      expect(result.updatedCount).toBe(2);
    });

    it('normalizes match key date when provided as Date', async () => {
      const mockLoans = [{ id: 'loan-1' }];
      const select = jest.fn().mockResolvedValue({ data: mockLoans, error: null });
      const eq3 = jest.fn(() => ({ select }));
      const eq2 = jest.fn(() => ({ eq: eq3 }));
      const eq1 = jest.fn(() => ({ eq: eq2 }));
      const update = jest.fn(() => ({ eq: eq1 }));
      supabase.from.mockReturnValue({ update });

      const dateObject = new Date('2025-03-02T10:00:00Z');
      await updateMatchLoans({
        teamId: 'team-1',
        receivingTeamName: 'Other Team',
        loanDate: dateObject
      }, { receivingTeamName: 'Updated Team' });

      expect(eq3).toHaveBeenCalledWith('loan_date', '2025-03-02');
    });

    it('handles zero updates gracefully', async () => {
      const select = jest.fn().mockResolvedValue({ data: [], error: null });
      const eq3 = jest.fn(() => ({ select }));
      const eq2 = jest.fn(() => ({ eq: eq3 }));
      const eq1 = jest.fn(() => ({ eq: eq2 }));
      const update = jest.fn(() => ({ eq: eq1 }));
      supabase.from.mockReturnValue({ update });

      const result = await updateMatchLoans(matchKey, { loanDate: '2025-02-01' });

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(0);
    });
  });

  describe('deletePlayerLoan', () => {
    it('validates loan id', async () => {
      const result = await deletePlayerLoan(null);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Loan ID is required');
    });

    it('deletes single loan record', async () => {
      const eq = jest.fn().mockResolvedValue({ error: null });
      const deleteFn = jest.fn(() => ({ eq }));
      supabase.from.mockReturnValue({ delete: deleteFn });

      const result = await deletePlayerLoan('loan-1');

      expect(supabase.from).toHaveBeenCalledWith('player_loan');
      expect(deleteFn).toHaveBeenCalled();
      expect(eq).toHaveBeenCalledWith('id', 'loan-1');
      expect(result.success).toBe(true);
    });

    it('handles database errors', async () => {
      const eq = jest.fn().mockResolvedValue({ error: { message: 'DB error' } });
      const deleteFn = jest.fn(() => ({ eq }));
      supabase.from.mockReturnValue({ delete: deleteFn });

      const result = await deletePlayerLoan('loan-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB error');
    });
  });

  describe('deleteMatchLoans', () => {
    const matchKey = {
      teamId: 'team-1',
      receivingTeamName: 'Other Team',
      loanDate: '2025-01-15'
    };

    it('validates required parameters', async () => {
      const result1 = await deleteMatchLoans({ ...matchKey, teamId: null });
      expect(result1.success).toBe(false);
      expect(result1.error).toBe('Team ID is required');

      const result2 = await deleteMatchLoans({ ...matchKey, receivingTeamName: '' });
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('Receiving team name is required');

      const result3 = await deleteMatchLoans({ ...matchKey, loanDate: null });
      expect(result3.success).toBe(false);
      expect(result3.error).toBe('Loan date is required');
    });

    it('deletes all loans matching criteria', async () => {
      const mockLoans = [
        { id: 'loan-1' },
        { id: 'loan-2' }
      ];

      const select = jest.fn().mockResolvedValue({ data: mockLoans, error: null });
      const eq3 = jest.fn(() => ({ select }));
      const eq2 = jest.fn(() => ({ eq: eq3 }));
      const eq1 = jest.fn(() => ({ eq: eq2 }));
      const deleteFn = jest.fn(() => ({ eq: eq1 }));
      supabase.from.mockReturnValue({ delete: deleteFn });

      const result = await deleteMatchLoans(matchKey);

      expect(supabase.from).toHaveBeenCalledWith('player_loan');
      expect(deleteFn).toHaveBeenCalled();
      expect(eq1).toHaveBeenCalledWith('team_id', matchKey.teamId);
      expect(eq2).toHaveBeenCalledWith('receiving_team_name', matchKey.receivingTeamName);
      expect(eq3).toHaveBeenCalledWith('loan_date', matchKey.loanDate);
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);
    });
  });

  describe('getPlayerLoans', () => {
    const playerId = 'player-1';

    it('validates player id', async () => {
      const result = await getPlayerLoans(null);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Player ID is required');
    });

    it('fetches loans for a player', async () => {
      const mockLoans = [
        { id: 'loan-1', player_id: playerId, loan_date: '2025-01-15' },
        { id: 'loan-2', player_id: playerId, loan_date: '2025-01-10' }
      ];

      const order = jest.fn().mockResolvedValue({ data: mockLoans, error: null });
      const eq = jest.fn(() => ({ order }));
      const select = jest.fn(() => ({ eq }));
      supabase.from.mockReturnValue({ select });

      const result = await getPlayerLoans(playerId);

      expect(supabase.from).toHaveBeenCalledWith('player_loan');
      expect(eq).toHaveBeenCalledWith('player_id', playerId);
      expect(order).toHaveBeenCalledWith('loan_date', { ascending: false });
      expect(result.success).toBe(true);
      expect(result.loans).toEqual(mockLoans);
    });

    it('filters by team id when provided', async () => {
      const resolved = { data: [], error: null };
      const eqTeam = jest.fn().mockResolvedValue(resolved);
      const order = jest.fn(() => ({ eq: eqTeam }));
      const eqPlayer = jest.fn(() => ({ order }));
      const select = jest.fn(() => ({ eq: eqPlayer }));
      supabase.from.mockReturnValue({ select });

      await getPlayerLoans(playerId, { teamId: 'team-1' });

      expect(eqPlayer).toHaveBeenCalledWith('player_id', playerId);
      expect(eqTeam).toHaveBeenCalledWith('team_id', 'team-1');
    });

    it('filters by date range when provided', async () => {
      const resolved = { data: [], error: null };
      const lte = jest.fn(() => Promise.resolve(resolved));
      const gte = jest.fn(() => ({ lte }));
      const order = jest.fn(() => ({ gte }));
      const eq = jest.fn(() => ({ order }));
      const select = jest.fn(() => ({ eq }));
      supabase.from.mockReturnValue({ select });

      await getPlayerLoans(playerId, { startDate: '2025-01-01', endDate: '2025-01-31' });

      expect(gte).toHaveBeenCalledWith('loan_date', '2025-01-01');
      expect(lte).toHaveBeenCalledWith('loan_date', '2025-01-31');
    });

    it('normalizes Date objects to date strings', async () => {
      const resolved = { data: [], error: null };
      const lte = jest.fn(() => Promise.resolve(resolved));
      const gte = jest.fn(() => ({ lte }));
      const order = jest.fn(() => ({ gte }));
      const eq = jest.fn(() => ({ order }));
      const select = jest.fn(() => ({ eq }));
      supabase.from.mockReturnValue({ select });

      await getPlayerLoans(playerId, {
        startDate: new Date('2025-01-01T00:00:00Z'),
        endDate: new Date('2025-01-31T23:59:59Z')
      });

      expect(gte).toHaveBeenCalledWith('loan_date', '2025-01-01');
      expect(lte).toHaveBeenCalledWith('loan_date', '2025-01-31');
    });
  });

  describe('getTeamLoans', () => {
    const teamId = 'team-1';

    it('validates team id', async () => {
      const result = await getTeamLoans(null);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Team ID is required');
    });

    it('fetches loans with player data', async () => {
      const mockLoans = [
        {
          id: 'loan-1',
          player_id: 'player-1',
          loan_date: '2025-01-15',
          player: {
            id: 'player-1',
            display_name: 'Player One',
            jersey_number: 10
          }
        }
      ];

      const order = jest.fn().mockResolvedValue({ data: mockLoans, error: null });
      const eq = jest.fn(() => ({ order }));
      const select = jest.fn(() => ({ eq }));
      supabase.from.mockReturnValue({ select });

      const result = await getTeamLoans(teamId);

      expect(supabase.from).toHaveBeenCalledWith('player_loan');
      expect(select).toHaveBeenCalledWith(expect.stringContaining('player:player_id'));
      expect(eq).toHaveBeenCalledWith('team_id', teamId);
      expect(result.success).toBe(true);
      expect(result.loans).toEqual(mockLoans);
    });

    it('filters by date range', async () => {
      const resolved = { data: [], error: null };
      const lte = jest.fn(() => Promise.resolve(resolved));
      const gte = jest.fn(() => ({ lte }));
      const order = jest.fn(() => ({ gte }));
      const eq = jest.fn(() => ({ order }));
      const select = jest.fn(() => ({ eq }));
      supabase.from.mockReturnValue({ select });

      await getTeamLoans(teamId, { startDate: '2025-01-01', endDate: '2025-01-31' });

      expect(gte).toHaveBeenCalledWith('loan_date', '2025-01-01');
      expect(lte).toHaveBeenCalledWith('loan_date', '2025-01-31');
    });
  });

  describe('getTeamLoanMatchWeight', () => {
    const teamId = 'team-1';

    it('validates team id', async () => {
      const result = await getTeamLoanMatchWeight(null);
      expect(result.success).toBe(false);
      expect(result.weight).toBe(0.5);
      expect(result.error).toBe('Team ID is required');
    });

    it('returns stored weight preference', async () => {
      const maybeSingle = jest.fn().mockResolvedValue({ data: { value: '0.75' }, error: null });
      const eq2 = jest.fn(() => ({ maybeSingle }));
      const eq1 = jest.fn(() => ({ eq: eq2 }));
      const select = jest.fn(() => ({ eq: eq1 }));
      supabase.from.mockReturnValue({ select });

      const result = await getTeamLoanMatchWeight(teamId);

      expect(supabase.from).toHaveBeenCalledWith('team_preference');
      expect(eq1).toHaveBeenCalledWith('team_id', teamId);
      expect(eq2).toHaveBeenCalledWith('key', 'loanMatchWeight');
      expect(result.success).toBe(true);
      expect(result.weight).toBe(0.75);
    });

    it('returns default weight when no preference exists', async () => {
      const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      const eq2 = jest.fn(() => ({ maybeSingle }));
      const eq1 = jest.fn(() => ({ eq: eq2 }));
      const select = jest.fn(() => ({ eq: eq1 }));
      supabase.from.mockReturnValue({ select });

      const result = await getTeamLoanMatchWeight(teamId);

      expect(result.success).toBe(true);
      expect(result.weight).toBe(0.5);
    });

    it('handles invalid stored values', async () => {
      const maybeSingle = jest.fn().mockResolvedValue({ data: { value: 'invalid' }, error: null });
      const eq2 = jest.fn(() => ({ maybeSingle }));
      const eq1 = jest.fn(() => ({ eq: eq2 }));
      const select = jest.fn(() => ({ eq: eq1 }));
      supabase.from.mockReturnValue({ select });

      const result = await getTeamLoanMatchWeight(teamId);

      expect(result.success).toBe(true);
      expect(result.weight).toBe(0.5); // Falls back to default
    });

    it('handles database errors', async () => {
      const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } });
      const eq2 = jest.fn(() => ({ maybeSingle }));
      const eq1 = jest.fn(() => ({ eq: eq2 }));
      const select = jest.fn(() => ({ eq: eq1 }));
      supabase.from.mockReturnValue({ select });

      const result = await getTeamLoanMatchWeight(teamId);

      expect(result.success).toBe(false);
      expect(result.weight).toBe(0.5); // Still returns default
      expect(result.error).toBe('DB error');
    });
  });

  describe('updateTeamLoanMatchWeight', () => {
    const teamId = 'team-1';

    it('validates team id', async () => {
      const result = await updateTeamLoanMatchWeight(null, 0.75);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Team ID is required');
    });

    it('validates weight is a number', async () => {
      const result1 = await updateTeamLoanMatchWeight(teamId, 'invalid');
      expect(result1.success).toBe(false);
      expect(result1.error).toBe('Loan match weight must be a number');

      const result2 = await updateTeamLoanMatchWeight(teamId, NaN);
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('Loan match weight must be a number');
    });

    it('updates weight preference', async () => {
      const upsert = jest.fn().mockResolvedValue({ error: null });
      supabase.from.mockReturnValue({ upsert });

      const result = await updateTeamLoanMatchWeight(teamId, 0.75);

      expect(supabase.from).toHaveBeenCalledWith('team_preference');
      expect(upsert).toHaveBeenCalledWith(
        {
          team_id: teamId,
          key: 'loanMatchWeight',
          value: '0.75',
          category: 'statistics',
          description: 'Weight applied to loan matches when calculating player statistics'
        },
        {
          onConflict: 'team_id,key',
          ignoreDuplicates: false
        }
      );
      expect(result.success).toBe(true);
      expect(result.weight).toBe(0.75);
    });

    it('accepts string weight and converts to number', async () => {
      const upsert = jest.fn().mockResolvedValue({ error: null });
      supabase.from.mockReturnValue({ upsert });

      const result = await updateTeamLoanMatchWeight(teamId, '1.0');

      expect(result.success).toBe(true);
      expect(result.weight).toBe(1.0);
    });

    it('handles database errors', async () => {
      const upsert = jest.fn().mockResolvedValue({ error: { message: 'DB error' } });
      supabase.from.mockReturnValue({ upsert });

      const result = await updateTeamLoanMatchWeight(teamId, 0.75);

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB error');
    });
  });

  describe('calculateWeightedMatches', () => {
    it('calculates weighted matches correctly', () => {
      const result = calculateWeightedMatches(10, 4, 0.5);

      expect(result.regularMatches).toBe(10);
      expect(result.loanMatches).toBe(4);
      expect(result.loanWeight).toBe(0.5);
      expect(result.weightedLoanMatches).toBe(2);
      expect(result.totalWeighted).toBe(12);
    });

    it('uses default weight when not provided', () => {
      const result = calculateWeightedMatches(10, 4);

      expect(result.loanWeight).toBe(0.5);
      expect(result.totalWeighted).toBe(12);
    });

    it('handles zero loan matches', () => {
      const result = calculateWeightedMatches(10, 0, 0.5);

      expect(result.totalWeighted).toBe(10);
      expect(result.weightedLoanMatches).toBe(0);
    });

    it('handles zero regular matches', () => {
      const result = calculateWeightedMatches(0, 4, 0.5);

      expect(result.totalWeighted).toBe(2);
      expect(result.regularMatches).toBe(0);
    });

    it('handles invalid inputs gracefully', () => {
      const result = calculateWeightedMatches(null, undefined, 'invalid');

      expect(result.regularMatches).toBe(0);
      expect(result.loanMatches).toBe(0);
      expect(result.loanWeight).toBe(0.5);
      expect(result.totalWeighted).toBe(0);
    });

    it('handles weight of 1.0 (full credit)', () => {
      const result = calculateWeightedMatches(10, 4, 1.0);

      expect(result.weightedLoanMatches).toBe(4);
      expect(result.totalWeighted).toBe(14);
    });

    it('handles weight of 0.0 (no credit)', () => {
      const result = calculateWeightedMatches(10, 4, 0.0);

      expect(result.weightedLoanMatches).toBe(0);
      expect(result.totalWeighted).toBe(10);
    });

    it('handles fractional results correctly', () => {
      const result = calculateWeightedMatches(10, 3, 0.33);

      expect(result.weightedLoanMatches).toBeCloseTo(0.99, 2);
      expect(result.totalWeighted).toBeCloseTo(10.99, 2);
    });

    it('preserves negative loan weights', () => {
      const result = calculateWeightedMatches(5, 2, -0.5);

      expect(result.loanWeight).toBe(-0.5);
      expect(result.weightedLoanMatches).toBe(-1);
      expect(result.totalWeighted).toBe(4);
    });

    it('falls back to default weight for NaN and Infinity', () => {
      const nanResult = calculateWeightedMatches(4, 2, NaN);
      expect(nanResult.loanWeight).toBe(0.5);
      expect(nanResult.totalWeighted).toBe(5);

      const infinityResult = calculateWeightedMatches(4, 2, Infinity);
      expect(infinityResult.loanWeight).toBe(0.5);
      expect(infinityResult.totalWeighted).toBe(5);
    });
  });
});
