import { isIPv4, isIPv6 } from 'https://deno.land/std@0.192.0/node/net.ts';

/**
 * Validates if a string is a valid IPv4 address.
 * Uses Node.js built-in net.isIPv4() for reliable validation.
 *
 * @param ip - The IP address string to validate
 * @returns true if valid IPv4, false otherwise
 *
 * @example
 * isValidIPv4('192.168.1.1') // true
 * isValidIPv4('256.1.1.1') // false
 */
export const isValidIPv4 = (ip: string): boolean => {
  if (!ip) return false;
  return isIPv4(ip);
};

/**
 * Validates if a string is a valid IPv6 address.
 * Uses Node.js built-in net.isIPv6() for reliable validation.
 * Correctly handles compressed notation (::).
 *
 * @param ip - The IP address string to validate
 * @returns true if valid IPv6, false otherwise
 *
 * @example
 * isValidIPv6('2001:db8::1') // true
 * isValidIPv6('::1') // true (IPv6 localhost)
 * isValidIPv6('::') // true (all zeros)
 * isValidIPv6('::ffff:192.0.2.1') // true (IPv4-mapped)
 */
export const isValidIPv6 = (ip: string): boolean => {
  if (!ip) return false;
  return isIPv6(ip);
};

/**
 * Validates if a string is a valid IP address (IPv4 or IPv6).
 *
 * @param ip - The IP address string to validate
 * @returns true if valid IPv4 or IPv6, false otherwise
 *
 * @example
 * isValidIpAddress('192.168.1.1') // true
 * isValidIpAddress('2001:db8::1') // true
 * isValidIpAddress('invalid') // false
 */
export const isValidIpAddress = (ip: string): boolean => isValidIPv4(ip) || isValidIPv6(ip);
