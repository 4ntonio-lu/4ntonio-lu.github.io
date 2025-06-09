import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, ChartData } from 'chart.js';
import { TabList, TabPanel, Tabs, Tab } from "react-tabs";
import { useState, useEffect, JSX } from 'react';
import { Line } from 'react-chartjs-2';
import WindowBox from "../elements/WindowBox";
import { img } from '../../assets/images/img';
import 'react-tabs/style/react-tabs.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip);

const cryptoIds = ['bitcoin', 'ethereum', 'solana', 'ripple', 'dogecoin'];

interface CoinData {
    changePercentage24h: number;
    displayName: string;
    marketCap: number;
    image: string;
    price: number;
}

type PriceMap = Record<string, CoinData>;
type ChartMap = Record<string, ChartData<'line'>>;

function CryptoPrices(): JSX.Element {
    const [prices, setPrices] = useState<PriceMap>({});
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState<ChartMap>({});
    const [retrievalTime, setRetrievalTime] = useState<string | null>(null);

    useEffect(() => {
        let attempt = 1;
        let timeoutId: ReturnType<typeof setTimeout>;

        const scheduleNextFetch = () => {
            const minutes = Math.min(0.5 * Math.pow(attempt++, 2), 240);
            timeoutId = setTimeout(() => {
                fetchPrices();
                attempt += 1;
                scheduleNextFetch();
            }, minutes * 60 * 1000);
        };

        const cachedData = localStorage.getItem('cryptoData');
        if (cachedData) {
            const parsed = JSON.parse(cachedData) as {
                chartData: ChartMap;
                prices: PriceMap;
                retrievalTime: string;
            };
            if (Date.now() - new Date(parsed.retrievalTime).getTime() <= 2 * 60 * 1000) {
                setChartData(parsed.chartData);
                setPrices(parsed.prices);
                setRetrievalTime(parsed.retrievalTime);
                setLoading(false);
            } else {
                fetchPrices();
            }
        } else {
            fetchPrices();
        }

        scheduleNextFetch();
        return () => clearTimeout(timeoutId);
    }, []);


    const fetchPrices = async () => {
        try {
            setLoading(true);
            const detailedPrices: PriceMap = {};
            for (const id of cryptoIds) {
                const response = await fetch(`https://cloudflare-worker.4ntonio-lu.workers.dev?id=${encodeURIComponent(id)}&type=info`);
                if (!response.ok) {
                    throw new Error(`Error fetching CoinGecko info data: ${response.status}-${response.statusText}`);
                }
                const data = await response.json();
                detailedPrices[id] = {
                    image: data.image.large,
                    price: data.market_data.current_price.usd,
                    marketCap: data.market_data.market_cap.usd,
                    changePercentage24h: data.market_data.price_change_percentage_24h,
                    displayName: data.name
                };
            }
            setPrices(detailedPrices);
            const historicalData: ChartMap = {};
            for (const id of cryptoIds) {
                const response = await fetch(`https://cloudflare-worker.4ntonio-lu.workers.dev?id=${encodeURIComponent(id)}&type=chart`);
                if (!response.ok) {
                    throw new Error(`Error fetching CoinGecko chart data: ${response.status}-${response.statusText}`);
                }
                const data = await response.json();
                historicalData[id] = {
                    labels: data.prices.map(([timestamp]: [number, number]) =>
                        new Date(timestamp).toLocaleDateString()
                    ),
                    datasets: [{
                        data: data.prices.map(([_, price]: [number, number]) => price),
                        borderColor: 'red',
                        borderWidth: 2,
                        fill: false
                    }]
                };
            }
            const currentTime = new Date().toLocaleString();
            localStorage.setItem('cryptoData', JSON.stringify({
                chartData: historicalData,
                prices: detailedPrices,
                retrievalTime: currentTime,
            }));
            setChartData(historicalData);
            setRetrievalTime(currentTime);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching CoinGecko data:', error);
            setLoading(false);
        }
    };

    const formatMarketCap = (marketCap: number): string => {
        if (marketCap >= 1e9) return `${(marketCap / 1e9).toFixed(1)}b`;
        if (marketCap >= 1e6) return `${(marketCap / 1e6).toFixed(1)}m`;
        return marketCap.toFixed(2);
    };

    return (
        <>
            {loading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="bg-[#aaaaaa] border-2 border-black shadow-[3px_3px_0_0_black] text-xl select-none w-60 py-4 text-center">
                        Loading...
                    </div>
                </div>
            )}

            <WindowBox name="Cryptocurrencies" width={0.6} content={
                <div className="p-1 m-1 sm:m-3">
                    <Tabs>
                        <TabList>
                            {Object.entries(prices).map(([id, info]) => (
                                <Tab key={id}>{info.displayName}</Tab>
                            ))}
                        </TabList>
                        <div className="tab-panels">
                            {Object.entries(prices).map(([id, data]) => {
                                const isPositive = data.changePercentage24h >= 0;
                                return (
                                    <TabPanel key={id}>
                                        <div className="flex items-center gap-4 mb-4 flex-wrap sm:flex-nowrap">
                                            <img src={data.image} alt={id} className="w-10 h-10" />
                                            <h1 className="m-0 max-md:text-2xl">{id.toUpperCase()}</h1>
                                            <h1 className="m-0 max-md:text-2xl">${data.price.toFixed(2)}</h1>
                                            <h2 className={`flex items-center max-md:text-xl ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                                {isPositive ? '▲' : '▼'} {Math.abs(data.changePercentage24h).toFixed(2)}%
                                            </h2>
                                            <br className="block md:hidden" />
                                            <span className="text-gray-500 font-semibold ml-auto text-lg">
                                                Market Cap: {formatMarketCap(data.marketCap)}
                                            </span>
                                            <span className="text-gray-500 font-semibold ml-4 text-lg">
                                                Last Updated: {new Date(retrievalTime!).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        {chartData[id] && (
                                            <Line data={chartData[id]} options={{
                                                plugins: {
                                                    tooltip: {
                                                        intersect: false,
                                                        callbacks: { label: (tooltipItem) => `$${(tooltipItem.raw as number).toFixed(2)}` },
                                                        displayColors: false,
                                                    },
                                                },
                                                responsive: true,
                                                scales: {
                                                    x: { grid: { display: false } },
                                                    y: { grid: { display: false }, ticks: { display: true } },
                                                },
                                                elements: {
                                                    point: { radius: 0 },
                                                }
                                            }}
                                            />
                                        )}
                                        <div className="flex justify-center items-center space-x-2 mt-6 text-xs text-gray-600">
                                            <span className="text-[0.8rem] font-semibold text-gray-600">Powered by</span>
                                            <a href="https://www.coingecko.com/en/api" target="_blank" rel="noopener noreferrer">
                                                <img src={img.coingecko} alt="CoinGecko" className="h-5 relative top-[3px]" />
                                            </a>
                                        </div>
                                    </TabPanel>
                                );
                            })}
                        </div>
                    </Tabs>
                </div>
            }/>
        </>
    );
}

export default CryptoPrices;