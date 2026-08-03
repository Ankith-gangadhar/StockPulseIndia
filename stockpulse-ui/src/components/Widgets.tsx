import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { useState, useEffect, useCallback } from 'react';
import MetricTooltip from './ui/MetricTooltip';
import WidgetSkeleton from './ui/WidgetSkeleton';
import WidgetError from './ui/WidgetError';
import StaleDataBadge from './ui/StaleDataBadge';
import { useMarketPolling } from '../hooks/useMarketPolling';
import {
  getScreener,
  clearApiCache,
  getFundamentals,
  getTechnical,
  getMarketStatus,
  getBuySignals,
  getBuySignal,
  getQuarterly,
  getNews,
  getInsights
} from '../services/stockApi';
import type {
  ScreenerResult,
  Fundamentals,
  Technical,
  MarketStatus,
  BuySignal,
  Quarterly,
  NewsItem,
  InsightCard
} from '../services/stockApi';


export const LiveQuotesWidget = () => {
  const [stocks, setStocks] = useState<Fundamentals[]>([]);
  const [nifty, setNifty] = useState<Fundamentals | null>(null);
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);
  const [, setPrevPrices] = useState<Record<string, number>>({});
  const [flashClasses, setFlashClasses] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [justLoaded, setJustLoaded] = useState(false);

  useEffect(() => {
    if (!loading) {
      setJustLoaded(true);
      setTimeout(() => setJustLoaded(false), 700);
    }
  }, [loading]);

  const { pollInterval } = useMarketPolling();

  const fetchAll = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const status = await getMarketStatus();
      setMarketStatus(status);

      const stockSymbols = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "SBIN", "BHARTIARTL", "ITC", "ICICIBANK"];
      const stockPromises = stockSymbols.map(sym => getFundamentals(sym));
      const niftyPromise = getFundamentals("^NSEI");

      const [stockRes, niftyRes] = await Promise.all([
        Promise.all(stockPromises),
        niftyPromise
      ]);

      const validStocks = stockRes.filter((s): s is Fundamentals => s !== null);

      setPrevPrices(prev => {
        const nextPrices: Record<string, number> = {};
        const nextFlashes: Record<string, string> = {};

        validStocks.forEach(s => {
          if (s.price !== null) {
            nextPrices[s.symbol] = s.price;
            if (prev[s.symbol] !== undefined && prev[s.symbol] !== s.price) {
              nextFlashes[s.symbol] = s.price > prev[s.symbol] ? "flash-green" : "flash-red";
              setTimeout(() => {
                setFlashClasses(f => {
                  const copy = { ...f };
                  delete copy[s.symbol];
                  return copy;
                });
              }, 800);
            }
          }
        });

        if (niftyRes && niftyRes.price !== null) {
          nextPrices[niftyRes.symbol] = niftyRes.price;
          if (prev[niftyRes.symbol] !== undefined && prev[niftyRes.symbol] !== niftyRes.price) {
            nextFlashes[niftyRes.symbol] = niftyRes.price > prev[niftyRes.symbol] ? "flash-green" : "flash-red";
            setTimeout(() => {
              setFlashClasses(f => {
                const copy = { ...f };
                delete copy[niftyRes.symbol];
                return copy;
              });
            }, 800);
          }
        }

        setFlashClasses(f => ({ ...f, ...nextFlashes }));
        return nextPrices;
      });

      setStocks(validStocks);
      setNifty(niftyRes);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error fetching live quotes", err);
      setError("Could not retrieve market quotes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll(false);
  }, []);

  useEffect(() => {
    if (pollInterval > 0) {
      const id = setInterval(() => fetchAll(true), pollInterval);
      return () => clearInterval(id);
    }
  }, [pollInterval]);

  const formatNextOpen = (isoString: string | null): string => {
    if (!isoString) return "—";
    try {
      const date = new Date(isoString);
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };
      return date.toLocaleString('en-IN', options);
    } catch {
      return isoString;
    }
  };

  if (loading) {
    return (
      <div className="h-full bg-surface border border-gray-800 widget-card flex flex-col overflow-hidden">
        <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none font-mono">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-bold widget-title">Live Quotes</span>
        </div>
        <WidgetSkeleton rows={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-surface border border-gray-800 widget-card flex flex-col overflow-hidden font-mono text-[10px]">
        <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-bold widget-title">Live Quotes</span>
        </div>
        <WidgetError message={error} onRetry={() => fetchAll(false)} />
      </div>
    );
  }

  return (
    <div className={`h-full bg-surface border border-gray-800 widget-card hover:border-gray-600 transition-colors flex flex-col overflow-hidden ${justLoaded ? 'widget-loaded' : ''}`}>
      {/* Self-contained CSS keyframe animations */}
      {/* Header */}
      <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none font-mono">
        <div className="flex items-center gap-1.5">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-bold widget-title">Live Quotes</span>
          {lastUpdated && <StaleDataBadge lastUpdatedAt={lastUpdated} />}
        </div>
        {marketStatus?.isOpen ? (
          <span className="text-xs bg-neonGreen/10 text-neonGreen border border-neonGreen/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-neonGreen animate-pulse"></span> Open
          </span>
        ) : (
          <span className="text-xs bg-gray-800/40 text-gray-500 border border-gray-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span> Closed
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-1 space-y-2">
        {/* NIFTY Index Header Row */}
        {nifty && (
          <div className="p-2 bg-gray-900/80 border border-gray-850 rounded flex justify-between items-center font-mono">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-400">NIFTY 50</div>
              <div className={`text-sm font-bold text-white px-1 rounded ${flashClasses[nifty.symbol] || ""}`}>{nifty.price ? nifty.price.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—"}</div>
            </div>
            {nifty.changePercent !== null ? (
              <div className={`text-xs text-right font-bold px-1 rounded ${(nifty.changePercent ?? 0) >= 0 ? "text-neonGreen" : "text-neonRed"} ${flashClasses[nifty.symbol] || ""}`}>
                {(nifty.changePercent ?? 0) >= 0 ? "▲" : "▼"} {Math.abs(nifty.change ?? 0).toFixed(2)} ({nifty.changePercent.toFixed(2)}%)
              </div>
            ) : null}
          </div>
        )}

        {/* Market Closed Warning */}
        {marketStatus && !marketStatus.isOpen && (
          <div className="p-2 bg-gray-950/60 border border-gray-850 rounded text-center font-mono space-y-1">
            <div className="inline-block px-1.5 py-0.5 rounded bg-gray-900 text-gray-400 border border-gray-800 font-bold text-[9px]">
              MARKET IS CLOSED
            </div>
            <div className="text-[8px] text-gray-500">
              Opens: {formatNextOpen(marketStatus.nextOpenIst)}
            </div>
          </div>
        )}

        {/* Stock List */}
        {stocks.length === 0 ? (
          <div className="text-center text-xs text-gray-500 py-6 font-mono">No quote data available</div>
        ) : (
          stocks.map((stock) => {
            const isUp = (stock.changePercent ?? 0) >= 0;
            const flashClass = flashClasses[stock.symbol] || "";
            return (
              <div
                key={stock.symbol}
                className="flex justify-between items-center py-1.5 px-2 border-b border-gray-850 hover:bg-white/5 rounded transition-colors group"
              >
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-neonAmber transition-colors font-mono">{stock.symbol}</div>
                  <div className="text-[9px] text-gray-500 truncate max-w-[120px] font-mono">{stock.sector || "NIFTY Stock"}</div>
                </div>
                <div className="text-right font-mono">
                  <div className={`text-xs text-white px-1 rounded ${flashClass}`}>
                    {stock.price !== null ? `₹${stock.price.toFixed(2)}` : "—"}
                  </div>
                  {stock.changePercent !== null && stock.change !== null ? (
                    <div className={`text-[9px] font-bold px-1 rounded ${isUp ? "text-neonGreen" : "text-neonRed"} ${flashClass}`}>
                      {isUp ? "▲" : "▼"} ₹{Math.abs(stock.change).toFixed(2)} ({stock.changePercent.toFixed(2)}%)
                    </div>
                  ) : (
                    <div className="text-[9px] text-gray-500">—</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export const SmartWatchlistWidget = () => {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [newSymbol, setNewSymbol] = useState("");
  const [addError, setAddError] = useState("");

  const { pollInterval } = useMarketPolling();

  useEffect(() => {
    const stored = localStorage.getItem("stockpulse_watchlist");
    let list = ["RELIANCE", "TCS", "SBIN", "BHARTIARTL", "INFY"];
    if (stored) {
      try {
        list = JSON.parse(stored);
      } catch {
        // ignore
      }
    } else {
      localStorage.setItem("stockpulse_watchlist", JSON.stringify(list));
    }
    setWatchlist(list);
  }, []);

  const fetchDetails = async (symbolsList: string[], isSilent = false) => {
    if (symbolsList.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const promises = symbolsList.map(async sym => {
        let fund: Fundamentals | null = null;
        let buy: BuySignal | null = null;
        try {
          fund = await getFundamentals(sym);
        } catch (e) {
          console.error(`Error loading fundamentals for ${sym}`, e);
        }
        try {
          buy = await getBuySignal(sym);
        } catch (e) {
          console.error(`Error loading buy signal for ${sym}`, e);
        }

        return {
          symbol: sym,
          price: fund?.price ?? null,
          changePercent: fund?.changePercent ?? null,
          peRatio: fund?.peRatio ?? null,
          roe: fund?.roe ?? null,
          rsi: buy?.rsi ?? null,
          signal: buy?.signal ?? null,
          score: buy?.score ?? null
        };
      });

      const res = await Promise.all(promises);

      // Sort: STRONG_BUY -> BUY -> WATCHLIST -> AVOID -> fallback to symbol alphabetical
      const signalPriority: Record<string, number> = {
        "STRONG_BUY": 1,
        "BUY": 2,
        "WATCHLIST": 3,
        "AVOID": 4
      };

      const sorted = res.sort((a, b) => {
        const priorityA = signalPriority[a.signal ?? ""] ?? 5;
        const priorityB = signalPriority[b.signal ?? ""] ?? 5;
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        return a.symbol.localeCompare(b.symbol);
      });

      setItems(sorted);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Watchlist fetch error", err);
      setError("Could not retrieve watchlist details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (watchlist.length >= 0) {
      fetchDetails(watchlist, false);
    }
  }, [watchlist]);

  useEffect(() => {
    if (pollInterval > 0 && watchlist.length > 0) {
      const id = setInterval(() => {
        fetchDetails(watchlist, true);
      }, pollInterval);
      return () => clearInterval(id);
    }
  }, [pollInterval, watchlist]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    const sym = newSymbol.trim().toUpperCase();
    if (!sym) return;

    if (watchlist.includes(sym)) {
      setAddError("Already in watchlist");
      return;
    }

    try {
      const fund = await getFundamentals(sym);
      if (!fund || fund.price === null) {
        setAddError("Symbol not found on NSE");
        return;
      }
      const updated = [...watchlist, sym];
      setWatchlist(updated);
      localStorage.setItem("stockpulse_watchlist", JSON.stringify(updated));
      setNewSymbol("");
    } catch {
      setAddError("Failed to add");
    }
  };

  const handleRemove = (sym: string) => {
    if (window.confirm(`Remove ${sym} from watchlist?`)) {
      const updated = watchlist.filter(s => s !== sym);
      setWatchlist(updated);
      localStorage.setItem("stockpulse_watchlist", JSON.stringify(updated));
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="h-full bg-surface border border-gray-800 widget-card flex flex-col overflow-hidden font-mono text-[10px]">
        <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-bold widget-title">Watchlist</span>
        </div>
        <WidgetSkeleton rows={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-surface border border-gray-800 widget-card flex flex-col overflow-hidden font-mono text-[10px]">
        <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-bold widget-title">Watchlist</span>
        </div>
        <WidgetError message={error} onRetry={() => fetchDetails(watchlist, false)} />
      </div>
    );
  }

  return (
    <div className="h-full bg-surface border border-gray-800 widget-card flex flex-col overflow-hidden">
      <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none font-mono">
        <div className="flex items-center gap-1.5">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-bold widget-title">Watchlist</span>
          {lastUpdated && <StaleDataBadge lastUpdatedAt={lastUpdated} />}
        </div>
        <form onSubmit={handleAdd} className="flex items-center gap-1">
          <input
            type="text"
            value={newSymbol}
            onChange={e => setNewSymbol(e.target.value)}
            placeholder="+ Symbol"
            className="w-16 bg-gray-950 border border-gray-800 px-1 py-0.2 rounded text-[10px] text-white focus:outline-none focus:border-neonAmber font-mono text-center"
          />
          <button type="submit" className="text-[10px] text-neonAmber hover:text-neonGreen focus:outline-none font-bold font-mono">+</button>
        </form>
      </div>

      {addError && (
        <div className="bg-neonRed/10 border-b border-neonRed/20 text-neonRed text-[9px] px-2 py-0.5 text-center font-mono">
          {addError}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-2 font-mono text-[10px]">
        {items.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Watchlist is empty</p>
        ) : (
          items.map(item => {
            const isUp = (item.changePercent ?? 0) >= 0;
            return (
              <div key={item.symbol} className="border border-gray-850 bg-black/10 rounded p-1.5 flex flex-col gap-1.5 hover:border-gray-700 transition-colors group">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">{item.symbol}</span>
                    <button
                      onClick={() => handleRemove(item.symbol)}
                      className="text-gray-600 hover:text-neonRed opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none font-bold text-[10px] cursor-pointer"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>

                  <div className="text-right">
                    <div className="text-white font-bold text-xs">
                      {item.price !== null ? `₹${item.price.toFixed(1)}` : "—"}
                    </div>
                    {item.changePercent !== null ? (
                      <div className={`text-[9px] font-bold ${isUp ? "text-neonGreen" : "text-neonRed"}`}>
                        {isUp ? "▲" : "▼"} {Math.abs(item.changePercent).toFixed(1)}%
                      </div>
                    ) : (
                      <div className="text-[9px] text-gray-500">—</div>
                    )}
                  </div>
                </div>

                {/* Chips and Badges */}
                <div className="flex flex-wrap items-center gap-1">
                  {item.signal ? (
                    <span className={`px-1 py-0.2 rounded border text-[8px] font-bold ${
                      item.signal === "STRONG_BUY" ? "text-neonGreen bg-neonGreen/10 border-neonGreen/20" :
                      item.signal === "BUY" ? "text-cyan-400 bg-cyan-950/40 border-cyan-800/40" :
                      item.signal === "WATCHLIST" ? "text-neonAmber bg-neonAmber/10 border-neonAmber/20" :
                      "text-gray-400 bg-gray-900 border-gray-800"
                    }`}>
                      {item.signal.replace("_", " ")}
                    </span>
                  ) : (
                    <span className="px-1 py-0.2 rounded border text-[8px] font-bold text-gray-500 bg-gray-950 border-gray-900">—</span>
                  )}

                  {item.peRatio !== null ? (
                    <MetricTooltip content={`P/E Ratio: You pay ₹${item.peRatio.toFixed(1)} for every ₹1 earned. Lower is generally better.`} position="top">
                      <span className={`px-1 py-0.2 rounded border text-[8px] font-bold cursor-help ${
                        item.peRatio < 20 ? "text-neonGreen bg-neonGreen/10 border-neonGreen/20" :
                        item.peRatio <= 35 ? "text-neonAmber bg-neonAmber/10 border-neonAmber/20" :
                        "text-neonRed bg-neonRed/10 border-neonRed/20"
                      }`}>
                        PE: {item.peRatio.toFixed(1)}x
                      </span>
                    </MetricTooltip>
                  ) : null}

                  {item.roe !== null ? (
                    <MetricTooltip content={`Return on Equity: Company earns ${item.roe.toFixed(1)}% per year on its own money. Above 15% is good.`} position="top">
                      <span className={`px-1 py-0.2 rounded border text-[8px] font-bold cursor-help ${
                        item.roe > 20 ? "text-neonGreen bg-neonGreen/10 border-neonGreen/20" :
                        item.roe >= 15 ? "text-neonAmber bg-neonAmber/10 border-neonAmber/20" :
                        "text-neonRed bg-neonRed/10 border-neonRed/20"
                      }`}>
                        ROE: {item.roe.toFixed(1)}%
                      </span>
                    </MetricTooltip>
                  ) : null}

                  {item.rsi !== null ? (
                    <MetricTooltip content={`RSI ${item.rsi.toFixed(0)}: Momentum relative strength index. Below 30 is oversold, above 70 is overbought.`} position="top">
                      <span className={`px-1 py-0.2 rounded border text-[8px] font-bold cursor-help ${
                        item.rsi < 35 ? "text-neonGreen bg-neonGreen/10 border-neonGreen/20" :
                        item.rsi <= 50 ? "text-neonAmber bg-neonAmber/10 border-neonAmber/20" :
                        item.rsi > 70 ? "text-neonRed bg-neonRed/10 border-neonRed/20" :
                        "text-gray-400 bg-gray-900 border-gray-800"
                      }`}>
                        RSI: {item.rsi.toFixed(0)}
                      </span>
                    </MetricTooltip>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export const BuyTodayWidget = () => {
  const [signals, setSignals] = useState<BuySignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [justLoaded, setJustLoaded] = useState(false);

  useEffect(() => {
    if (!loading) {
      setJustLoaded(true);
      setTimeout(() => setJustLoaded(false), 700);
    }
  }, [loading]);
  const [minutesAgo, setMinutesAgo] = useState(0);

  const { pollInterval } = useMarketPolling();

  const fetchSignals = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBuySignals();
      setSignals(data);
      setLastUpdated(new Date());
    } catch {
      setError("Could not score buy signals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
  }, []);

  useEffect(() => {
    if (pollInterval > 0) {
      const id = setInterval(() => {
        fetchSignals();
      }, pollInterval);
      return () => clearInterval(id);
    }
  }, [pollInterval]);

  useEffect(() => {
    if (!lastUpdated) return;
    const interval = setInterval(() => {
      setMinutesAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 60000));
    }, 30000);
    setMinutesAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 60000));
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const handleRefresh = () => {
    clearApiCache();
    fetchSignals();
  };

  if (loading && signals.length === 0) {
    return (
      <div className="h-full bg-surface border border-gray-800 widget-card flex flex-col overflow-hidden font-mono text-[10px]">
        <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-bold widget-title">Top Conviction Buys</span>
        </div>
        <WidgetSkeleton rows={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-surface border border-gray-800 widget-card flex flex-col overflow-hidden font-mono text-[10px]">
        <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-bold widget-title">Top Conviction Buys</span>
        </div>
        <WidgetError message={error} onRetry={fetchSignals} />
      </div>
    );
  }

  return (
    <div className={`h-full bg-surface border border-gray-800 widget-card flex flex-col hover:border-gray-600 transition-colors overflow-hidden ${justLoaded ? 'widget-loaded' : ''}`}>
      <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none font-mono">
        <div className="flex items-center gap-1.5">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-bold widget-title">Top Conviction Buys</span>
          {lastUpdated && <StaleDataBadge lastUpdatedAt={lastUpdated} />}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3 font-mono text-[10px] flex flex-col">
        {signals.length === 0 ? (
          <p className="text-gray-550 text-center py-6 px-2 leading-relaxed font-mono">
            NO STRONG BUY SETUPS TODAY — Market may be overbought or data is updating. RSI across NIFTY 50 is elevated.
          </p>
        ) : (
          <div className="space-y-3">
            {signals.slice(0, 5).map(s => {
              const isStrong = s.signal === "STRONG_BUY";
              const badgeColor = isStrong
                ? "text-neonGreen bg-neonGreen/10 border-neonGreen/20"
                : "text-neonAmber bg-neonAmber/10 border-neonAmber/20";
              const badgeText = isStrong ? "HIGH CONVICTION" : "MEDIUM";

              let barColor = "bg-gray-650";
              if (s.score >= 75) barColor = "bg-neonGreen";
              else if (s.score >= 55) barColor = "bg-neonAmber";

              const tags: string[] = [];
              if (s.pe !== null && s.pe < 20) tags.push(`PE: ${s.pe.toFixed(1)}x`);
              if (s.roe !== null && s.roe > 18) tags.push(`ROE: ${s.roe.toFixed(1)}%`);
              if (s.rsi !== null && s.rsi < 40) tags.push("RSI LOW");
              if (s.debtToEquity !== null && s.debtToEquity < 0.5) tags.push("LOW DEBT");

              return (
                <div key={s.symbol} className="border border-gray-850 bg-black/10 rounded p-2 space-y-2">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-sm font-bold text-white">{s.symbol}</span>
                      <span className="text-[9px] text-gray-500 ml-1.5">₹{s.price.toFixed(1)}</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded border text-[8px] font-bold uppercase tracking-wider ${badgeColor}`}>
                      {badgeText}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] text-gray-400">
                      <span>Conviction Score</span>
                      <span className="font-bold text-white">{s.score}/100</span>
                    </div>
                    <div className="w-full bg-gray-900 h-1.5 rounded overflow-hidden border border-gray-850">
                      <div
                        className={`h-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${s.score}%` }}
                      />
                    </div>
                  </div>

                  {/* Criteria Tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tags.map(t => (
                        <span key={t} className="text-[8px] bg-gray-900 text-gray-400 border border-gray-800 px-1 py-0.2 rounded font-sans">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Top Reasons */}
                  {s.reasons.length > 0 && (
                    <ul className="text-[8px] text-gray-400 list-disc list-inside space-y-0.5 leading-normal">
                      {s.reasons.slice(0, 2).map((r, idx) => (
                        <li key={idx} className="truncate">{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Small disclaimer */}
      <div className="text-[8px] text-gray-650 text-center px-2 py-1 mt-auto border-t border-gray-850 bg-gray-950/20 select-none">
        Not financial advice. Based on technical + fundamental analysis.
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 bg-gray-900/40 px-2 py-1 flex justify-between items-center text-[10px] text-gray-500 font-mono select-none font-bold">
        <span>Last scanned: {lastUpdated ? `${minutesAgo}m ago` : "never"}</span>
        <button
          onClick={handleRefresh}
          className="text-neonAmber hover:text-neonGreen transition-colors flex items-center gap-1 focus:outline-none cursor-pointer"
          title="Refresh Data"
        >
          <span>↺</span>
          <span className="uppercase tracking-wider">Refresh</span>
        </button>
      </div>
    </div>
  );
};

export const FallenStocksWidget = () => {
  const { stocks } = useSelector((state: RootState) => state.stock);
  const liveStocks = stocks as any[];
  const [justLoaded, setJustLoaded] = useState(false);
  useEffect(() => {
    if (stocks.length > 0) {
      setJustLoaded(true);
      setTimeout(() => setJustLoaded(false), 700);
    }
  }, [stocks.length > 0]);
  const FALLEN_STOCKS = liveStocks.length ? liveStocks
    .filter(s => s.changePercent < 0)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 3)
    .map(s => ({
      symbol: s.symbol,
      down: `${s.changePercent.toFixed(2)}%`,
      note: 'Sharp fall recently; wait for support zone.'
    })) : [];

  return (
    <div className={`h-full bg-surface border border-gray-800 widget-card flex flex-col overflow-hidden ${justLoaded ? 'widget-loaded' : ''}`}>
      <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
        <div className="flex items-center gap-1">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-bold widget-title">Stocks Down A Lot</span>
          <span className="text-xs bg-neonGreen/10 text-neonGreen border border-neonGreen/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-neonGreen animate-pulse"></span> Live
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-1 space-y-2">
        {FALLEN_STOCKS.length === 0 ? (
          <p className="text-xs text-gray-600 text-center mt-2">No stocks down significantly.</p>
        ) : FALLEN_STOCKS.map((item) => (
          <div key={item.symbol} className="p-1 border border-neonRed/30 rounded bg-neonRed/5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white">{item.symbol}</span>
              <span className="text-xs text-neonRed">{item.down}</span>
            </div>
            <div className="text-xs text-gray-300 mt-1">{item.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AIInsightsWidget = () => {
  const [insights, setInsights] = useState<InsightCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getInsights();
      setInsights(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 10 * 60_000); // 10 minutes
    return () => clearInterval(interval);
  }, []);

  const getTypeDetails = (type: string) => {
    switch (type.toUpperCase()) {
      case "BULLISH":
        return { icon: "▲", colorClass: "text-neonGreen border-neonGreen/20 bg-neonGreen/5" };
      case "BEARISH":
        return { icon: "▼", colorClass: "text-neonRed border-neonRed/20 bg-neonRed/5" };
      case "WARNING":
        return { icon: "⚠", colorClass: "text-neonAmber border-neonAmber/20 bg-neonAmber/5" };
      case "WATCH":
        return { icon: "👁", colorClass: "text-cyan-400 border-cyan-900/30 bg-cyan-950/20" };
      default:
        return { icon: "•", colorClass: "text-gray-400 border-gray-800 bg-gray-900/30" };
    }
  };

  return (
    <div className="h-full bg-surface border border-gray-800 widget-card flex flex-col hover:border-gray-600 transition-colors overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .staggered-insight-card {
          animation: fadeInUp 0.3s ease-out forwards;
          opacity: 0;
        }
      `}} />

      <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
        <span className="text-xs uppercase tracking-widest text-gray-500 font-bold widget-title">AI Insights</span>
        <span className="text-xs text-neonAmber font-bold">ALERT</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2.5 flex flex-col">
        {loading ? (
          <p className="text-xs text-gray-650 mt-2 font-mono text-center">Assembling market insights...</p>
        ) : error ? (
          <p className="text-xs text-neonRed mt-2 font-mono text-center">Failed to load insights</p>
        ) : insights.length === 0 ? (
          <p className="text-xs text-gray-500 mt-2 font-mono text-center">No daily insights generated</p>
        ) : (
          <div className="space-y-2.5">
            {insights.map((item, idx) => {
              const { icon, colorClass } = getTypeDetails(item.type);
              return (
                <div
                  key={idx}
                  className={`p-2 border rounded font-mono staggered-insight-card ${colorClass}`}
                  style={{ animationDelay: `${idx * 85}ms` }}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <span className="text-xs">{icon}</span>
                    <span className="text-white text-[10px] uppercase tracking-wider">{item.title}</span>
                  </div>
                  <div className="text-[9px] text-gray-300 leading-normal">{item.body}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Subtle disclaimer */}
      <div className="text-[8px] text-gray-600 text-center px-2 py-1 mt-auto border-t border-gray-850 bg-gray-950/20 select-none">
        Not financial advice. Rules-based market evaluation.
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 bg-gray-900/40 px-2 py-1 flex justify-between items-center text-[8px] text-gray-500 font-mono select-none font-bold">
        <span>Generated from live market data • updates every 10 min</span>
        <button
          onClick={fetchData}
          className="text-neonAmber hover:text-neonGreen transition-colors flex items-center gap-1 focus:outline-none cursor-pointer font-bold text-[9px]"
          title="Refresh Insights"
        >
          <span>↺</span>
          <span className="uppercase tracking-wider">Refresh</span>
        </button>
      </div>
    </div>
  );
};

export const NewsSentinelWidget = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchNews = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getNews();
      setNews(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    const interval = setInterval(() => {
      fetchNews();
    }, 3 * 60_000); // 3 minutes
    return () => clearInterval(interval);
  }, []);

  const posCount = news.filter(n => n.sentiment === "POSITIVE").length;
  const negCount = news.filter(n => n.sentiment === "NEGATIVE").length;

  const formatTimeAgo = (publishedAtStr: string): string => {
    try {
      const published = new Date(publishedAtStr);
      const diffMs = Date.now() - published.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 5) return "just now";
      if (diffMin < 60) return `${diffMin} min ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours} hours ago`;
      return "yesterday";
    } catch {
      return "—";
    }
  };

  const getSourceStyle = (source: string): string => {
    switch (source.toUpperCase()) {
      case "ET":
        return "text-yellow-500 bg-yellow-950/30 border-yellow-900/30";
      case "MC":
        return "text-cyan-500 bg-cyan-950/30 border-cyan-900/30";
      case "BS":
        return "text-purple-500 bg-purple-950/30 border-purple-900/30";
      default:
        return "text-gray-400 bg-gray-900 border-gray-800";
    }
  };

  const getSentimentDot = (sentiment: string) => {
    switch (sentiment.toUpperCase()) {
      case "POSITIVE": return "bg-neonGreen";
      case "NEGATIVE": return "bg-neonRed";
      default: return "bg-gray-600";
    }
  };

  const truncateHeadline = (headline: string): string => {
    if (headline.length <= 85) return headline;
    return headline.slice(0, 82) + "...";
  };

  return (
    <div className="h-full bg-surface border border-gray-800 widget-card flex flex-col hover:border-gray-600 transition-colors overflow-hidden font-mono text-[10px]">
      <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
        <div className="flex items-center gap-1.5">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-bold widget-title">News Sentinel</span>
          <span className="text-[8px] bg-neonGreen/10 text-neonGreen border border-neonGreen/20 px-1 py-0.2 rounded font-bold uppercase shrink-0 animate-pulse">LIVE</span>
        </div>
      </div>

      {/* Sentiment Summary Header */}
      {!loading && !error && news.length > 0 && (
        <div className="px-2 py-1 bg-gray-900/40 border-b border-gray-850 text-gray-400 font-bold text-[9px] select-none text-center">
          📈 {posCount} positive • 📉 {negCount} negative today
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-1.5 space-y-2">
        {loading ? (
          <p className="text-gray-600 text-center py-4">Scanning news feeds...</p>
        ) : error ? (
          <p className="text-neonRed text-center py-4">Failed to load news</p>
        ) : news.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No recent market news found</p>
        ) : (
          news.map((n, idx) => (
            <a
              key={idx}
              href={n.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-1.5 border border-gray-850 bg-black/10 rounded hover:bg-white/5 transition-colors group cursor-pointer"
            >
              <div className="flex items-start gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${getSentimentDot(n.sentiment)}`} />
                <div className="flex-1 min-w-0">
                  <div
                    className="text-gray-200 group-hover:text-white transition-colors leading-normal"
                    title={n.headline}
                  >
                    {truncateHeadline(n.headline)}
                  </div>
                  <div className="flex justify-between items-center mt-1 select-none text-[8px]">
                    <span className={`px-1 py-0.2 rounded border uppercase font-bold text-[8px] ${getSourceStyle(n.source)}`}>
                      {n.source}
                    </span>
                    <span className="text-gray-500">{formatTimeAgo(n.publishedAt)}</span>
                  </div>
                </div>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
};

export const FinancialSummaryWidget = () => {
  const [activeSymbol, setActiveSymbol] = useState("RELIANCE");
  const [inputVal, setInputVal] = useState("RELIANCE");
  const [fund, setFund] = useState<Fundamentals | null>(null);
  const [quarterly, setQuarterly] = useState<Quarterly | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [justLoaded, setJustLoaded] = useState(false);

  useEffect(() => {
    if (!loading) {
      setJustLoaded(true);
      setTimeout(() => setJustLoaded(false), 700);
    }
  }, [loading]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fData, qData] = await Promise.all([
        getFundamentals(activeSymbol),
        getQuarterly(activeSymbol)
      ]);
      if (fData) {
        setFund(fData);
        setQuarterly(qData);
        setLastUpdated(new Date());
      } else {
        setError(`No financials found for ${activeSymbol}`);
      }
    } catch {
      setError(`Failed to retrieve financials for ${activeSymbol}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeSymbol]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      setActiveSymbol(inputVal.trim().toUpperCase());
    }
  };

  const formatCrore = (n: number | null | undefined) => {
    if (n == null) return "—";
    const cr = n / 1e7;                 // rupees → crore
    if (cr >= 1e5) return `₹${(cr / 1e5).toFixed(2)} L Cr`;
    if (cr >= 1)   return `₹${cr.toLocaleString("en-IN", {maximumFractionDigits:0})} Cr`;
    return `₹${(n / 1e5).toFixed(2)} Lakh`;
  };

  let sliderPercent = 0;
  if (fund?.price && fund?.week52Low && fund?.week52High) {
    const range = fund.week52High - fund.week52Low;
    if (range > 0) {
      sliderPercent = ((fund.price - fund.week52Low) / range) * 100;
      sliderPercent = Math.max(0, Math.min(100, sliderPercent));
    }
  }

  const isBank = ["SBIN", "HDFCBANK", "ICICIBANK", "KOTAKBANK", "AXISBANK", "INDUSINDBK"].includes(activeSymbol);

  if (loading) {
    return (
      <div className="h-full bg-surface border border-gray-800 widget-card flex flex-col overflow-hidden font-mono text-[10px]">
        <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-bold widget-title">Financials</span>
        </div>
        <WidgetSkeleton rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-surface border border-gray-800 widget-card flex flex-col overflow-hidden font-mono text-[10px]">
        <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-bold widget-title">Financials</span>
        </div>
        <WidgetError message={error} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div className={`h-full bg-surface border border-gray-800 widget-card flex flex-col hover:border-gray-600 transition-colors overflow-hidden ${justLoaded ? 'widget-loaded' : ''}`}>
      {/* Header with Search */}
      <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none font-mono">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-bold widget-title shrink-0">Financials</span>
          <span className="text-xs text-white font-bold truncate max-w-[60px]">{activeSymbol}</span>
          {fund?.sector && (
            <span className="text-[8px] bg-gray-850 text-gray-400 border border-gray-800 px-1 py-0.2 rounded uppercase truncate max-w-[80px]" title={fund.sector}>
              {fund.sector}
            </span>
          )}
          {lastUpdated && <StaleDataBadge lastUpdatedAt={lastUpdated} />}
        </div>
        <form onSubmit={handleSearch} className="flex items-center gap-1 shrink-0">
          <input
            type="text"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            placeholder="RELIANCE"
            className="w-16 bg-gray-950 border border-gray-800 px-1 py-0.2 rounded text-[10px] text-white focus:outline-none focus:border-neonAmber font-mono text-center"
          />
          <button type="submit" className="text-[10px] text-neonAmber hover:text-neonGreen focus:outline-none font-bold">↵</button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3 font-mono text-[10px]">
        {fund && (
          <>
            {/* Fundamentals Overview */}
            <div>
              <div className="space-y-1.5 border-b border-gray-850 pb-2">
                {/* Market Cap */}
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-gray-500">Market Cap</span>
                  <span className="text-white font-bold">{formatCrore(fund?.marketCap)}</span>
                </div>

                {/* PE Ratio */}
                <div className="flex justify-between items-center border-b border-gray-850/30 py-0.5">
                  <MetricTooltip content={`P/E Ratio: You pay ₹${fund?.peRatio?.toFixed(1) ?? "—"} for every ₹1 earned. Below 20 is fair. IT stocks can be 30. PSU banks normal at PE 10.`} position="top">
                    <span className="text-gray-500 cursor-help select-none flex items-center gap-1">
                      PE Ratio <span className="text-gray-600 text-[8px]">ℹ</span>
                    </span>
                  </MetricTooltip>
                  <span className={`px-1 py-0.2 rounded border font-bold ${
                    fund?.peRatio === null || fund?.peRatio === undefined ? "text-gray-500 bg-gray-950 border-gray-900" :
                    fund.peRatio < 20 ? "text-neonGreen bg-neonGreen/10 border-neonGreen/20" :
                    fund.peRatio <= 35 ? "text-neonAmber bg-neonAmber/10 border-neonAmber/20" :
                    "text-neonRed bg-neonRed/10 border-neonRed/20"
                  }`}>
                    {fund?.peRatio?.toFixed(1) ?? "—"}x
                  </span>
                </div>

                {/* ROE */}
                <div className="flex justify-between items-center border-b border-gray-850/30 py-0.5">
                  <MetricTooltip content={`Return on Equity: Company earns ${fund?.roe?.toFixed(1) ?? "—"}% per year on shareholders' equity. Above 15% is good.`} position="top">
                    <span className="text-gray-500 cursor-help select-none flex items-center gap-1">
                      ROE <span className="text-gray-600 text-[8px]">ℹ</span>
                    </span>
                  </MetricTooltip>
                  <span className={`px-1 py-0.2 rounded border font-bold ${
                    fund?.roe === null || fund?.roe === undefined ? "text-gray-500 bg-gray-950 border-gray-900" :
                    fund.roe > 20 ? "text-neonGreen bg-neonGreen/10 border-neonGreen/20" :
                    fund.roe >= 15 ? "text-neonAmber bg-neonAmber/10 border-neonAmber/20" :
                    "text-neonRed bg-neonRed/10 border-neonRed/20"
                  }`}>
                    {fund?.roe?.toFixed(1) ?? "—"}%
                  </span>
                </div>

                {/* Debt to Equity */}
                <div className="flex justify-between items-center border-b border-gray-850/30 py-0.5">
                  <MetricTooltip content={`Debt to Equity: Ratio of total liabilities to shareholders' equity. Below 0.5 is healthy. Banks are excluded.`} position="top">
                    <span className="text-gray-500 cursor-help select-none flex items-center gap-1">
                      Debt to Equity <span className="text-gray-600 text-[8px]">ℹ</span>
                    </span>
                  </MetricTooltip>
                  <span className={`px-1 py-0.2 rounded border font-bold ${
                    fund?.debtToEquity === null || fund?.debtToEquity === undefined ? "text-gray-500 bg-gray-950 border-gray-900" :
                    isBank ? "text-gray-400 bg-gray-900 border-gray-800" :
                    fund.debtToEquity < 0.3 ? "text-neonGreen bg-neonGreen/10 border-neonGreen/20" :
                    fund.debtToEquity <= 1.0 ? "text-neonAmber bg-neonAmber/10 border-neonAmber/20" :
                    "text-neonRed bg-neonRed/10 border-neonRed/20"
                  }`}>
                    {fund?.debtToEquity?.toFixed(2) ?? "—"}
                  </span>
                </div>

                {/* EPS */}
                <div className="flex justify-between items-center border-b border-gray-850/30 py-0.5">
                  <MetricTooltip content="Earnings Per Share: Portion of company's profit allocated to each share. Higher is better." position="top">
                    <span className="text-gray-500 cursor-help select-none flex items-center gap-1">
                      EPS <span className="text-gray-600 text-[8px]">ℹ</span>
                    </span>
                  </MetricTooltip>
                  <span className={`px-1 py-0.2 rounded border font-bold ${
                    fund?.eps === null || fund?.eps === undefined ? "text-gray-500 bg-gray-950 border-gray-900" :
                    fund.eps > 0 ? "text-neonGreen bg-neonGreen/10 border-neonGreen/20" :
                    "text-neonRed bg-neonRed/10 border-neonRed/20"
                  }`}>
                    {fund?.eps !== null && fund?.eps !== undefined ? `₹${fund.eps.toFixed(1)}` : "—"}
                  </span>
                </div>

                {/* Dividend Yield */}
                <div className="flex justify-between items-center border-b border-gray-850/30 py-0.5">
                  <MetricTooltip content="Dividend Yield: Annual dividend payments relative to share price. Higher yield means more direct cash return." position="top">
                    <span className="text-gray-500 cursor-help select-none flex items-center gap-1">
                      Div Yield <span className="text-gray-600 text-[8px]">ℹ</span>
                    </span>
                  </MetricTooltip>
                  <span className={`px-1 py-0.2 rounded border font-bold ${
                    fund?.dividendYield === null || fund?.dividendYield === undefined ? "text-gray-500 bg-gray-950 border-gray-900" :
                    fund.dividendYield > 3.0 ? "text-neonGreen bg-neonGreen/10 border-neonGreen/20" :
                    fund.dividendYield >= 1.0 ? "text-neonAmber bg-neonAmber/10 border-neonAmber/20" :
                    "text-gray-400 bg-gray-900 border-gray-800"
                  }`}>
                    {fund?.dividendYield !== null && fund?.dividendYield !== undefined ? `${fund.dividendYield.toFixed(1)}%` : "—"}
                  </span>
                </div>

                {/* Beta */}
                <div className="flex justify-between items-center py-0.5">
                  <MetricTooltip content={`Beta: Volatility relative to index. If NIFTY moves 1%, this stock moves ~${fund?.beta?.toFixed(2) ?? "—"}%. Above 1.3 is highly volatile.`} position="top">
                    <span className="text-gray-500 cursor-help select-none flex items-center gap-1">
                      Beta <span className="text-gray-600 text-[8px]">ℹ</span>
                    </span>
                  </MetricTooltip>
                  <span className={`px-1 py-0.2 rounded border font-bold ${
                    fund?.beta === null || fund?.beta === undefined ? "text-gray-500 bg-gray-950 border-gray-900" :
                    fund.beta < 0.8 ? "text-neonGreen bg-neonGreen/10 border-neonGreen/20" :
                    fund.beta <= 1.3 ? "text-neonAmber bg-neonAmber/10 border-neonAmber/20" :
                    "text-neonRed bg-neonRed/10 border-neonRed/20"
                  }`}>
                    {fund?.beta?.toFixed(2) ?? "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* 52 Week Slider */}
            {fund?.week52Low && fund?.week52High && (
              <div className="space-y-1 text-[9px] border-b border-gray-850 pb-2">
                <span className="text-gray-500">52-Week Range (Price: ₹{fund.price?.toFixed(1)})</span>
                <div className="relative w-full bg-gray-900 h-2 rounded border border-gray-850 overflow-visible mt-1">
                  <div
                    className="absolute w-1 h-3 bg-neonAmber -top-[3px] rounded-full transform -translate-x-1/2"
                    style={{ left: `${sliderPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-gray-500 text-[8px]">
                  <span>L: ₹{fund.week52Low.toFixed(0)}</span>
                  <span>H: ₹{fund.week52High.toFixed(0)}</span>
                </div>
              </div>
            )}

            {/* Quarterly Growth */}
            {quarterly && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[9px]">
                  <span className="text-gray-500 font-bold uppercase tracking-wider">Quarterly YoY Growth</span>
                  <div className="flex gap-2 font-bold">
                    {quarterly.revenueYoY !== null && (
                      <span className={quarterly.revenueYoY >= 0 ? "text-neonGreen" : "text-neonRed"}>
                        Rev: {quarterly.revenueYoY >= 0 ? "+" : ""}{quarterly.revenueYoY.toFixed(1)}%
                      </span>
                    )}
                    {quarterly.netIncomeYoY !== null && (
                      <span className={quarterly.netIncomeYoY >= 0 ? "text-neonGreen" : "text-neonRed"}>
                        Net: {quarterly.netIncomeYoY >= 0 ? "+" : ""}{quarterly.netIncomeYoY.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Compact Table */}
                {quarterly.quarters && quarterly.quarters.length > 0 ? (
                  <div className="overflow-x-auto border border-gray-850 rounded">
                    <table className="w-full text-[8px] text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-950 text-gray-500 border-b border-gray-850">
                          <th className="p-1 font-bold">Quarter</th>
                          <th className="p-1 font-bold text-right">Revenue</th>
                          <th className="p-1 font-bold text-right">Net Inc</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quarterly.quarters.slice(0, 2).map(q => (
                          <tr key={q.date} className="border-b border-gray-850 last:border-0 hover:bg-white/5">
                            <td className="p-1 text-gray-400 font-bold">{q.date}</td>
                            <td className="p-1 text-right text-white font-bold">{formatCrore(q.totalRevenue)}</td>
                            <td className="p-1 text-right text-white font-bold">{formatCrore(q.netIncome)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-650 text-center py-2">No quarterly details found</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export const RiskMeterWidget = ({ symbol: defaultSymbol = "RELIANCE" }: { symbol?: string }) => {
  const [activeSymbol, setActiveSymbol] = useState(defaultSymbol);
  const [inputVal, setInputVal] = useState(defaultSymbol);
  const [fund, setFund] = useState<Fundamentals | null>(null);
  const [tech, setTech] = useState<Technical | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActiveSymbol(defaultSymbol);
    setInputVal(defaultSymbol);
  }, [defaultSymbol]);

  const fetchRiskData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fundData, techData] = await Promise.all([
        getFundamentals(activeSymbol),
        getTechnical(activeSymbol)
      ]);

      if (fundData) {
        setFund(fundData);
        setTech(techData);
      } else {
        setError(`No risk data found for ${activeSymbol}`);
      }
    } catch {
      setError(`Failed to retrieve risk details for ${activeSymbol}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskData();
  }, [activeSymbol]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      setActiveSymbol(inputVal.trim().toUpperCase());
    }
  };

  // Volatility math
  let vol = 0;
  let hasVol = false;
  if (tech?.priceHistory && tech.priceHistory.length > 1) {
    const closes = tech.priceHistory.map(p => p.close);
    const returns: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push(closes[i] / closes[i - 1] - 1);
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    vol = stdDev * Math.sqrt(252) * 100;
    hasVol = true;
  }

  const beta = fund?.beta;

  // Risk Level
  let riskLevel = "—";
  let riskColor = "text-gray-500 border-gray-800 bg-gray-900/40";
  if (beta !== undefined && beta !== null && hasVol) {
    if (beta < 0.8 && vol < 20) {
      riskLevel = "LOW RISK 🟢";
      riskColor = "text-neonGreen border-neonGreen/20 bg-neonGreen/10";
    } else if (beta > 1.3 || vol > 35) {
      riskLevel = "HIGH RISK 🔴";
      riskColor = "text-neonRed border-neonRed/20 bg-neonRed/10";
    } else {
      riskLevel = "MEDIUM RISK 🟡";
      riskColor = "text-neonAmber border-neonAmber/20 bg-neonAmber/10";
    }
  }

  // Warnings
  const warnings: string[] = [];
  const rsi = tech?.rsi;
  if (rsi && rsi > 72) {
    warnings.push(`Overbought — RSI at ${rsi.toFixed(1)}, avoid buying at current levels`);
  }
  const isBank = ["SBIN", "HDFCBANK", "ICICIBANK", "KOTAKBANK", "AXISBANK", "INDUSINDBK"].includes(activeSymbol);
  if (fund?.debtToEquity !== null && fund?.debtToEquity !== undefined && fund.debtToEquity > 2.0 && !isBank) {
    warnings.push(`High debt — D/E at ${fund.debtToEquity.toFixed(2)}, elevated risk`);
  }
  if (beta !== undefined && beta !== null && beta > 1.5) {
    warnings.push(`Very high volatility — stock moves ${beta.toFixed(2)}x vs NIFTY`);
  }
  if (fund?.price !== null && fund?.price !== undefined && fund?.week52High !== null && fund?.week52High !== undefined && fund.price >= fund.week52High * 0.95) {
    warnings.push(`Near 52-week high — consider waiting for a dip`);
  }
  if (warnings.length === 0) {
    warnings.push("No active warnings");
  }

  if (loading) {
    return (
      <div className="h-full bg-surface border border-gray-800 widget-card flex flex-col overflow-hidden font-mono text-[10px]">
        <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-bold widget-title">Risk Meter</span>
        </div>
        <WidgetSkeleton rows={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-surface border border-gray-800 widget-card flex flex-col overflow-hidden font-mono text-[10px]">
        <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-bold widget-title">Risk Meter</span>
        </div>
        <WidgetError message={error} onRetry={fetchRiskData} />
      </div>
    );
  }

  return (
    <div className="h-full bg-surface border border-gray-800 widget-card flex flex-col hover:border-gray-600 transition-colors overflow-hidden">
      {/* Header with Search */}
      <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none font-mono">
        <span className="text-xs uppercase tracking-widest text-gray-500 font-bold widget-title">Risk Meter</span>
        <form onSubmit={handleSearch} className="flex items-center gap-1">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="RELIANCE"
            className="w-16 bg-gray-950 border border-gray-800 px-1 py-0.2 rounded text-[10px] text-white focus:outline-none focus:border-neonAmber font-mono text-center"
          />
          <button type="submit" className="text-[10px] text-neonAmber hover:text-neonGreen focus:outline-none font-bold">↵</button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col justify-between space-y-2">
        {fund && (
          <>
            <div className="flex flex-col items-center py-1.5 font-mono">
              <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider mb-1">{activeSymbol} Risk rating</span>
              <div className={`px-3 py-1 rounded border font-mono font-bold tracking-widest text-xs ${riskColor}`}>
                {riskLevel}
              </div>
            </div>

            <div className="w-full space-y-2 text-[10px] font-mono">
              {/* Beta */}
              <div className="flex justify-between border-b border-gray-850 pb-1">
                <MetricTooltip content={`Beta measures volatility relative to index. >1 is high risk, <1 is low risk.`} position="top">
                  <span className="text-gray-500 cursor-help select-none">Beta (vs NIFTY) ℹ</span>
                </MetricTooltip>
                <span className="font-mono text-white">{beta !== undefined && beta !== null ? beta.toFixed(2) : "—"}</span>
              </div>

              {/* Volatility */}
              <div className="flex justify-between border-b border-gray-850 pb-1">
                <MetricTooltip content="Historical standard deviation of daily price changes. Under 20% = low risk, 20–40% = medium, over 40% = high." position="top">
                  <span className="text-gray-500 cursor-help select-none">30D Volatility ℹ</span>
                </MetricTooltip>
                <span className="font-mono text-white">{hasVol ? `${vol.toFixed(1)}%` : "—"}</span>
              </div>

              {/* Active Warnings */}
              <div className="flex flex-col space-y-1 pt-1">
                <span className="text-gray-500 font-bold uppercase tracking-wider text-[9px]">Active Warnings</span>
                <div className="bg-black/20 p-1.5 border border-gray-850 rounded max-h-[80px] overflow-y-auto space-y-1 font-mono text-[9px]">
                  {warnings.map((w, idx) => {
                    const isAlert = w !== "No active warnings";
                    return (
                      <div key={idx} className={isAlert ? "text-neonAmber" : "text-gray-500"}>
                        {isAlert ? "⚠ " : ""}{w}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const ScreenerMetricWidget = ({ tabName }: { tabName: string }) => {
  const type = tabName.toLowerCase() as "pe" | "roe" | "debt" | "growth" | "tech";
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [minutesAgo, setMinutesAgo] = useState(0);

  const { pollInterval } = useMarketPolling();

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const data = await getScreener(type);
      setResults(data);
      setLastUpdated(new Date());
    } catch {
      setError("Failed to run screen parameters");
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  useEffect(() => {
    if (pollInterval > 0) {
      const id = setInterval(() => {
        fetchData(true);
      }, pollInterval);
      return () => clearInterval(id);
    }
  }, [pollInterval, fetchData]);

  useEffect(() => {
    if (!lastUpdated) return;
    const interval = setInterval(() => {
      setMinutesAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 60000));
    }, 30000);
    setMinutesAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 60000));
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const handleRefresh = () => {
    clearApiCache();
    fetchData(false);
  };

  const getBadgeDetails = (val: number) => {
    let badgeColor = "";
    let tooltipText = "";
    let formattedValue = "";

    switch (type) {
      case "pe":
        formattedValue = `${val.toFixed(1)}x`;
        if (val < 20) {
          badgeColor = "text-neonGreen bg-neonGreen/10 border-neonGreen/20";
        } else if (val >= 20 && val <= 35) {
          badgeColor = "text-neonAmber bg-neonAmber/10 border-neonAmber/20";
        } else {
          badgeColor = "text-neonRed bg-neonRed/10 border-neonRed/20";
        }
        tooltipText = `P/E Ratio: You pay ₹${val.toFixed(1)} for every ₹1 earned. Below 20 is fair. IT stocks can be 30. PSU banks are normal at PE 10.`;
        break;

      case "roe":
        formattedValue = `${val.toFixed(1)}%`;
        if (val > 20) {
          badgeColor = "text-neonGreen bg-neonGreen/10 border-neonGreen/20";
        } else if (val >= 15 && val <= 20) {
          badgeColor = "text-neonAmber bg-neonAmber/10 border-neonAmber/20";
        } else {
          badgeColor = "text-neonRed bg-neonRed/10 border-neonRed/20";
        }
        tooltipText = `Return on Equity: Company earns ${val.toFixed(1)}% per year on its own money. Above 15% is good, above 20% is excellent.`;
        break;

      case "debt":
        formattedValue = val.toFixed(2);
        if (val < 0.3) {
          badgeColor = "text-neonGreen bg-neonGreen/10 border-neonGreen/20";
        } else if (val >= 0.3 && val <= 1.0) {
          badgeColor = "text-neonAmber bg-neonAmber/10 border-neonAmber/20";
        } else {
          badgeColor = "text-neonRed bg-neonRed/10 border-neonRed/20";
        }
        tooltipText = `Debt to Equity: For every ₹1 of own money this company has ₹${val.toFixed(2)} of debt. Below 0.5 is healthy. Banks are excluded here.`;
        break;

      case "tech":
        formattedValue = `RSI ${val.toFixed(1)}`;
        if (val < 35) {
          badgeColor = "text-neonGreen bg-neonGreen/10 border-neonGreen/20";
        } else if (val >= 35 && val <= 50) {
          badgeColor = "text-neonAmber bg-neonAmber/10 border-neonAmber/20";
        } else if (val > 70) {
          badgeColor = "text-neonRed bg-neonRed/10 border-neonRed/20";
        } else {
          badgeColor = "text-gray-400 bg-gray-900 border-gray-800";
        }
        tooltipText = `RSI ${val.toFixed(1)}: Below 30 = oversold (possible buy). Above 70 = overbought (avoid buying now).`;
        break;

      case "growth":
        formattedValue = `${val.toFixed(1)}%`;
        if (val > 20) {
          badgeColor = "text-neonGreen bg-neonGreen/10 border-neonGreen/20";
        } else if (val >= 10 && val <= 20) {
          badgeColor = "text-neonAmber bg-neonAmber/10 border-neonAmber/20";
        } else {
          badgeColor = "text-neonRed bg-neonRed/10 border-neonRed/20";
        }
        tooltipText = `Profit grew ${val.toFixed(1)}% YoY. Above 15% is strong. Profit growing faster than revenue = improving margins.`;
        break;

      default:
        formattedValue = val.toString();
        badgeColor = "text-gray-400 bg-gray-950 border-gray-850";
        tooltipText = `Value: ${val}`;
    }

    return { badgeColor, tooltipText, formattedValue };
  };

  const getScreenerDescription = () => {
    switch (type) {
      case "pe": return "Healthy P/E Ratio (<20x)";
      case "roe": return "Strong ROE (>15%)";
      case "debt": return "Low Debt to Equity (<0.5)";
      case "growth": return "High Revenue & Profit Growth";
      case "tech": return "RSI < 30 OR MACD Positive";
      default: return "";
    }
  };

  if (loading && results.length === 0) {
    return (
      <div className="h-full bg-surface border border-gray-800 widget-card flex flex-col overflow-hidden font-mono text-[10px]">
        <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-bold widget-title">{tabName} Screener</span>
        </div>
        <WidgetSkeleton rows={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-surface border border-gray-800 widget-card flex flex-col overflow-hidden font-mono text-[10px]">
        <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-bold widget-title">{tabName} Screener</span>
        </div>
        <WidgetError message={error} onRetry={() => fetchData(false)} />
      </div>
    );
  }

  return (
    <div className="h-full bg-surface border border-gray-800 widget-card flex flex-col overflow-hidden">
      {/* Title Header */}
      <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none font-mono">
        <div className="flex items-center gap-1.5">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-bold widget-title">{tabName} Screener</span>
          {lastUpdated && <StaleDataBadge lastUpdatedAt={lastUpdated} />}
        </div>
        <span className="text-[8px] px-1 py-0.2 rounded bg-neonAmber/15 text-neonAmber border border-neonAmber/20 font-bold uppercase tracking-wider shrink-0 select-none">DATA</span>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-1 space-y-2">
        <div className="text-xs text-center text-gray-500 mb-2 italic px-1 truncate font-mono select-none" title={getScreenerDescription()}>
          {getScreenerDescription()}
        </div>
        {results.length === 0 ? (
          <p className="text-xs text-center text-gray-500 mt-4 px-2 font-mono">
            NO MATCHES RIGHT NOW — market conditions don't fit this screen.
          </p>
        ) : (
          results.map((item) => {
            const { badgeColor, tooltipText, formattedValue } = getBadgeDetails(item.metricValue);
            return (
              <div
                key={item.symbol}
                className="flex justify-between items-center p-1.5 border border-gray-850 bg-black/10 hover:bg-white/5 rounded transition-colors group font-mono text-[10px]"
              >
                <div className="overflow-hidden pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white group-hover:text-neonAmber transition-colors truncate">
                      {item.symbol}
                    </span>
                    {item.sector && (
                      <span className="text-[9px] uppercase px-1 py-0.2 bg-gray-800 text-gray-400 rounded-sm shrink-0 truncate max-w-[80px]">
                        {item.sector}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate" title={item.symbol}>
                    {item.symbol} Industries
                  </div>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end">
                  <div className="text-sm font-mono text-neonGreen">
                    ₹{item.price ? item.price.toFixed(2) : "0.00"}
                  </div>
                  
                  {/* MetricTooltip on Badge */}
                  <div className="inline-block mt-0.5">
                    <MetricTooltip content={tooltipText} position="top">
                      <span className={`text-[10px] px-1 py-0.5 rounded border font-mono select-none cursor-help font-bold ${badgeColor}`}>
                        {formattedValue}
                      </span>
                    </MetricTooltip>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto border-t border-gray-800 bg-gray-900/40 px-2 py-1 flex justify-between items-center text-[10px] text-gray-500 font-mono select-none font-bold">
        <span>Last scanned: {lastUpdated ? `${minutesAgo}m ago` : "never"}</span>
        <button
          onClick={handleRefresh}
          className="text-neonAmber hover:text-neonGreen transition-colors flex items-center gap-1 focus:outline-none cursor-pointer"
          title="Refresh Data"
        >
          <span>↺</span>
          <span className="uppercase tracking-wider">Refresh</span>
        </button>
      </div>
    </div>
  );
};
