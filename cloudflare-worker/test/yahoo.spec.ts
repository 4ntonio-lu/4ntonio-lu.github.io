import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchYahooChart, parseYahooChart, yahooChartUrl } from '../src/yahoo';

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

describe('fetchYahooChart', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('loads daily history and fifteen-minute bars for the one-day chart', async () => {
		const urls: string[] = [];
		vi.stubGlobal('fetch', (input: RequestInfo) => {
			urls.push(String(input));
			const intraday = String(input).includes('interval=15m');
			const body = {
				chart: {
					result: [
						{
							meta: { regularMarketPrice: intraday ? 11 : 110 },
							timestamp: [1, 2],
							indicators: {
								quote: [{ open: [1, 2], high: [2, 3], low: [1, 2], close: [1.5, intraday ? 11 : 110], volume: [1, 2] }],
							},
						},
					],
				},
			};
			return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
		});

		const payload = await fetchYahooChart('AAPL');
		expect(yahooChartUrl('AAPL', '1d', '5y')).toBe('https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=5y');
		expect(urls).toEqual([
			'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=5y',
			'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=15m&range=5d',
		]);
		expect(payload?.price).toBe(110);
		expect(payload?.previousClose).toBe(1.5);
		expect(payload?.intraday.map((candle) => candle.c)).toEqual([1.5, 11]);
	});
});
