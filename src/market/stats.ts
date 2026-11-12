import {
  formatCompact,
  formatMarketCap,
  formatSignedPercent,
  formatSignedUsd,
  formatUsd,
  formatVolume,
} from './format';
import { percentChange, sliceByDays } from './series';
import type { EquitySnapshot } from './equities';
import type { Quote } from './types';

export type StatRow = {
  label: string;
  value: string;
};

function money(value: number | undefined): string | undefined {
  return typeof value === 'number' ? `$${formatUsd(value)}` : undefined;
}

function percent(value: number | undefined): string | undefined {
  return typeof value === 'number' ? formatSignedPercent(value) : undefined;
}

function add(rows: StatRow[], label: string, value: string | undefined) {
  if (value != null) rows.push({ label, value });
}

/** Rows the crypto window can fill from the CoinGecko info payload. */
export function cryptoStatRows(quote: Quote): StatRow[] {
  const rows: StatRow[] = [];
  add(
    rows,
    'Market cap',
    typeof quote.marketCap === 'number' ? formatMarketCap(quote.marketCap) : undefined,
  );
  add(rows, '24h change', formatSignedPercent(quote.changePct24h));
  add(
    rows,
    '24h $',
    typeof quote.change24h === 'number' ? formatSignedUsd(quote.change24h) : undefined,
  );
  add(rows, '24h high', money(quote.high24h));
  add(rows, '24h low', money(quote.low24h));
  add(
    rows,
    '24h volume',
    typeof quote.volume24h === 'number' ? formatCompact(quote.volume24h) : undefined,
  );
  add(rows, '7d', percent(quote.changePct7d));
  add(rows, '30d', percent(quote.changePct30d));
  add(rows, '1y', percent(quote.changePct1y));
  add(
    rows,
    'Rank',
    typeof quote.marketCapRank === 'number' ? `#${quote.marketCapRank}` : undefined,
  );
  add(
    rows,
    'Supply',
    typeof quote.circulatingSupply === 'number'
      ? formatCompact(quote.circulatingSupply)
      : undefined,
  );
  add(rows, 'ATH', money(quote.ath));
  add(rows, 'ATL', money(quote.atl));
  return rows;
}

/** Rows the stocks window can fill from the quote and the daily candles. */
export function equityStatRows(snapshot: EquitySnapshot): StatRow[] {
  const rows: StatRow[] = [];
  add(
    rows,
    'Market cap',
    typeof snapshot.marketCap === 'number' ? formatMarketCap(snapshot.marketCap) : undefined,
  );
  const dayPct = percentChange(snapshot.previousClose, snapshot.price);
  add(rows, 'Day change', dayPct == null ? undefined : formatSignedPercent(dayPct));
  add(rows, 'Day $', formatSignedUsd(snapshot.price - snapshot.previousClose));
  add(rows, 'Prev close', money(snapshot.previousClose));

  const latest = snapshot.candles[snapshot.candles.length - 1];
  if (latest) {
    add(rows, 'Open', money(latest.o));
    add(rows, 'Day high', money(latest.h));
    add(rows, 'Day low', money(latest.l));
    add(rows, 'Volume', latest.v > 0 ? formatVolume(latest.v) : undefined);
  }

  const year = sliceByDays(snapshot.candles, 365, 1);
  if (year.length > 0) {
    add(rows, '52w high', money(Math.max(...year.map((candle) => candle.h))));
    add(rows, '52w low', money(Math.min(...year.map((candle) => candle.l))));
  }
  return rows;
}
