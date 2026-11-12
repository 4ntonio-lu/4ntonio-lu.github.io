import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitForMinimumLoad } from './loading';

describe('loading hold', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stays pending until two seconds have passed', async () => {
    vi.useFakeTimers();
    const started = Date.now();
    let done = false;
    void waitForMinimumLoad(started - 400).then(() => {
      done = true;
    });

    await vi.advanceTimersByTimeAsync(1_599);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
  });

  it('resolves immediately when the fetch already took two seconds', async () => {
    await expect(waitForMinimumLoad(Date.now() - 2_000)).resolves.toBeUndefined();
  });
});
