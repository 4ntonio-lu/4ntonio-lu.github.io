export type Quote = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  changePct24h: number;
  marketCap?: number;
  image?: string;
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
