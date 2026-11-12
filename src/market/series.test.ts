import { describe, expect, it } from 'vitest';
import { percentChange, seriesBounds, sliceByDays } from './series';

const DAY = 86_400_000;

describe('series', () => {
  const points = [
    { t: 0, price: 100 },
    { t: 5 * DAY, price: 110 },
    { t: 10 * DAY, price: 80 },
  ];

  it('slices from the newest point so a range switch does not refetch', () => {
    expect(sliceByDays(points, 7).map((point) => point.price)).toEqual([110, 80]);
    expect(sliceByDays(points, 365).map((point) => point.price)).toEqual([100, 110, 80]);
    expect(sliceByDays([], 7)).toEqual([]);
  });

  it('falls back to the last two points when the window has a single close', () => {
    expect(sliceByDays(points, 1).map((point) => point.price)).toEqual([110, 80]);
  });

  it('can keep a single candle for a one-day stock range', () => {
    expect(sliceByDays(points, 1, 1).map((point) => point.price)).toEqual([80]);
  });

  it('measures percent change and the high/low of the visible range', () => {
    expect(percentChange(100, 110)).toBe(10);
    expect(percentChange(100, 90)).toBe(-10);
    expect(percentChange(0, 10)).toBeNull();
    expect(seriesBounds([110, 80, 100])).toEqual({ high: 110, low: 80 });
    expect(seriesBounds([])).toBeNull();
  });
});
