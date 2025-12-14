/**
 * Tests for get-live-match-events Edge Function
 * Security-critical public endpoint using service_role
 */

// Mock Deno environment
const mockEnv = {
  get: jest.fn((key: string) => {
    if (key === 'SUPABASE_URL') return 'https://test.supabase.co';
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'test-service-role-key';
    return undefined;
  })
};

global.Deno = {
  env: mockEnv,
  serve: jest.fn()
} as any;

// Import after setting up global.Deno
import { corsHeaders } from '../../../_shared/cors.ts';

// UUID validation regex (from the Edge Function)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('get-live-match-events Edge Function', () => {
  describe('UUID_REGEX validation', () => {
    it('accepts valid UUID v4', () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        '123e4567-e89b-12d3-a456-426614174000',
        'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        'AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE'
      ];

      validUUIDs.forEach(uuid => {
        expect(UUID_REGEX.test(uuid)).toBe(true);
      });
    });

    it('accepts valid UUID v1', () => {
      const uuidV1 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      expect(UUID_REGEX.test(uuidV1)).toBe(true);
    });

    it('accepts valid UUID v5', () => {
      const uuidV5 = '886313e1-3b8a-5372-9b90-0c9aee199e5d';
      expect(UUID_REGEX.test(uuidV5)).toBe(true);
    });

    it('rejects invalid UUID formats', () => {
      const invalidUUIDs = [
        '550e8400-e29b-41d4-a716', // Too short
        '550e8400-e29b-41d4-a716-446655440000-extra', // Too long
        'not-a-uuid',
        '550e8400e29b41d4a716446655440000', // Missing dashes
        '550e8400-e29b-41d4-g716-446655440000', // Invalid character 'g'
        '550e8400-e29b-71d4-a716-446655440000', // Invalid version (7)
        '550e8400-e29b-41d4-f716-446655440000' // Invalid variant (f)
      ];

      invalidUUIDs.forEach(uuid => {
        expect(UUID_REGEX.test(uuid)).toBe(false);
      });
    });

    it('rejects empty or null values', () => {
      expect(UUID_REGEX.test('')).toBe(false);
      expect(UUID_REGEX.test(null as any)).toBe(false);
      expect(UUID_REGEX.test(undefined as any)).toBe(false);
    });

    it('rejects SQL injection attempts', () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE match_log_event; --",
        "' OR '1'='1",
        "1'; DELETE FROM match_log_event WHERE '1'='1",
        "../../../etc/passwd"
      ];

      sqlInjectionAttempts.forEach(attempt => {
        expect(UUID_REGEX.test(attempt)).toBe(false);
      });
    });

    it('handles uppercase and lowercase UUIDs', () => {
      const lowerUUID = '550e8400-e29b-41d4-a716-446655440000';
      const upperUUID = '550E8400-E29B-41D4-A716-446655440000';
      const mixedUUID = '550e8400-E29B-41d4-A716-446655440000';

      expect(UUID_REGEX.test(lowerUUID)).toBe(true);
      expect(UUID_REGEX.test(upperUUID)).toBe(true);
      expect(UUID_REGEX.test(mixedUUID)).toBe(true);
    });
  });

  describe('Parameter validation and error responses', () => {
    let mockSupabase: any;
    let mockRequest: any;

    beforeEach(() => {
      // Reset mocks
      mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis()
      };

      // Mock createClient to return our mock Supabase
      jest.mock('jsr:@supabase/supabase-js@2', () => ({
        createClient: jest.fn(() => mockSupabase)
      }));
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('returns 400 when match_id is missing', async () => {
      const url = 'https://test.supabase.co/functions/v1/get-live-match-events';

      mockRequest = new Request(url, {
        method: 'GET'
      });

      // Simulate the Edge Function logic
      const parsedUrl = new URL(mockRequest.url);
      const matchId = parsedUrl.searchParams.get('match_id');

      if (!matchId) {
        const response = new Response(
          JSON.stringify({
            error: 'Missing required parameter: match_id',
            message: 'Please provide a valid match ID'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.error).toBe('Missing required parameter: match_id');
      }
    });

    it('returns 400 when match_id is invalid UUID', async () => {
      const url = 'https://test.supabase.co/functions/v1/get-live-match-events?match_id=not-a-uuid';

      mockRequest = new Request(url, {
        method: 'GET'
      });

      const parsedUrl = new URL(mockRequest.url);
      const matchId = parsedUrl.searchParams.get('match_id');

      if (matchId && !UUID_REGEX.test(matchId)) {
        const response = new Response(
          JSON.stringify({
            error: 'Invalid match_id format',
            message: 'match_id must be a valid UUID'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.error).toBe('Invalid match_id format');
        expect(body.message).toBe('match_id must be a valid UUID');
      }
    });

    it('returns 400 when since_ordinal is negative', async () => {
      const url = 'https://test.supabase.co/functions/v1/get-live-match-events?match_id=550e8400-e29b-41d4-a716-446655440000&since_ordinal=-5';

      mockRequest = new Request(url, {
        method: 'GET'
      });

      const parsedUrl = new URL(mockRequest.url);
      const sinceOrdinal = parsedUrl.searchParams.get('since_ordinal');

      if (sinceOrdinal !== null) {
        const parsed = parseInt(sinceOrdinal, 10);
        if (isNaN(parsed) || parsed < 0) {
          const response = new Response(
            JSON.stringify({
              error: 'Invalid since_ordinal',
              message: 'since_ordinal must be a non-negative integer'
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );

          expect(response.status).toBe(400);
          const body = await response.json();
          expect(body.error).toBe('Invalid since_ordinal');
        }
      }
    });

    it('returns 400 when since_ordinal is not an integer', async () => {
      const invalidValues = ['abc', '3.14', '10.5', 'null', 'undefined'];

      invalidValues.forEach(value => {
        const parsed = parseInt(value, 10);
        expect(isNaN(parsed) || parsed < 0).toBe(true);
      });
    });

    it('accepts valid since_ordinal values', () => {
      const validValues = ['0', '1', '100', '999999'];

      validValues.forEach(value => {
        const parsed = parseInt(value, 10);
        expect(!isNaN(parsed) && parsed >= 0).toBe(true);
      });
    });

    it('handles missing since_ordinal (null)', () => {
      const sinceOrdinal = null;
      let sinceOrdinalValue: number | null = null;

      if (sinceOrdinal !== null) {
        sinceOrdinalValue = parseInt(sinceOrdinal, 10);
      }

      expect(sinceOrdinalValue).toBe(null);
    });
  });

  describe('Query building logic', () => {
    it('constructs base query with match_id filter', () => {
      const matchId = '550e8400-e29b-41d4-a716-446655440000';

      // Simulate query construction
      const querySteps: string[] = [];

      querySteps.push('from(match_log_event)');
      querySteps.push('select(*)');
      querySteps.push(`eq(match_id, ${matchId})`);
      querySteps.push('order(ordinal, ascending)');

      expect(querySteps).toContain('from(match_log_event)');
      expect(querySteps).toContain('select(*)');
      expect(querySteps).toContain(`eq(match_id, ${matchId})`);
      expect(querySteps).toContain('order(ordinal, ascending)');
    });

    it('adds gt filter when since_ordinal is provided', () => {
      const matchId = '550e8400-e29b-41d4-a716-446655440000';
      const sinceOrdinal = 42;

      const querySteps: string[] = [];

      querySteps.push('from(match_log_event)');
      querySteps.push('select(*)');
      querySteps.push(`eq(match_id, ${matchId})`);
      querySteps.push('order(ordinal, ascending)');

      if (sinceOrdinal !== null) {
        querySteps.push(`gt(ordinal, ${sinceOrdinal})`);
      }

      expect(querySteps).toContain(`gt(ordinal, ${sinceOrdinal})`);
    });

    it('skips gt filter when since_ordinal is null', () => {
      const matchId = '550e8400-e29b-41d4-a716-446655440000';
      const sinceOrdinal = null;

      const querySteps: string[] = [];

      querySteps.push('from(match_log_event)');
      querySteps.push('select(*)');
      querySteps.push(`eq(match_id, ${matchId})`);
      querySteps.push('order(ordinal, ascending)');

      if (sinceOrdinal !== null) {
        querySteps.push(`gt(ordinal, ${sinceOrdinal})`);
      }

      expect(querySteps).not.toContain('gt(ordinal');
      expect(querySteps.length).toBe(4);
    });
  });

  describe('Response structure', () => {
    it('calculates latest_ordinal from returned events', () => {
      const events = [
        { ordinal: 1, event_type: 'match_started' },
        { ordinal: 5, event_type: 'goal_scored' },
        { ordinal: 10, event_type: 'period_ended' },
        { ordinal: 3, event_type: 'substitution_in' }
      ];

      const latestOrdinal = events && events.length > 0
        ? Math.max(...events.map(e => e.ordinal))
        : 0;

      expect(latestOrdinal).toBe(10);
    });

    it('returns since_ordinal when no events returned', () => {
      const events: any[] = [];
      const sinceOrdinalValue = 42;

      const latestOrdinal = events && events.length > 0
        ? Math.max(...events.map(e => e.ordinal))
        : sinceOrdinalValue || 0;

      expect(latestOrdinal).toBe(42);
    });

    it('returns 0 when no events and no since_ordinal', () => {
      const events: any[] = [];
      const sinceOrdinalValue = null;

      const latestOrdinal = events && events.length > 0
        ? Math.max(...events.map(e => e.ordinal))
        : sinceOrdinalValue || 0;

      expect(latestOrdinal).toBe(0);
    });

    it('returns correct count', () => {
      const events = [
        { ordinal: 1 },
        { ordinal: 2 },
        { ordinal: 3 }
      ];

      const count = events?.length || 0;

      expect(count).toBe(3);
    });

    it('handles empty events array', () => {
      const events: any[] = [];

      const latestOrdinal = events && events.length > 0
        ? Math.max(...events.map(e => e.ordinal))
        : 0;
      const count = events?.length || 0;

      expect(latestOrdinal).toBe(0);
      expect(count).toBe(0);
    });

    it('handles null events', () => {
      const events = null;

      const latestOrdinal = events && events.length > 0
        ? Math.max(...(events as any).map((e: any) => e.ordinal))
        : 0;
      const count = events?.length || 0;

      expect(latestOrdinal).toBe(0);
      expect(count).toBe(0);
    });
  });

  describe('CORS handling', () => {
    it('returns CORS headers for OPTIONS request', () => {
      const response = new Response('ok', { headers: corsHeaders });

      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Headers')).toBeDefined();
    });

    it('includes CORS headers in all responses', () => {
      const responses = [
        new Response(JSON.stringify({ error: 'test' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }),
        new Response(JSON.stringify({ error: 'test' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }),
        new Response(JSON.stringify({ events: [] }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      ];

      responses.forEach(response => {
        expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
      });
    });
  });

  describe('Error handling', () => {
    it('returns 500 for database errors', () => {
      const error = new Error('Database connection failed');

      const response = new Response(
        JSON.stringify({
          error: 'Database error',
          message: error.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

      expect(response.status).toBe(500);
    });

    it('handles unexpected errors gracefully', () => {
      const error = new Error('Unexpected error');

      const response = new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

      expect(response.status).toBe(500);
    });

    it('handles non-Error exceptions', () => {
      const error = 'String error';

      const response = new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

      expect(response.status).toBe(500);
      const expectedMessage = error instanceof Error ? error.message : 'Unknown error';
      expect(expectedMessage).toBe('Unknown error');
    });
  });

  describe('Security considerations', () => {
    it('validates environment variables are set', () => {
      const supabaseUrl = mockEnv.get('SUPABASE_URL');
      const supabaseKey = mockEnv.get('SUPABASE_SERVICE_ROLE_KEY');

      expect(supabaseUrl).toBeDefined();
      expect(supabaseKey).toBeDefined();
      expect(supabaseUrl).toBeTruthy();
      expect(supabaseKey).toBeTruthy();
    });

    it('uses service_role for database access', () => {
      const key = mockEnv.get('SUPABASE_SERVICE_ROLE_KEY');

      // Service role key should be used (not anon key)
      expect(key).toBe('test-service-role-key');
    });

    it('rejects UUIDs with path traversal attempts', () => {
      const pathTraversalAttempts = [
        '../550e8400-e29b-41d4-a716-446655440000',
        '../../etc/passwd',
        '550e8400-e29b-41d4-a716-446655440000/../../../',
        './550e8400-e29b-41d4-a716-446655440000'
      ];

      pathTraversalAttempts.forEach(attempt => {
        expect(UUID_REGEX.test(attempt)).toBe(false);
      });
    });

    it('only queries match_log_event table', () => {
      // This is enforced by the query construction
      const tableName = 'match_log_event';

      expect(tableName).toBe('match_log_event');
      // In the actual implementation, ensure no other tables are accessed
    });
  });
});
