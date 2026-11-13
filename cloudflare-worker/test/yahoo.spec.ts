import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchYahooChart, parseYahooChart, readYahooSize, yahooChartUrl } from '../src/yahoo';

describe('parseYahooChart', () => {
	it('turns a split-adjusted Yahoo chart into candles and a day change', () => {
		const payload = parseYahooChart('NVDA', {
			chart: {
				result: [
					{
						meta: { regularMarketPrice: 120.91 },
						timestamp: [1717718400, 1717977600],
						indicators: {
							quote: [
								{
									open: [119.77, 121.77],
									high: [121.69, 122.87],
									low: [118.02, 118.74],
									close: [120.888, 120.91],
									volume: [412386000.4, null],
								},
							],
						},
					},
				],
			},
		});

		expect(payload).toEqual({
			symbol: 'NVDA',
			price: 120.91,
			previousClose: 120.888,
			candles: [
				{ t: 1717718400000, o: 119.77, h: 121.69, l: 118.02, c: 120.888, v: 412386000 },
				{ t: 1717977600000, o: 121.77, h: 122.87, l: 118.74, c: 120.91, v: 0 },
			],
		});
	});

	it('uses the prior daily close when the quote is the last candle', () => {
		const payload = parseYahooChart('AAPL', {
			chart: {
				result: [
					{
						meta: { regularMarketPrice: 110 },
						timestamp: [1, 2],
						indicators: { quote: [{ open: [1, 2], high: [2, 3], low: [1, 2], close: [1.5, 110], volume: [1, 2] }] },
					},
				],
			},
		});
		expect(payload?.previousClose).toBe(1.5);
	});

	it('rejects a chart that is not a series', () => {
		expect(parseYahooChart('AAPL', { chart: { result: [] } })).toBeNull();
		expect(parseYahooChart('AAPL', null)).toBeNull();
	});
});

describe('readYahooSize', () => {
	it('reads the quote market cap and ignores a fund that only has net assets', () => {
		expect(readYahooSize({ quoteSummary: { result: [{ price: { marketCap: { raw: 5.16e12 } } }] } })).toBe(5.16e12);
		expect(
			readYahooSize({
				quoteSummary: {
					result: [
						{
							price: { regularMarketPrice: { raw: 10 } },
							defaultKeyStatistics: { sharesOutstanding: { raw: 4 } },
						},
					],
				},
			}),
		).toBe(40);
		expect(
			readYahooSize({
				quoteSummary: { result: [{ summaryDetail: { totalAssets: { raw: 7.9e11 } } }] },
			}),
		).toBeNull();
		expect(readYahooSize(null)).toBeNull();
	});
});

describe('fetchYahooChart', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('loads daily history, the one-day session, and a fifteen-minute week', async () => {
		const urls: string[] = [];
		vi.stubGlobal('fetch', (input: RequestInfo) => {
			const url = String(input);
			urls.push(url);
			if (url.includes('fc.yahoo.com')) {
				return Promise.resolve(new Response(null, { status: 404, headers: { 'set-cookie': 'A3=abc; Path=/' } }));
			}
			if (url.includes('getcrumb')) return Promise.resolve(new Response('crumb'));
			if (url.includes('quoteSummary')) {
				return Promise.resolve(Response.json({ quoteSummary: { result: [{ price: { marketCap: { raw: 5.16e12 } } }] } }));
			}
			const week = url.includes('range=1wk');
			const intraday = url.includes('interval=15m') && url.includes('range=5d');
			const body = {
				chart: {
					result: [
						{
							meta: { regularMarketPrice: week ? 15 : intraday ? 11 : 110 },
							timestamp: [1, 2],
							indicators: {
								quote: [
									{
										open: [1, 2],
										high: [2, 3],
										low: [1, 2],
										close: [1.5, week ? 15 : intraday ? 11 : 110],
										volume: [1, 2],
									},
								],
							},
						},
					],
				},
			};
			return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
		});

		const payload = await fetchYahooChart('AAPL');
		expect(yahooChartUrl('AAPL', '1d', '5y')).toBe('https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=5y');
		expect(urls.filter((url) => url.includes('/chart/'))).toEqual([
			'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=5y',
			'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=15m&range=5d',
			'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=15m&range=1wk',
		]);
		expect(urls.some((url) => url.includes('/quoteSummary/AAPL') && url.includes('modules=price'))).toBe(true);
		expect(payload?.price).toBe(110);
		expect(payload?.previousClose).toBe(1.5);
		expect(payload?.marketCap).toBe(5.16e12);
		expect(payload?.intraday.map((candle) => candle.c)).toEqual([1.5, 11]);
		expect(payload?.week.map((candle) => candle.c)).toEqual([1.5, 15]);
	});
});
