import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import Sparkline from './ui/Sparkline';
import { openStockPanel } from '../utils/openPanel';

export type Timeframe = '15m' | '1h' | '6h' | '1d' | '1w' | '1m' | '1y';

const TIMEFRAMES: Timeframe[] = ['15m', '1h', '6h', '1d', '1w', '1m', '1y'];
const MAX_CHARTS = 5;

const TAB_SIGNAL_COLORS: Record<string, string> = {
  'STRONG BUY': '#39ff14',
  'BUY': '#7fff00',
  'HOLD': '#ffb300',
  'AVOID': '#ff3131',
};

const TF_HINT: Partial<Record<Timeframe, string>> = {
  '15m': '1', '1h': '2', '6h': '3', '1d': 'D', '1w': 'W', '1m': 'M', '1y': 'Y',
};

interface Suggestion {
  symbol: string;
  name: string;
  tradingViewSymbol: string;
}

export type ChartTab = {
  id: string;
  symbol: string;
  title: string;
  tradingViewSymbol: string;
  timeframe: Timeframe;
  embedUrl: string;
  fullChartUrl: string;
  signal?: string;
  score?: number;
  priceHistory?: number[];
  week52Low?: number;
  week52High?: number;
};

const makeChartId = () => `chart-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

interface ChartStationProps {
  apiBase: string;
}

export default function ChartStation({ apiBase }: ChartStationProps) {
  const [chartQuery, setChartQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [chartTabs, setChartTabs] = useState<ChartTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const liveStocks = useSelector((state: RootState) => state.stock.stocks);

  const getLiveStock = useCallback((symbol: string) => {
    return liveStocks.find(s => s.symbol === symbol);
  }, [liveStocks]);

  // Seeding default RELIANCE tab
  useEffect(() => {
    const seedDefaultChart = async () => {
      try {
        const [chartData, signalData, techData, fundData] = await Promise.all([
          fetch(`${apiBase}/api/market/chart-config?symbol=RELIANCE&timeframe=1d`).then(r => r.ok ? r.json() : null),
          fetch(`${apiBase}/api/signals/buy/RELIANCE`).then(r => r.ok ? r.json() : null),
          fetch(`${apiBase}/api/stock/RELIANCE/technical`).then(r => r.ok ? r.json() : null),
          fetch(`${apiBase}/api/stock/RELIANCE/fundamentals`).then(r => r.ok ? r.json() : null),
        ]);
        if (!chartData) return;
        const newTab: ChartTab = {
          id: makeChartId(),
          symbol: chartData.symbol,
          title: chartData.name,
          tradingViewSymbol: chartData.tradingViewSymbol,
          timeframe: '1d',
          embedUrl: chartData.embedUrl,
          fullChartUrl: chartData.fullChartUrl,
          signal: signalData?.signal ?? 'HOLD',
          score: signalData?.score ?? 50,
          priceHistory: techData?.priceHistory?.map((p: { close: number }) => p.close).slice(-30) ?? [],
          week52Low: fundData?.week52Low ?? undefined,
          week52High: fundData?.week52High ?? undefined,
        };
        setChartTabs([newTab]);
        setActiveTabId(newTab.id);
      } catch (err) {
        console.error('Failed to seed default chart:', err);
        setChartTabs([]);
      }
    };
    seedDefaultChart();
  }, [apiBase]);

  // Suggestions debounced fetch
  useEffect(() => {
    if (!chartQuery.trim()) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      try {
        const res = await fetch(`${apiBase}/api/market/symbols?query=${encodeURIComponent(chartQuery.trim())}`);
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(data);
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [chartQuery, apiBase]);

  const addChartTab = useCallback(async () => {
    const targetSymbol = selectedSuggestion?.symbol;
    if (!targetSymbol || chartTabs.length >= MAX_CHARTS) return;
    try {
      const [chartData, signalData, techData, fundData] = await Promise.all([
        fetch(`${apiBase}/api/market/chart-config?symbol=${encodeURIComponent(targetSymbol)}&timeframe=1d`).then(r => r.ok ? r.json() : null),
        fetch(`${apiBase}/api/signals/buy/${encodeURIComponent(targetSymbol)}`).then(r => r.ok ? r.json() : null),
        fetch(`${apiBase}/api/stock/${encodeURIComponent(targetSymbol)}/technical`).then(r => r.ok ? r.json() : null),
        fetch(`${apiBase}/api/stock/${encodeURIComponent(targetSymbol)}/fundamentals`).then(r => r.ok ? r.json() : null),
      ]);
      if (!chartData) return;
      const newTab: ChartTab = {
        id: makeChartId(),
        symbol: chartData.symbol,
        title: chartData.name,
        tradingViewSymbol: chartData.tradingViewSymbol,
        timeframe: '1d',
        embedUrl: chartData.embedUrl,
        fullChartUrl: chartData.fullChartUrl,
        signal: signalData?.signal ?? 'HOLD',
        score: signalData?.score ?? 50,
        priceHistory: techData?.priceHistory?.map((p: { close: number }) => p.close).slice(-30) ?? [],
        week52Low: fundData?.week52Low ?? undefined,
        week52High: fundData?.week52High ?? undefined,
      };
      setChartTabs(prev => {
        if (prev.some(t => t.symbol === newTab.symbol)) return prev;
        return [...prev, newTab];
      });
      setActiveTabId(newTab.id);
      setChartQuery('');
      setSelectedSuggestion(null);
      setShowSuggestions(false);
    } catch (err) {
      console.error('Failed to add chart tab:', err);
    }
  }, [apiBase, selectedSuggestion, chartTabs]);

  const setTabTimeframe = useCallback(async (id: string, timeframe: Timeframe) => {
    const tab = chartTabs.find((t) => t.id === id);
    if (!tab) return;
    try {
      const res = await fetch(
        `${apiBase}/api/market/chart-config?symbol=${encodeURIComponent(tab.symbol)}&timeframe=${timeframe}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      setChartTabs((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, timeframe, embedUrl: data.embedUrl, fullChartUrl: data.fullChartUrl }
            : item,
        ),
      );
    } catch (err) {
      console.error('Failed to set tab timeframe:', err);
    }
  }, [apiBase, chartTabs]);

  const removeChartTab = useCallback((id: string) => {
    setChartTabs((prev) => {
      const next = prev.filter((tab) => tab.id !== id);
      if (activeTabId === id && next.length > 0) {
        setActiveTabId(next[next.length - 1].id);
      } else if (next.length === 0) {
        setActiveTabId(null);
      }
      return next;
    });
  }, [activeTabId]);

  // openChart event listener to programmatically add tab
  useEffect(() => {
    const handler = (e: Event) => {
      const symbol = (e as CustomEvent).detail as string;
      if (symbol) {
        const existing = chartTabs.find(t => t.symbol === symbol);
        if (existing) {
          setActiveTabId(existing.id);
          return;
        }

        setTimeout(async () => {
          try {
            const [chartData, signalData, techData, fundData] = await Promise.all([
              fetch(`${apiBase}/api/market/chart-config?symbol=${encodeURIComponent(symbol)}&timeframe=1d`).then(r => r.ok ? r.json() : null),
              fetch(`${apiBase}/api/signals/buy/${encodeURIComponent(symbol)}`).then(r => r.ok ? r.json() : null),
              fetch(`${apiBase}/api/stock/${encodeURIComponent(symbol)}/technical`).then(r => r.ok ? r.json() : null),
              fetch(`${apiBase}/api/stock/${encodeURIComponent(symbol)}/fundamentals`).then(r => r.ok ? r.json() : null),
            ]);
            if (!chartData) return;
            const newTab: ChartTab = {
              id: makeChartId(),
              symbol: chartData.symbol,
              title: chartData.name,
              tradingViewSymbol: chartData.tradingViewSymbol,
              timeframe: '1d',
              embedUrl: chartData.embedUrl,
              fullChartUrl: chartData.fullChartUrl,
              signal: signalData?.signal ?? 'HOLD',
              score: signalData?.score ?? 50,
              priceHistory: techData?.priceHistory?.map((p: { close: number }) => p.close).slice(-30) ?? [],
              week52Low: fundData?.week52Low ?? undefined,
              week52High: fundData?.week52High ?? undefined,
            };
            setChartTabs(prev => {
              if (prev.some(t => t.symbol === newTab.symbol)) return prev;
              return [...prev, newTab];
            });
            setActiveTabId(newTab.id);
          } catch (err) {
            console.error('Failed to auto-add chart tab from event:', err);
          }
        }, 10);
      }
    };
    window.addEventListener('openChart', handler);
    return () => window.removeEventListener('openChart', handler);
  }, [apiBase, chartTabs]);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (!activeTabId) return;

      const TF_SHORTCUTS: Record<string, Timeframe> = {
        '1': '15m', '2': '1h', '3': '6h',
        'd': '1d', 'w': '1w', 'm': '1m',
        'y': '1y',
      };

      const tf = TF_SHORTCUTS[e.key.toLowerCase()];
      if (tf) {
        e.preventDefault();
        setTabTimeframe(activeTabId, tf);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTabId, setTabTimeframe]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Chart Station Header Title */}
      <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
        <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">Chart Station</span>
        <span className="text-xs text-gray-600">{chartTabs.length}/{MAX_CHARTS} charts</span>
      </div>

      {/* Aggregate signals summary badge */}
      {chartTabs.length > 0 && (
        <div className="px-3 py-1 flex gap-3 text-[9px] font-mono text-gray-600 border-b border-gray-800/50">
          {['STRONG BUY', 'BUY', 'HOLD', 'AVOID'].map(sig => {
            const count = chartTabs.filter(t => t.signal === sig).length;
            if (count === 0) return null;
            const color = TAB_SIGNAL_COLORS[sig];
            return <span key={sig} style={{ color }}>{count} {sig}</span>;
          })}
        </div>
      )}

      {/* Search Input Bar */}
      <div className="px-3 pt-3">
        <div className="relative flex gap-1">
          <input
            value={chartQuery}
            onFocus={() => setShowSuggestions(true)}
            onChange={(e) => {
              setChartQuery(e.target.value);
              setSelectedSuggestion(null);
              setShowSuggestions(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addChartTab();
              if (e.key === 'Escape') setShowSuggestions(false);
            }}
            placeholder="Search symbol (RELIANCE, NIFTY 50)"
            className="flex-1 bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 text-xs text-gray-100 placeholder:text-gray-500"
          />
          <button
            onClick={addChartTab}
            disabled={chartTabs.length >= MAX_CHARTS || !selectedSuggestion}
            className="px-3 py-1 text-xs font-bold rounded border border-neonAmber/40 text-neonAmber disabled:text-gray-500 disabled:border-gray-700"
          >
            Add Chart
          </button>
          {showSuggestions && (
            <div className="absolute left-0 right-24 top-8 z-20 bg-gray-950 border border-gray-700 rounded-md max-h-44 overflow-y-auto">
              {isLoadingSuggestions && <div className="px-2 py-2 text-xs text-gray-500">Loading symbols...</div>}
              {!isLoadingSuggestions && suggestions.length === 0 && <div className="px-2 py-2 text-xs text-neonRed">No symbol matches found.</div>}
              {!isLoadingSuggestions && suggestions.map((option) => (
                <button
                  key={`${option.symbol}-${option.tradingViewSymbol}`}
                  onClick={() => {
                    setChartQuery(option.symbol);
                    setSelectedSuggestion(option);
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-1.5 py-0.5 hover:bg-white/10 border-b border-gray-800 last:border-b-0"
                >
                  <div className="text-xs font-bold text-gray-200">{option.symbol}</div>
                  <div className="text-[10px] text-gray-500 truncate">{option.name}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs and Views Area */}
      <div className="flex-1 overflow-hidden mt-3 relative bg-black flex flex-col">
        {/* Tab Bar */}
        {chartTabs.length > 0 && (
          <div className="flex bg-gray-900/50 border-b border-gray-800 overflow-x-auto no-scrollbar shrink-0">
            {chartTabs.map((tab) => {
              const sigColor = TAB_SIGNAL_COLORS[tab.signal ?? 'HOLD'] ?? '#ffb300';
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`flex items-center gap-1.5 border-r border-gray-800 px-2 py-1 bg-surface hover:bg-white/5 transition-colors group cursor-pointer ${isActive ? 'bg-white/5' : ''}`}
                  style={{ borderBottom: `2px solid ${sigColor}${isActive ? '99' : '33'}` }}
                >
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sigColor, boxShadow: `0 0 4px ${sigColor}` }} />
                    <span className="text-xs font-bold text-gray-300 whitespace-nowrap">{tab.symbol}</span>
                    {tab.priceHistory && tab.priceHistory.length > 2 && (
                      <Sparkline data={tab.priceHistory} width={36} height={14} />
                    )}
                  </div>
                  {/* Score badge */}
                  {tab.score != null && (
                    <span className="text-[9px] font-mono px-1 rounded shrink-0 select-none" style={{ color: sigColor, background: `${sigColor}15` }}>
                      {tab.score}
                    </span>
                  )}
                  {/* Open Dossier Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openStockPanel(tab.symbol);
                    }}
                    title="Open stock dossier →"
                    className="px-1 py-0.5 text-[9px] font-mono text-gray-600 hover:text-neonGreen border border-transparent hover:border-neonGreen/30 rounded transition-all select-none"
                  >
                    INFO
                  </button>
                  {/* Timeframe selector */}
                  <div className="flex gap-0.5 ml-1">
                    {TIMEFRAMES.map((tf) => (
                      <button
                        key={tf}
                        onClick={(e) => {
                          e.stopPropagation();
                          setTabTimeframe(tab.id, tf);
                        }}
                        title={TF_HINT[tf] ? `Shortcut: ${TF_HINT[tf]}` : undefined}
                        className={`text-[10px] px-1 rounded relative group select-none ${tab.timeframe === tf ? 'bg-neonAmber text-black font-bold' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                        {tf}
                        {isActive && TF_HINT[tf] && (
                          <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[8px] text-gray-700 font-mono hidden group-hover:block z-20">
                            {TF_HINT[tf]}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  {/* Remove Tab */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeChartTab(tab.id);
                    }}
                    className="ml-1 text-gray-600 hover:text-neonRed select-none"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Charts lists */}
        <div className="flex-1 overflow-y-auto p-1 space-y-1">
          {chartTabs.map((tab) => {
            const live = getLiveStock(tab.symbol);
            const isUp = live?.changePercent != null ? live.changePercent >= 0 : true;
            return (
              <div key={tab.id} className="w-full h-[380px] shrink-0 border border-gray-800 bg-black rounded overflow-hidden flex flex-col">
                {/* Price context bar */}
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800/50 bg-gray-950/80 font-mono">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-white">{tab.symbol}</span>
                    {(live?.price ?? tab.week52Low) != null && (
                      <span className="text-sm font-bold text-white">₹{(live?.price ?? tab.week52Low)?.toFixed(2)}</span>
                    )}
                    {live?.changePercent != null && (
                      <span className={`text-xs font-bold ${isUp ? 'text-neonGreen' : 'text-neonRed'}`}>
                        {isUp ? '▲' : '▼'} {Math.abs(live.changePercent).toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {/* 52W range mini indicator */}
                    {tab.week52Low != null && tab.week52High != null && (live?.price ?? tab.week52Low) != null && (
                      <div className="flex items-center gap-1.5 text-[9px] text-gray-600">
                        <span>52W:</span>
                        <span>₹{tab.week52Low.toFixed(0)}</span>
                        <div className="w-12 h-1 bg-gray-800 rounded-full relative">
                          <div className="absolute top-0 bottom-0 left-0 bg-neonGreen/40 rounded-full"
                            style={{ width: `${Math.min(100, (((live?.price ?? tab.week52Low ?? 0) - tab.week52Low) / (tab.week52High - tab.week52Low)) * 100)}%` }} />
                        </div>
                        <span>₹{tab.week52High.toFixed(0)}</span>
                      </div>
                    )}
                    <button
                      onClick={() => openStockPanel(tab.symbol)}
                      className="text-[10px] text-gray-600 hover:text-neonGreen border border-gray-800 hover:border-neonGreen/30 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                    >
                      DOSSIER →
                    </button>
                    <button
                      onClick={() => removeChartTab(tab.id)}
                      className="text-gray-600 hover:text-neonRed text-xs transition-colors cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Iframe */}
                <div className="flex-1">
                  <iframe src={tab.embedUrl} className="w-full h-full border-0" allow="fullscreen" />
                </div>
              </div>
            );
          })}
          {chartTabs.length === 0 && (
            <div className="text-center text-xs text-gray-500 py-6 font-mono">Add a symbol to open chart tabs (max {MAX_CHARTS}).</div>
          )}
        </div>
      </div>
    </div>
  );
}
