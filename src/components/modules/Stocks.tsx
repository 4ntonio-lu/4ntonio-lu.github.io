import {
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { CandlestickController, CandlestickElement } from 'chartjs-chart-financial';
import { useEffect, useRef, useState, JSX } from 'react';
import { Chart } from 'react-chartjs-2';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import WindowBox from '../elements/WindowBox';
import { img } from '../../assets/images/img';
import { crosshairPlugin, win95Font, win95Tooltip } from '../../market/chartChrome';
import { createEquityRefreshSchedule } from '../../market/backoff';
import { readCache, writeCache } from '../../market/cache';
import {
  EQUITIES,
  EQUITY_TTL_MS,
  equityCacheKey,
  fetchEquity,
  type EquitySnapshot,
  type EquitySymbol,
} from '../../market/equities';
import {
  formatAxisDate,
  formatClock,
  formatSignedPercent,
  formatTooltipDate,
  formatUsd,
  formatVolume,
} from '../../market/format';
import {
  EQUITY_RANGES,
  equityCandles,
  equityRangeDays,
  percentChange,
  type EquityRangeId,
} from '../../market/series';
import { equityStatRows } from '../../market/stats';
import type { Candle } from '../../market/types';
import RangeButtons from '../market/RangeButtons';
import RangeSummary from '../market/RangeSummary';
import RefreshStatus from '../market/RefreshStatus';
import StatsPanel from '../market/StatsPanel';

ChartJS.register(
  CandlestickController,
  CandlestickElement,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
);

type ChartStyle = 'candles' | 'line';

const candleColors = {
  up: '#0b5a0b',
  down: '#8b0000',
  unchanged: '#272727',
};

function candleChartData(candles: Candle[]): ChartData<'candlestick'> {
  return {
    datasets: [
      {
        data: candles.map((candle) => ({
          x: candle.t,
          o: candle.o,
          h: candle.h,
          l: candle.l,
          c: candle.c,
        })),
        borderColors: candleColors,
        backgroundColors: candleColors,
        borderWidth: 1,
        barPercentage: 1,
        categoryPercentage: 1,
        barThickness: 'flex',
      },
    ],
  };
}

function candleChartOptions(candles: Candle[], days: number): ChartOptions<'candlestick'> {
  return {
    responsive: true,
    aspectRatio: 2.15,
    animation: false,
    parsing: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...win95Tooltip,
        intersect: false,
        mode: 'index',
        callbacks: {
          title(items) {
            const candle = candles[items[0]?.dataIndex ?? -1];
            if (!candle) return '';
            return formatTooltipDate(candle.t, undefined, days <= 1);
          },
          label(item) {
            const candle = candles[item.dataIndex];
            if (!candle) return '';
            const lines = [
              `O ${formatUsd(candle.o)}  H ${formatUsd(candle.h)}`,
              `L ${formatUsd(candle.l)}  C ${formatUsd(candle.c)}`,
            ];
            const prior = candles[item.dataIndex - 1]?.c;
            if (prior != null) {
              const day = percentChange(prior, candle.c);
              if (day != null) lines.push(`${formatSignedPercent(day)} vs prior close`);
            }
            if (candle.v > 0) lines.push(`Vol ${formatVolume(candle.v)}`);
            return lines;
          },
        },
      },
    },
    scales: {
      x: timeScale(candles, days),
      y: {
        grid: { color: '#b5b5b5' },
        ticks: {
          color: '#272727',
          font: { family: win95Font, size: 12 },
          callback: (value) => (typeof value === 'number' ? `$${formatUsd(value)}` : String(value)),
        },
      },
    },
  };
}

function axisDetail(days: number): 'auto' | 'day' | 'time' {
  if (days <= 1) return 'time';
  if (days <= 120) return 'day';
  return 'auto';
}

/**
 * Domain for the horizontal scale. A linear axis otherwise rounds to nice
 * tick marks and then pads by the tick count, which leaves empty gutters
 * beside the series. Half the end gaps is the room one candle needs.
 */
function plotDomain(candles: Candle[]): { min: number; max: number } {
  const first = candles[0]?.t ?? 0;
  const last = candles[candles.length - 1]?.t ?? first;
  const leftGap = candles.length > 1 ? candles[1].t - first : 86_400_000;
  const rightGap = candles.length > 1 ? last - candles[candles.length - 2].t : 86_400_000;
  return {
    min: first - Math.max(leftGap, 1) / 2,
    max: last + Math.max(rightGap, 1) / 2,
  };
}

function timeScale(candles: Candle[], days: number) {
  const { min, max } = plotDomain(candles);
  return {
    type: 'linear' as const,
    min,
    max,
    offset: false,
    bounds: 'data' as const,
    grid: { color: '#b5b5b5' },
    ticks: {
      maxTicksLimit: 6,
      color: '#272727',
      font: { family: win95Font, size: 12 },
      callback: (value: string | number) =>
        typeof value === 'number' ? formatAxisDate(value, days, undefined, axisDetail(days)) : '',
    },
  };
}

function lineChartData(candles: Candle[]): ChartData<'line'> {
  return {
    datasets: [
      {
        data: candles.map((candle) => ({ x: candle.t, y: candle.c })),
        borderColor: '#000080',
        backgroundColor: 'rgba(0, 0, 128, 0.12)',
        borderWidth: 2,
        fill: true,
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 3,
        pointHoverBackgroundColor: '#000080',
      },
    ],
  };
}

function lineChartOptions(candles: Candle[], days: number): ChartOptions<'line'> {
  return {
    responsive: true,
    aspectRatio: 2.15,
    animation: { duration: 180 },
    parsing: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...win95Tooltip,
        intersect: false,
        mode: 'index',
        callbacks: {
          title(items) {
            const candle = candles[items[0]?.dataIndex ?? -1];
            return candle ? formatTooltipDate(candle.t, undefined, days <= 1) : '';
          },
          label(item) {
            const index = item.dataIndex;
            const close = candles[index]?.c;
            if (close == null) return '';
            const lines = [`$${formatUsd(close)}`];
            const prior = candles[index - 1]?.c;
            if (prior != null) {
              const day = percentChange(prior, close);
              if (day != null) lines.push(`${formatSignedPercent(day)} vs prior close`);
            }
            const start = candles[0]?.c;
            if (start != null && index > 0) {
              const fromStart = percentChange(start, close);
              if (fromStart != null)
                lines.push(`${formatSignedPercent(fromStart)} from range start`);
            }
            return lines;
          },
        },
      },
    },
    scales: {
      x: timeScale(candles, days),
      y: {
        grid: { color: '#b5b5b5' },
        ticks: {
          color: '#272727',
          font: { family: win95Font, size: 12 },
          callback: (value) => (typeof value === 'number' ? `$${formatUsd(value)}` : String(value)),
        },
      },
    },
  };
}

function ChangeText({ value, caption }: { value: number; caption: string }): JSX.Element {
  const up = value >= 0;
  return (
    <p
      className={`m-0 flex items-baseline gap-1 text-lg leading-none ${up ? 'text-green-700' : 'text-red-700'}`}
    >
      <span>
        {up ? '▲' : '▼'} {Math.abs(value).toFixed(2)}%
      </span>
      <span className="text-sm text-[#272727]">{caption}</span>
    </p>
  );
}

function Stocks(): JSX.Element {
  const [symbol, setSymbol] = useState<EquitySymbol>('AAPL');
  const [range, setRange] = useState<EquityRangeId>('1Y');
  const [chartStyle, setChartStyle] = useState<ChartStyle>('candles');
  const [snapshots, setSnapshots] = useState<Record<string, EquitySnapshot>>({});
  const [loadingSymbol, setLoadingSymbol] = useState<string | null>(null);
  const [failedSymbol, setFailedSymbol] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const symbolRef = useRef(symbol);
  symbolRef.current = symbol;

  useEffect(() => {
    let active = true;
    const cached = readCache<EquitySnapshot>(equityCacheKey(symbol), EQUITY_TTL_MS);
    if (cached) {
      setSnapshots((current) => ({ ...current, [symbol]: cached }));
      setLoadingSymbol(null);
      setFailedSymbol(null);
      return () => {
        active = false;
      };
    }

    setLoadingSymbol(symbol);
    setFailedSymbol(null);
    void fetchEquity(symbol)
      .then((snapshot) => {
        if (!active) return;
        writeCache(equityCacheKey(symbol), snapshot);
        setSnapshots((current) => ({ ...current, [symbol]: snapshot }));
        setFailedSymbol(null);
      })
      .catch((error: unknown) => {
        console.error('Error fetching equity data:', error);
        if (!active) return;
        setFailedSymbol(symbol);
      })
      .finally(() => {
        if (active) setLoadingSymbol((current) => (current === symbol ? null : current));
      });

    return () => {
      active = false;
    };
  }, [symbol]);

  useEffect(() => {
    let active = true;
    const stop = createEquityRefreshSchedule(() => {
      const target = symbolRef.current;
      setRefreshing(true);
      void fetchEquity(target)
        .then((snapshot) => {
          if (!active) return;
          writeCache(equityCacheKey(target), snapshot);
          setSnapshots((current) => ({ ...current, [target]: snapshot }));
          setRefreshError(false);
          setFailedSymbol((current) => (current === target ? null : current));
        })
        .catch((error: unknown) => {
          console.error('Error fetching equity data:', error);
          if (!active) return;
          setRefreshError(true);
        })
        .finally(() => {
          if (active) setRefreshing(false);
        });
    });
    return () => {
      active = false;
      stop();
    };
  }, []);

  const equity = EQUITIES.find((item) => item.symbol === symbol) ?? EQUITIES[0];
  const snapshot = snapshots[symbol];
  const days = equityRangeDays(range);
  const candles = snapshot ? equityCandles(snapshot.candles, snapshot.intraday, range) : [];
  const loading = loadingSymbol === symbol;
  const failed = failedSymbol === symbol && !snapshot;
  const dayMove = snapshot ? percentChange(snapshot.previousClose, snapshot.price) : null;
  const rangeMove =
    candles.length >= 2
      ? percentChange(candles[0].c, candles[candles.length - 1].c)
      : candles.length === 1
        ? percentChange(candles[0].o, candles[0].c)
        : null;
  const high = candles.length ? Math.max(...candles.map((candle) => candle.h)) : null;
  const low = candles.length ? Math.min(...candles.map((candle) => candle.l)) : null;

  return (
    <WindowBox
      name="Stocks"
      width={0.82}
      content={
        <div className="m-1 p-1 sm:m-3">
          <Tabs
            selectedIndex={Math.max(
              0,
              EQUITIES.findIndex((item) => item.symbol === symbol),
            )}
            onSelect={(index) => setSymbol(EQUITIES[index].symbol)}
          >
            <TabList>
              {EQUITIES.map((item) => (
                <Tab key={item.symbol}>{item.symbol}</Tab>
              ))}
            </TabList>
            <div className="tab-panels">
              {EQUITIES.map((item) => (
                <TabPanel key={item.symbol}>
                  {item.symbol === symbol && (
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h1 className="m-0 text-lg leading-none">{equity.name}</h1>
                        {snapshot && (
                          <p className="m-0 text-lg leading-none">${formatUsd(snapshot.price)}</p>
                        )}
                        {dayMove != null && <ChangeText value={dayMove} caption="day" />}
                      </div>
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <RangeButtons
                          ranges={EQUITY_RANGES}
                          value={range}
                          onChange={(id) => setRange(id as EquityRangeId)}
                        />
                        <div className="flex items-center gap-2">
                          <RangeSummary change={rangeMove} high={high} low={low} />
                          <div
                            className="flex gap-1 border-2 border-b-[#808080] border-l-[#ffffff] border-r-[#808080] border-t-[#ffffff] bg-[#c0c0c0] p-0.5"
                            role="group"
                            aria-label="Chart style"
                          >
                            <button
                              type="button"
                              className="button-shadow px-2 py-0.5 text-sm text-[#272727]"
                              aria-pressed={chartStyle === 'candles'}
                              onClick={() => setChartStyle('candles')}
                            >
                              Candles
                            </button>
                            <button
                              type="button"
                              className="button-shadow px-2 py-0.5 text-sm text-[#272727]"
                              aria-pressed={chartStyle === 'line'}
                              onClick={() => setChartStyle('line')}
                            >
                              Line
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="button-shadow px-2 py-0.5 text-sm sm:ml-auto"
                          aria-pressed={showStats}
                          onClick={() => setShowStats((open) => !open)}
                        >
                          {showStats ? 'Hide stats' : 'Show stats'}
                        </button>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        <div className="min-w-0 flex-1">
                          {candles.length >= 1 && snapshot ? (
                            <>
                              <p className="sr-only">
                                {equity.name} closed at ${formatUsd(snapshot.price)},{' '}
                                {formatSignedPercent(rangeMove ?? 0)} over {range}. The{' '}
                                {chartStyle === 'line' ? 'line' : 'candlesticks'} run from{' '}
                                {formatTooltipDate(candles[0].t)} through{' '}
                                {formatTooltipDate(candles[candles.length - 1].t)}.
                                {snapshot.asOf ? ` Saved ${formatClock(snapshot.asOf)}.` : ''}
                              </p>
                              <div className="border-2 border-b-[#ffffff] border-l-[#808080] border-r-[#ffffff] border-t-[#808080] bg-[#c3c3c3] p-1">
                                {chartStyle === 'line' ? (
                                  <Chart
                                    type="line"
                                    data={lineChartData(candles)}
                                    options={lineChartOptions(candles, days)}
                                    plugins={[crosshairPlugin]}
                                  />
                                ) : (
                                  <Chart
                                    type="candlestick"
                                    data={candleChartData(candles)}
                                    options={candleChartOptions(candles, days)}
                                    plugins={[crosshairPlugin]}
                                  />
                                )}
                              </div>
                            </>
                          ) : (
                            <p className="border-2 border-b-[#ffffff] border-l-[#808080] border-r-[#ffffff] border-t-[#808080] px-3 py-8 text-center text-[#272727]">
                              {failed
                                ? `Couldn't load ${equity.name}. The quote service didn't answer.`
                                : 'Loading chart…'}
                            </p>
                          )}
                        </div>
                        {showStats && snapshot && <StatsPanel rows={equityStatRows(snapshot)} />}
                      </div>
                      <RefreshStatus
                        refreshing={loading || refreshing}
                        updatedAt={snapshot?.asOf ?? null}
                        error={failed || refreshError}
                        errorText={`Couldn't load ${equity.name}.`}
                      />
                    </div>
                  )}
                </TabPanel>
              ))}
            </div>
          </Tabs>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#272727]">
            <span className="text-[0.8rem] font-semibold">Powered by</span>
            <a
              href={`https://finance.yahoo.com/quote/${equity.symbol}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src={img.yahoo} alt="Yahoo Finance" className="relative top-[3px] h-5" />
            </a>
          </div>
        </div>
      }
    />
  );
}

export default Stocks;
