import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchCryptoHistory,
  fetchCryptoQuotes,
  parseCoinInfo,
  parseMarketChart,
} from './coingecko';

const info = {
  name: 'Bitcoin',
  image: { large: 'https://example.com/btc.png' },
  market_data: {
    current_price: { usd: 73000 },
    market_cap: { usd: 1.4e12 },
    price_change_percentage_24h: -1.25,
  },
};

describe('coingecko client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reads the fields the crypto window shows', () => {
    expect(parseCoinInfo('bitcoin', info, 10)).toEqual({
      id: 'bitcoin',
      symbol: 'bitcoin',
      name: 'Bitcoin',
      price: 73000,
      changePct24h: -1.25,
      marketCap: 1.4e12,
      image: 'https://example.com/btc.png',
      asOf: 10,
    });
    expect(parseMarketChart({ prices: [[1, 2], [3, 4], 'nope'] })).toEqual([
      { t: 1, price: 2 },
      { t: 3, price: 4 },
    ]);
  });

  it('rejects a payload that would render as NaN', () => {
    expect(() => parseCoinInfo('bitcoin', { name: 'Bitcoin' })).toThrow(/Bad quote/);
    expect(() => parseMarketChart({ prices: [[1, 2]] })).toThrow(/empty/);
  });

  it('asks the worker for info and chart, and shares an in-flight chart request', async () => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', (input: RequestInfo) => {
      const url = String(input);
      urls.push(url);
      if (url.includes('type=info')) return Promise.resolve(Response.json(info));
      return Promise.resolve(
        Response.json({
          prices: [
            [1, 2],
            [3, 4],
          ],
        }),
      );
    });

    const [quotes, first, second] = await Promise.all([
      fetchCryptoQuotes(['bitcoin']),
      fetchCryptoHistory(['bitcoin']),
      fetchCryptoHistory(['bitcoin']),
    ]);

    expect(quotes.bitcoin.price).toBe(73000);
    expect(first.bitcoin).toEqual(second.bitcoin);
    expect(urls.filter((url) => url.includes('type=chart'))).toHaveLength(1);
    expect(urls.filter((url) => url.includes('type=info'))).toHaveLength(1);
    expect(urls[0]).toContain('https://cloudflare-worker.4ntonio-lu.workers.dev');
  });
});
