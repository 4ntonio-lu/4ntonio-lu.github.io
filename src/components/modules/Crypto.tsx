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
import { useEffect, useState, JSX } from 'react';
import { Line } from 'react-chartjs-2';
import WindowBox from '../elements/WindowBox';
import { img } from '../../assets/images/img';
import 'react-tabs/style/react-tabs.css';
import { createCryptoRefreshSchedule } from '../../market/backoff';
import { readCache, writeCache } from '../../market/cache';
import { crosshairPlugin, win95Font, win95Tooltip } from '../../market/chartChrome';
import {
  CRYPTO_HISTORY_CACHE,
  CRYPTO_HISTORY_TTL_MS,
  CRYPTO_IDS,
  CRYPTO_QUOTE_CACHE,
  CRYPTO_QUOTE_TTL_MS,
  fetchCryptoHistory,
  fetchCryptoQuotes,
} from '../../market/coingecko';
import {
  formatAxisDate,
  formatClock,
  formatMarketCap,
  formatSignedPercent,
  formatTooltipDate,
  formatUsd,
} from '../../market/format';
import {
  LINE_RANGES,
  percentChange,
  rangeDays,
  seriesBounds,
  sliceByDays,
} from '../../market/series';
import type { LineRangeId } from '../../market/series';
import type { LinePoint, Quote, QuoteBook } from '../../market/types';
import RangeButtons from '../market/RangeButtons';
import RefreshStatus from '../market/RefreshStatus';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

function chartOptions(points: LinePoint[]): ChartOptions<'line'> {
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
            return point ? formatTooltipDate(point.t) : '';
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
  return {
    labels: points.map((point) => formatAxisDate(point.t, days)),
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
    <p className={`m-0 flex items-center text-xl ${up ? 'text-green-700' : 'text-red-700'}`}>
      {up ? '▲' : '▼'} {Math.abs(value).toFixed(2)}%
      <span className="ml-1 text-base text-[#272727]">{caption}</span>
    </p>
  );
}

function CryptoPrices(): JSX.Element {
  const [quotes, setQuotes] = useState<Record<string, Quote> | null>(null);
  const [history, setHistory] = useState<Record<string, LinePoint[]> | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const [chartError, setChartError] = useState(false);
  const [range, setRange] = useState<LineRangeId>('1Y');

  useEffect(() => {
    let active = true;

    const refreshPrices = () => {
      setRefreshing(true);
      void fetchCryptoQuotes(CRYPTO_IDS)
        .then((next) => {
          if (!active) return;
          const at = Date.now();
          setQuotes(next);
          setUpdatedAt(at);
          setRefreshError(false);
          writeCache(CRYPTO_QUOTE_CACHE, { quotes: next, updatedAt: at } satisfies QuoteBook);
        })
        .catch((error: unknown) => {
          console.error('Error fetching CoinGecko data:', error);
          if (!active) return;
          setRefreshError(true);
        })
        .finally(() => {
          if (active) setRefreshing(false);
        });
    };

    try {
      localStorage.removeItem('cryptoData');
    } catch {
      // Ignore private-mode storage.
    }

    const cachedQuotes = readCache<QuoteBook>(CRYPTO_QUOTE_CACHE, CRYPTO_QUOTE_TTL_MS);
    if (cachedQuotes) {
      setQuotes(cachedQuotes.quotes);
      setUpdatedAt(cachedQuotes.updatedAt);
    } else {
      refreshPrices();
    }

    const cachedHistory = readCache<Record<string, LinePoint[]>>(
      CRYPTO_HISTORY_CACHE,
      CRYPTO_HISTORY_TTL_MS,
    );
    if (cachedHistory) {
      setHistory(cachedHistory);
    } else {
      void fetchCryptoHistory(CRYPTO_IDS)
        .then((next) => {
          if (!active) return;
          setHistory(next);
          setChartError(false);
          writeCache(CRYPTO_HISTORY_CACHE, next);
        })
        .catch((error: unknown) => {
          console.error('Error fetching CoinGecko data:', error);
          if (!active) return;
          setChartError(true);
        });
    }

    const stop = createCryptoRefreshSchedule(refreshPrices);
    return () => {
      active = false;
      stop();
    };
  }, []);

  const days = rangeDays(range);

  return (
    <WindowBox
      name="Cryptocurrencies"
      width={0.64}
      content={
        <div className="m-1 p-1 sm:m-3">
          {!quotes ? (
            <div role="status" className="px-6 py-10 text-center text-xl text-[#272727]">
              {refreshError ? "Couldn't load prices. The next try is automatic." : 'Loading...'}
            </div>
          ) : (
            <Tabs>
              <TabList>
                {Object.entries(quotes).map(([id, info]) => (
                  <Tab key={id}>{info.name}</Tab>
                ))}
              </TabList>
              <div className="tab-panels">
                {Object.entries(quotes).map(([id, data]) => {
                  const points = sliceByDays(history?.[id] ?? [], days);
                  const rangeMove =
                    points.length >= 2
                      ? percentChange(points[0].price, points[points.length - 1].price)
                      : null;
                  const bounds = seriesBounds(points.map((point) => point.price));
                  return (
                    <TabPanel key={id}>
                      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                        {data.image && <img src={data.image} alt="" className="h-10 w-10" />}
                        <h1 className="m-0 text-2xl">{data.name}</h1>
                        <p className="m-0 text-2xl">${formatUsd(data.price)}</p>
                        <ChangeText value={data.changePct24h} caption="24h" />
                        {typeof data.marketCap === 'number' && (
                          <p className="m-0 text-lg font-semibold text-[#272727] sm:ml-auto">
                            Market Cap: {formatMarketCap(data.marketCap)}
                          </p>
                        )}
                      </div>
                      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                        <RangeButtons
                          ranges={LINE_RANGES}
                          value={range}
                          onChange={(id) => setRange(id as LineRangeId)}
                        />
                        {rangeMove != null && <ChangeText value={rangeMove} caption="this range" />}
                        {bounds && (
                          <p className="m-0 text-sm text-[#272727]">
                            High ${formatUsd(bounds.high)} · Low ${formatUsd(bounds.low)}
                          </p>
                        )}
                      </div>
                      {points.length >= 2 ? (
                        <>
                          <p className="sr-only">
                            {data.name} is {formatSignedPercent(rangeMove ?? 0)} over {range}, from
                            ${formatUsd(points[0].price)} to $
                            {formatUsd(points[points.length - 1].price)}. The crosshair reads each
                            close from {formatTooltipDate(points[0].t)} through{' '}
                            {formatTooltipDate(points[points.length - 1].t)}.
                            {updatedAt ? ` Last price update ${formatClock(updatedAt)}.` : ''}
                          </p>
                          <div className="border-2 border-b-[#ffffff] border-l-[#808080] border-r-[#ffffff] border-t-[#808080] bg-[#c3c3c3] p-1">
                            <Line
                              data={chartData(points, days)}
                              options={chartOptions(points)}
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
                    </TabPanel>
                  );
                })}
              </div>
            </Tabs>
          )}
          {quotes && (
            <>
              <RefreshStatus refreshing={refreshing} updatedAt={updatedAt} error={refreshError} />
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#272727]">
                <span className="text-[0.8rem] font-semibold">Powered by</span>
                <a
                  href="https://www.coingecko.com/en/api"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={img.coingecko} alt="CoinGecko" className="relative top-[3px] h-5" />
                </a>
              </div>
            </>
          )}
        </div>
      }
    />
  );
}

export default CryptoPrices;
