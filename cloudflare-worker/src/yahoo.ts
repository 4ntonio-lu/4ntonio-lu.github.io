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
};

const YAHOO_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart';

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

/** Daily history plus fifteen-minute bars, so a one-day chart is one session of candles. */
export async function fetchYahooChart(symbol: string): Promise<EquityPayload | null> {
	const [daily, intraday] = await Promise.all([fetchYahooSeries(symbol, '1d', '5y'), fetchYahooSeries(symbol, '15m', '5d')]);
	if (!daily) return null;
	return { ...daily, intraday: intraday?.candles ?? [] };
}
