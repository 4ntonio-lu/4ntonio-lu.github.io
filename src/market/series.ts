const DAY_MS = 86_400_000;

export const LINE_RANGES = [
  { id: '1D', label: '1D', days: 1 },
  { id: '1W', label: '1W', days: 7 },
  { id: '1M', label: '1M', days: 30 },
  { id: '3M', label: '3M', days: 90 },
  { id: '1Y', label: '1Y', days: 365 },
] as const;

export type LineRangeId = (typeof LINE_RANGES)[number]['id'];

/** Daily candles, sliced on the client from one five-year download. */
export const EQUITY_RANGES = [
  { id: '1D', label: '1D', days: 1 },
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
