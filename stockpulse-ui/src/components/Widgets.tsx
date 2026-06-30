import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { useState, useEffect, useCallback } from 'react';
import {
  getScreener,
  clearApiCache,
  getFundamentals,
  getTechnical,
  getMarketStatus,
  getBuySignals,
  getBuySignal,
  getQuarterly
} from '../services/stockApi';
import type {
  ScreenerResult,
  Fundamentals,
  Technical,
  MarketStatus,
  BuySignal,
  Quarterly
} from '../services/stockApi';


export const LiveQuotesWidget = () => {
  const [stocks, setStocks] = useState<Fundamentals[]>([]);
  const [nifty, setNifty] = useState<Fundamentals | null>(null);
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);
  const [, setPrevPrices] = useState<Record<string, number>>({});
  const [flashClasses, setFlashClasses] = useState<Record<string, string>>({});

  const fetchAll = async () => {
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
    } catch (err) {
      console.error("Error fetching live quotes", err);
    }
  };

  useEffect(() => {
    fetchAll();

    let intervalId: any = null;
    if (marketStatus?.isOpen) {
      intervalId = setInterval(() => {
        fetchAll();
      }, 60000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [marketStatus?.isOpen]);

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

  return (
    <div className="h-full bg-surface border border-gray-800 hover:border-gray-600 transition-colors flex flex-col overflow-hidden">
      {/* Self-contained CSS keyframe animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes flash {
          0% { background-color: var(--flash-color); }
          100% { background-color: transparent; }
        }
        .flash-green {
          --flash-color: rgba(0, 255, 65, 0.4);
          animation: flash 0.8s ease-out;
        }
        .flash-red {
          --flash-color: rgba(255, 0, 60, 0.4);
          animation: flash 0.8s ease-out;
        }
      `}} />

      {/* Header */}
      <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
        <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">Live Quotes</span>
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
          <div className={`p-2 bg-gray-900/80 border border-gray-850 rounded flex justify-between items-center font-mono ${flashClasses[nifty.symbol] || ""}`}>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-400">NIFTY 50</div>
              <div className="text-sm font-bold text-white">{nifty.price ? nifty.price.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—"}</div>
            </div>
            {nifty.changePercent !== null ? (
              <div className={`text-xs text-right font-bold ${(nifty.changePercent ?? 0) >= 0 ? "text-neonGreen" : "text-neonRed"}`}>
                {(nifty.changePercent ?? 0) >= 0 ? "▲" : "▼"} {Math.abs(nifty.change ?? 0).toFixed(2)} ({nifty.changePercent.toFixed(2)}%)
              </div>
            ) : null}
          </div>
        )}

        {/* Market Closed Warning */}
        {marketStatus && !marketStatus.isOpen && (
          <div className="p-2 bg-gray-950/60 border border-gray-850 rounded text-center font-mono space-y-1">
            <div className="inline-block px-1.5 py-0.5 rounded bg-gray-900 text-gray-400 border border-gray-800 font-bold text-[9px]">
              MARKET CLOSED
            </div>
            <div className="text-[9px] text-gray-500">
              Next open: {formatNextOpen(marketStatus.nextOpenIst)}
            </div>
          </div>
        )}

        {/* Stock List */}
        {stocks.length === 0 ? (
          <p className="text-xs text-gray-600 mt-4 text-center">Loading stock data...</p>
        ) : (
          stocks.map(stock => {
            const isUp = (stock.changePercent ?? 0) >= 0;
            const flashClass = flashClasses[stock.symbol] || "";
            return (
              <div
                key={stock.symbol}
                className={`flex justify-between items-center py-1.5 px-2 border-b border-gray-850 hover:bg-white/5 rounded transition-colors group ${flashClass}`}
              >
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-neonAmber transition-colors">{stock.symbol}</div>
                  <div className="text-[9px] text-gray-500 truncate max-w-[120px]">{stock.sector || "NIFTY Stock"}</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-xs text-white">
                    {stock.price !== null ? `₹${stock.price.toFixed(2)}` : "—"}
                  </div>
                  {stock.changePercent !== null && stock.change !== null ? (
                    <div className={`text-[9px] font-bold ${isUp ? "text-neonGreen" : "text-neonRed"}`}>
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
  const [newSymbol, setNewSymbol] = useState("");
  const [addError, setAddError] = useState("");
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);

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

  const fetchDetails = async (symbolsList: string[]) => {
    if (symbolsList.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const status = await getMarketStatus();
      setMarketStatus(status);

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
    } catch (err) {
      console.error("Watchlist fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (watchlist.length >= 0) {
      fetchDetails(watchlist);
    }
  }, [watchlist]);

  useEffect(() => {
    let interval: any = null;
    if (marketStatus?.isOpen && watchlist.length > 0) {
      interval = setInterval(() => {
        fetchDetails(watchlist);
      }, 5 * 60_000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [marketStatus?.isOpen, watchlist]);

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

  return (
    <div className="h-full bg-surface border border-gray-800 flex flex-col overflow-hidden">
      <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none font-mono">
        <div className="flex items-center gap-1.5">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">Watchlist</span>
          {marketStatus?.isOpen ? (
            <span className="text-[8px] bg-neonGreen/10 text-neonGreen border border-neonGreen/20 px-1 py-0.2 rounded font-bold uppercase shrink-0">LIVE</span>
          ) : (
            <span className="text-[8px] bg-gray-850 text-gray-500 border border-gray-800 px-1 py-0.2 rounded font-bold uppercase shrink-0">STATIC</span>
          )}
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
        {loading && items.length === 0 ? (
          <p className="text-gray-600 text-center py-4">Syncing watchlist metrics...</p>
        ) : items.length === 0 ? (
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
                    <span className={`px-1 py-0.2 rounded border text-[8px] font-bold ${
                      item.peRatio < 20 ? "text-neonGreen bg-neonGreen/10 border-neonGreen/20" :
                      item.peRatio <= 35 ? "text-neonAmber bg-neonAmber/10 border-neonAmber/20" :
                      "text-neonRed bg-neonRed/10 border-neonRed/20"
                    }`}>
                      PE: {item.peRatio.toFixed(1)}x
                    </span>
                  ) : null}

                  {item.roe !== null ? (
                    <span className={`px-1 py-0.2 rounded border text-[8px] font-bold ${
                      item.roe > 20 ? "text-neonGreen bg-neonGreen/10 border-neonGreen/20" :
                      item.roe >= 15 ? "text-neonAmber bg-neonAmber/10 border-neonAmber/20" :
                      "text-neonRed bg-neonRed/10 border-neonRed/20"
                    }`}>
                      ROE: {item.roe.toFixed(1)}%
                    </span>
                  ) : null}

                  {item.rsi !== null ? (
                    <span className={`px-1 py-0.2 rounded border text-[8px] font-bold ${
                      item.rsi < 35 ? "text-neonGreen bg-neonGreen/10 border-neonGreen/20" :
                      item.rsi <= 50 ? "text-neonAmber bg-neonAmber/10 border-neonAmber/20" :
                      item.rsi > 70 ? "text-neonRed bg-neonRed/10 border-neonRed/20" :
                      "text-gray-400 bg-gray-900 border-gray-800"
                    }`}>
                      RSI: {item.rsi.toFixed(0)}
                    </span>
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
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [minutesAgo, setMinutesAgo] = useState(0);

  const fetchSignals = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getBuySignals();
      setSignals(data);
      setLastUpdated(new Date());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(() => {
      fetchSignals();
    }, 5 * 60_000);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <div className="h-full bg-surface border border-gray-800 flex flex-col hover:border-gray-600 transition-colors overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .animate-cursor-blink {
          animation: cursor-blink 1s step-end infinite;
        }
      `}} />

      <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none font-mono">
        <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">Top Conviction Buys</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3 font-mono text-[10px] flex flex-col">
        {loading ? (
          <div className="flex justify-center items-center py-8 font-mono text-neonGreen text-xs tracking-widest uppercase">
            <span>SCANNING MOMENTUM</span>
            <span className="animate-cursor-blink ml-1">_</span>
          </div>
        ) : error ? (
          <p className="text-neonRed text-center py-4">Scoring failed</p>
        ) : signals.length === 0 ? (
          <p className="text-gray-500 text-center py-6 px-2 leading-relaxed font-mono">
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
      <div className="text-[8px] text-gray-600 text-center px-2 py-1 mt-auto border-t border-gray-850 bg-gray-950/20 select-none">
        Not financial advice. Based on technical + fundamental analysis.
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 bg-gray-900/40 px-2 py-1 flex justify-between items-center text-[10px] text-gray-500 font-mono select-none">
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
    <div className="h-full bg-surface border border-gray-800 flex flex-col overflow-hidden">
      <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
        <div className="flex items-center gap-1">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">Stocks Down A Lot</span>
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
  const { insights, loading } = useSelector((state: RootState) => state.dashboard);
  return (
    <div className="h-full bg-surface border border-gray-800 flex flex-col overflow-hidden">
      <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
        <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">AI Insights</span>
        <span className="text-xs text-neonAmber font-bold">ALERT</span>
      </div>
      <div className="flex-1 overflow-y-auto p-1 space-y-3">
        {loading && <p className="text-xs text-gray-600 mt-2">Initializing AI models...</p>}
        {insights.map((insight: any, idx: number) => (
          <div key={idx} className="border-l-2 pl-2 py-1" style={{ borderColor: insight.sentiment === 'Bullish' ? '#00ff41' : insight.sentiment === 'Bearish' ? '#ff003c' : '#ffb000' }}>
            <div className="text-xs font-bold uppercase text-gray-500">{insight.type}</div>
            <div className="text-xs text-gray-200 mt-0.5">{insight.message}</div>
            <div className={`text-xs mt-1 font-bold ${insight.sentiment === 'Bullish' ? 'text-neonGreen' : insight.sentiment === 'Bearish' ? 'text-neonRed' : 'text-neonAmber'}`}>
              {insight.sentiment}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const NewsSentinelWidget = () => {
  const { news, loading } = useSelector((state: RootState) => state.dashboard);
  return (
    <div className="h-full bg-surface border border-gray-800 flex flex-col overflow-hidden">
      <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
        <div className="flex items-center gap-1">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">News Sentinel</span>
          <span className="text-xs bg-neonGreen/10 text-neonGreen border border-neonGreen/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-neonGreen animate-pulse"></span> Live
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-1 space-y-2">
        {loading && <p className="text-xs text-gray-600 mt-2">Scanning headlines...</p>}
        {news.map((n: any, idx: number) => (
          <div key={idx} className="py-2 border-b border-gray-800/50 hover:bg-white/5 px-1 rounded cursor-pointer">
            <div className="text-xs text-gray-200">{n.headline}</div>
            <div className="flex justify-between items-center mt-1">
              <span className={`text-xs uppercase font-bold px-1.5 py-0.5 rounded ${n.impact === 'Positive' ? 'bg-neonGreen/15 text-neonGreen' : 'bg-neonRed/15 text-neonRed'}`}>
                {n.impact}
              </span>
              <span className="text-xs text-gray-600">{n.time}</span>
            </div>
          </div>
        ))}
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
  const [error, setError] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const [fData, qData] = await Promise.all([
        getFundamentals(activeSymbol),
        getQuarterly(activeSymbol)
      ]);
      if (fData) {
        setFund(fData);
        setQuarterly(qData);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
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

  return (
    <div className="h-full bg-surface border border-gray-800 flex flex-col hover:border-gray-600 transition-colors overflow-hidden">
      {/* Header with Search */}
      <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none font-mono">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-bold shrink-0">Financials</span>
          <span className="text-xs text-white font-bold truncate max-w-[60px]">{activeSymbol}</span>
          {fund?.sector && (
            <span className="text-[8px] bg-gray-850 text-gray-400 border border-gray-800 px-1 py-0.2 rounded uppercase truncate max-w-[80px]" title={fund.sector}>
              {fund.sector}
            </span>
          )}
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
        {loading ? (
          <p className="text-gray-600 text-center py-4">Fetching financial metrics...</p>
        ) : error ? (
          <p className="text-neonRed text-center py-4">No data found for {activeSymbol}</p>
        ) : (
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
                <div className="flex justify-between items-center relative group/pe border-b border-gray-850/30 py-0.5">
                  <span className="text-gray-500 cursor-help select-none flex items-center gap-1">
                    PE Ratio <span className="text-gray-600 text-[8px]">ℹ</span>
                  </span>
                  <span className={`px-1 py-0.2 rounded border font-bold ${
                    fund?.peRatio === null || fund?.peRatio === undefined ? "text-gray-500 bg-gray-950 border-gray-900" :
                    fund.peRatio < 20 ? "text-neonGreen bg-neonGreen/10 border-neonGreen/20" :
                    fund.peRatio <= 35 ? "text-neonAmber bg-neonAmber/10 border-neonAmber/20" :
                    "text-neonRed bg-neonRed/10 border-neonRed/20"
                  }`}>
                    {fund?.peRatio?.toFixed(1) ?? "—"}x
                  </span>
                  <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/pe:block z-50 bg-gray-950 text-gray-200 text-[9px] rounded border border-gray-800 p-2 w-48 shadow-2xl pointer-events-none text-left leading-normal font-sans">
                    P/E Ratio: You pay ₹{fund?.peRatio?.toFixed(1) ?? "—"} for every ₹1 earned. Below 20 is fair. IT stocks can be 30. PSU banks are normal at PE 10.
                  </div>
                </div>

                {/* ROE */}
                <div className="flex justify-between items-center relative group/roe border-b border-gray-850/30 py-0.5">
                  <span className="text-gray-500 cursor-help select-none flex items-center gap-1">
                    ROE <span className="text-gray-600 text-[8px]">ℹ</span>
                  </span>
                  <span className={`px-1 py-0.2 rounded border font-bold ${
                    fund?.roe === null || fund?.roe === undefined ? "text-gray-500 bg-gray-950 border-gray-900" :
                    fund.roe > 20 ? "text-neonGreen bg-neonGreen/10 border-neonGreen/20" :
                    fund.roe >= 15 ? "text-neonAmber bg-neonAmber/10 border-neonAmber/20" :
                    "text-neonRed bg-neonRed/10 border-neonRed/20"
                  }`}>
                    {fund?.roe?.toFixed(1) ?? "—"}%
                  </span>
                  <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/roe:block z-50 bg-gray-950 text-gray-200 text-[9px] rounded border border-gray-800 p-2 w-48 shadow-2xl pointer-events-none text-left leading-normal font-sans">
                    Return on Equity: Company earns {fund?.roe?.toFixed(1) ?? "—"}% per year on its own money. Above 15% is good, above 20% is excellent.
                  </div>
                </div>

                {/* Debt to Equity */}
                <div className="flex justify-between items-center relative group/de border-b border-gray-850/30 py-0.5">
                  <span className="text-gray-500 cursor-help select-none flex items-center gap-1">
                    Debt to Equity <span className="text-gray-600 text-[8px]">ℹ</span>
                  </span>
                  <span className={`px-1 py-0.2 rounded border font-bold ${
                    fund?.debtToEquity === null || fund?.debtToEquity === undefined ? "text-gray-500 bg-gray-950 border-gray-900" :
                    isBank ? "text-gray-400 bg-gray-900 border-gray-800" :
                    fund.debtToEquity < 0.3 ? "text-neonGreen bg-neonGreen/10 border-neonGreen/20" :
                    fund.debtToEquity <= 1.0 ? "text-neonAmber bg-neonAmber/10 border-neonAmber/20" :
                    "text-neonRed bg-neonRed/10 border-neonRed/20"
                  }`}>
                    {fund?.debtToEquity?.toFixed(2) ?? "—"}
                  </span>
                  <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/de:block z-50 bg-gray-950 text-gray-200 text-[9px] rounded border border-gray-800 p-2 w-48 shadow-2xl pointer-events-none text-left leading-normal font-sans">
                    Debt to Equity: For every ₹1 of own money this company has ₹{fund?.debtToEquity?.toFixed(2) ?? "—"} of debt. Below 0.5 is healthy. Banks are excluded here.
                  </div>
                </div>

                {/* EPS */}
                <div className="flex justify-between items-center relative group/eps border-b border-gray-850/30 py-0.5">
                  <span className="text-gray-500 cursor-help select-none flex items-center gap-1">
                    EPS <span className="text-gray-600 text-[8px]">ℹ</span>
                  </span>
                  <span className={`px-1 py-0.2 rounded border font-bold ${
                    fund?.eps === null || fund?.eps === undefined ? "text-gray-500 bg-gray-950 border-gray-900" :
                    fund.eps > 0 ? "text-neonGreen bg-neonGreen/10 border-neonGreen/20" :
                    "text-neonRed bg-neonRed/10 border-neonRed/20"
                  }`}>
                    {fund?.eps !== null && fund?.eps !== undefined ? `₹${fund.eps.toFixed(1)}` : "—"}
                  </span>
                  <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/eps:block z-50 bg-gray-950 text-gray-200 text-[9px] rounded border border-gray-800 p-2 w-48 shadow-2xl pointer-events-none text-left leading-normal font-sans">
                    Earnings Per Share: The portion of a company's profit allocated to each outstanding share. Higher is better.
                  </div>
                </div>

                {/* Dividend Yield */}
                <div className="flex justify-between items-center relative group/div border-b border-gray-850/30 py-0.5">
                  <span className="text-gray-500 cursor-help select-none flex items-center gap-1">
                    Div Yield <span className="text-gray-600 text-[8px]">ℹ</span>
                  </span>
                  <span className={`px-1 py-0.2 rounded border font-bold ${
                    fund?.dividendYield === null || fund?.dividendYield === undefined ? "text-gray-500 bg-gray-950 border-gray-900" :
                    fund.dividendYield > 3.0 ? "text-neonGreen bg-neonGreen/10 border-neonGreen/20" :
                    fund.dividendYield >= 1.0 ? "text-neonAmber bg-neonAmber/10 border-neonAmber/20" :
                    "text-gray-400 bg-gray-900 border-gray-800"
                  }`}>
                    {fund?.dividendYield !== null && fund?.dividendYield !== undefined ? `${fund.dividendYield.toFixed(1)}%` : "—"}
                  </span>
                  <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/div:block z-50 bg-gray-950 text-gray-200 text-[9px] rounded border border-gray-800 p-2 w-48 shadow-2xl pointer-events-none text-left leading-normal font-sans">
                    Dividend Yield: Annual dividend payment divided by share price. Higher yield means more cash returned directly to shareholders.
                  </div>
                </div>

                {/* Beta */}
                <div className="flex justify-between items-center relative group/beta py-0.5">
                  <span className="text-gray-500 cursor-help select-none flex items-center gap-1">
                    Beta <span className="text-gray-600 text-[8px]">ℹ</span>
                  </span>
                  <span className={`px-1 py-0.2 rounded border font-bold ${
                    fund?.beta === null || fund?.beta === undefined ? "text-gray-500 bg-gray-950 border-gray-900" :
                    fund.beta < 0.8 ? "text-neonGreen bg-neonGreen/10 border-neonGreen/20" :
                    fund.beta <= 1.3 ? "text-neonAmber bg-neonAmber/10 border-neonAmber/20" :
                    "text-neonRed bg-neonRed/10 border-neonRed/20"
                  }`}>
                    {fund?.beta?.toFixed(2) ?? "—"}
                  </span>
                  <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/beta:block z-50 bg-gray-950 text-gray-200 text-[9px] rounded border border-gray-800 p-2 w-48 shadow-2xl pointer-events-none text-left leading-normal font-sans">
                    Beta: If NIFTY moves 1%, this stock moves ~{fund?.beta?.toFixed(2) ?? "—"}%. Above 1.3 = high volatility.
                  </div>
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
                  <p className="text-gray-600 text-center py-2">No quarterly details found</p>
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
  const [error, setError] = useState(false);

  useEffect(() => {
    setActiveSymbol(defaultSymbol);
    setInputVal(defaultSymbol);
  }, [defaultSymbol]);

  useEffect(() => {
    const fetchRiskData = async () => {
      setLoading(true);
      setError(false);
      try {
        const [fundData, techData] = await Promise.all([
          getFundamentals(activeSymbol),
          getTechnical(activeSymbol)
        ]);

        if (fundData) {
          setFund(fundData);
          setTech(techData);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
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

  return (
    <div className="h-full bg-surface border border-gray-800 flex flex-col hover:border-gray-600 transition-colors overflow-hidden">
      {/* Header with Search */}
      <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none font-mono">
        <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">Risk Meter</span>
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
        {loading ? (
          <p className="text-[10px] text-gray-600 text-center py-4 font-mono">Evaluating risk parameters...</p>
        ) : error ? (
          <p className="text-[10px] text-neonRed text-center py-4 font-mono">Evaluation failed for {activeSymbol}</p>
        ) : (
          <>
            <div className="flex flex-col items-center py-1.5 font-mono">
              <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider mb-1">{activeSymbol} Risk rating</span>
              <div className={`px-3 py-1 rounded border font-mono font-bold tracking-widest text-xs ${riskColor}`}>
                {riskLevel}
              </div>
            </div>

            <div className="w-full space-y-2 text-[10px] font-mono">
              {/* Beta */}
              <div className="flex justify-between border-b border-gray-850 pb-1 relative group/risktooltip">
                <span className="text-gray-500 cursor-help select-none">Beta (vs NIFTY) ℹ</span>
                <span className="font-mono text-white">{beta !== undefined && beta !== null ? beta.toFixed(2) : "—"}</span>
                <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/risktooltip:block z-50 bg-gray-950 text-gray-200 rounded border border-gray-800 p-2 w-48 shadow-2xl pointer-events-none text-left leading-normal font-sans">
                  Beta {beta !== undefined && beta !== null ? beta.toFixed(2) : "—"}: If NIFTY moves 1%, this stock moves ~{beta !== undefined && beta !== null ? beta.toFixed(2) : "—"}%. Above 1.3 = high volatility.
                </div>
              </div>

              {/* Volatility */}
              <div className="flex justify-between border-b border-gray-850 pb-1 relative group/voltooltip">
                <span className="text-gray-500 cursor-help select-none">30D Volatility ℹ</span>
                <span className="font-mono text-white">{hasVol ? `${vol.toFixed(1)}%` : "—"}</span>
                <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/voltooltip:block z-50 bg-gray-950 text-gray-200 rounded border border-gray-800 p-2 w-48 shadow-2xl pointer-events-none text-left leading-normal font-sans">
                  Annualized volatility from last 30 days. Under 20% = low risk, 20–40% = medium, over 40% = high.
                </div>
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
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [minutesAgo, setMinutesAgo] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getScreener(type);
      setResults(data);
      setLastUpdated(new Date());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    fetchData();
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

  return (
    <div className="h-full bg-surface border border-gray-800 flex flex-col overflow-hidden">
      {/* Title Header */}
      <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
        <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">{tabName} Screener</span>
        <span className="text-xs px-1 py-0.5 rounded bg-neonAmber/10 text-neonAmber border border-neonAmber/20">DATA</span>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-1 space-y-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[100px] mt-4 animate-pulse">
            <span className="text-xs text-neonGreen font-bold tracking-widest uppercase">SCANNING NIFTY 50...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-4 text-center mt-4">
            <span className="text-xs text-neonRed font-bold mb-2">⚠ SCAN FAILED — CHECK CONNECTION</span>
            <button
              onClick={handleRefresh}
              className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-neonRed/10 text-neonRed border border-neonRed/30 hover:bg-neonRed/20 transition-all rounded"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="text-xs text-center text-gray-500 mb-2 italic px-1 truncate" title={getScreenerDescription()}>
              {getScreenerDescription()}
            </div>
            {results.length === 0 ? (
              <p className="text-xs text-center text-gray-500 mt-4 px-2">
                NO MATCHES RIGHT NOW — market conditions don't fit this screen.
              </p>
            ) : (
              results.map((item) => {
                const { badgeColor, tooltipText, formattedValue } = getBadgeDetails(item.metricValue);
                return (
                  <div
                    key={item.symbol}
                    className="flex justify-between items-center p-1.5 border border-gray-800/40 bg-white/5 hover:bg-white/10 rounded transition-colors group"
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
                      
                      {/* CSS Hover Tooltip on Badge */}
                      <div className="relative group/tooltip inline-block mt-0.5">
                        <span className={`text-[10px] px-1 py-0.5 rounded border font-mono select-none cursor-help font-bold ${badgeColor}`}>
                          {formattedValue}
                        </span>
                        <div className="absolute right-0 bottom-full mb-2 hidden group-hover/tooltip:block z-50 bg-gray-950 text-gray-200 text-[10px] rounded border border-gray-800 p-2 w-48 shadow-2xl pointer-events-none text-left leading-normal font-sans">
                          {tooltipText}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto border-t border-gray-800 bg-gray-900/40 px-2 py-1.5 flex justify-between items-center text-[10px] text-gray-500 font-mono">
        <span>Last scanned: {lastUpdated ? `${minutesAgo}m ago` : "never"}</span>
        <button
          onClick={handleRefresh}
          className="text-neonAmber hover:text-neonGreen transition-colors flex items-center gap-1 focus:outline-none"
          title="Refresh Data"
        >
          <span>↺</span>
          <span className="uppercase tracking-wider">Refresh</span>
        </button>
      </div>
    </div>
  );
};
