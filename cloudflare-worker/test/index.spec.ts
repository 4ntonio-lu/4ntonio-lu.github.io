import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

async function respond(url: string): Promise<Response> {
	const ctx = createExecutionContext();
	const response = await worker.fetch(new IncomingRequest(url), env, ctx);
	await waitOnExecutionContext(ctx);
	return response;
}

describe('market worker', () => {
	it('rejects anything that is not an allowlisted coin or symbol', async () => {
		expect((await respond('http://example.com/?id=bitcoin/tickers&type=info')).status).toBe(400);
		expect((await respond('http://example.com/?type=equity&symbol=FAKE')).status).toBe(400);
		expect((await respond('http://example.com/?id=bitcoin&type=nope')).status).toBe(400);
		expect((await respond('http://example.com/')).status).toBe(400);
	});

	it('answers a CORS preflight', async () => {
		const preflight = await worker.fetch(
			new IncomingRequest('http://example.com/', { method: 'OPTIONS' }),
			env,
			createExecutionContext(),
		);
		expect(preflight.status).toBe(204);
		expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe('*');
	});
});
