import { describe, expect, it } from 'vitest';
import { cryptoChartParams } from '../src/index';

describe('crypto chart query', () => {
	it('keeps a one-year daily chart when the client omits days', () => {
		expect(cryptoChartParams(null)).toEqual({ days: '365', interval: 'daily' });
		expect(cryptoChartParams('')).toEqual({ days: '365', interval: 'daily' });
	});

	it('forwards a five-year request and rejects a window it does not know', () => {
		expect(cryptoChartParams('1825')).toEqual({ days: '1825', interval: 'daily' });
		expect(cryptoChartParams('max')).toBeNull();
		expect(cryptoChartParams('1')).toBeNull();
	});
});
