import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DesktopProvider } from '../../desktop/DesktopProvider';
import { clearMarketMemory, writeCache } from '../../market/cache';
import { equityCacheKey, type EquitySnapshot } from '../../market/equities';
import { equityCandles } from '../../market/series';
import Stocks from './Stocks';

type ChartScale = {
  min?: number;
  max?: number;
  offset?: boolean;
  bounds?: string;
};

const renderedCharts: { type?: string; x?: ChartScale }[] = [];

vi.mock('react-chartjs-2', () => ({
  Chart: ({ type, options }: { type?: string; options?: { scales?: { x?: ChartScale } } }) => {
    renderedCharts.push({ type, x: options?.scales?.x });
    return <div data-testid={type === 'line' ? 'line-chart' : 'candle-chart'} />;
  },
}));

const DAY = 86_400_000;

function snapshot(now: number): EquitySnapshot {
  return {
    symbol: 'AAPL',
    price: 110,
    previousClose: 105,
    marketCap: 5.16e12,
    asOf: now,
    intraday: [
      { t: Date.UTC(2026, 10, 11, 14, 35), o: 100, h: 101, l: 99, c: 100, v: 10 },
      { t: Date.UTC(2026, 10, 11, 20, 0), o: 100, h: 130, l: 100, c: 120, v: 10 },
    ],
    candles: [
      { t: now - 200 * DAY, o: 79, h: 82, l: 78, c: 80, v: 1_000_000 },
      { t: now - 10 * DAY, o: 99, h: 102, l: 98, c: 100, v: 2_000_000 },
      { t: now - 3 * DAY, o: 104, h: 106, l: 99, c: 105, v: 500_000 },
      { t: now - DAY, o: 109, h: 112, l: 108, c: 110, v: 3_000_000 },
    ],
  };
}

describe('Stocks', () => {
  beforeEach(() => {
    vi.useRealTimers();
    clearMarketMemory();
    localStorage.clear();
    renderedCharts.length = 0;
    vi.unstubAllGlobals();
  });

  it('shows a cached candlestick series and slices it when the range changes', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const cached = snapshot(Date.now());
    writeCache(equityCacheKey('AAPL'), cached);

    render(
      <MemoryRouter>
        <DesktopProvider initialOpen="stocks">
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
    expect(
      [...screen.getByRole('group', { name: 'Chart range' }).querySelectorAll('button')].map(
        (button) => button.textContent,
      ),
    ).toEqual(['1D', '1W', '1M', '3M', '1Y', '5Y']);
    expect(screen.getByRole('button', { name: '1Y', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Candles', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Line', pressed: false })).toBeInTheDocument();
    const rangeStats = screen.getByRole('group', { name: 'Selected range' });
    const chartStyle = screen.getByRole('group', { name: 'Chart style' });
    expect(rangeStats.compareDocumentPosition(chartStyle) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(chartStyle).toHaveClass('border-2');
    expect(chartStyle.parentElement).toHaveClass('gap-5');
    expect(rangeStats).not.toContainElement(chartStyle);
    expect(rangeStats).toHaveTextContent('37.50%');
    expect(rangeStats).toHaveTextContent('High');
    expect(screen.getByTestId('candle-chart')).toBeInTheDocument();
    const shown = equityCandles(cached.candles, cached.intraday, '1Y');
    const last = shown[shown.length - 1];
    const beforeLast = shown[shown.length - 2];
    expect(renderedCharts[renderedCharts.length - 1]?.x).toMatchObject({
      min: shown[0].t - (shown[1].t - shown[0].t) / 2,
      max: last.t + (last.t - beforeLast.t) / 2,
      offset: false,
      bounds: 'data',
    });
    expect(screen.getByRole('complementary', { name: 'Market stats' })).toHaveTextContent(
      'Market cap',
    );
    expect(screen.getByRole('complementary', { name: 'Market stats' })).toHaveTextContent('5.2t');
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

    await userEvent.click(screen.getByRole('button', { name: 'Line' }));
    expect(screen.getByRole('button', { name: 'Line', pressed: true })).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('candle-chart')).not.toBeInTheDocument();
    expect(renderedCharts[renderedCharts.length - 1]?.x).toMatchObject({
      min: shown[0].t - (shown[1].t - shown[0].t) / 2,
      max: last.t + (last.t - beforeLast.t) / 2,
      offset: false,
      bounds: 'data',
    });
    expect(screen.getByRole('group', { name: 'Selected range' })).toHaveTextContent('37.50%');

    await userEvent.click(screen.getByRole('button', { name: '1D' }));
    expect(screen.getByRole('button', { name: '1D', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Selected range' })).toHaveTextContent('20.00%');
    expect(screen.getByRole('group', { name: 'Selected range' })).toHaveTextContent('High $130.00');
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '1M' }));

    expect(screen.getByRole('button', { name: '1M', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Selected range' })).toHaveTextContent('10.00%');

    await userEvent.click(screen.getByRole('button', { name: '1W' }));

    expect(screen.getByRole('button', { name: '1W', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Candles', pressed: false })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Selected range' })).toHaveTextContent('4.76%');
    expect(screen.getByRole('group', { name: 'Selected range' })).toHaveTextContent('High $112.00');
    expect(screen.getByRole('group', { name: 'Selected range' })).toHaveTextContent('Low $99.00');
    expect(fetchSpy).not.toHaveBeenCalled();

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

  it('refreshes the open symbol five times and then stops', async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.fn((input: RequestInfo) => {
      const symbol = new URL(String(input)).searchParams.get('symbol') ?? 'AAPL';
      return Promise.resolve(
        Response.json({
          symbol,
          price: 111,
          previousClose: 105,
          candles: [
            { t: 1, o: 1, h: 2, l: 1, c: 1, v: 1 },
            { t: 2, o: 1, h: 2, l: 1, c: 111, v: 1 },
          ],
        }),
      );
    });
    vi.stubGlobal('fetch', fetchSpy);
    writeCache(equityCacheKey('AAPL'), snapshot(Date.now()));

    render(
      <MemoryRouter>
        <DesktopProvider initialOpen="stocks">
          <Stocks />
        </DesktopProvider>
      </MemoryRouter>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(14_999);
    });
    expect(fetchSpy).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1 + 30_000 * 4);
    });
    expect(fetchSpy).toHaveBeenCalledTimes(5);
    expect(String(fetchSpy.mock.calls[0][0])).toContain('symbol=AAPL');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(fetchSpy).toHaveBeenCalledTimes(5);
  });
});
