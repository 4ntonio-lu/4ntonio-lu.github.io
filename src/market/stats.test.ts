import { describe, expect, it } from 'vitest';
import type { EquitySnapshot } from './equities';
import { cryptoStatRows, equityStatRows } from './stats';
import type { Quote } from './types';

const quote: Quote = {
  id: 'bitcoin',
  symbol: 'bitcoin',
  name: 'Bitcoin',
  price: 73000,
  changePct24h: 1.5,
  change24h: 1080,
  high24h: 74695,
  low24h: 73357,
  volume24h: 23.5e9,
  changePct7d: -2.1,
  marketCap: 1.48e12,
  marketCapRank: 1,
  circulatingSupply: 19.8e6,
  ath: 73750,
  asOf: 1,
};

describe('crypto stats', () => {
  it('lists the numbers the info payload already includes', () => {
    expect(cryptoStatRows(quote).map((row) => row.label)).toEqual([
      'Market cap',
      '24h change',
      '24h $',
      '24h high',
      '24h low',
      '24h volume',
      '7d',
      'Rank',
      'Supply',
      'ATH',
    ]);
    expect(cryptoStatRows(quote).find((row) => row.label === '24h volume')?.value).toBe('23.5b');
    expect(cryptoStatRows(quote).find((row) => row.label === '24h $')?.value).toBe('+$1,080.00');
  });

  it('skips a row when that field is missing', () => {
    expect(
      cryptoStatRows({ ...quote, high24h: undefined, volume24h: undefined }).map(
        (row) => row.label,
      ),
    ).not.toContain('24h high');
  });
});

describe('equity stats', () => {
  const day = 86_400_000;
  const snapshot: EquitySnapshot = {
    symbol: 'AAPL',
    price: 110,
    previousClose: 105,
    asOf: 1,
    candles: [
      { t: 1, o: 70, h: 82, l: 68, c: 80, v: 1_000_000 },
      { t: 1 + 400 * day, o: 109, h: 112, l: 108, c: 110, v: 3_012_000 },
    ],
  };

  it('fills the panel from the quote and the daily candles', () => {
    expect(equityStatRows(snapshot).map((row) => `${row.label} ${row.value}`)).toEqual([
      'Day change +4.76%',
      'Day $ +$5.00',
      'Prev close $105.00',
      'Open $109.00',
      'Day high $112.00',
      'Day low $108.00',
      'Volume 3.0m',
      '52w high $112.00',
      '52w low $108.00',
    ]);
  });
});
