import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DesktopProvider } from '../../desktop/DesktopProvider';
import { clearMarketMemory, writeCache } from '../../market/cache';
import { CRYPTO_HISTORY_CACHE, CRYPTO_QUOTE_CACHE } from '../../market/coingecko';
import Crypto from './Crypto';

vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="price-chart" />,
}));

const DAY = 86_400_000;

describe('Crypto', () => {
  beforeEach(() => {
    clearMarketMemory();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('shows cached prices and slices the chart when the range changes', async () => {
    const now = Date.now();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    writeCache(CRYPTO_QUOTE_CACHE, {
      updatedAt: now,
      quotes: {
        bitcoin: {
          id: 'bitcoin',
          symbol: 'bitcoin',
          name: 'Bitcoin',
          price: 73000,
          changePct24h: 1.5,
          high24h: 74695,
          marketCap: 1.48e12,
          image: 'https://example.com/btc.png',
          asOf: now,
        },
      },
    });
    writeCache(CRYPTO_HISTORY_CACHE, {
      bitcoin: [
        { t: now - 10 * DAY, price: 100 },
        { t: now - 2 * DAY, price: 110 },
        { t: now - DAY, price: 120 },
      ],
    });

    render(
      <MemoryRouter initialEntries={['/crypto']}>
        <DesktopProvider>
          <Crypto />
        </DesktopProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('tab', { name: 'Bitcoin' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bitcoin' })).toBeInTheDocument();
    expect(screen.getByText('$73,000.00')).toBeInTheDocument();
    expect(screen.queryByText('Market Cap: 1.5t')).not.toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Market stats' })).toHaveTextContent('1.5t');
    expect(screen.getByRole('button', { name: '1D' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '6M' })).not.toBeInTheDocument();
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

    await userEvent.click(screen.getByRole('button', { name: '1W' }));

    expect(screen.getByRole('button', { name: '1W', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Selected range' })).toHaveTextContent('9.09%');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
