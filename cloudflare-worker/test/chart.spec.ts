import { describe, expect, it } from 'vitest';
import { cryptoChartParams } from '../src/index';

describe('crypto chart query', () => {
	it('keeps a one-year daily chart when the client omits days', () => {
		expect(cryptoChartParams(null)).toEqual({ days: '365', interval: 'daily' });
		expect(cryptoChartParams('')).toEqual({ days: '365', interval: 'daily' });
	});

	it('uses free-plan auto granularity for short windows and rejects five years', () => {
		expect(cryptoChartParams('1')).toEqual({ days: '1' });
		expect(cryptoChartParams('7')).toEqual({ days: '7' });
		expect(cryptoChartParams('30')).toEqual({ days: '30' });
		expect(cryptoChartParams('90')).toEqual({ days: '90' });
		expect(cryptoChartParams('365')).toEqual({ days: '365', interval: 'daily' });
		expect(cryptoChartParams('1825')).toBeNull();
		expect(cryptoChartParams('max')).toBeNull();
		expect(cryptoChartParams('2')).toBeNull();
	});
});
