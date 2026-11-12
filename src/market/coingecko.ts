import type { LinePoint, Quote } from './types';
import { fetchWorkerJson } from './worker';

/**
 * The coins on the chart, most recognizable first.
 * Keep this list identical to COINS in cloudflare-worker/src/index.ts.
 */
export const CRYPTO_IDS = [
  'bitcoin',
  'ethereum',
  'solana',
  'ripple',
  'binancecoin',
  'dogecoin',
  'cardano',
  'chainlink',
] as const;

/** Tab labels. The quote replaces these once that coin has been opened. */
export const CRYPTO_NAMES: Record<(typeof CRYPTO_IDS)[number], string> = {
  bitcoin: 'Bitcoin',
  ethereum: 'Ethereum',
  solana: 'Solana',
  ripple: 'XRP',
  binancecoin: 'BNB',
  dogecoin: 'Dogecoin',
  cardano: 'Cardano',
  chainlink: 'Chainlink',
};

export function cryptoQuoteCacheKey(id: string): string {
  return `market:crypto:quote:v4:${id}`;
}

export function cryptoHistoryCacheKey(id: string, days?: string): string {
  return days ? `market:crypto:history:v4:${id}:${days}` : `market:crypto:history:v3:${id}`;
}

/** Same window the previous screen used before it refetched on mount. */
export const CRYPTO_QUOTE_TTL_MS = 2 * 60 * 1000;

/**
 * Each range is its own series. A day is 5-minute bars and a week through
 * three months is hourly; a year stays daily. None of that moves during a
 * visit, so a series stays cached for half a day instead of the price timer.
 */
export const CRYPTO_HISTORY_TTL_MS = 12 * 60 * 60 * 1000;

function readUsd(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object' && typeof (value as { usd?: unknown }).usd === 'number') {
    const amount = (value as { usd: number }).usd;
    return Number.isFinite(amount) ? amount : undefined;
  }
  return undefined;
}

function withNumber(quote: Quote, key: keyof Quote, value: number | undefined): Quote {
  if (value == null) return quote;
  return { ...quote, [key]: value };
}

export function parseCoinInfo(id: string, data: unknown, asOf = Date.now()): Quote {
  if (!data || typeof data !== 'object') throw new Error(`Bad quote for ${id}`);
  const record = data as {
    name?: unknown;
    image?: { large?: unknown };
    market_cap_rank?: unknown;
    market_data?: {
      current_price?: { usd?: unknown };
      market_cap?: { usd?: unknown };
      price_change_percentage_24h?: unknown;
      price_change_percentage_7d?: unknown;
      price_change_percentage_30d?: unknown;
      price_change_percentage_1y?: unknown;
      price_change_24h?: unknown;
      high_24h?: unknown;
      low_24h?: unknown;
      total_volume?: unknown;
      circulating_supply?: unknown;
      ath?: unknown;
      atl?: unknown;
      market_cap_rank?: unknown;
    };
  };
  const market = record.market_data;
  const price = market?.current_price?.usd;
  const marketCap = market?.market_cap?.usd;
  const change = market?.price_change_percentage_24h;
  const image = record.image?.large;
  if (
    typeof record.name !== 'string' ||
    typeof price !== 'number' ||
    typeof marketCap !== 'number' ||
    typeof change !== 'number'
  ) {
    throw new Error(`Bad quote for ${id}`);
  }
  let quote: Quote = {
    id,
    symbol: id,
    name: record.name,
    price,
    changePct24h: change,
    marketCap,
    image: typeof image === 'string' ? image : undefined,
    asOf,
  };
  quote = withNumber(quote, 'high24h', readUsd(market?.high_24h));
  quote = withNumber(quote, 'low24h', readUsd(market?.low_24h));
  quote = withNumber(quote, 'volume24h', readUsd(market?.total_volume));
  quote = withNumber(quote, 'change24h', readUsd(market?.price_change_24h));
  quote = withNumber(quote, 'changePct7d', readUsd(market?.price_change_percentage_7d));
  quote = withNumber(quote, 'changePct30d', readUsd(market?.price_change_percentage_30d));
  quote = withNumber(quote, 'changePct1y', readUsd(market?.price_change_percentage_1y));
  quote = withNumber(quote, 'circulatingSupply', readUsd(market?.circulating_supply));
  quote = withNumber(quote, 'ath', readUsd(market?.ath));
  quote = withNumber(quote, 'atl', readUsd(market?.atl));
  quote = withNumber(
    quote,
    'marketCapRank',
    readUsd(record.market_cap_rank) ?? readUsd(market?.market_cap_rank),
  );
  return quote;
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

async function settleById<T>(
  ids: readonly string[],
  load: (id: string) => Promise<T>,
): Promise<Record<string, T>> {
  const results = await Promise.allSettled(ids.map(async (id) => [id, await load(id)] as const));
  const loaded = Object.fromEntries(
    results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : [])),
  );
  if (Object.keys(loaded).length === 0) throw new Error('No market data');
  return loaded;
}

export async function fetchCryptoQuotes(ids: readonly string[]): Promise<Record<string, Quote>> {
  return settleById(ids, async (id) =>
    parseCoinInfo(id, await fetchWorkerJson({ id, type: 'info' })),
  );
}

export async function fetchCryptoHistory(
  ids: readonly string[],
  days?: string,
): Promise<Record<string, LinePoint[]>> {
  return settleById(ids, async (id) => {
    const params: Record<string, string> = { id, type: 'chart' };
    if (days) params.days = days;
    return parseMarketChart(await fetchWorkerJson(params));
  });
}
