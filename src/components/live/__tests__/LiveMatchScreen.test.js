import { calculateEffectiveMatchDurationSeconds, formatLiveMatchMinuteDisplay } from '../LiveMatchScreen';
import { sortEventsByOrdinal } from '../LiveMatchScreen';

const baseTime = Date.parse('2024-01-01T10:00:00Z');
const buildEvent = (type, offsetMs) => ({
  event_type: type,
  created_at: new Date(baseTime + offsetMs).toISOString()
});

describe('calculateEffectiveMatchDurationSeconds', () => {
  it('sums completed periods and excludes intermissions', () => {
    const events = [
      buildEvent('match_started', 0),
      buildEvent('period_ended', 900000),
      buildEvent('period_started', 1200000),
      buildEvent('match_ended', 2100000)
    ];

    const result = calculateEffectiveMatchDurationSeconds(events, false, baseTime + 2100000);
    expect(result).toBe(1800);
  });

  it('includes ongoing period time for live matches', () => {
    const events = [
      buildEvent('match_started', 0),
      buildEvent('period_ended', 900000),
      buildEvent('period_started', 1200000)
    ];

    const result = calculateEffectiveMatchDurationSeconds(events, true, baseTime + 1500000);
    expect(result).toBe(1200);
  });

  it('returns zero for missing or invalid timestamps', () => {
    expect(calculateEffectiveMatchDurationSeconds([], true, baseTime)).toBe(0);

    expect(
      calculateEffectiveMatchDurationSeconds(
        [{ event_type: 'match_started', created_at: 'invalid-date' }],
        true,
        baseTime + 60000
      )
    ).toBe(0);
  });
});

describe('formatLiveMatchMinuteDisplay', () => {
  it('rounds up to the current minute', () => {
    expect(formatLiveMatchMinuteDisplay(221)).toBe("4'");
  });

  it('defaults to first minute for invalid or early values', () => {
    expect(formatLiveMatchMinuteDisplay(0)).toBe("1'");
    expect(formatLiveMatchMinuteDisplay(-5)).toBe("1'");
    expect(formatLiveMatchMinuteDisplay(NaN)).toBe("1'");
  });
});

describe('sortEventsByOrdinal', () => {
  it('orders by ordinal first', () => {
    const unordered = [
      { id: 'b', ordinal: 2 },
      { id: 'a', ordinal: 1 }
    ];

    const sorted = sortEventsByOrdinal(unordered);
    expect(sorted.map(e => e.id)).toEqual(['a', 'b']);
  });

  it('falls back to created_at when ordinal missing', () => {
    const unordered = [
      { id: 'later', created_at: new Date(baseTime + 2000).toISOString() },
      { id: 'earlier', created_at: new Date(baseTime + 1000).toISOString() }
    ];

    const sorted = sortEventsByOrdinal(unordered);
    expect(sorted.map(e => e.id)).toEqual(['earlier', 'later']);
  });
});
