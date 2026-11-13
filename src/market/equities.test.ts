import { afterEach, describe, expect, it, vi } from 'vitest';
import { EQUITIES, fetchEquity, parseEquityPayload, type EquitySnapshot } from './equities';
import { equityStatRows } from './stats';

describe('equities', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists the mega-caps and the major index ETFs', () => {
    expect(EQUITIES.map((equity) => equity.symbol)).toEqual([
      'AAPL',
      'MSFT',
      'GOOGL',
      'AMZN',
      'NVDA',
      'META',
      'TSLA',
      'SPY',
      'QQQ',
      'DIA',
      'IWM',
    ]);
  });

  it('reads a normalized candle payload and drops a broken row', () => {
    const snapshot = parseEquityPayload(
      {
        symbol: 'AAPL',
        price: 110,
        previousClose: 105,
        candles: [
          { t: 1, o: 1, h: 2, l: 0.5, c: 1.5, v: 10 },
          { t: 'nope' },
          { t: 2, o: 1.5, h: 2.5, l: 1, c: 2, v: 12 },
        ],
      },
      50,
    );
    expect(snapshot.candles).toHaveLength(2);
    expect(snapshot.asOf).toBe(50);
    expect(snapshot.marketCap).toBeUndefined();
    expect(snapshot.week).toEqual([]);
    expect(snapshot.intraday).toEqual([]);
    expect(
      parseEquityPayload(
        {
          symbol: 'AAPL',
          price: 110,
          previousClose: 105,
          marketCap: 5.16e12,
          candles: [
            { t: 1, o: 1, h: 2, l: 1, c: 1, v: 1 },
            { t: 2, o: 1, h: 2, l: 1, c: 2, v: 1 },
          ],
        },
        50,
      ).marketCap,
    ).toBe(5.16e12);
    expect(() => parseEquityPayload({ symbol: 'AAPL', price: 1 })).toThrow(/Bad equity/);
  });

  it('shows market cap like the crypto row and leaves it out when Yahoo has none', () => {
    const snapshot: EquitySnapshot = {
      symbol: 'SPY',
      price: 10,
      previousClose: 9,
      candles: [
        { t: 1, o: 1, h: 2, l: 1, c: 1, v: 1 },
        { t: 2, o: 1, h: 2, l: 1, c: 2, v: 1 },
      ],
      intraday: [],
      week: [],
      asOf: 1,
    };
    expect(equityStatRows(snapshot).some((row) => row.label === 'Market cap')).toBe(false);
    expect(equityStatRows({ ...snapshot, marketCap: 5.16e12 })[0]).toEqual({
      label: 'Market cap',
      value: '5.2t',
    });
  });

  it('asks the worker for one symbol and does not send a key', async () => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', (input: RequestInfo) => {
      urls.push(String(input));
      return Promise.resolve(
        Response.json({
          symbol: 'AAPL',
          price: 10,
          previousClose: 9,
          candles: [
            { t: 1, o: 1, h: 2, l: 1, c: 1.5, v: 1 },
            { t: 2, o: 1.5, h: 2, l: 1, c: 1.8, v: 1 },
          ],
        }),
      );
    });
    const snapshot = await fetchEquity('AAPL');
    expect(snapshot.price).toBe(10);
    expect(urls).toEqual([
      'https://cloudflare-worker.4ntonio-lu.workers.dev/?type=equity&symbol=AAPL&series=4',
    ]);
  });
});
