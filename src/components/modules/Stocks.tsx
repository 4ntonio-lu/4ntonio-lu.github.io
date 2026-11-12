import {
  Chart as ChartJS,
  LinearScale,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { CandlestickController, CandlestickElement } from 'chartjs-chart-financial';
import { useEffect, useState, JSX } from 'react';
import { Chart } from 'react-chartjs-2';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import WindowBox from '../elements/WindowBox';
import { img } from '../../assets/images/img';
import { crosshairPlugin, win95Font, win95Tooltip } from '../../market/chartChrome';
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
  equityRangeDays,
  percentChange,
  sliceByDays,
  type EquityRangeId,
} from '../../market/series';
import { equityStatRows } from '../../market/stats';
import type { Candle } from '../../market/types';
import RangeButtons from '../market/RangeButtons';
import RangeSummary from '../market/RangeSummary';
import RefreshStatus from '../market/RefreshStatus';
import StatsPanel from '../market/StatsPanel';

ChartJS.register(CandlestickController, CandlestickElement, LinearScale, Tooltip);

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
            return candle ? formatTooltipDate(candle.t) : '';
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
      x: {
        type: 'linear',
        offset: true,
        grid: { color: '#b5b5b5' },
        ticks: {
          maxTicksLimit: 6,
          color: '#272727',
          font: { family: win95Font, size: 12 },
          callback: (value) => (typeof value === 'number' ? formatAxisDate(value, days) : ''),
        },
      },
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
  const [snapshots, setSnapshots] = useState<Record<string, EquitySnapshot>>({});
  const [loadingSymbol, setLoadingSymbol] = useState<string | null>(null);
  const [failedSymbol, setFailedSymbol] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(true);

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

  const equity = EQUITIES.find((item) => item.symbol === symbol) ?? EQUITIES[0];
  const snapshot = snapshots[symbol];
  const days = equityRangeDays(range);
  const candles = snapshot ? sliceByDays(snapshot.candles, days, 1) : [];
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
                        <RangeSummary change={rangeMove} high={high} low={low} />
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
                                {formatSignedPercent(rangeMove ?? 0)} over {range}. The candlesticks
                                run from {formatTooltipDate(candles[0].t)} through{' '}
                                {formatTooltipDate(candles[candles.length - 1].t)}.
                                {snapshot.asOf ? ` Saved ${formatClock(snapshot.asOf)}.` : ''}
                              </p>
                              <div className="border-2 border-b-[#ffffff] border-l-[#808080] border-r-[#ffffff] border-t-[#808080] bg-[#c3c3c3] p-1">
                                <Chart
                                  type="candlestick"
                                  data={candleChartData(candles)}
                                  options={candleChartOptions(candles, days)}
                                  plugins={[crosshairPlugin]}
                                />
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
                        refreshing={loading}
                        updatedAt={snapshot?.asOf ?? null}
                        error={failed}
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
