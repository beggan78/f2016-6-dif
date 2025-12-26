import { isValidIpAddress } from './ipValidation.ts';

const CLIENT_IP_HEADERS = [
  'x-forwarded-for',
  'x-real-ip',
  'cf-connecting-ip',
  'x-client-ip',
  'x-cluster-client-ip'
];

// **SECURITY**: Enhanced IP extraction with validation
export function extractClientIP(req: Request): string {
  for (const header of CLIENT_IP_HEADERS) {
    const value = req.headers.get(header);
    if (value) {
      // Handle comma-separated IPs (take first one)
      const ip = value.split(',')[0].trim();
      if (isValidIpAddress(ip)) {
        return ip;
      }
    }
  }

  return 'unknown';
}
