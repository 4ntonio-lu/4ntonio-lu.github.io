import type { Candle } from './types';
import { fetchWorkerJson } from './worker';

/** Keep this list identical to the worker allowlist in cloudflare-worker/src/yahoo.ts. */
export const EQUITIES = [
  { symbol: 'AAPL', name: 'Apple', group: 'Stocks' },
  { symbol: 'MSFT', name: 'Microsoft', group: 'Stocks' },
  { symbol: 'GOOGL', name: 'Alphabet', group: 'Stocks' },
  { symbol: 'AMZN', name: 'Amazon', group: 'Stocks' },
  { symbol: 'NVDA', name: 'NVIDIA', group: 'Stocks' },
  { symbol: 'META', name: 'Meta', group: 'Stocks' },
  { symbol: 'TSLA', name: 'Tesla', group: 'Stocks' },
  { symbol: 'SPY', name: 'S&P 500', group: 'Index ETFs' },
  { symbol: 'QQQ', name: 'Nasdaq 100', group: 'Index ETFs' },
  { symbol: 'DIA', name: 'Dow Jones', group: 'Index ETFs' },
  { symbol: 'IWM', name: 'Russell 2000', group: 'Index ETFs' },
] as const;

export type EquitySymbol = (typeof EQUITIES)[number]['symbol'];

export type EquitySnapshot = {
  symbol: string;
  price: number;
  previousClose: number;
  candles: Candle[];
  asOf: number;
};

/** One symbol's five-year daily candles. Fresh enough for a portfolio, not a terminal. */
export const EQUITY_TTL_MS = 15 * 60 * 1000;

export function equityCacheKey(symbol: string): string {
  return `market:equity:v1:${symbol}`;
}

export function parseEquityPayload(data: unknown, asOf = Date.now()): EquitySnapshot {
  if (!data || typeof data !== 'object') throw new Error('Bad equity payload');
  const record = data as {
    symbol?: unknown;
    price?: unknown;
    previousClose?: unknown;
    candles?: unknown;
  };
  if (
    typeof record.symbol !== 'string' ||
    typeof record.price !== 'number' ||
    typeof record.previousClose !== 'number' ||
    !Array.isArray(record.candles)
  ) {
    throw new Error('Bad equity payload');
  }

  const candles: Candle[] = [];
  for (const row of record.candles) {
    if (!row || typeof row !== 'object') continue;
    const candle = row as Partial<Candle>;
    if (
      typeof candle.t !== 'number' ||
      typeof candle.o !== 'number' ||
      typeof candle.h !== 'number' ||
      typeof candle.l !== 'number' ||
      typeof candle.c !== 'number'
    ) {
      continue;
    }
    candles.push({
      t: candle.t,
      o: candle.o,
      h: candle.h,
      l: candle.l,
      c: candle.c,
      v: typeof candle.v === 'number' ? candle.v : 0,
    });
  }
  if (candles.length < 2) throw new Error('Equity chart was empty');
  return {
    symbol: record.symbol,
    price: record.price,
    previousClose: record.previousClose,
    candles,
    asOf,
  };
}

export async function fetchEquity(symbol: string): Promise<EquitySnapshot> {
  const data = await fetchWorkerJson({ type: 'equity', symbol });
  return parseEquityPayload(data);
}
