/** Keep this list identical to EQUITIES in src/market/equities.ts. */
export const EQUITY_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'SPY', 'QQQ', 'DIA', 'IWM'] as const;

export type EquityCandle = {
	t: number;
	o: number;
	h: number;
	l: number;
	c: number;
	v: number;
};

export type EquitySeries = {
	symbol: string;
	price: number;
	previousClose: number;
	candles: EquityCandle[];
};

export type EquityPayload = EquitySeries & {
	intraday: EquityCandle[];
	/** Present when Yahoo's quote has a market cap, or shares outstanding times price. */
	marketCap?: number;
};

const YAHOO_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart';
const YAHOO_CRUMB = 'https://query1.finance.yahoo.com/v1/test/getcrumb';
const YAHOO_SUMMARY = 'https://query1.finance.yahoo.com/v10/finance/quoteSummary';

function round4(value: number): number {
	return Math.round(value * 10000) / 10000;
}

export function parseYahooChart(symbol: string, data: unknown): EquitySeries | null {
	if (!data || typeof data !== 'object') return null;
	const result = (data as { chart?: { result?: unknown[] } }).chart?.result?.[0];
	if (!result || typeof result !== 'object') return null;
	const chart = result as {
		meta?: { regularMarketPrice?: unknown };
		timestamp?: unknown;
		indicators?: { quote?: unknown[] };
	};
	const timestamps = chart.timestamp;
	const quote = chart.indicators?.quote?.[0] as
		| {
				open?: unknown[];
				high?: unknown[];
				low?: unknown[];
				close?: unknown[];
				volume?: unknown[];
		  }
		| undefined;
	if (!Array.isArray(timestamps) || !quote) return null;

	const candles: EquityCandle[] = [];
	for (let i = 0; i < timestamps.length; i++) {
		const time = timestamps[i];
		const open = quote.open?.[i];
		const high = quote.high?.[i];
		const low = quote.low?.[i];
		const close = quote.close?.[i];
		const volume = quote.volume?.[i];
		if (
			typeof time !== 'number' ||
			typeof open !== 'number' ||
			typeof high !== 'number' ||
			typeof low !== 'number' ||
			typeof close !== 'number'
		) {
			continue;
		}
		candles.push({
			t: time * 1000,
			o: round4(open),
			h: round4(high),
			l: round4(low),
			c: round4(close),
			v: typeof volume === 'number' ? Math.round(volume) : 0,
		});
	}
	if (candles.length < 2) return null;

	const last = candles[candles.length - 1];
	const prior = candles[candles.length - 2];
	const market = chart.meta?.regularMarketPrice;
	const price = typeof market === 'number' ? round4(market) : last.c;
	const sameClose = Math.abs(price - last.c) < 0.0001 * Math.max(1, price);
	return {
		symbol,
		price,
		previousClose: sameClose ? prior.c : last.c,
		candles,
	};
}

export function yahooChartUrl(symbol: string, interval: string, range: string): string {
	const url = new URL(`${YAHOO_CHART}/${encodeURIComponent(symbol)}`);
	url.searchParams.set('interval', interval);
	url.searchParams.set('range', range);
	return url.toString();
}

async function fetchYahooSeries(symbol: string, interval: string, range: string): Promise<EquitySeries | null> {
	let response: Response;
	try {
		response = await fetch(yahooChartUrl(symbol, interval, range), {
			headers: {
				Accept: 'application/json',
				'User-Agent': 'Mozilla/5.0',
			},
		});
	} catch {
		return null;
	}
	if (!response.ok) return null;
	return parseYahooChart(symbol, await response.json());
}

function yahooRaw(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (value && typeof value === 'object' && typeof (value as { raw?: unknown }).raw === 'number') {
		const raw = (value as { raw: number }).raw;
		return Number.isFinite(raw) ? raw : null;
	}
	return null;
}

/**
 * Market cap from Yahoo's quoteSummary quote. `price.marketCap` is the field.
 * When that is missing, shares outstanding times the quote price is the same figure.
 * Net assets are not a market cap, so an ETF with only that number stays blank.
 */
export function readYahooSize(data: unknown): number | null {
	if (!data || typeof data !== 'object') return null;
	const result = (data as { quoteSummary?: { result?: unknown[] } }).quoteSummary?.result?.[0];
	if (!result || typeof result !== 'object') return null;
	const record = result as {
		price?: { marketCap?: unknown; regularMarketPrice?: unknown; sharesOutstanding?: unknown };
		summaryDetail?: { marketCap?: unknown };
		defaultKeyStatistics?: { sharesOutstanding?: unknown };
	};
	const quoted = yahooRaw(record.price?.marketCap) ?? yahooRaw(record.summaryDetail?.marketCap);
	if (quoted != null && quoted > 0) return quoted;
	const shares = yahooRaw(record.defaultKeyStatistics?.sharesOutstanding) ?? yahooRaw(record.price?.sharesOutstanding);
	const price = yahooRaw(record.price?.regularMarketPrice);
	if (shares != null && price != null && shares > 0 && price > 0) return shares * price;
	return null;
}

function cookieHeader(response: Response): string {
	const lines = response.headers.getSetCookie();
	const fallback = response.headers.get('set-cookie');
	const parts = lines.length > 0 ? lines : fallback ? [fallback] : [];
	return parts
		.map((line) => line.split(';')[0]?.trim() ?? '')
		.filter((part) => part.length > 0)
		.join('; ');
}

/** Yahoo's quote market cap. A missing cookie or an empty quote leaves it off the payload. */
async function fetchYahooMarketCap(symbol: string): Promise<number | null> {
	let seed: Response;
	try {
		seed = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' } });
	} catch {
		return null;
	}
	const cookie = cookieHeader(seed);
	if (!cookie) return null;

	let crumbResponse: Response;
	try {
		crumbResponse = await fetch(YAHOO_CRUMB, {
			headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/plain', Cookie: cookie },
		});
	} catch {
		return null;
	}
	if (!crumbResponse.ok) return null;
	const crumb = (await crumbResponse.text()).trim();
	if (!crumb || crumb.startsWith('{') || crumb.startsWith('<')) return null;

	const url = new URL(`${YAHOO_SUMMARY}/${encodeURIComponent(symbol)}`);
	url.searchParams.set('modules', 'price,summaryDetail,defaultKeyStatistics');
	url.searchParams.set('crumb', crumb);
	let quote: Response;
	try {
		quote = await fetch(url, {
			headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', Cookie: cookie },
		});
	} catch {
		return null;
	}
	if (!quote.ok) return null;
	return readYahooSize(await quote.json());
}

/** Daily history plus fifteen-minute bars, so a one-day chart is one session of candles. */
export async function fetchYahooChart(symbol: string): Promise<EquityPayload | null> {
	const [daily, intraday, marketCap] = await Promise.all([
		fetchYahooSeries(symbol, '1d', '5y'),
		fetchYahooSeries(symbol, '15m', '5d'),
		fetchYahooMarketCap(symbol),
	]);
	if (!daily) return null;
	return { ...daily, intraday: intraday?.candles ?? [], ...(marketCap != null ? { marketCap } : {}) };
}
