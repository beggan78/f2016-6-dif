import { randomBytes } from 'crypto';
import { TextEncoder, TextDecoder } from 'util';

import {
  BASE_RATE_LIMIT_DELAY_MS,
  PBKDF2_ITERATIONS,
  RATE_LIMIT_CONFIGS,
  base64ToUint8Array,
  checkRateLimit,
  encryptCredentials,
  extractClientIP,
  getMasterKeyFromVault,
  resetRateLimitStore
} from '../../../supabase/functions/connect-provider/index.ts';

const { perIP } = RATE_LIMIT_CONFIGS;

if (typeof global.atob === 'undefined') {
  global.atob = (input) => Buffer.from(input, 'base64').toString('binary');
}

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

describe('connect-provider edge helpers', () => {
  const originalCrypto = global.crypto;
  const createRequest = (headers = {}) => {
    const normalized = Object.entries(headers).reduce((acc, [key, value]) => {
      acc[key.toLowerCase()] = value;
      return acc;
    }, {});

    return {
      headers: {
        get: (name) => normalized[name.toLowerCase()] ?? null
      }
    };
  };

  beforeAll(() => {
    // Ensure Web Crypto is available for PBKDF2 derivation and AES-GCM decrypt
    if (!originalCrypto?.subtle) {
      const { webcrypto } = require('crypto');
      global.crypto = webcrypto;
    }
  });

  afterAll(() => {
    if (!originalCrypto?.subtle) {
      delete global.crypto;
    }
  });

  describe('encryptCredentials round-trip', () => {
    it('performs AES-GCM round-trip with derived key', async () => {
      const masterKeyBytes = randomBytes(32);
      const masterKey = masterKeyBytes.toString('base64');

      const { encryptedUsername, encryptedPassword, iv, salt } = await encryptCredentials(
        'coach@example.com',
        'super-secret-password',
        masterKey
      );

      expect(encryptedUsername).toBeInstanceOf(Uint8Array);
      expect(encryptedPassword).toBeInstanceOf(Uint8Array);
      expect(iv).toHaveLength(12);
      expect(salt).toHaveLength(16);

      const keyMaterial = await global.crypto.subtle.importKey(
        'raw',
        base64ToUint8Array(masterKey),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      const derivedKey = await global.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: PBKDF2_ITERATIONS,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      const decryptedUsername = new TextDecoder().decode(
        await global.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, derivedKey, encryptedUsername)
      );

      const decryptedPassword = new TextDecoder().decode(
        await global.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, derivedKey, encryptedPassword)
      );

      expect(decryptedUsername).toBe('coach@example.com');
      expect(decryptedPassword).toBe('super-secret-password');
    });
  });

  describe('getMasterKeyFromVault', () => {
    it('resolves with the vault secret when RPC succeeds', async () => {
      const mockClient = {
        rpc: jest.fn().mockResolvedValue({ data: 'test/master-key', error: null })
      };

      await expect(getMasterKeyFromVault(mockClient)).resolves.toBe('test/master-key');
      expect(mockClient.rpc).toHaveBeenCalledWith('get_vault_secret_by_name', {
        secret_name: 'connector_master_key'
      });
    });

    it('throws when Supabase returns an error', async () => {
      const mockClient = {
        rpc: jest.fn().mockResolvedValue({ data: null, error: new Error('boom') })
      };

      await expect(getMasterKeyFromVault(mockClient)).rejects.toThrow('Failed to retrieve encryption key from Vault');
    });

    it('throws when Supabase returns no data', async () => {
      const mockClient = {
        rpc: jest.fn().mockResolvedValue({ data: null, error: null })
      };

      await expect(getMasterKeyFromVault(mockClient)).rejects.toThrow('Encryption key not found in Vault');
    });
  });

  describe('extractClientIP', () => {
    it('uses the first IP in x-forwarded-for when present', () => {
      const req = createRequest({
        'x-forwarded-for': '203.0.113.195, 70.41.3.18'
      });

      expect(extractClientIP(req)).toBe('203.0.113.195');
    });

    it('falls back to the next header when the first header is invalid', () => {
      const req = createRequest({
        'x-forwarded-for': 'not-an-ip, 203.0.113.9',
        'x-real-ip': '198.51.100.10'
      });

      expect(extractClientIP(req)).toBe('198.51.100.10');
    });

    it('supports IPv6 headers', () => {
      const req = createRequest({
        'cf-connecting-ip': '2001:0db8:85a3:0000:0000:8a2e:0370:7334'
      });

      expect(extractClientIP(req)).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
    });

    it('returns unknown when no valid headers are provided', () => {
      const req = createRequest({
        'x-client-ip': 'unknown'
      });

      expect(extractClientIP(req)).toBe('unknown');
    });
  });

  describe('rate limit behaviour under burst load', () => {
    beforeEach(() => {
      resetRateLimitStore();
      jest.useRealTimers();
      jest.spyOn(Date, 'now').mockImplementation(() => 1_700_000_000_000);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('allows up to the configured limit before delaying and blocks after repeated violations', () => {
      const allowedResponses = Array.from({ length: perIP.maxRequests }, () => {
        const result = checkRateLimit('ip:127.0.0.1', perIP);
        expect(result.allowed).toBe(true);
        return result;
      });

      expect(allowedResponses).toHaveLength(perIP.maxRequests);

      const firstViolation = checkRateLimit('ip:127.0.0.1', perIP);
      expect(firstViolation.allowed).toBe(false);
      expect(firstViolation.delay).toBeGreaterThanOrEqual(BASE_RATE_LIMIT_DELAY_MS);

      const secondViolation = checkRateLimit('ip:127.0.0.1', perIP);
      expect(secondViolation.allowed).toBe(false);
      expect(secondViolation.delay).toBeGreaterThan(firstViolation.delay ?? 0);

      const thirdViolation = checkRateLimit('ip:127.0.0.1', perIP);
      expect(thirdViolation.allowed).toBe(false);
      expect(thirdViolation.message).toMatch(/Rate limit exceeded/);
    });
  });

  describe('rate limit enforcement flow', () => {
    const runRateLimitFlow = ({ ip, userId }) => {
      const ipLimit = checkRateLimit(`ip:${ip}`, RATE_LIMIT_CONFIGS.perIP);
      if (!ipLimit.allowed) {
        return { stage: 'ip', result: ipLimit };
      }

      const globalLimit = checkRateLimit('global', RATE_LIMIT_CONFIGS.global);
      if (!globalLimit.allowed) {
        return { stage: 'global', result: globalLimit };
      }

      const userLimit = checkRateLimit(`user:${userId}`, RATE_LIMIT_CONFIGS.perUser);
      if (!userLimit.allowed) {
        return { stage: 'user', result: userLimit };
      }

      return { stage: 'allowed', result: { allowed: true } };
    };

    beforeEach(() => {
      resetRateLimitStore();
      jest.spyOn(Date, 'now').mockImplementation(() => 1_700_000_000_000);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('blocks on the IP tier before evaluating global/user limits', () => {
      const ip = '203.0.113.20';
      const userId = 'user-ip-blocked';

      for (let i = 0; i < RATE_LIMIT_CONFIGS.perIP.maxRequests; i += 1) {
        const result = runRateLimitFlow({ ip, userId });
        expect(result.stage).toBe('allowed');
      }

      const blocked = runRateLimitFlow({ ip, userId });
      expect(blocked.stage).toBe('ip');
      expect(blocked.result.allowed).toBe(false);
    });

    it('blocks on the global tier once the circuit breaker is exceeded', () => {
      const ip = '198.51.100.5';

      for (let i = 0; i < RATE_LIMIT_CONFIGS.global.maxRequests; i += 1) {
        const result = runRateLimitFlow({
          ip: `198.51.100.${i}`,
          userId: `user-global-blocked-${i}`
        });
        expect(result.stage).toBe('allowed');
      }

      const blocked = runRateLimitFlow({ ip, userId: 'user-global-blocked-final' });
      expect(blocked.stage).toBe('global');
      expect(blocked.result.allowed).toBe(false);
    });

    it('blocks on the user tier for authenticated requests', () => {
      const userId = 'user-rate-limit';

      for (let i = 0; i < RATE_LIMIT_CONFIGS.perUser.maxRequests; i += 1) {
        const result = runRateLimitFlow({ ip: `192.0.2.${i}`, userId });
        expect(result.stage).toBe('allowed');
      }

      const blocked = runRateLimitFlow({ ip: '192.0.2.250', userId });
      expect(blocked.stage).toBe('user');
      expect(blocked.result.allowed).toBe(false);
    });
  });
});
