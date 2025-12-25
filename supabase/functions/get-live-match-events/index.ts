import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { Redis } from 'https://esm.sh/@upstash/redis@1.28.4'
import { Ratelimit } from 'https://esm.sh/@upstash/ratelimit@1.0.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// UUID validation regex (RFC 4122 compliant)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
// Explicitly whitelist public fields to avoid exposing internal metadata
const MATCH_LOG_EVENT_COLUMNS =
  'id, match_id, event_type, period, occurred_at_seconds, ordinal, data, created_at, correlation_id, player_id'

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 60 seconds
const RATE_LIMIT_MAX_REQUESTS = 5

// Extract client IP from request headers
function extractClientIP(req: Request): string {
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip',
    'x-client-ip',
  ]

  for (const header of headers) {
    const value = req.headers.get(header)
    if (value) {
      const ip = value.split(',')[0].trim()
      if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip) || /^[0-9a-fA-F:]+$/.test(ip)) {
        return ip
      }
    }
  }
  return 'unknown'
}

// Initialize Upstash Redis rate limiter
function createRateLimiter(): Ratelimit | null {
  const upstashUrl = Deno.env.get('UPSTASH_REDIS_REST_URL')
  const upstashToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')

  if (!upstashUrl || !upstashToken) {
    console.error('🚨 CRITICAL: Upstash Redis credentials not configured')
    console.error('UPSTASH_REDIS_REST_URL:', upstashUrl ? '✅ Set' : '❌ Missing')
    console.error('UPSTASH_REDIS_REST_TOKEN:', upstashToken ? '✅ Set' : '❌ Missing')
    return null
  }

  try {
    const redis = new Redis({
      url: upstashUrl,
      token: upstashToken,
    })

    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(RATE_LIMIT_MAX_REQUESTS, `${RATE_LIMIT_WINDOW_MS} ms`),
      analytics: true,
      prefix: 'ratelimit:live-match-events',
    })

    console.log('✅ Rate limiter initialized: 5 requests per 60 seconds (sliding window)')
    return ratelimit
  } catch (error) {
    console.error('🚨 CRITICAL: Failed to initialize rate limiter:', error)
    return null
  }
}

// Check rate limit for IP address
async function checkRateLimit(
  ratelimit: Ratelimit | null,
  identifier: string
): Promise<{ allowed: boolean; limit?: number; remaining?: number; reset?: number; error?: string }> {
  if (!ratelimit) {
    console.warn('⚠️ Rate limiter unavailable - allowing request (FAIL-OPEN mode)')
    return { allowed: true }
  }

  try {
    const result = await ratelimit.limit(identifier)

    if (!result.success) {
      console.warn(`🚨 SECURITY: Rate limit exceeded for IP: ${identifier}`)
      console.warn(`Rate limit details: ${result.remaining}/${result.limit} remaining, resets in ${Math.ceil((result.reset - Date.now()) / 1000)}s`)
    }

    return {
      allowed: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    }
  } catch (error) {
    console.error('🚨 CRITICAL: Rate limit check failed:', error)
    return { allowed: true, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Rate limiting check (before any processing)
  const clientIP = extractClientIP(req)
  const ratelimit = createRateLimiter()

  const rateLimitResult = await checkRateLimit(ratelimit, `ip:${clientIP}`)

  if (!rateLimitResult.allowed) {
    const resetInSeconds = rateLimitResult.reset
      ? Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
      : 60

    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Too many requests. Please wait ${resetInSeconds} seconds before trying again.`,
        retry_after_seconds: resetInSeconds,
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining,
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(resetInSeconds),
          'X-RateLimit-Limit': String(rateLimitResult.limit || RATE_LIMIT_MAX_REQUESTS),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining || 0),
          'X-RateLimit-Reset': String(rateLimitResult.reset || Date.now() + RATE_LIMIT_WINDOW_MS),
        }
      }
    )
  }

  if (rateLimitResult.error) {
    console.error('🚨 CRITICAL: Rate limiter degraded - request allowed but monitoring required')
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
      .select(MATCH_LOG_EVENT_COLUMNS)
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
