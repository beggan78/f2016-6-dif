import { assertEquals, assertExists } from 'https://deno.land/std@0.192.0/testing/asserts.ts';
import {
  checkRateLimitRedis,
  createRedisClient,
  generateRateLimitHeaders,
  getRateLimitEntry,
  setRateLimitEntry,
  type RateLimitConfig,
  type RateLimitEntry,
  MS_IN_SECOND,
  MS_IN_MINUTE,
  MS_IN_HOUR,
} from '../redisRateLimit.ts';

// Mock Redis client for testing
interface MockRedisStore {
  [key: string]: Record<string, string> & { _ttl?: number };
}

class MockRedis {
  private store: MockRedisStore = {};
  public failOnNextCall = false;

  async hgetall<T>(key: string): Promise<T> {
    if (this.failOnNextCall) {
      this.failOnNextCall = false;
      throw new Error('Mock Redis connection error');
    }

    const data = this.store[key];
    if (!data) {
      return {} as T;
    }

    const { _ttl, ...hashData } = data;
    return hashData as T;
  }

  async hset(key: string, data: Record<string, string>): Promise<void> {
    if (this.failOnNextCall) {
      this.failOnNextCall = false;
      throw new Error('Mock Redis connection error');
    }

    if (!this.store[key]) {
      this.store[key] = {};
    }
    Object.assign(this.store[key], data);
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (this.failOnNextCall) {
      this.failOnNextCall = false;
      throw new Error('Mock Redis connection error');
    }

    if (this.store[key]) {
      this.store[key]._ttl = seconds;
    }
  }

  // Test helper methods
  clear() {
    this.store = {};
  }

  getTTL(key: string): number | undefined {
    return this.store[key]?._ttl;
  }

  getData(key: string): Record<string, string> | undefined {
    const data = this.store[key];
    if (!data) return undefined;
    const { _ttl, ...hashData } = data;
    return hashData;
  }
}

// Test configuration
const TEST_CONFIG: RateLimitConfig = {
  windowMs: MS_IN_HOUR,
  maxRequests: 10,
  violationThreshold: 3,
  blockDurationMs: MS_IN_HOUR,
};

Deno.test('createRedisClient - succeeds with valid credentials', () => {
  // Mock environment variables
  Deno.env.set('UPSTASH_REDIS_REST_URL', 'https://test.upstash.io');
  Deno.env.set('UPSTASH_REDIS_REST_TOKEN', 'test-token');

  const redis = createRedisClient();
  assertExists(redis);

  // Cleanup
  Deno.env.delete('UPSTASH_REDIS_REST_URL');
  Deno.env.delete('UPSTASH_REDIS_REST_TOKEN');
});

Deno.test('createRedisClient - returns null with missing credentials', () => {
  // Ensure no credentials
  Deno.env.delete('UPSTASH_REDIS_REST_URL');
  Deno.env.delete('UPSTASH_REDIS_REST_TOKEN');

  const redis = createRedisClient();
  assertEquals(redis, null);
});

Deno.test('getRateLimitEntry - returns default for non-existent key', async () => {
  const mockRedis = new MockRedis() as any;
  const entry = await getRateLimitEntry(mockRedis, 'test-key');

  assertEquals(entry.count, 0);
  assertEquals(entry.blocked, false);
  assertEquals(entry.violations, 0);
  assertExists(entry.lastReset);
});

Deno.test('getRateLimitEntry - parses existing entry correctly', async () => {
  const mockRedis = new MockRedis() as any;
  const now = Date.now();

  // Pre-populate mock Redis
  mockRedis.store['test-key'] = {
    count: '5',
    lastReset: String(now),
    blocked: '1',
    violations: '2',
  };

  const entry = await getRateLimitEntry(mockRedis, 'test-key');

  assertEquals(entry.count, 5);
  assertEquals(entry.lastReset, now);
  assertEquals(entry.blocked, true);
  assertEquals(entry.violations, 2);
});

Deno.test('setRateLimitEntry - stores entry with correct TTL', async () => {
  const mockRedis = new MockRedis() as any;
  const now = Date.now();

  const entry: RateLimitEntry = {
    count: 7,
    lastReset: now,
    blocked: false,
    violations: 1,
  };

  await setRateLimitEntry(mockRedis, 'test-key', entry, TEST_CONFIG);

  const stored = mockRedis.getData('test-key');
  assertEquals(stored?.count, '7');
  assertEquals(stored?.lastReset, String(now));
  assertEquals(stored?.blocked, '0');
  assertEquals(stored?.violations, '1');

  // Verify TTL is set correctly
  const ttl = mockRedis.getTTL('test-key');
  const expectedTTL = Math.ceil((TEST_CONFIG.windowMs + TEST_CONFIG.blockDurationMs) / MS_IN_SECOND);
  assertEquals(ttl, expectedTTL);
});

Deno.test('generateRateLimitHeaders - creates correct headers', () => {
  const now = Date.now();
  const entry: RateLimitEntry = {
    count: 7,
    lastReset: now,
    blocked: false,
    violations: 0,
  };

  const headers = generateRateLimitHeaders(entry, TEST_CONFIG);

  assertEquals(headers['X-RateLimit-Limit'], '10');
  assertEquals(headers['X-RateLimit-Remaining'], '3'); // 10 - 7
  assertEquals(headers['X-RateLimit-Reset'], String(Math.floor((now + TEST_CONFIG.windowMs) / MS_IN_SECOND)));
  assertEquals(headers['Retry-After'], undefined);
});

Deno.test('generateRateLimitHeaders - includes Retry-After when provided', () => {
  const now = Date.now();
  const entry: RateLimitEntry = {
    count: 11,
    lastReset: now,
    blocked: false,
    violations: 1,
  };

  const headers = generateRateLimitHeaders(entry, TEST_CONFIG, 30);

  assertEquals(headers['Retry-After'], '30');
});

Deno.test('checkRateLimitRedis - allows requests under limit', async () => {
  const mockRedis = new MockRedis() as any;
  const now = Date.now();

  // Pre-populate with count = 5
  mockRedis.store['ratelimit:connect-provider:ip:test-ip'] = {
    count: '5',
    lastReset: String(now),
    blocked: '0',
    violations: '0',
  };

  const result = await checkRateLimitRedis(mockRedis, 'test-ip', TEST_CONFIG, 'ip');

  assertEquals(result.allowed, true);
  assertEquals(result.headers['X-RateLimit-Remaining'], '4'); // 10 - 6 (incremented)
  assertEquals(result.error, undefined);

  // Verify count was incremented
  const stored = mockRedis.getData('ratelimit:connect-provider:ip:test-ip');
  assertEquals(stored?.count, '6');
});

Deno.test('checkRateLimitRedis - blocks requests over limit with exponential backoff', async () => {
  const mockRedis = new MockRedis() as any;
  const now = Date.now();

  // Pre-populate with count = 10 (at limit)
  mockRedis.store['ratelimit:connect-provider:ip:test-ip'] = {
    count: '10',
    lastReset: String(now),
    blocked: '0',
    violations: '1',
  };

  const result = await checkRateLimitRedis(mockRedis, 'test-ip', TEST_CONFIG, 'ip');

  assertEquals(result.allowed, false);
  assertEquals(result.delay, 4000); // 1s * 2^2 = 4s (violations incremented to 2)
  assertExists(result.message);
  assertEquals(result.headers['Retry-After'], '4');

  // Verify violations were incremented
  const stored = mockRedis.getData('ratelimit:connect-provider:ip:test-ip');
  assertEquals(stored?.violations, '2');
});

Deno.test('checkRateLimitRedis - enforces block duration after violation threshold', async () => {
  const mockRedis = new MockRedis() as any;
  const now = Date.now();

  // Pre-populate with violations = 2 (one below threshold of 3)
  mockRedis.store['ratelimit:connect-provider:ip:test-ip'] = {
    count: '10',
    lastReset: String(now),
    blocked: '0',
    violations: '2',
  };

  const result = await checkRateLimitRedis(mockRedis, 'test-ip', TEST_CONFIG, 'ip');

  assertEquals(result.allowed, false);

  // Verify entry is now blocked
  const stored = mockRedis.getData('ratelimit:connect-provider:ip:test-ip');
  assertEquals(stored?.blocked, '1');
  assertEquals(stored?.violations, '3');
});

Deno.test('checkRateLimitRedis - denies requests when blocked', async () => {
  const mockRedis = new MockRedis() as any;
  const now = Date.now();

  // Pre-populate with blocked state
  mockRedis.store['ratelimit:connect-provider:ip:test-ip'] = {
    count: '15',
    lastReset: String(now),
    blocked: '1',
    violations: '3',
  };

  const result = await checkRateLimitRedis(mockRedis, 'test-ip', TEST_CONFIG, 'ip');

  assertEquals(result.allowed, false);
  assertExists(result.message);
  assertEquals(result.message?.includes('Try again in'), true);
});

Deno.test('checkRateLimitRedis - resets window after expiration', async () => {
  const mockRedis = new MockRedis() as any;
  const twoHoursAgo = Date.now() - (2 * MS_IN_HOUR);

  // Pre-populate with expired window
  mockRedis.store['ratelimit:connect-provider:ip:test-ip'] = {
    count: '15',
    lastReset: String(twoHoursAgo),
    blocked: '0',
    violations: '2',
  };

  const result = await checkRateLimitRedis(mockRedis, 'test-ip', TEST_CONFIG, 'ip');

  assertEquals(result.allowed, true);

  // Verify count was reset and violations preserved
  const stored = mockRedis.getData('ratelimit:connect-provider:ip:test-ip');
  assertEquals(stored?.count, '1'); // Reset to 0, then incremented
  assertEquals(stored?.violations, '2'); // Preserved for escalation
  assertEquals(stored?.blocked, '0');
});

Deno.test('checkRateLimitRedis - fails open when Redis is null', async () => {
  const result = await checkRateLimitRedis(null, 'test-ip', TEST_CONFIG, 'ip');

  assertEquals(result.allowed, true);
  assertEquals(result.headers, {});
  assertEquals(result.error, undefined);
});

Deno.test('checkRateLimitRedis - fails open on Redis errors', async () => {
  const mockRedis = new MockRedis() as any;
  mockRedis.failOnNextCall = true;

  const result = await checkRateLimitRedis(mockRedis, 'test-ip', TEST_CONFIG, 'ip');

  assertEquals(result.allowed, true);
  assertEquals(result.error, 'Mock Redis connection error');
});

Deno.test('checkRateLimitRedis - tracks different tiers independently', async () => {
  const mockRedis = new MockRedis() as any;
  const now = Date.now();

  // Pre-populate IP tier with high count
  mockRedis.store['ratelimit:connect-provider:ip:test-id'] = {
    count: '9',
    lastReset: String(now),
    blocked: '0',
    violations: '0',
  };

  // User tier should be independent
  const result = await checkRateLimitRedis(mockRedis, 'test-id', TEST_CONFIG, 'user');

  assertEquals(result.allowed, true);

  // Verify user tier started fresh
  const stored = mockRedis.getData('ratelimit:connect-provider:user:test-id');
  assertEquals(stored?.count, '1');
});

Deno.test('checkRateLimitRedis - uses correct key format for each tier', async () => {
  const mockRedis = new MockRedis() as any;

  await checkRateLimitRedis(mockRedis, '192.168.1.1', TEST_CONFIG, 'ip');
  assertExists(mockRedis.getData('ratelimit:connect-provider:ip:192.168.1.1'));

  await checkRateLimitRedis(mockRedis, 'user-uuid', TEST_CONFIG, 'user');
  assertExists(mockRedis.getData('ratelimit:connect-provider:user:user-uuid'));

  await checkRateLimitRedis(mockRedis, 'system', TEST_CONFIG, 'global');
  assertExists(mockRedis.getData('ratelimit:connect-provider:global:system'));

  await checkRateLimitRedis(mockRedis, '192.168.1.1', TEST_CONFIG, 'bot');
  assertExists(mockRedis.getData('ratelimit:connect-provider:bot:192.168.1.1'));
});

Deno.test('checkRateLimitRedis - exponential backoff caps at 30 seconds', async () => {
  const mockRedis = new MockRedis() as any;
  const now = Date.now();

  // Pre-populate with high violation count (2^10 = 1024 seconds without cap)
  mockRedis.store['ratelimit:connect-provider:ip:test-ip'] = {
    count: '10',
    lastReset: String(now),
    blocked: '0',
    violations: '10',
  };

  const result = await checkRateLimitRedis(mockRedis, 'test-ip', TEST_CONFIG, 'ip');

  assertEquals(result.allowed, false);
  assertEquals(result.delay, 30000); // Capped at 30 seconds
});

Deno.test('checkRateLimitRedis - preserves violations across window resets', async () => {
  const mockRedis = new MockRedis() as any;
  const twoHoursAgo = Date.now() - (2 * MS_IN_HOUR);

  // Pre-populate with expired window but violations
  mockRedis.store['ratelimit:connect-provider:ip:test-ip'] = {
    count: '15',
    lastReset: String(twoHoursAgo),
    blocked: '0',
    violations: '5',
  };

  await checkRateLimitRedis(mockRedis, 'test-ip', TEST_CONFIG, 'ip');

  const stored = mockRedis.getData('ratelimit:connect-provider:ip:test-ip');
  assertEquals(stored?.violations, '5'); // Violations persisted
  assertEquals(stored?.count, '1'); // Count reset
});
