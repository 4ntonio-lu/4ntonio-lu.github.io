/** The price indicator stays up long enough to be seen, even when the fetch is quick. */
export const MIN_LOADING_MS = 2_000;

export function waitForMinimumLoad(startedAt: number, now = Date.now()): Promise<void> {
  const remaining = Math.max(0, MIN_LOADING_MS - (now - startedAt));
  if (remaining === 0) return Promise.resolve();
  return new Promise((resolve) => {
    setTimeout(resolve, remaining);
  });
}
