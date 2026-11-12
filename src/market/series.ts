import type { Candle } from './types';

const DAY_MS = 86_400_000;

export const LINE_RANGES = [
  { id: '1D', label: '1D', days: 1 },
  { id: '1W', label: '1W', days: 7 },
  { id: '1M', label: '1M', days: 30 },
  { id: '3M', label: '3M', days: 90 },
  { id: '1Y', label: '1Y', days: 365 },
  { id: '5Y', label: '5Y', days: 1825 },
] as const;

export type LineRangeId = (typeof LINE_RANGES)[number]['id'];

/** Stock ranges. 1D uses intraday bars. 1W and the longer ranges use daily bars. */
export const EQUITY_RANGES = [
  { id: '1D', label: '1D', days: 1 },
  { id: '1W', label: '1W', days: 7 },
  { id: '1M', label: '1M', days: 30 },
  { id: '3M', label: '3M', days: 90 },
  { id: '1Y', label: '1Y', days: 365 },
  { id: '5Y', label: '5Y', days: 1825 },
] as const;

export type EquityRangeId = (typeof EQUITY_RANGES)[number]['id'];

export function rangeDays(id: LineRangeId): number {
  const range = LINE_RANGES.find((item) => item.id === id);
  return range ? range.days : 365;
}

/** `days` query the chart worker forwards to CoinGecko. */
export function lineChartQueryDays(id: LineRangeId): string {
  return String(rangeDays(id));
}

/**
 * A five-year label needs a series that is actually longer than one year.
 * The free CoinGecko plan stops at 365 days, and that payload must not be drawn as 5Y.
 */
export function chartSeriesCovers(points: readonly { t: number }[], days: number): boolean {
  if (points.length < 2) return false;
  if (days < 1000) return true;
  const span = points[points.length - 1].t - points[0].t;
  return span >= 4 * 365 * DAY_MS;
}

export function equityRangeDays(id: EquityRangeId): number {
  const range = EQUITY_RANGES.find((item) => item.id === id);
  return range ? range.days : 365;
}

/** Keep points in the last `days` before the newest point. Ranges share one series. */
export function sliceByDays<T extends { t: number }>(
  points: readonly T[],
  days: number,
  minPoints = 2,
): T[] {
  if (points.length === 0) return [];
  const end = points[points.length - 1].t;
  const cutoff = end - days * DAY_MS;
  const sliced = points.filter((point) => point.t >= cutoff);
  if (sliced.length >= minPoints) return sliced;
  return points.slice(-minPoints);
}

const SESSION_ZONE = 'America/New_York';

/** Trading-day key. Yahoo's intraday bars share one of these per session. */
export function sessionDay(timestamp: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SESSION_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(timestamp);
}

/** The newest session in an intraday series, so 1D is one full day of bars. */
export function latestSession<T extends { t: number }>(candles: readonly T[]): T[] {
  if (candles.length === 0) return [];
  const day = sessionDay(candles[candles.length - 1].t);
  const session = candles.filter((candle) => sessionDay(candle.t) === day);
  return session.length > 0 ? session : candles.slice(-1);
}

function bucketStart(timestamp: number, unit: 'week' | 'month'): number {
  const date = new Date(timestamp);
  if (unit === 'month') return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - mondayOffset);
}

/** Fold daily bars into weeks or months so a long range stays a candlestick chart. */
export function aggregateCandles(candles: readonly Candle[], unit: 'week' | 'month'): Candle[] {
  const groups = new Map<number, Candle>();
  for (const candle of candles) {
    const key = bucketStart(candle.t, unit);
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { ...candle, t: key });
      continue;
    }
    existing.h = Math.max(existing.h, candle.h);
    existing.l = Math.min(existing.l, candle.l);
    existing.c = candle.c;
    existing.v += candle.v;
  }
  return [...groups.values()].sort((a, b) => a.t - b.t);
}

/**
 * Candles for the selected stock range. 1D prefers the latest intraday session.
 * 1W is that week's daily bars. 1Y and 5Y are rolled up so each candle is wide enough to read.
 */
export function equityCandles(
  daily: readonly Candle[],
  intraday: readonly Candle[] | undefined,
  range: EquityRangeId,
): Candle[] {
  if (range === '1D') {
    const session = latestSession(intraday ?? []);
    if (session.length >= 2) return session;
  }
  const days = equityRangeDays(range);
  const sliced = sliceByDays(daily, days, range === '1D' ? 1 : 2);
  if (range === '1Y') return aggregateCandles(sliced, 'week');
  if (range === '5Y') return aggregateCandles(sliced, 'month');
  return sliced;
}

export function percentChange(from: number, to: number): number | null {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) return null;
  return ((to - from) / Math.abs(from)) * 100;
}

export function seriesBounds(prices: readonly number[]): { high: number; low: number } | null {
  if (prices.length === 0) return null;
  let high = prices[0];
  let low = prices[0];
  for (const price of prices) {
    if (price > high) high = price;
    if (price < low) low = price;
  }
  return { high, low };
}
