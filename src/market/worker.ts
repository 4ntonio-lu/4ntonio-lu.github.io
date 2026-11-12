const configuredWorker = import.meta.env.VITE_MARKET_WORKER;
export const MARKET_WORKER_URL =
  typeof configuredWorker === 'string' && configuredWorker.length > 0
    ? configuredWorker
    : 'https://cloudflare-worker.4ntonio-lu.workers.dev';

const inflight = new Map<string, Promise<unknown>>();

export function marketWorkerUrl(params: Record<string, string>): string {
  const url = new URL(MARKET_WORKER_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

export async function fetchWorkerJson(params: Record<string, string>): Promise<unknown> {
  const url = marketWorkerUrl(params);
  const pending = inflight.get(url);
  if (pending) return pending;

  const request = fetch(url).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Market request failed (${response.status})`);
    }
    return response.json() as Promise<unknown>;
  });
  inflight.set(url, request);
  try {
    return await request;
  } finally {
    inflight.delete(url);
  }
}
