/** Gaps between automatic price refreshes. Three ticks per page load, then stop. */
export const CRYPTO_REFRESH_GAPS_MS = [15_000, 30_000, 45_000] as const;

/**
 * Schedules at most three price refreshes: 15s after load, 30s after that,
 * then 45s after that. There is no further timer.
 */
export function createCryptoRefreshSchedule(onRefresh: () => void): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let index = 0;

  const scheduleNext = () => {
    if (index >= CRYPTO_REFRESH_GAPS_MS.length) return;
    const delay = CRYPTO_REFRESH_GAPS_MS[index];
    index += 1;
    timeoutId = setTimeout(() => {
      onRefresh();
      scheduleNext();
    }, delay);
  };

  scheduleNext();
  return () => clearTimeout(timeoutId);
}

/** Five stock refreshes per page load: once after 15s, then every 30s. */
export const EQUITY_REFRESH_GAPS_MS = [15_000, 30_000, 30_000, 30_000, 30_000] as const;

export function createEquityRefreshSchedule(onRefresh: () => void): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let index = 0;

  const scheduleNext = () => {
    if (index >= EQUITY_REFRESH_GAPS_MS.length) return;
    const delay = EQUITY_REFRESH_GAPS_MS[index];
    index += 1;
    timeoutId = setTimeout(() => {
      onRefresh();
      scheduleNext();
    }, delay);
  };

  scheduleNext();
  return () => clearTimeout(timeoutId);
}
