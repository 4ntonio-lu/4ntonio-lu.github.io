import type { LinePoint, Quote } from './types';
import { fetchWorkerJson } from './worker';

/** Coins the portfolio chart already follows. The worker serves these ids today. */
export const CRYPTO_IDS = ['bitcoin', 'ethereum', 'solana', 'ripple', 'dogecoin'] as const;

export const CRYPTO_QUOTE_CACHE = 'market:crypto:quotes:v1';
export const CRYPTO_HISTORY_CACHE = 'market:crypto:history:v1';

/** Same window the previous screen used before it refetched on mount. */
export const CRYPTO_QUOTE_TTL_MS = 2 * 60 * 1000;

/**
 * The worker returns one year of daily closes. That series barely moves
 * during a visit, so it stays cached for half a day instead of riding along
 * with the price timer.
 */
export const CRYPTO_HISTORY_TTL_MS = 12 * 60 * 60 * 1000;

export function parseCoinInfo(id: string, data: unknown, asOf = Date.now()): Quote {
  if (!data || typeof data !== 'object') throw new Error(`Bad quote for ${id}`);
  const record = data as {
    name?: unknown;
    image?: { large?: unknown };
    market_data?: {
      current_price?: { usd?: unknown };
      market_cap?: { usd?: unknown };
      price_change_percentage_24h?: unknown;
    };
  };
  const price = record.market_data?.current_price?.usd;
  const marketCap = record.market_data?.market_cap?.usd;
  const change = record.market_data?.price_change_percentage_24h;
  const image = record.image?.large;
  if (
    typeof record.name !== 'string' ||
    typeof price !== 'number' ||
    typeof marketCap !== 'number' ||
    typeof change !== 'number'
  ) {
    throw new Error(`Bad quote for ${id}`);
  }
  return {
    id,
    symbol: id,
    name: record.name,
    price,
    changePct24h: change,
    marketCap,
    image: typeof image === 'string' ? image : undefined,
    asOf,
  };
}

export function parseMarketChart(data: unknown): LinePoint[] {
  if (!data || typeof data !== 'object' || !Array.isArray((data as { prices?: unknown }).prices)) {
    throw new Error('Bad chart');
  }
  const points: LinePoint[] = [];
  for (const row of (data as { prices: unknown[] }).prices) {
    if (!Array.isArray(row) || typeof row[0] !== 'number' || typeof row[1] !== 'number') continue;
    points.push({ t: row[0], price: row[1] });
  }
  if (points.length < 2) throw new Error('Chart was empty');
  return points;
}

export async function fetchCryptoQuotes(ids: readonly string[]): Promise<Record<string, Quote>> {
  const pairs = await Promise.all(
    ids.map(async (id) => {
      const data = await fetchWorkerJson({ id, type: 'info' });
      return [id, parseCoinInfo(id, data)] as const;
    }),
  );
  return Object.fromEntries(pairs);
}

export async function fetchCryptoHistory(
  ids: readonly string[],
): Promise<Record<string, LinePoint[]>> {
  const pairs = await Promise.all(
    ids.map(async (id) => {
      const data = await fetchWorkerJson({ id, type: 'chart' });
      return [id, parseMarketChart(data)] as const;
    }),
  );
  return Object.fromEntries(pairs);
}
