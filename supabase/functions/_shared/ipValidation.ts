const IPV4_REGEX =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV6_SEGMENT_REGEX = /^[0-9a-fA-F]{1,4}$/;

export const isValidIPv4 = (ip: string): boolean => IPV4_REGEX.test(ip);

export const isValidIPv6 = (ip: string): boolean => {
  if (!ip) {
    return false;
  }

  const hasDoubleColon = ip.includes('::');
  if (hasDoubleColon && ip.indexOf('::') !== ip.lastIndexOf('::')) {
    return false;
  }

  const [left, right] = ip.split('::');
  const leftSegments = left ? left.split(':') : [];
  const rightSegments = right ? right.split(':') : [];

  if (leftSegments.some(segment => segment.length === 0)) {
    return false;
  }

  if (rightSegments.some(segment => segment.length === 0)) {
    return false;
  }

  let ipv4Segment: string | null = null;
  if (rightSegments.length > 0 && rightSegments[rightSegments.length - 1].includes('.')) {
    ipv4Segment = rightSegments.pop() ?? null;
  } else if (!right && leftSegments.length > 0 && leftSegments[leftSegments.length - 1].includes('.')) {
    ipv4Segment = leftSegments.pop() ?? null;
  }

  if (ipv4Segment && !isValidIPv4(ipv4Segment)) {
    return false;
  }

  const allSegments = [...leftSegments, ...rightSegments];
  if (allSegments.some(segment => !IPV6_SEGMENT_REGEX.test(segment))) {
    return false;
  }

  const segmentCount = allSegments.length + (ipv4Segment ? 2 : 0);

  if (hasDoubleColon) {
    return segmentCount <= 7;
  }

  return segmentCount === 8;
};

export const isValidIpAddress = (ip: string): boolean => isValidIPv4(ip) || isValidIPv6(ip);
