import { compareEventsForSort } from '../GameEventTimeline';

describe('compareEventsForSort', () => {
  it('sorts by ordinal ascending and descending', () => {
    const a = { ordinal: 1 };
    const b = { ordinal: 2 };

    expect([a, b].sort((x, y) => compareEventsForSort(x, y, 'asc')).map(e => e.ordinal)).toEqual([1, 2]);
    expect([a, b].sort((x, y) => compareEventsForSort(x, y, 'desc')).map(e => e.ordinal)).toEqual([2, 1]);
  });

  it('falls back to timestamp when ordinal missing', () => {
    const a = { timestamp: 100 };
    const b = { timestamp: 200 };

    expect([a, b].sort((x, y) => compareEventsForSort(x, y, 'asc')).map(e => e.timestamp)).toEqual([100, 200]);
    expect([a, b].sort((x, y) => compareEventsForSort(x, y, 'desc')).map(e => e.timestamp)).toEqual([200, 100]);
  });
});
