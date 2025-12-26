import { Redis } from 'https://esm.sh/@upstash/redis@1.28.4'

// Time constants (matching connect-provider)
export const MS_IN_SECOND = 1000;
export const MS_IN_MINUTE = 60 * MS_IN_SECOND;
export const MS_IN_HOUR = 60 * MS_IN_MINUTE;
export const BASE_RATE_LIMIT_DELAY_MS = MS_IN_SECOND;
export const MAX_RATE_LIMIT_DELAY_MS = 30 * MS_IN_SECOND;

// Rate limit data structures
export interface RateLimitEntry {
  count: number;
  lastReset: number;
  blocked: boolean;
  violations: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  violationThreshold: number;
  blockDurationMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  delay?: number;
  message?: string;
  headers: Record<string, string>;
  error?: string;
}

const DEFAULT_RATE_LIMIT_ENTRY: RateLimitEntry = {
  count: 0,
  lastReset: Date.now(),
  blocked: false,
  violations: 0
};

// Initialize Redis client with fail-open error handling
export function createRedisClient(): Redis | null {
  const upstashUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
  const upstashToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

  if (!upstashUrl || !upstashToken) {
    console.error('🚨 CRITICAL: Upstash Redis credentials not configured for rate limiting');
    console.error('UPSTASH_REDIS_REST_URL:', upstashUrl ? '✅ Set' : '❌ Missing');
    console.error('UPSTASH_REDIS_REST_TOKEN:', upstashToken ? '✅ Set' : '❌ Missing');
    console.warn('⚠️ Rate limiting will operate in FAIL-OPEN mode (allowing all requests)');
    return null;
  }

  try {
    const redis = new Redis({
      url: upstashUrl,
      token: upstashToken,
    });

    console.log('✅ Redis rate limiter initialized for connect-provider');
    return redis;
  } catch (error) {
    console.error('🚨 CRITICAL: Failed to initialize Redis client for rate limiting:', error);
    console.warn('⚠️ Rate limiting will operate in FAIL-OPEN mode (allowing all requests)');
    return null;
  }
}

// Fetch rate limit entry from Redis Hash
export async function getRateLimitEntry(
  redis: Redis,
  key: string
): Promise<RateLimitEntry> {
  try {
    const data = await redis.hgetall<Record<string, string>>(key);

    if (!data || Object.keys(data).length === 0) {
      // Entry doesn't exist, return default
      return { ...DEFAULT_RATE_LIMIT_ENTRY, lastReset: Date.now() };
    }

    // Parse Redis hash fields (all stored as strings)
    return {
      count: parseInt(data.count || '0', 10),
      lastReset: parseInt(data.lastReset || String(Date.now()), 10),
      blocked: data.blocked === '1',
      violations: parseInt(data.violations || '0', 10)
    };
  } catch (error) {
    console.error('🚨 Redis HGETALL failed:', error);
    throw error; // Re-throw to trigger fail-open mode
  }
}

// Store rate limit entry to Redis Hash with TTL
export async function setRateLimitEntry(
  redis: Redis,
  key: string,
  entry: RateLimitEntry,
  config: RateLimitConfig
): Promise<void> {
  try {
    // Convert entry to string hash fields
    const hashData = {
      count: String(entry.count),
      lastReset: String(entry.lastReset),
      blocked: entry.blocked ? '1' : '0',
      violations: String(entry.violations)
    };

    // Store hash
    await redis.hset(key, hashData);

    // Set TTL to window + block duration (prevents indefinite storage)
    const ttlSeconds = Math.ceil((config.windowMs + config.blockDurationMs) / MS_IN_SECOND);
    await redis.expire(key, ttlSeconds);
  } catch (error) {
    console.error('🚨 Redis HSET/EXPIRE failed:', error);
    throw error; // Re-throw to trigger fail-open mode
  }
}

// Generate standard HTTP rate limit headers
export function generateRateLimitHeaders(
  entry: RateLimitEntry,
  config: RateLimitConfig,
  retryAfterSeconds?: number
): Record<string, string> {
  const resetTime = entry.lastReset + config.windowMs;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(config.maxRequests),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.floor(resetTime / MS_IN_SECOND)),
  };

  if (retryAfterSeconds !== undefined) {
    headers['Retry-After'] = String(retryAfterSeconds);
  }

  return headers;
}

// Main rate limit check function (async version of connect-provider's checkRateLimit)
export async function checkRateLimitRedis(
  redis: Redis | null,
  identifier: string,
  config: RateLimitConfig,
  tier: 'ip' | 'user' | 'global' | 'bot'
): Promise<RateLimitResult> {
  // Fail-open if Redis unavailable
  if (!redis) {
    console.warn('⚠️ Rate limiter unavailable - allowing request (FAIL-OPEN mode)');
    return { allowed: true, headers: {} };
  }

  const key = `ratelimit:connect-provider:${tier}:${identifier}`;
  const now = Date.now();

  try {
    // Fetch current entry from Redis
    const entry = await getRateLimitEntry(redis, key);

    // Check if currently blocked
    if (entry.blocked && now - entry.lastReset < config.blockDurationMs) {
      const remainingMs = config.blockDurationMs - (now - entry.lastReset);
      const remainingMinutes = Math.ceil(remainingMs / MS_IN_MINUTE);

      return {
        allowed: false,
        message: `Rate limit exceeded. Try again in ${remainingMinutes} minutes.`,
        headers: generateRateLimitHeaders(entry, config, Math.ceil(remainingMs / MS_IN_SECOND))
      };
    }

    // Reset window if expired
    if (now - entry.lastReset >= config.windowMs) {
      entry.count = 0;
      entry.lastReset = now;
      entry.blocked = false;
      // Note: violations persist across windows for escalation tracking
    }

    // Increment count
    entry.count++;

    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      entry.violations++;

      // Block if too many violations
      if (entry.violations >= config.violationThreshold) {
        entry.blocked = true;
        entry.lastReset = now;
        console.warn(
          `🚨 SECURITY: Rate limit violation - blocking ${tier}:${identifier} for ${config.blockDurationMs / MS_IN_MINUTE} minutes`
        );
      }

      // Calculate exponential backoff delay (max 30 seconds)
      const delay = Math.min(
        BASE_RATE_LIMIT_DELAY_MS * Math.pow(2, entry.violations),
        MAX_RATE_LIMIT_DELAY_MS
      );

      // Store updated entry
      await setRateLimitEntry(redis, key, entry, config);

      return {
        allowed: false,
        delay,
        message: `Rate limit exceeded. Please wait ${delay / MS_IN_SECOND} seconds before retrying.`,
        headers: generateRateLimitHeaders(entry, config, Math.ceil(delay / MS_IN_SECOND))
      };
    }

    // Store updated entry
    await setRateLimitEntry(redis, key, entry, config);

    return {
      allowed: true,
      headers: generateRateLimitHeaders(entry, config)
    };

  } catch (error) {
    console.error('🚨 CRITICAL: Rate limit check failed:', error);
    console.warn('⚠️ Failing open - allowing request due to Redis error');

    // Fail-open on Redis errors
    return {
      allowed: true,
      headers: {},
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
