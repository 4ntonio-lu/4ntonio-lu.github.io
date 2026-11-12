export type Quote = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  changePct24h: number;
  marketCap?: number;
  image?: string;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
  change24h?: number;
  changePct7d?: number;
  changePct30d?: number;
  changePct1y?: number;
  circulatingSupply?: number;
  ath?: number;
  atl?: number;
  marketCapRank?: number;
  asOf: number;
};

export type LinePoint = {
  t: number;
  price: number;
};

export type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type QuoteBook = {
  quotes: Record<string, Quote>;
  updatedAt: number;
};
