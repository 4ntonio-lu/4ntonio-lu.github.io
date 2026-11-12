import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CRYPTO_IDS,
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
    expect(
      parseCoinInfo(
        'bitcoin',
        {
          ...info,
          market_cap_rank: 1,
          market_data: {
            ...info.market_data,
            high_24h: { usd: 74695 },
            low_24h: { usd: 73357 },
            total_volume: { usd: 23.5e9 },
            price_change_24h: -262.4,
            price_change_percentage_7d: 4.2,
            circulating_supply: 19.8e6,
            ath: { usd: 73750 },
          },
        },
        10,
      ),
    ).toMatchObject({
      high24h: 74695,
      low24h: 73357,
      volume24h: 23.5e9,
      change24h: -262.4,
      changePct7d: 4.2,
      circulatingSupply: 19.8e6,
      ath: 73750,
      marketCapRank: 1,
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
    expect(urls.find((url) => url.includes('type=chart'))).not.toContain('days=');
  });

  it('keeps the coins that loaded when another id is rejected', async () => {
    expect(CRYPTO_IDS).toEqual([
      'bitcoin',
      'ethereum',
      'solana',
      'ripple',
      'binancecoin',
      'dogecoin',
      'cardano',
      'chainlink',
    ]);
    vi.stubGlobal('fetch', (input: RequestInfo) => {
      const url = String(input);
      if (url.includes('id=cardano')) return Promise.resolve(new Response('no', { status: 400 }));
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

    await expect(fetchCryptoQuotes(['bitcoin', 'cardano'])).resolves.toMatchObject({
      bitcoin: { price: 73000 },
    });
    await expect(fetchCryptoHistory(['cardano'])).rejects.toThrow(/No market data/);
  });
});
