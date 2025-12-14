/**
 * Tests for Match Integration Service
 * Integration layer between match records and external data sources
 */

import { findUpcomingMatchByOpponent } from '../matchIntegrationService';
import * as fixtures from './__fixtures__/upcomingMatches';

// Mock dependencies
jest.mock('../../lib/supabase');

describe('MatchIntegrationService', () => {
  let mockSupabase;

  beforeEach(() => {
    // Setup Supabase mock with chainable methods
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis()
    };

    require('../../lib/supabase').supabase = mockSupabase;

    // Suppress console errors in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findUpcomingMatchByOpponent', () => {
    describe('Input validation', () => {
      it('returns null when teamId is missing', async () => {
        const result = await findUpcomingMatchByOpponent(null, 'Palawan');
        expect(result).toBe(null);
        expect(mockSupabase.from).not.toHaveBeenCalled();
      });

      it('returns null when teamId is empty string', async () => {
        const result = await findUpcomingMatchByOpponent('', 'Palawan');
        expect(result).toBe(null);
        expect(mockSupabase.from).not.toHaveBeenCalled();
      });

      it('returns null when opponentName is missing', async () => {
        const result = await findUpcomingMatchByOpponent(fixtures.sampleTeamId, null);
        expect(result).toBe(null);
        expect(mockSupabase.from).not.toHaveBeenCalled();
      });

      it('returns null when opponentName is empty string', async () => {
        const result = await findUpcomingMatchByOpponent(fixtures.sampleTeamId, '');
        expect(result).toBe(null);
        expect(mockSupabase.from).not.toHaveBeenCalled();
      });

      it('returns null when both parameters are missing', async () => {
        const result = await findUpcomingMatchByOpponent(null, null);
        expect(result).toBe(null);
        expect(mockSupabase.from).not.toHaveBeenCalled();
      });
    });

    describe('Query construction', () => {
      beforeEach(() => {
        mockSupabase.order.mockResolvedValue({ data: [], error: null });
      });

      it('queries upcoming_match table with connector join', async () => {
        await findUpcomingMatchByOpponent(fixtures.sampleTeamId, 'Palawan');

        expect(mockSupabase.from).toHaveBeenCalledWith('upcoming_match');
        expect(mockSupabase.select).toHaveBeenCalledWith(
          expect.stringContaining('connector!inner')
        );
      });

      it('filters by team_id through connector relationship', async () => {
        await findUpcomingMatchByOpponent(fixtures.sampleTeamId, 'Palawan');

        expect(mockSupabase.eq).toHaveBeenCalledWith('connector.team_id', fixtures.sampleTeamId);
      });

      it('filters by date >= today', async () => {
        const today = new Date().toISOString().split('T')[0];

        await findUpcomingMatchByOpponent(fixtures.sampleTeamId, 'Palawan');

        expect(mockSupabase.gte).toHaveBeenCalledWith('match_date', today);
      });

      it('orders results by match_date ascending', async () => {
        await findUpcomingMatchByOpponent(fixtures.sampleTeamId, 'Palawan');

        expect(mockSupabase.order).toHaveBeenCalledWith('match_date', { ascending: true });
      });
    });

    describe('Opponent name matching', () => {
      it('matches opponent name case-insensitively', async () => {
        mockSupabase.order.mockResolvedValue({
          data: [
            fixtures.upcomingMatchAgainstPalawan,
            fixtures.upcomingMatchAgainstThunder
          ],
          error: null
        });

        // Search with lowercase
        const result1 = await findUpcomingMatchByOpponent(fixtures.sampleTeamId, 'palawan');
        expect(result1).toEqual(fixtures.upcomingMatchAgainstPalawan);

        // Search with uppercase
        const result2 = await findUpcomingMatchByOpponent(fixtures.sampleTeamId, 'PALAWAN');
        expect(result2).toEqual(fixtures.upcomingMatchAgainstPalawan);

        // Search with mixed case
        const result3 = await findUpcomingMatchByOpponent(fixtures.sampleTeamId, 'PaLaWaN');
        expect(result3).toEqual(fixtures.upcomingMatchAgainstPalawan);
      });

      it('trims whitespace from opponent name', async () => {
        mockSupabase.order.mockResolvedValue({
          data: [fixtures.upcomingMatchAgainstPalawan],
          error: null
        });

        const result = await findUpcomingMatchByOpponent(fixtures.sampleTeamId, '  Palawan  ');
        expect(result).toEqual(fixtures.upcomingMatchAgainstPalawan);
      });

      it('handles whitespace in database opponent name', async () => {
        mockSupabase.order.mockResolvedValue({
          data: [fixtures.upcomingMatchWithWhitespace],
          error: null
        });

        // Database has '  Palawan  ', search with 'Palawan'
        const result = await findUpcomingMatchByOpponent(fixtures.sampleTeamId, 'Palawan');
        expect(result).toEqual(fixtures.upcomingMatchWithWhitespace);
      });

      it('combines case-insensitive and whitespace normalization', async () => {
        mockSupabase.order.mockResolvedValue({
          data: [fixtures.upcomingMatchWithWhitespace],
          error: null
        });

        const result = await findUpcomingMatchByOpponent(fixtures.sampleTeamId, '  PALAWAN  ');
        expect(result).toEqual(fixtures.upcomingMatchWithWhitespace);
      });
    });

    describe('Result handling', () => {
      it('returns first matching opponent when found', async () => {
        mockSupabase.order.mockResolvedValue({
          data: [
            fixtures.upcomingMatchAgainstPalawan,
            fixtures.upcomingMatchAgainstThunder,
            fixtures.upcomingMatchAgainstLightning
          ],
          error: null
        });

        const result = await findUpcomingMatchByOpponent(fixtures.sampleTeamId, 'Thunder United');
        expect(result).toEqual(fixtures.upcomingMatchAgainstThunder);
      });

      it('returns first match when multiple matches against same opponent', async () => {
        const palawan1 = { ...fixtures.upcomingMatchAgainstPalawan, id: 'match-1' };
        const palawan2 = {
          ...fixtures.upcomingMatchAgainstPalawan,
          id: 'match-2',
          match_date: fixtures.getNextWeek()
        };

        mockSupabase.order.mockResolvedValue({
          data: [palawan1, palawan2],
          error: null
        });

        const result = await findUpcomingMatchByOpponent(fixtures.sampleTeamId, 'Palawan');
        expect(result).toEqual(palawan1);
      });

      it('returns null when no matches found', async () => {
        mockSupabase.order.mockResolvedValue({
          data: [fixtures.upcomingMatchAgainstThunder],
          error: null
        });

        const result = await findUpcomingMatchByOpponent(fixtures.sampleTeamId, 'Nonexistent Team');
        expect(result).toBe(null);
      });

      it('returns null when database returns empty array', async () => {
        mockSupabase.order.mockResolvedValue({
          data: [],
          error: null
        });

        const result = await findUpcomingMatchByOpponent(fixtures.sampleTeamId, 'Palawan');
        expect(result).toBe(null);
      });

      it('returns null when database returns null data', async () => {
        mockSupabase.order.mockResolvedValue({
          data: null,
          error: null
        });

        const result = await findUpcomingMatchByOpponent(fixtures.sampleTeamId, 'Palawan');
        expect(result).toBe(null);
      });
    });

    describe('Error handling', () => {
      it('returns null on database error', async () => {
        mockSupabase.order.mockResolvedValue({
          data: null,
          error: new Error('Database connection failed')
        });

        const result = await findUpcomingMatchByOpponent(fixtures.sampleTeamId, 'Palawan');

        expect(result).toBe(null);
        expect(console.error).toHaveBeenCalledWith(
          'Error finding upcoming match:',
          expect.any(Error)
        );
      });

      it('returns null on query exception', async () => {
        mockSupabase.order.mockRejectedValue(new Error('Network error'));

        const result = await findUpcomingMatchByOpponent(fixtures.sampleTeamId, 'Palawan');

        expect(result).toBe(null);
        expect(console.error).toHaveBeenCalledWith(
          'Error finding upcoming match:',
          expect.any(Error)
        );
      });

      it('logs error message to console', async () => {
        const error = new Error('Timeout error');
        mockSupabase.order.mockResolvedValue({
          data: null,
          error
        });

        await findUpcomingMatchByOpponent(fixtures.sampleTeamId, 'Palawan');

        expect(console.error).toHaveBeenCalledWith(
          'Error finding upcoming match:',
          error
        );
      });

      it('handles malformed database response gracefully', async () => {
        mockSupabase.order.mockResolvedValue({
          data: 'not-an-array',
          error: null
        });

        const result = await findUpcomingMatchByOpponent(fixtures.sampleTeamId, 'Palawan');

        // Should handle gracefully (may return null or throw, depending on implementation)
        expect(result).toBe(null);
      });
    });

    describe('RLS compliance', () => {
      it('relies on Supabase RLS for access control', async () => {
        mockSupabase.order.mockResolvedValue({
          data: [fixtures.upcomingMatchAgainstPalawan],
          error: null
        });

        await findUpcomingMatchByOpponent(fixtures.sampleTeamId, 'Palawan');

        // RLS is enforced at database level through connector relationship
        // The query doesn't explicitly check permissions - it relies on Supabase RLS
        expect(mockSupabase.select).toHaveBeenCalledWith(
          expect.stringContaining('connector!inner')
        );
        expect(mockSupabase.eq).toHaveBeenCalledWith('connector.team_id', fixtures.sampleTeamId);
      });
    });

    describe('Date filtering', () => {
      it('excludes past matches', async () => {
        mockSupabase.order.mockResolvedValue({
          data: [
            fixtures.upcomingMatchAgainstPalawan,
            fixtures.upcomingMatchAgainstThunder
          ],
          error: null
        });

        const today = new Date().toISOString().split('T')[0];

        await findUpcomingMatchByOpponent(fixtures.sampleTeamId, 'Palawan');

        expect(mockSupabase.gte).toHaveBeenCalledWith('match_date', today);
      });

      it('includes matches scheduled for today', async () => {
        mockSupabase.order.mockResolvedValue({
          data: [fixtures.upcomingMatchAgainstLightning],
          error: null
        });

        // Match is scheduled for today (from fixture)
        const result = await findUpcomingMatchByOpponent(fixtures.sampleTeamId, 'Lightning FC');

        expect(result).toEqual(fixtures.upcomingMatchAgainstLightning);
      });
    });

    describe('Integration scenarios', () => {
      it('finds match for typical workflow', async () => {
        mockSupabase.order.mockResolvedValue({
          data: fixtures.allUpcomingMatches,
          error: null
        });

        // User types opponent name in configuration screen
        const result = await findUpcomingMatchByOpponent(
          fixtures.sampleTeamId,
          'Palawan'
        );

        expect(result).toBeTruthy();
        expect(result.opponent.toLowerCase()).toContain('palawan');
        expect(result.match_date).toBeTruthy();
        expect(result.match_time).toBeTruthy();
      });

      it('returns null when opponent not in upcoming matches', async () => {
        mockSupabase.order.mockResolvedValue({
          data: [
            fixtures.upcomingMatchAgainstThunder,
            fixtures.upcomingMatchAgainstLightning
          ],
          error: null
        });

        const result = await findUpcomingMatchByOpponent(
          fixtures.sampleTeamId,
          'Palawan'
        );

        expect(result).toBe(null);
      });

      it('handles empty upcoming matches list', async () => {
        mockSupabase.order.mockResolvedValue({
          data: [],
          error: null
        });

        const result = await findUpcomingMatchByOpponent(
          fixtures.sampleTeamId,
          'Any Team'
        );

        expect(result).toBe(null);
      });
    });
  });
});
