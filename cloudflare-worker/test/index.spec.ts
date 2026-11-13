import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

const PORTFOLIO = 'https://4ntonio-lu.github.io';

async function respond(url: string, origin?: string, method = 'GET'): Promise<Response> {
	const ctx = createExecutionContext();
	const headers = new Headers();
	if (origin !== undefined) headers.set('Origin', origin);
	const response = await worker.fetch(new IncomingRequest(url, { method, headers }), env, ctx);
	await waitOnExecutionContext(ctx);
	return response;
}

describe('market worker', () => {
	it('rejects anything that is not an allowlisted coin or symbol', async () => {
		expect((await respond('http://example.com/?id=bitcoin/tickers&type=info', PORTFOLIO)).status).toBe(400);
		expect((await respond('http://example.com/?type=equity&symbol=FAKE', PORTFOLIO)).status).toBe(400);
		expect((await respond('http://example.com/?id=bitcoin&type=nope', PORTFOLIO)).status).toBe(400);
		expect((await respond('http://example.com/', PORTFOLIO)).status).toBe(400);
	});

	it('echoes only an allowed Origin on a CORS preflight', async () => {
		for (const origin of [PORTFOLIO, 'http://localhost:5173', 'http://127.0.0.1:5173']) {
			const preflight = await respond('http://example.com/', origin, 'OPTIONS');
			expect(preflight.status).toBe(204);
			expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe(origin);
			expect(preflight.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
			expect(preflight.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
			expect(preflight.headers.get('Vary')).toBe('Origin');
		}
	});

	it('rejects a missing Origin and every other Origin', async () => {
		const denied = [
			await respond('http://example.com/?id=bitcoin&type=info'),
			await respond('http://example.com/?id=bitcoin&type=info', 'https://evil.example'),
			await respond('http://example.com/?id=bitcoin&type=info', 'https://4ntonio-lu.github.io.evil.example'),
			await respond('http://example.com/', 'https://evil.example', 'OPTIONS'),
			await respond('http://example.com/', undefined, 'OPTIONS'),
		];

		for (const response of denied) {
			expect(response.status).toBe(403);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
		}
	});

	it('echoes the portfolio Origin on an allowed error response', async () => {
		const response = await respond('http://example.com/?id=not-a-coin&type=info', PORTFOLIO);
		expect(response.status).toBe(400);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe(PORTFOLIO);
		expect(await response.text()).toBe('Unknown coin');
	});
});
