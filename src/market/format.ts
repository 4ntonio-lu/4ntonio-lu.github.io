export function formatUsd(price: number): string {
  const digits = price >= 1 ? 2 : price >= 0.01 ? 4 : 6;
  return price.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatCompact(value: number): string {
  if (value >= 1e12) return `${(value / 1e12).toFixed(1)}t`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}b`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}m`;
  return value.toFixed(2);
}

export function formatMarketCap(marketCap: number): string {
  return formatCompact(marketCap);
}

export function formatSignedUsd(value: number): string {
  const body = `$${formatUsd(Math.abs(value))}`;
  if (value > 0) return `+${body}`;
  if (value < 0) return `-${body}`;
  return body;
}

export function formatSignedPercent(value: number): string {
  const body = `${Math.abs(value).toFixed(2)}%`;
  if (value > 0) return `+${body}`;
  if (value < 0) return `-${body}`;
  return body;
}

export function formatAxisDate(
  timestamp: number,
  rangeDays: number,
  locales?: Intl.LocalesArgument,
): string {
  const date = new Date(timestamp);
  if (rangeDays <= 31) {
    return date.toLocaleDateString(locales, { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString(locales, { month: 'short', year: '2-digit' });
}

export function formatTooltipDate(timestamp: number, locales?: Intl.LocalesArgument): string {
  return new Date(timestamp).toLocaleDateString(locales, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

export function formatVolume(volume: number): string {
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}b`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}m`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}k`;
  return String(Math.round(volume));
}
