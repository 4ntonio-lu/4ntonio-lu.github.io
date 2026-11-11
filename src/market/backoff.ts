/**
 * Delay before the next crypto price refresh.
 * `minutes = min(0.5 * attempt², 240)`. The caller advances `attempt` twice
 * per cycle, which is the schedule the app already ships with.
 */
export function cryptoRefreshDelayMinutes(attempt: number): number {
  return Math.min(0.5 * attempt * attempt, 240);
}

/**
 * Starts the crypto price timer. `onRefresh` runs on each tick; it does not
 * change the delays. Call the returned function to cancel the pending tick.
 */
export function createCryptoRefreshSchedule(onRefresh: () => void): () => void {
  let attempt = 1;
  let timeoutId: ReturnType<typeof setTimeout>;

  const scheduleNextFetch = () => {
    const minutes = cryptoRefreshDelayMinutes(attempt++);
    timeoutId = setTimeout(
      () => {
        onRefresh();
        attempt += 1;
        scheduleNextFetch();
      },
      minutes * 60 * 1000,
    );
  };

  scheduleNextFetch();
  return () => clearTimeout(timeoutId);
}
