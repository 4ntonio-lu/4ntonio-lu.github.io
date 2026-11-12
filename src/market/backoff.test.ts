import { afterEach, describe, expect, it, vi } from 'vitest';
import { CRYPTO_REFRESH_GAPS_MS, createCryptoRefreshSchedule } from './backoff';

describe('crypto refresh schedule', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires three times, 15s then 30s then 45s, and then stops', () => {
    vi.useFakeTimers();
    const firedAt: number[] = [];
    const start = Date.now();
    const stop = createCryptoRefreshSchedule(() => firedAt.push(Date.now()));

    vi.advanceTimersByTime(14_999);
    expect(firedAt).toHaveLength(0);

    vi.advanceTimersByTime(1);
    expect(firedAt.map((time) => time - start)).toEqual([15_000]);

    vi.advanceTimersByTime(30_000);
    expect(firedAt.map((time) => time - start)).toEqual([15_000, 45_000]);

    vi.advanceTimersByTime(45_000);
    expect(firedAt.map((time) => time - start)).toEqual([15_000, 45_000, 90_000]);

    vi.advanceTimersByTime(10 * 60_000);
    expect(firedAt).toHaveLength(3);
    expect(CRYPTO_REFRESH_GAPS_MS).toEqual([15_000, 30_000, 45_000]);
    stop();
  });
});
