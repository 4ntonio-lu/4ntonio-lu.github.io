import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DesktopProvider } from '../../desktop/DesktopProvider';
import { clearMarketMemory, writeCache } from '../../market/cache';
import { equityCacheKey, type EquitySnapshot } from '../../market/equities';
import Stocks from './Stocks';

vi.mock('react-chartjs-2', () => ({
  Chart: () => <div data-testid="candle-chart" />,
}));

const DAY = 86_400_000;

function snapshot(now: number): EquitySnapshot {
  return {
    symbol: 'AAPL',
    price: 110,
    previousClose: 105,
    asOf: now,
    candles: [
      { t: now - 200 * DAY, o: 79, h: 82, l: 78, c: 80, v: 1_000_000 },
      { t: now - 10 * DAY, o: 99, h: 102, l: 98, c: 100, v: 2_000_000 },
      { t: now - DAY, o: 109, h: 112, l: 108, c: 110, v: 3_000_000 },
    ],
  };
}

describe('Stocks', () => {
  beforeEach(() => {
    clearMarketMemory();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('shows a cached candlestick series and slices it when the range changes', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    writeCache(equityCacheKey('AAPL'), snapshot(Date.now()));

    render(
      <MemoryRouter initialEntries={['/stocks']}>
        <DesktopProvider>
          <Stocks />
        </DesktopProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('tab', { name: 'AAPL', selected: true })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Apple' })).toBeInTheDocument();
    expect(screen.getAllByText('$110.00').length).toBeGreaterThan(0);
    expect(screen.getByRole('tab', { name: 'SPY' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'AAPL Apple' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1D' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '6M' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1Y', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Selected range' })).toHaveTextContent('37.50%');
    expect(screen.getByRole('group', { name: 'Selected range' })).toHaveTextContent('High');
    expect(screen.getByTestId('candle-chart')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Market stats' })).toHaveTextContent(
      'Prev close',
    );
    expect(screen.getByRole('complementary', { name: 'Market stats' })).toHaveTextContent(
      '$105.00',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Hide stats' }));
    expect(screen.queryByRole('complementary', { name: 'Market stats' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show stats' }));
    expect(screen.getByRole('complementary', { name: 'Market stats' })).toBeInTheDocument();
    expect(screen.getByText('Powered by')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Yahoo Finance' })).toHaveAttribute(
      'href',
      'https://finance.yahoo.com/quote/AAPL',
    );
    expect(fetchSpy).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: '1M' }));

    expect(screen.getByRole('button', { name: '1M', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Selected range' })).toHaveTextContent('10.00%');

    writeCache(equityCacheKey('SPY'), {
      ...snapshot(Date.now()),
      symbol: 'SPY',
      price: 500,
      previousClose: 480,
    });
    await userEvent.click(screen.getByRole('tab', { name: 'SPY' }));

    expect(screen.getByRole('tab', { name: 'SPY', selected: true })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'S&P 500' })).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
