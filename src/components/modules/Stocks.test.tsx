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

    expect(await screen.findByRole('heading', { name: 'AAPL Apple' })).toBeInTheDocument();
    expect(screen.getByText('$110.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'AAPL Apple', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SPY S&P 500' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1Y', pressed: true })).toBeInTheDocument();
    expect(screen.getByText(/this range/).closest('p')).toHaveTextContent('37.50%');
    expect(screen.getByTestId('candle-chart')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Data: Yahoo Finance' })).toHaveAttribute(
      'href',
      'https://finance.yahoo.com/quote/AAPL',
    );
    expect(fetchSpy).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: '1M' }));

    expect(screen.getByRole('button', { name: '1M', pressed: true })).toBeInTheDocument();
    expect(screen.getByText(/this range/).closest('p')).toHaveTextContent('10.00%');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
