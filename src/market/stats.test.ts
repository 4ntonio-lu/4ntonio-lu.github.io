import { describe, expect, it } from 'vitest';
import { cryptoStatRows } from './stats';
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
