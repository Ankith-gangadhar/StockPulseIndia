const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5200";

export interface Fundamentals {
  symbol: string; price: number | null; peRatio: number | null; forwardPe: number | null;
  roe: number | null; debtToEquity: number | null; revenueGrowth: number | null;
  earningsGrowth: number | null; eps: number | null; bookValue: number | null;
  marketCap: number | null; beta: number | null; week52High: number | null;
  week52Low: number | null; sector: string | null; dividendYield: number | null;
  change: number | null; changePercent: number | null;
}
export interface PricePoint { date: string; close: number; }
export interface Technical {
  symbol: string; rsi: number; macdLine: number; signalLine: number;
  histogram: number; macdCrossover: boolean; priceHistory: PricePoint[];
}
export interface ScreenerResult {
  symbol: string; price: number; metricValue: number;
  metricLabel: string; sector: string | null; signal: string;
}
export interface MarketStatus {
  isOpen: boolean; session: string; nextOpenIst: string; remainingMinutes: number;
}

export interface BuySignal {
  symbol: string; score: number; signal: string; price: number;
  pe: number | null; roe: number | null; rsi: number | null;
  debtToEquity: number | null; revenueGrowth: number | null; reasons: string[];
}
export interface Quarter { date: string; totalRevenue: number|null; netIncome: number|null; ebitda: number|null; }
export interface Quarterly { symbol: string; revenueYoY: number|null; netIncomeYoY: number|null; quarters: Quarter[]; }
export interface NewsItem { headline: string; source: string; publishedAt: string; url: string; sentiment: string; }
export interface InsightCard { type: string; title: string; body: string; symbol: string | null; }

// --- tiny in-memory cache (per page session) ---
type Entry = { data: unknown; ts: number };
const cache = new Map<string, Entry>();
function getCached<T>(key: string, ttlMs: number): T | null {
  const e = cache.get(key);
  if (e && Date.now() - e.ts < ttlMs) return e.data as T;
  return null;
}
function setCached(key: string, data: unknown) { cache.set(key, { data, ts: Date.now() }); }
export function clearApiCache() { cache.clear(); }

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    console.error("API error", path, err);
    return null;
  }
}

export async function getFundamentals(symbol: string): Promise<Fundamentals | null> {
  const key = `fund:${symbol}`;
  const hit = getCached<Fundamentals>(key, 15 * 60_000);
  if (hit) return hit;
  const data = await getJson<Fundamentals>(`/api/stock/${symbol}/fundamentals`);
  if (data) setCached(key, data);
  return data;
}
export async function getTechnical(symbol: string): Promise<Technical | null> {
  const key = `tech:${symbol}`;
  const hit = getCached<Technical>(key, 5 * 60_000);
  if (hit) return hit;
  const data = await getJson<Technical>(`/api/stock/${symbol}/technical`);
  if (data) setCached(key, data);
  return data;
}
export async function getScreener(
  type: "pe" | "roe" | "debt" | "growth" | "tech"
): Promise<ScreenerResult[]> {
  const key = `screen:${type}`;
  const hit = getCached<ScreenerResult[]>(key, 10 * 60_000);
  if (hit) return hit;
  const data = (await getJson<ScreenerResult[]>(`/api/screener/${type}`)) ?? [];
  setCached(key, data);
  return data;
}
export async function getMarketStatus(): Promise<MarketStatus | null> {
  return getJson<MarketStatus>(`/api/market/status`); // never cache — must be live
}

export async function getBuySignals(): Promise<BuySignal[]> {
  return (await getJson<BuySignal[]>(`/api/signals/buy`)) ?? [];
}
export async function getBuySignal(symbol: string): Promise<BuySignal | null> {
  return getJson<BuySignal>(`/api/signals/buy/${symbol}`);
}
export async function getQuarterly(symbol: string): Promise<Quarterly | null> {
  return getJson<Quarterly>(`/api/stock/${symbol}/quarterly`);
}
export async function getNews(): Promise<NewsItem[]> {
  return (await getJson<NewsItem[]>(`/api/news`)) ?? [];
}
export async function getInsights(): Promise<InsightCard[]> {
  return (await getJson<InsightCard[]>(`/api/insights/daily`)) ?? [];
}
