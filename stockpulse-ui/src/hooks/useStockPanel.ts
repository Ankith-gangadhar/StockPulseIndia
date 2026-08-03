import { useState, useEffect } from 'react';
import { getFundamentals, getTechnical, getBuySignal, getQuarterly, getNews } from '../services/stockApi';
import type { Fundamentals, Technical, BuySignal, Quarterly, NewsItem } from '../services/stockApi';

export interface PanelData {
  fundamentals: Fundamentals | null;
  technical: Technical | null;
  buySignal: BuySignal | null;
  quarterly: Quarterly | null;
  news: NewsItem[];
}

export function useStockPanel(symbol: string | null) {
  const [prevSymbol, setPrevSymbol] = useState<string | null>(null);
  const [data, setData] = useState<PanelData>({
    fundamentals: null, technical: null, buySignal: null, quarterly: null, news: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronously reset panel states during render if symbol changed
  if (symbol !== prevSymbol) {
    setPrevSymbol(symbol);
    setData({ fundamentals: null, technical: null, buySignal: null, quarterly: null, news: [] });
    setLoading(symbol ? true : false);
    setError(null);
  }

  useEffect(() => {
    if (!symbol) return;

    Promise.all([
      getFundamentals(symbol),
      getTechnical(symbol),
      getBuySignal(symbol),
      getQuarterly(symbol),
      getNews(),
    ]).then(([fundamentals, technical, buySignal, quarterly, allNews]) => {
      setData({
        fundamentals,
        technical,
        buySignal,
        quarterly,
        // Filter news for this symbol if possible, otherwise show all
        news: allNews.filter(n =>
          n.headline.toLowerCase().includes(symbol.toLowerCase())
        ).slice(0, 5),
      });
    }).catch(() => setError('Failed to load stock data'))
    .finally(() => setLoading(false));
  }, [symbol]);

  return { data, loading, error };
}
