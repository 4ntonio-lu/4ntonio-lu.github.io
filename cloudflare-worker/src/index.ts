import { EQUITY_SYMBOLS, fetchYahooChart } from './yahoo';

interface Env {
	COINGECKO_APIKEY: string;
}

/** Keep this list identical to CRYPTO_IDS in src/market/coingecko.ts. */
const COINS = new Set([
	'bitcoin',
	'ethereum',
	'solana',
	'ripple',
	'binancecoin',
	'dogecoin',
	'cardano',
	'chainlink',
]);
const EQUITIES = new Set<string>(EQUITY_SYMBOLS);

const INFO_TTL_SECONDS = 30 * 60;
const CHART_TTL_SECONDS = 12 * 60 * 60;
const EQUITY_TTL_SECONDS = 15 * 60;

/**
 * Chart windows the worker will ask CoinGecko for.
 * Omit `interval` for 1–90 days. The free plan then returns 5-minute bars for
 * one day and hourly bars through 90 days. `interval=daily` collapses those
 * windows to a handful of closes.
 */
const CHART_DAYS = new Set(['1', '7', '30', '90', '365']);

export function cryptoChartParams(days: string | null): { days: string; interval?: 'daily' } | null {
	if (days == null || days.length === 0) return { days: '365', interval: 'daily' };
	if (!CHART_DAYS.has(days)) return null;
	if (Number(days) <= 90) return { days };
	return { days, interval: 'daily' };
}

/** Portfolio and Vite dev. A missing or any other Origin is rejected. */
const ALLOWED_ORIGINS = new Set([
	'https://4ntonio-lu.github.io',
	'http://localhost:5173',
	'http://127.0.0.1:5173',
]);

function allowedOrigin(request: Request): string | null {
	const origin = request.headers.get('Origin');
	if (origin !== null && ALLOWED_ORIGINS.has(origin)) return origin;
	return null;
}

function applyCors(headers: Headers, origin: string): void {
	headers.set('Access-Control-Allow-Origin', origin);
	headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
	headers.set('Access-Control-Allow-Headers', 'Content-Type');
	headers.set('Vary', 'Origin');
}

function withCors(response: Response, origin: string): Response {
	const headers = new Headers(response.headers);
	applyCors(headers, origin);
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

function text(message: string, status: number): Response {
	return new Response(message, { status });
}

function json(body: string, status: number, ttlSeconds: number): Response {
	return new Response(body, {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': `public, max-age=${ttlSeconds}`,
		},
	});
}

async function fromCache(request: Request, load: () => Promise<Response>): Promise<Response> {
	const cacheKey = new Request(request.url, { method: 'GET' });
	try {
		const hit = await caches.default.match(cacheKey);
		if (hit) return hit;
	} catch {
		// The cache binding is missing in some local runs. Fall through to origin.
	}

	const response = await load();
	if (response.ok) {
		try {
			await caches.default.put(cacheKey, response.clone());
		} catch {
			// Serving the fresh response still matters more than storing it.
		}
	}
	return response;
}

async function serveEquity(request: Request, symbol: string): Promise<Response> {
	if (!EQUITIES.has(symbol)) return text('Unknown symbol', 400);
	return fromCache(request, async () => {
		const payload = await fetchYahooChart(symbol);
		if (!payload) return text('Failed to fetch equity data', 502);
		return json(JSON.stringify(payload), 200, EQUITY_TTL_SECONDS);
	});
}

async function serveCrypto(request: Request, env: Env, id: string, type: string): Promise<Response> {
	if (!COINS.has(id)) return text('Unknown coin', 400);
	if (type !== 'info' && type !== 'chart') return text('Missing or invalid "type" query parameter', 400);
	if (!env.COINGECKO_APIKEY) return text('API key is not set', 500);

	const chart = type === 'chart' ? cryptoChartParams(new URL(request.url).searchParams.get('days')) : null;
	if (type === 'chart' && !chart) return text('Invalid days', 400);

	const ttl = type === 'info' ? INFO_TTL_SECONDS : CHART_TTL_SECONDS;
	return fromCache(request, async () => {
		const params = new URLSearchParams();
		let apiUrl = '';
		if (type === 'info') {
			apiUrl = `https://api.coingecko.com/api/v3/coins/${id}`;
			params.set('localization', 'false');
		} else if (chart) {
			apiUrl = `https://api.coingecko.com/api/v3/coins/${id}/market_chart`;
			params.set('vs_currency', 'usd');
			params.set('days', chart.days);
			if (chart.interval) params.set('interval', chart.interval);
		}

		let upstream: Response;
		try {
			upstream = await fetch(`${apiUrl}?${params.toString()}`, {
				headers: { 'x-cg-demo-api-key': env.COINGECKO_APIKEY },
			});
		} catch {
			return text('Failed to fetch data from CoinGecko', 502);
		}

		const body = await upstream.text();
		return json(body, upstream.status, upstream.ok ? ttl : 0);
	});
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const origin = allowedOrigin(request);
		if (!origin) return new Response('Forbidden', { status: 403 });

		if (request.method === 'OPTIONS') {
			const headers = new Headers();
			applyCors(headers, origin);
			return new Response(null, { status: 204, headers });
		}
		if (request.method !== 'GET') return withCors(text('Method not allowed', 405), origin);

		const url = new URL(request.url);
		const type = url.searchParams.get('type');
		if (type === 'equity') {
			const symbol = url.searchParams.get('symbol') ?? '';
			return withCors(await serveEquity(request, symbol), origin);
		}

		const id = url.searchParams.get('id') ?? '';
		if (!id) return withCors(text('Missing "id" query parameter', 400), origin);
		if (!type) return withCors(text('Missing or invalid "type" query parameter (info or chart)', 400), origin);
		return withCors(await serveCrypto(request, env, id, type), origin);
	},
};
