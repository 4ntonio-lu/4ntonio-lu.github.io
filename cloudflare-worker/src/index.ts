interface Env {
	COINGECKO_APIKEY: string;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const id = url.searchParams.get('id');
		const type = url.searchParams.get('type'); // "info" or "chart"

		if (!env.COINGECKO_APIKEY) {
			return new Response('API key is not set', { status: 500 });
		}

		if (!id) {
			return new Response('Missing "id" query parameter', { status: 400 });
		}

		if (!type || (type !== 'info' && type !== 'chart')) {
			return new Response('Missing or invalid "type" query parameter (info or chart)', { status: 400 });
		}

		let apiUrl = '';
		const params = new URLSearchParams();

		if (type === 'info') {
			apiUrl = `https://api.coingecko.com/api/v3/coins/${id}`;
			params.set('localization', 'false');
		} else if (type === 'chart') {
			apiUrl = `https://api.coingecko.com/api/v3/coins/${id}/market_chart`;
			params.set('vs_currency', 'usd');
			params.set('days', '365');
			params.set('interval', 'daily');
		}

		const fetchUrl = `${apiUrl}?${params.toString()}`;

		try {
			const response = await fetch(fetchUrl, {
				headers: {
					'x-cg-demo-api-key': env.COINGECKO_APIKEY
				}
			});

			const data = await response.text();

			return new Response(data, {
				status: response.status,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*'
				}
			});
		} catch (error) {
			return new Response('Failed to fetch data from CoinGecko', { status: 502 });
		}
	},
};