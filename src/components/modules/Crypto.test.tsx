import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DesktopProvider } from '../../desktop/DesktopProvider';
import { clearMarketMemory, writeCache } from '../../market/cache';
import { cryptoHistoryCacheKey, cryptoQuoteCacheKey } from '../../market/coingecko';
import Crypto from './Crypto';

vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="price-chart" />,
}));

const DAY = 86_400_000;

describe('Crypto', () => {
  beforeEach(() => {
    vi.useRealTimers();
    clearMarketMemory();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('shows cached prices and slices the chart when the range changes', async () => {
    const now = Date.now();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    writeCache(cryptoQuoteCacheKey('bitcoin'), {
      id: 'bitcoin',
      symbol: 'bitcoin',
      name: 'Bitcoin',
      price: 73000,
      changePct24h: 1.5,
      high24h: 74695,
      marketCap: 1.48e12,
      image: 'https://example.com/btc.png',
      asOf: now,
    });
    writeCache(cryptoHistoryCacheKey('bitcoin', '365'), [
      { t: now - 10 * DAY, price: 100 },
      { t: now - 2 * DAY, price: 110 },
      { t: now - DAY, price: 120 },
    ]);

    render(
      <MemoryRouter>
        <DesktopProvider initialOpen="crypto">
          <Crypto />
        </DesktopProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('tab', { name: 'Bitcoin', selected: true })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Ethereum' })).toBeInTheDocument();
    expect(screen.getByRole('status').closest('.react-tabs__tab-panel--selected')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Bitcoin' })).toBeInTheDocument();
    expect(screen.getByText('$73,000.00')).toBeInTheDocument();
    expect(screen.queryByText('Market Cap: 1.5t')).not.toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Market stats' })).toHaveTextContent('1.5t');
    expect(screen.getByRole('button', { name: '1D' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '6M' })).not.toBeInTheDocument();
    expect(
      [...screen.getByRole('group', { name: 'Chart range' }).querySelectorAll('button')].map(
        (button) => button.textContent,
      ),
    ).toEqual(['1D', '1W', '1M', '3M', '1Y']);
    expect(screen.queryByRole('button', { name: '5Y' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1Y', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Selected range' })).toHaveTextContent('20.00%');
    expect(screen.getByRole('group', { name: 'Selected range' })).toHaveTextContent('High $120.00');
    expect(screen.getByTestId('price-chart')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Last updated');
    expect(screen.getByRole('complementary', { name: 'Market stats' })).toHaveTextContent(
      '24h high',
    );
    expect(screen.getByRole('complementary', { name: 'Market stats' })).toHaveTextContent(
      '$74,695.00',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Hide stats' }));
    expect(screen.queryByRole('complementary', { name: 'Market stats' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show stats' }));
    expect(screen.getByRole('complementary', { name: 'Market stats' })).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();

    const end = now;
    fetchSpy.mockImplementation((input: RequestInfo) => {
      const url = String(input);
      if (!url.includes('days=1')) return Promise.resolve(new Response('no', { status: 400 }));
      const prices = Array.from({ length: 12 }, (_, index) => [
        end - (11 - index) * 5 * 60_000,
        100 + index,
      ]);
      return Promise.resolve(Response.json({ prices }));
    });

    await userEvent.click(screen.getByRole('button', { name: '1D' }));

    expect(screen.getByRole('button', { name: '1D', pressed: true })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('group', { name: 'Selected range' })).toHaveTextContent('11.00%');
    });
    expect(screen.getByRole('group', { name: 'Selected range' })).toHaveTextContent('High $111.00');
    expect(screen.getByRole('group', { name: 'Selected range' })).toHaveTextContent('Low $100.00');
    const chartUrl = String(fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1]?.[0]);
    expect(chartUrl).toContain('days=1');
    expect(chartUrl).not.toContain('interval=');
  });

  it('fetches and refreshes only the open coin', async () => {
    vi.useFakeTimers();
    const urls: string[] = [];
    vi.stubGlobal('fetch', (input: RequestInfo) => {
      const url = String(input);
      urls.push(url);
      if (url.includes('type=chart')) {
        return Promise.resolve(
          Response.json({
            prices: [
              [1, 2],
              [3, 4],
            ],
          }),
        );
      }
      const id = new URL(url).searchParams.get('id') ?? 'bitcoin';
      return Promise.resolve(
        Response.json({
          name: id === 'ethereum' ? 'Ethereum' : 'Bitcoin',
          market_data: {
            current_price: { usd: 10 },
            market_cap: { usd: 20 },
            price_change_percentage_24h: 1,
          },
        }),
      );
    });
    const now = Date.now();
    writeCache(cryptoQuoteCacheKey('bitcoin'), {
      id: 'bitcoin',
      symbol: 'bitcoin',
      name: 'Bitcoin',
      price: 73000,
      changePct24h: 1,
      marketCap: 1,
      asOf: now,
    });
    writeCache(cryptoHistoryCacheKey('bitcoin', '365'), [
      { t: now - DAY, price: 1 },
      { t: now, price: 2 },
    ]);

    render(
      <MemoryRouter>
        <DesktopProvider initialOpen="crypto">
          <Crypto />
        </DesktopProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('tab', { name: 'Bitcoin', selected: true })).toBeInTheDocument();
    expect(urls).toEqual([]);

    fireEvent.click(screen.getByRole('tab', { name: 'Ethereum' }));
    expect(urls.every((url) => url.includes('id=ethereum'))).toBe(true);
    expect(urls.some((url) => url.includes('type=info'))).toBe(true);
    expect(urls.some((url) => url.includes('type=chart') && url.includes('days=365'))).toBe(true);
    expect(urls.some((url) => url.includes('id=bitcoin'))).toBe(false);

    const beforeRefresh = urls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    const refreshUrls = urls.slice(beforeRefresh);
    expect(refreshUrls.length).toBeGreaterThan(0);
    expect(
      refreshUrls.every((url) => url.includes('id=ethereum') && url.includes('type=info')),
    ).toBe(true);
  });
});
