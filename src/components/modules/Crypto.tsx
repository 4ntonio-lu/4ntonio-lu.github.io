import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { TabList, TabPanel, Tabs, Tab } from 'react-tabs';
import { useEffect, useRef, useState, JSX } from 'react';
import { Line } from 'react-chartjs-2';
import WindowBox from '../elements/WindowBox';
import { img } from '../../assets/images/img';
import 'react-tabs/style/react-tabs.css';
import { createCryptoRefreshSchedule } from '../../market/backoff';
import { waitForMinimumLoad } from '../../market/loading';
import { readCache, writeCache } from '../../market/cache';
import { crosshairPlugin, win95Font, win95Tooltip } from '../../market/chartChrome';
import {
  CRYPTO_HISTORY_TTL_MS,
  CRYPTO_IDS,
  CRYPTO_NAMES,
  CRYPTO_QUOTE_TTL_MS,
  cryptoHistoryCacheKey,
  cryptoQuoteCacheKey,
  fetchCryptoHistory,
  fetchCryptoQuotes,
} from '../../market/coingecko';
import {
  formatAxisDate,
  formatClock,
  formatSignedPercent,
  formatTooltipDate,
  formatUsd,
} from '../../market/format';
import {
  LINE_RANGES,
  chartSeriesCacheable,
  lineChartQueryDays,
  percentChange,
  rangeDays,
  seriesBounds,
  sliceByDays,
} from '../../market/series';
import type { LineRangeId } from '../../market/series';
import { cryptoStatRows } from '../../market/stats';
import type { LinePoint, Quote } from '../../market/types';
import RangeButtons from '../market/RangeButtons';
import RangeSummary from '../market/RangeSummary';
import RefreshStatus from '../market/RefreshStatus';
import StatsPanel from '../market/StatsPanel';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

function chartOptions(points: LinePoint[], days: number): ChartOptions<'line'> {
  return {
    responsive: true,
    aspectRatio: 2.15,
    animation: { duration: 180 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...win95Tooltip,
        intersect: false,
        mode: 'index',
        callbacks: {
          title(items) {
            const point = points[items[0]?.dataIndex ?? -1];
            return point ? formatTooltipDate(point.t, undefined, days <= 1) : '';
          },
          label(item) {
            const index = item.dataIndex;
            const price = points[index]?.price;
            if (price == null) return '';
            const lines = [`$${formatUsd(price)}`];
            const prior = points[index - 1]?.price;
            if (prior != null) {
              const day = percentChange(prior, price);
              if (day != null) lines.push(`${formatSignedPercent(day)} vs prior close`);
            }
            const start = points[0]?.price;
            if (start != null && index > 0) {
              const fromStart = percentChange(start, price);
              if (fromStart != null)
                lines.push(`${formatSignedPercent(fromStart)} from range start`);
            }
            return lines;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#b5b5b5' },
        ticks: {
          maxTicksLimit: 6,
          color: '#272727',
          font: { family: win95Font, size: 12 },
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

function chartData(points: LinePoint[], days: number): ChartData<'line'> {
  const detail = days <= 1 ? 'time' : 'auto';
  return {
    labels: points.map((point) => formatAxisDate(point.t, days, undefined, detail)),
    datasets: [
      {
        data: points.map((point) => point.price),
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

function CryptoPrices(): JSX.Element {
  const [coinId, setCoinId] = useState<(typeof CRYPTO_IDS)[number]>(CRYPTO_IDS[0]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [history, setHistory] = useState<Record<string, LinePoint[]>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const [chartErrorKey, setChartErrorKey] = useState<string | null>(null);
  const [range, setRange] = useState<LineRangeId>('1Y');
  const [showStats, setShowStats] = useState(true);
  const coinRef = useRef(coinId);
  coinRef.current = coinId;

  useEffect(() => {
    try {
      localStorage.removeItem('cryptoData');
    } catch {
      // Ignore private-mode storage.
    }

    let active = true;
    const stop = createCryptoRefreshSchedule(() => {
      const id = coinRef.current;
      const started = Date.now();
      setRefreshing(true);
      void fetchCryptoQuotes([id])
        .then((next) => {
          const quote = next[id];
          if (!quote) throw new Error('No market data');
          writeCache(cryptoQuoteCacheKey(id), quote);
          if (!active) return;
          setQuotes((current) => ({ ...current, [id]: quote }));
          if (coinRef.current === id) setRefreshError(false);
        })
        .catch((error: unknown) => {
          console.error('Error fetching CoinGecko data:', error);
          if (!active || coinRef.current !== id) return;
          setRefreshError(true);
        })
        .finally(() => {
          void waitForMinimumLoad(started).then(() => {
            if (active) setRefreshing(false);
          });
        });
    });
    return () => {
      active = false;
      stop();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const id = coinId;
    const cachedQuote = readCache<Quote>(cryptoQuoteCacheKey(id), CRYPTO_QUOTE_TTL_MS);
    if (cachedQuote) setQuotes((current) => ({ ...current, [id]: cachedQuote }));

    if (!cachedQuote) {
      const started = Date.now();
      setLoadingId(id);
      setFailedId((current) => (current === id ? null : current));
      void fetchCryptoQuotes([id])
        .then((next) => {
          const quote = next[id];
          if (!quote) throw new Error('No market data');
          writeCache(cryptoQuoteCacheKey(id), quote);
          if (!active) return;
          setQuotes((current) => ({ ...current, [id]: quote }));
          setRefreshError(false);
        })
        .catch((error: unknown) => {
          console.error('Error fetching CoinGecko data:', error);
          if (!active) return;
          setFailedId(id);
        })
        .finally(() => {
          void waitForMinimumLoad(started).then(() => {
            if (active) setLoadingId((current) => (current === id ? null : current));
          });
        });
    } else {
      setLoadingId((current) => (current === id ? null : current));
    }

    return () => {
      active = false;
    };
  }, [coinId]);

  useEffect(() => {
    let active = true;
    const id = coinId;
    const queryDays = lineChartQueryDays(range);
    const numericDays = rangeDays(range);
    const key = `${id}:${queryDays}`;
    const cached = readCache<LinePoint[]>(
      cryptoHistoryCacheKey(id, queryDays),
      CRYPTO_HISTORY_TTL_MS,
    );
    if (cached) {
      setHistory((current) => ({ ...current, [key]: cached }));
      setChartErrorKey((current) => (current === key ? null : current));
      return () => {
        active = false;
      };
    }

    setChartErrorKey((current) => (current === key ? null : current));
    void fetchCryptoHistory([id], queryDays)
      .then((next) => {
        const series = next[id];
        if (!series) throw new Error('No market data');
        if (!active) return;
        if (chartSeriesCacheable(series, numericDays)) {
          writeCache(cryptoHistoryCacheKey(id, queryDays), series);
        }
        setHistory((current) => ({ ...current, [key]: series }));
        setChartErrorKey((current) => (current === key ? null : current));
      })
      .catch((error: unknown) => {
        console.error('Error fetching CoinGecko data:', error);
        if (!active) return;
        setChartErrorKey(key);
      });

    return () => {
      active = false;
    };
  }, [coinId, range]);

  const days = rangeDays(range);
  const quote = quotes[coinId];
  const historyKey = `${coinId}:${lineChartQueryDays(range)}`;
  const failedChart = chartErrorKey === historyKey;
  const points = failedChart ? [] : sliceByDays(history[historyKey] ?? [], days);
  const loading = loadingId === coinId && !quote;
  const failed = failedId === coinId && !quote;
  const chartError = failedChart && quote != null;

  return (
    <WindowBox
      name="Cryptocurrencies"
      width={0.82}
      content={
        <div className="m-1 p-1 sm:m-3">
          <Tabs
            selectedIndex={Math.max(
              0,
              CRYPTO_IDS.findIndex((id) => id === coinId),
            )}
            onSelect={(index) => setCoinId(CRYPTO_IDS[index])}
          >
            <TabList>
              {CRYPTO_IDS.map((id) => (
                <Tab key={id}>{quotes[id]?.name ?? CRYPTO_NAMES[id]}</Tab>
              ))}
            </TabList>
            <div className="tab-panels">
              {CRYPTO_IDS.map((id) => {
                const open = quotes[id];
                const series = id === coinId ? points : [];
                const rangeMove =
                  series.length >= 2
                    ? percentChange(series[0].price, series[series.length - 1].price)
                    : null;
                const bounds = seriesBounds(series.map((point) => point.price));
                return (
                  <TabPanel key={id}>
                    {id === coinId && (
                      <div className="min-w-0">
                        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                          {open?.image && <img src={open.image} alt="" className="h-7 w-7" />}
                          <h1 className="m-0 text-lg leading-none">
                            {open?.name ?? CRYPTO_NAMES[id]}
                          </h1>
                          {open && (
                            <p className="m-0 text-lg leading-none">${formatUsd(open.price)}</p>
                          )}
                          {open && <ChangeText value={open.changePct24h} caption="24h" />}
                        </div>
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <RangeButtons
                            ranges={LINE_RANGES}
                            value={range}
                            onChange={(next) => setRange(next as LineRangeId)}
                          />
                          <RangeSummary
                            change={rangeMove}
                            high={bounds?.high ?? null}
                            low={bounds?.low ?? null}
                          />
                          <button
                            type="button"
                            className="button-shadow px-2 py-0.5 text-sm sm:ml-auto"
                            aria-pressed={showStats}
                            onClick={() => setShowStats((shown) => !shown)}
                          >
                            {showStats ? 'Hide stats' : 'Show stats'}
                          </button>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                          <div className="min-w-0 flex-1">
                            {series.length >= 2 && open ? (
                              <>
                                <p className="sr-only">
                                  {open.name} is {formatSignedPercent(rangeMove ?? 0)} over {range},
                                  from ${formatUsd(series[0].price)} to $
                                  {formatUsd(series[series.length - 1].price)}. The crosshair reads
                                  each close from {formatTooltipDate(series[0].t)} through{' '}
                                  {formatTooltipDate(series[series.length - 1].t)}.
                                  {open.asOf ? ` Last price update ${formatClock(open.asOf)}.` : ''}
                                </p>
                                <div className="border-2 border-b-[#ffffff] border-l-[#808080] border-r-[#ffffff] border-t-[#808080] bg-[#c3c3c3] p-1">
                                  <Line
                                    data={chartData(series, days)}
                                    options={chartOptions(series, days)}
                                    plugins={[crosshairPlugin]}
                                  />
                                </div>
                              </>
                            ) : (
                              <p className="border-2 border-b-[#ffffff] border-l-[#808080] border-r-[#ffffff] border-t-[#808080] px-3 py-8 text-center text-[#272727]">
                                {chartError
                                  ? "Couldn't load the chart. Prices above are still updating."
                                  : 'Loading chart…'}
                              </p>
                            )}
                          </div>
                          {showStats && open && <StatsPanel rows={cryptoStatRows(open)} />}
                        </div>
                        <RefreshStatus
                          refreshing={loading || refreshing}
                          updatedAt={open?.asOf ?? null}
                          error={failed || refreshError}
                          errorText={`Couldn't load ${CRYPTO_NAMES[id]}.`}
                        />
                      </div>
                    )}
                  </TabPanel>
                );
              })}
            </div>
          </Tabs>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#272727]">
            <span className="text-[0.8rem] font-semibold">Powered by</span>
            <a href="https://www.coingecko.com/en/api" target="_blank" rel="noopener noreferrer">
              <img src={img.coingecko} alt="CoinGecko" className="relative top-[3px] h-5" />
            </a>
          </div>
        </div>
      }
    />
  );
}

export default CryptoPrices;
