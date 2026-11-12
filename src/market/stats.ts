import { formatCompact, formatSignedPercent, formatSignedUsd, formatUsd } from './format';
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
