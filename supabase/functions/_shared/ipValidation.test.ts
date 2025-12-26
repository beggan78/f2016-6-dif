import { isValidIPv4, isValidIPv6, isValidIpAddress } from './ipValidation.ts';

describe('IP Validation', () => {
  describe('IPv4 Validation', () => {
    test('validates standard IPv4 addresses', () => {
      expect(isValidIPv4('192.168.1.1')).toBe(true);
      expect(isValidIPv4('127.0.0.1')).toBe(true);
      expect(isValidIPv4('0.0.0.0')).toBe(true);
      expect(isValidIPv4('255.255.255.255')).toBe(true);
      expect(isValidIPv4('10.0.0.1')).toBe(true);
    });

    test('rejects invalid IPv4 addresses', () => {
      expect(isValidIPv4('256.1.1.1')).toBe(false);
      expect(isValidIPv4('192.168.1')).toBe(false);
      expect(isValidIPv4('192.168.1.1.1')).toBe(false);
      expect(isValidIPv4('abc.def.ghi.jkl')).toBe(false);
      expect(isValidIPv4('')).toBe(false);
    });
  });

  describe('IPv6 Validation', () => {
    test('validates standard IPv6 addresses', () => {
      expect(isValidIPv6('2001:db8:85a3:0:0:8a2e:370:7334')).toBe(true);
      expect(isValidIPv6('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
      expect(isValidIPv6('fe80:0:0:0:204:61ff:fe9d:f156')).toBe(true);
    });

    test('validates compressed IPv6 addresses (:: notation)', () => {
      // CRITICAL: These were BROKEN in the previous implementation
      expect(isValidIPv6('::1')).toBe(true); // IPv6 localhost
      expect(isValidIPv6('::')).toBe(true); // All zeros
      expect(isValidIPv6('2001:db8::')).toBe(true); // Trailing compression
      expect(isValidIPv6('::ffff:192.0.2.1')).toBe(true); // IPv4-mapped IPv6
      expect(isValidIPv6('2001:db8::1')).toBe(true); // Common compression
      expect(isValidIPv6('fe80::')).toBe(true); // Link-local
      expect(isValidIPv6('::8a2e:370:7334')).toBe(true); // Leading compression
    });

    test('rejects invalid IPv6 addresses', () => {
      expect(isValidIPv6('::1::2')).toBe(false); // Multiple ::
      expect(isValidIPv6('gggg::1')).toBe(false); // Invalid hex
      expect(isValidIPv6('192.168.1.1')).toBe(false); // IPv4 address
      expect(isValidIPv6('')).toBe(false); // Empty string
      expect(isValidIPv6('12345::1')).toBe(false); // Segment too long
    });
  });

  describe('Generic IP Validation', () => {
    test('validates both IPv4 and IPv6', () => {
      // IPv4
      expect(isValidIpAddress('192.168.1.1')).toBe(true);
      expect(isValidIpAddress('127.0.0.1')).toBe(true);

      // IPv6
      expect(isValidIpAddress('::1')).toBe(true);
      expect(isValidIpAddress('2001:db8::1')).toBe(true);
      expect(isValidIpAddress('::ffff:192.0.2.1')).toBe(true);
    });

    test('rejects invalid IP addresses', () => {
      expect(isValidIpAddress('invalid')).toBe(false);
      expect(isValidIpAddress('256.1.1.1')).toBe(false);
      expect(isValidIpAddress('gggg::1')).toBe(false);
      expect(isValidIpAddress('')).toBe(false);
    });
  });
});
