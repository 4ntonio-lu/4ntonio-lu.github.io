import { describe, expect, it } from 'vitest';
import {
  formatAxisDate,
  formatMarketCap,
  formatSignedPercent,
  formatTooltipDate,
  formatUsd,
  formatVolume,
} from './format';

describe('market format', () => {
  const noon = Date.UTC(2026, 10, 10, 12);

  it('formats prices, market cap, and percents', () => {
    expect(formatUsd(73768)).toBe('73,768.00');
    expect(formatUsd(0.1823)).toBe('0.1823');
    expect(formatUsd(0.00001234)).toBe('0.000012');
    expect(formatMarketCap(1.483e12)).toBe('1.5t');
    expect(formatMarketCap(2.4e9)).toBe('2.4b');
    expect(formatMarketCap(8.2e6)).toBe('8.2m');
    expect(formatSignedPercent(1.2)).toBe('+1.20%');
    expect(formatSignedPercent(-0.5)).toBe('-0.50%');
    expect(formatSignedPercent(0)).toBe('0.00%');
    expect(formatVolume(3_012_000)).toBe('3.0m');
  });

  it('formats chart dates in a fixed locale', () => {
    expect(formatAxisDate(noon, 7, 'en-US')).toBe('Nov 10');
    expect(formatAxisDate(noon, 365, 'en-US')).toBe('Nov 26');
    expect(formatTooltipDate(noon, 'en-US')).toBe('Tue, Nov 10, 2026');
  });
});
