import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearMarketMemory, readCache, writeCache } from './cache';

describe('market cache', () => {
  beforeEach(() => {
    clearMarketMemory();
    localStorage.clear();
  });

  it('stores an epoch timestamp that round-trips in any locale', () => {
    writeCache('prices', { usd: 1 }, 1_700_000_000_000);
    expect(readCache('prices', 1_000, 1_700_000_000_500)).toEqual({ usd: 1 });
    expect(readCache('prices', 1_000, 1_700_000_001_001)).toBeNull();
  });

  it('ignores a corrupt entry', () => {
    localStorage.setItem('prices', 'not-json');
    expect(readCache('prices', 1_000)).toBeNull();
  });

  it('keeps the value in memory when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    writeCache('prices', { usd: 2 });
    expect(readCache('prices', 1_000)).toEqual({ usd: 2 });
    vi.restoreAllMocks();
  });
});
