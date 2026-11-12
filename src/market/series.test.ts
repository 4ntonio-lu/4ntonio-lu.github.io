import { describe, expect, it } from 'vitest';
import {
  percentChange,
  seriesBounds,
  sliceByDays,
  chartSeriesCovers,
  equityCandles,
  equityRangeDays,
  latestSession,
  aggregateCandles,
} from './series';

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

  it('refuses to call a one-year series five years', () => {
    const year = [
      { t: 0, price: 1 },
      { t: 364 * DAY, price: 2 },
    ];
    const five = [
      { t: 0, price: 1 },
      { t: 5 * 365 * DAY, price: 2 },
    ];
    expect(chartSeriesCovers(year, 1825)).toBe(false);
    expect(chartSeriesCovers(five, 1825)).toBe(true);
    expect(chartSeriesCovers(year, 7)).toBe(true);
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

describe('equity candles', () => {
  const daily = [
    { t: Date.UTC(2026, 0, 2), o: 10, h: 12, l: 9, c: 11, v: 1 },
    { t: Date.UTC(2026, 0, 5), o: 11, h: 14, l: 10, c: 13, v: 2 },
    { t: Date.UTC(2026, 0, 6), o: 13, h: 15, l: 12, c: 14, v: 3 },
    { t: Date.UTC(2026, 5, 1), o: 20, h: 22, l: 19, c: 21, v: 4 },
    { t: Date.UTC(2026, 5, 2), o: 21, h: 24, l: 20, c: 23, v: 5 },
  ];
  const intraday = [
    { t: Date.UTC(2026, 10, 10, 15, 0), o: 30, h: 31, l: 29, c: 30.5, v: 1 },
    { t: Date.UTC(2026, 10, 11, 14, 30), o: 40, h: 42, l: 39, c: 41, v: 2 },
    { t: Date.UTC(2026, 10, 11, 15, 0), o: 41, h: 44, l: 40, c: 43, v: 3 },
  ];

  it('keeps one New York session for the one-day range', () => {
    expect(latestSession(intraday).map((candle) => candle.c)).toEqual([41, 43]);
    const shown = equityCandles(daily, intraday, '1D');
    expect(shown.map((candle) => candle.c)).toEqual([41, 43]);
    expect(equityCandles(daily, [], '1D').map((candle) => candle.c)).toEqual([21, 23]);
  });

  it('keeps one week of daily bars and ignores the intraday session', () => {
    const week = equityCandles(daily, intraday, '1W');
    expect(week.map((candle) => candle.c)).toEqual([21, 23]);
    expect(week.map((candle) => candle.t)).toEqual([Date.UTC(2026, 5, 1), Date.UTC(2026, 5, 2)]);
    expect(equityRangeDays('1W')).toBe(7);
  });

  it('rolls a year into weeks and five years into months', () => {
    const weeks = aggregateCandles(daily.slice(0, 3), 'week');
    expect(weeks).toHaveLength(2);
    expect(weeks[1]).toMatchObject({ o: 11, h: 15, l: 10, c: 14, v: 5 });

    const year = equityCandles(daily, intraday, '1Y');
    expect(year.length).toBeGreaterThan(0);
    expect(year.length).toBeLessThan(daily.length);

    const months = aggregateCandles(
      [
        { t: Date.UTC(2026, 0, 10), o: 1, h: 2, l: 1, c: 2, v: 1 },
        { t: Date.UTC(2026, 0, 20), o: 2, h: 4, l: 1, c: 3, v: 1 },
        { t: Date.UTC(2026, 1, 2), o: 3, h: 5, l: 3, c: 4, v: 1 },
      ],
      'month',
    );
    expect(months.map((candle) => candle.c)).toEqual([3, 4]);
    expect(sliceByDays(daily, 365, 2).length).toBeGreaterThan(0);
  });
});
