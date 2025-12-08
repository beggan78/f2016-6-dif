import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// UUID validation regex (RFC 4122 compliant)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse query parameters
    const url = new URL(req.url)
    const matchId = url.searchParams.get('match_id')
    const sinceOrdinal = url.searchParams.get('since_ordinal')

    // Validate match_id parameter (required)
    if (!matchId) {
      return new Response(
        JSON.stringify({
          error: 'Missing required parameter: match_id',
          message: 'Please provide a valid match ID'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate match_id is a valid UUID
    if (!UUID_REGEX.test(matchId)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid match_id format',
          message: 'match_id must be a valid UUID'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate since_ordinal (optional, must be non-negative integer)
    let sinceOrdinalValue: number | null = null
    if (sinceOrdinal !== null) {
      const parsed = parseInt(sinceOrdinal, 10)
      if (isNaN(parsed) || parsed < 0) {
        return new Response(
          JSON.stringify({
            error: 'Invalid since_ordinal',
            message: 'since_ordinal must be a non-negative integer'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      sinceOrdinalValue = parsed
    }

    // Create Supabase client with service_role to bypass RLS
    // CRITICAL: This enables anonymous access to match_log_event table only
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Build query for match events
    let query = supabase
      .from('match_log_event')
      .select('*')
      .eq('match_id', matchId)
      .order('ordinal', { ascending: true })

    // Add ordinal filter for incremental fetching
    if (sinceOrdinalValue !== null) {
      query = query.gt('ordinal', sinceOrdinalValue)
    }

    const { data: events, error } = await query

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({
          error: 'Database error',
          message: error.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Calculate latest ordinal from returned events
    const latestOrdinal = events && events.length > 0
      ? Math.max(...events.map(e => e.ordinal))
      : sinceOrdinalValue || 0

    // Return events with metadata
    return new Response(
      JSON.stringify({
        events: events || [],
        latest_ordinal: latestOrdinal,
        count: events?.length || 0
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
