import { randomBytes } from 'crypto';
import { TextEncoder, TextDecoder } from 'util';

import {
  BASE_RATE_LIMIT_DELAY_MS,
  PBKDF2_ITERATIONS,
  RATE_LIMIT_CONFIGS,
  base64ToUint8Array,
  checkRateLimit,
  encryptCredentials,
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
});
