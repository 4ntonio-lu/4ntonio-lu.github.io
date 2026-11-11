import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCryptoRefreshSchedule, cryptoRefreshDelayMinutes } from './backoff';

describe('crypto refresh backoff', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the original 0.5 * attempt² minutes, capped at 240', () => {
    expect(cryptoRefreshDelayMinutes(1)).toBe(0.5);
    expect(cryptoRefreshDelayMinutes(3)).toBe(4.5);
    expect(cryptoRefreshDelayMinutes(21)).toBe(220.5);
    expect(cryptoRefreshDelayMinutes(23)).toBe(240);
  });

  it('keeps the original double step, so the gaps are 0.5, 4.5, 12.5…', () => {
    vi.useFakeTimers();
    const firedAt: number[] = [];
    const start = Date.now();
    const stop = createCryptoRefreshSchedule(() => firedAt.push(Date.now()));

    for (let i = 0; i < 12; i++) vi.advanceTimersToNextTimer();

    const elapsedMinutes = firedAt.map((time) => (time - start) / 60_000);
    expect(elapsedMinutes).toEqual([
      0.5, 5, 17.5, 42, 82.5, 143, 227.5, 340, 484.5, 665, 885.5, 1125.5,
    ]);
    stop();
  });
});
