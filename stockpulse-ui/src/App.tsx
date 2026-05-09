import { useEffect, useState } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';
import { setStocks, setConnectionStatus } from './features/stockSlice';
import { fetchDashboardData } from './features/dashboardSlice';
import { Analytics } from '@vercel/analytics/react';
import 'react-resizable/css/styles.css';

const API_BASE = 'https://stockpulseindia.onrender.com';
const MAX_CHARTS = 10;
const TIMEFRAMES = ['15m', '1h', '6h', '1d', '1w', '1m', '6m', '1y', '3y', '5y'] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

type Suggestion = {
  symbol: string;
  name: string;
  tradingViewSymbol: string;
};

type ChartTab = {
  id: string;
  symbol: string;
  title: string;
  tradingViewSymbol: string;
  timeframe: Timeframe;
  embedUrl: string;
  fullChartUrl: string;
};

const makeChartId = () => `chart-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const FINANCIALS_DATA = [
  { metric: 'Revenue (Q3)', value: '₹2.4L Cr', growth: '+11% YoY', status: 'good' },
  { metric: 'Net Profit', value: '₹21K Cr', growth: '+15% YoY', status: 'good' },
  { metric: 'EBITDA Margin', value: '18.4%', growth: '+120 bps', status: 'good' },
  { metric: 'Debt/Equity', value: '0.4x', growth: 'Stable', status: 'neutral' },
];

const RISK_PROFILE = {
  level: 'LOW RISK 🟢',
  color: 'text-neonGreen',
  bg: 'bg-neonGreen/10',
  beta: '0.92',
  volatility: '14.2%',
  warning: 'None currently.'
};

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { stocks, status } = useSelector((state: RootState) => state.stock);
  const { insights, news, loading } = useSelector((state: RootState) => state.dashboard);

  const [chartQuery, setChartQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [chartTabs, setChartTabs] = useState<ChartTab[]>([]);

  // Dynamic Live Data Calculations
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

  const WATCHLIST_SEED = liveStocks.length ? liveStocks
    .slice(0, 4)
    .map(s => ({
      symbol: s.symbol,
      name: s.name,
      target: (s.price * 1.15).toFixed(0),
      thesis: 'Technically looking strong above moving averages.'
    })) : [];

  const BUY_TODAY = liveStocks.length ? liveStocks
    .filter(s => s.changePercent > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 3)
    .map(s => ({
      symbol: s.symbol,
      conviction: s.changePercent > 2 ? 'High' : 'Medium',
      reason: `Strong bullish momentum, up ${s.changePercent.toFixed(2)}% today.`
    })) : [];

  useEffect(() => {
    dispatch(fetchDashboardData());

    const fetchLiveQuotes = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/market/live-quotes`);
        if (res.ok) {
          const data = await res.json();
          dispatch(setStocks(data));
        }
      } catch (e) { }
    };
    fetchLiveQuotes();

    const connection = new HubConnectionBuilder()
      .withUrl(`${API_BASE}/stockHub`)
      .configureLogging(LogLevel.Warning)
      .withAutomaticReconnect()
      .build();

    connection.on('ReceiveStockUpdates', (updatedStocks) => {
      dispatch(setStocks(updatedStocks));
    });

    connection.start()
      .then(() => dispatch(setConnectionStatus('connected')))
      .catch(() => dispatch(setConnectionStatus('error')));

    return () => { connection.stop(); };
  }, [dispatch]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      try {
        const res = await fetch(`${API_BASE}/api/market/symbols?query=${encodeURIComponent(chartQuery.trim())}`);
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
  }, [chartQuery]);

  const [screenerData, setScreenerData] = useState<any[]>([]);
  const [screenerTab, setScreenerTab] = useState('PE');
  useEffect(() => {
    const fetchScreener = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/screener/metrics`);
        if (res.ok) {
          const data = await res.json();
          setScreenerData(data);
        }
      } catch (e) { }
    };
    fetchScreener();
  }, []);

  useEffect(() => {
    const seedDefaultChart = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/market/chart-config?symbol=RELIANCE&timeframe=1d`);
        if (!res.ok) return;
        const data = await res.json();
        setChartTabs([
          {
            id: makeChartId(),
            symbol: data.symbol,
            title: data.name,
            tradingViewSymbol: data.tradingViewSymbol,
            timeframe: '1d',
            embedUrl: data.embedUrl,
            fullChartUrl: data.fullChartUrl,
          },
        ]);
      } catch {
        setChartTabs([]);
      }
    };
    seedDefaultChart();
  }, []);

  const addChartTab = async () => {
    if (!selectedSuggestion || chartTabs.length >= MAX_CHARTS) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/market/chart-config?symbol=${encodeURIComponent(selectedSuggestion.symbol)}&timeframe=1d`,
      );
      if (!res.ok) return;
      const data = await res.json();
      setChartTabs((prev) => [
        ...prev,
        {
          id: makeChartId(),
          symbol: data.symbol,
          title: data.name,
          tradingViewSymbol: data.tradingViewSymbol,
          timeframe: '1d',
          embedUrl: data.embedUrl,
          fullChartUrl: data.fullChartUrl,
        },
      ]);
      setChartQuery('');
      setSelectedSuggestion(null);
      setShowSuggestions(false);
    } catch {
      // No-op fallback
    }
  };

  const setTabTimeframe = async (id: string, timeframe: Timeframe) => {
    const tab = chartTabs.find((t) => t.id === id);
    if (!tab) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/market/chart-config?symbol=${encodeURIComponent(tab.symbol)}&timeframe=${timeframe}`,
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
    } catch {
      // No-op fallback
    }
  };

  const removeChartTab = (id: string) => {
    setChartTabs((prev) => prev.filter((tab) => tab.id !== id));
  };

  return (
    <div className="min-h-screen bg-background font-mono text-gray-200">
      <header className="flex justify-between items-center px-6 py-3 border-b border-gray-800 bg-surface">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-neonGreen animate-pulse" />
          <h1 className="text-lg font-bold tracking-widest text-white">
            STOCK<span className="text-neonAmber">PULSE</span> <span className="text-gray-500">INDIA</span>
          </h1>
        </div>
        <div className="flex items-center gap-4 text-[8px] text-gray-500">
          <span>NSE / BSE</span>
          <span className="text-gray-700">|</span>
          <span>
            STATUS: <span className={status === 'connected' ? 'text-neonGreen' : 'text-neonRed'}>● {status === 'connected' ? 'LIVE' : status.toUpperCase()}</span>
          </span>
          <span className="text-gray-700">|</span>
          <span>{new Date().toLocaleTimeString('en-IN', { hour12: false })} IST</span>
        </div>
      </header>

      <div className="p-2 columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-2">
          <div key="quotes" className="break-inside-avoid mb-2 min-h-[120px] bg-surface border border-gray-800 hover:border-gray-600 transition-colors flex flex-col resize-y overflow-hidden">
            <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
              <span className="text-[8px] uppercase tracking-widest text-gray-500 font-bold">Live Quotes</span>
              <span className="text-[8px] px-2 py-0.5 rounded-full bg-neonGreen/10 text-neonGreen border border-neonGreen/20">LIVE</span>
            </div>
            <div className="flex-1 overflow-y-auto p-1 space-y-2">
              {stocks.length === 0 ? (
                <p className="text-[8px] text-gray-600 mt-4 text-center">Waiting for market data...</p>
              ) : (
                stocks.map((stock: any) => (
                  <div key={stock.symbol} className="flex justify-between items-center py-1.5 px-2 border-b border-gray-800/60 hover:bg-white/5 rounded transition-colors group cursor-pointer">
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-neonAmber transition-colors">{stock.symbol}</div>
                      <div className="text-[8px] text-gray-600">{stock.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono">Rs {stock.price?.toFixed(2)}</div>
                      <div className={`text-[8px] font-bold ${(stock.change ?? 0) >= 0 ? 'text-neonGreen' : 'text-neonRed'}`}>
                        {(stock.change ?? 0) >= 0 ? 'UP' : 'DOWN'} {Math.abs(stock.changePercent ?? 0).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div key="screener" className="break-inside-avoid mb-2 min-h-[200px] bg-surface border border-gray-800 hover:border-gray-600 transition-colors flex flex-col resize-y overflow-hidden">
            <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
              <span className="text-[8px] uppercase tracking-widest text-gray-500 font-bold">Advanced Screener</span>
              <span className="text-[8px] px-2 py-0.5 rounded-full bg-neonGreen/10 text-neonGreen font-bold border border-neonGreen/20">DATA-DRIVEN</span>
            </div>
            
            <div className="flex border-b border-gray-800/60">
              {['PE', 'ROE', 'DEBT', 'GROWTH', 'TECH'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setScreenerTab(tab)}
                  className={`flex-1 text-[8px] py-1 font-bold tracking-widest transition-colors ${screenerTab === tab ? 'bg-white/10 text-neonAmber border-b-2 border-neonAmber' : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-1 space-y-2">
              {screenerData.length === 0 ? (
                <p className="text-[8px] text-gray-600 mt-4 text-center">Loading advanced metrics...</p>
              ) : (() => {
                let filtered = [];
                let description = '';
                if (screenerTab === 'PE') {
                  filtered = screenerData.filter(s => s.isPeHealthy).slice(0, 5);
                  description = "Healthy P/E Ratio (10-25x)";
                } else if (screenerTab === 'ROE') {
                  filtered = screenerData.filter(s => s.isRoeGood).slice(0, 5);
                  description = "Strong ROE (>15%)";
                } else if (screenerTab === 'DEBT') {
                  filtered = screenerData.filter(s => s.isDebtLow).slice(0, 5);
                  description = "Low Debt to Equity (<0.5)";
                } else if (screenerTab === 'GROWTH') {
                  filtered = screenerData.filter(s => s.isGrowthStrong).slice(0, 5);
                  description = "High Revenue & Profit Growth";
                } else if (screenerTab === 'TECH') {
                  filtered = screenerData.filter(s => s.isTechnicalBuy).slice(0, 5);
                  description = "RSI < 30 OR MACD Positive";
                }

                return (
                  <>
                    <div className="text-[8px] text-center text-gray-500 mb-2 italic">Showing: {description}</div>
                    {filtered.length === 0 ? <p className="text-[8px] text-center text-gray-500 mt-2">No stocks fit criteria.</p> : null}
                    {filtered.map(item => (
                      <div key={item.symbol} className="border border-gray-800 rounded p-1.5 bg-gray-900/30 hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => {
                        setChartQuery(item.symbol);
                        const match = suggestions.find(s => s.symbol === item.symbol) || { symbol: item.symbol, name: item.symbol, tradingViewSymbol: `NSE:${item.symbol}` };
                        setSelectedSuggestion(match);
                        addChartTab();
                      }}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-white group-hover:text-neonAmber transition-colors">
                            {item.symbol}
                          </span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded font-bold bg-neonGreen/20 text-neonGreen border border-neonGreen/30">
                            MATCH
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[8px]">
                          {screenerTab === 'PE' && (
                            <>
                              <div className="text-gray-500">P/E Ratio: <span className="text-white font-mono">{item.pe.toFixed(2)}x</span></div>
                              <div className="text-gray-500">EPS: <span className="text-neonGreen">Growing</span></div>
                            </>
                          )}
                          {screenerTab === 'ROE' && (
                            <>
                              <div className="text-gray-500">ROE: <span className="text-white font-mono">{item.roe.toFixed(2)}%</span></div>
                              <div className="text-gray-500">Promoter: <span className="text-white font-mono">{item.promoterHolding}%</span></div>
                            </>
                          )}
                          {screenerTab === 'DEBT' && (
                            <>
                              <div className="text-gray-500">Debt/Eq: <span className="text-white font-mono">{item.debtToEquity.toFixed(2)}</span></div>
                              <div className="text-gray-500">FCF: <span className="text-neonGreen">Positive</span></div>
                            </>
                          )}
                          {screenerTab === 'GROWTH' && (
                            <>
                              <div className="text-gray-500">Rev Growth: <span className="text-neonGreen font-mono">+{item.revenueGrowth.toFixed(1)}%</span></div>
                              <div className="text-gray-500">Profit Growth: <span className="text-neonGreen font-mono">+{item.profitGrowth.toFixed(1)}%</span></div>
                            </>
                          )}
                          {screenerTab === 'TECH' && (
                            <>
                              <div className="text-gray-500">RSI: <span className="text-white font-mono">{item.rsi.toFixed(2)}</span></div>
                              <div className="text-gray-500">MACD: <span className={item.macdPositive ? 'text-neonGreen' : 'text-neonRed'}>{item.macdPositive ? 'Positive' : 'Negative'}</span></div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          </div>

          <div key="chart" className="break-inside-avoid mb-2 min-h-[350px] bg-surface border border-gray-800 flex flex-col resize-y overflow-hidden">
            <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
              <span className="text-[8px] uppercase tracking-widest text-gray-500 font-bold">Chart Station</span>
              <span className="text-[8px] text-gray-600">{chartTabs.length}/{MAX_CHARTS} charts</span>
            </div>
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
                  className="flex-1 bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 text-[8px] text-gray-100 placeholder:text-gray-500"
                />
                <button
                  onClick={addChartTab}
                  disabled={chartTabs.length >= MAX_CHARTS || !selectedSuggestion}
                  className="px-3 py-1 text-[8px] font-bold rounded border border-neonAmber/40 text-neonAmber disabled:text-gray-500 disabled:border-gray-700"
                >
                  Add Chart
                </button>
                {showSuggestions && (
                  <div className="absolute left-0 right-24 top-8 z-20 bg-gray-950 border border-gray-700 rounded-md max-h-44 overflow-y-auto">
                    {isLoadingSuggestions && <div className="px-2 py-2 text-[8px] text-gray-500">Loading symbols...</div>}
                    {!isLoadingSuggestions && suggestions.length === 0 && <div className="px-2 py-2 text-[8px] text-neonRed">No symbol matches found.</div>}
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
                        <div className="text-[8px] text-white">{option.symbol}</div>
                        <div className="text-[8px] text-gray-500">{option.name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {chartQuery && !selectedSuggestion && !isLoadingSuggestions && (
                <div className="text-[8px] text-neonRed mt-1">Please select one symbol from suggestions.</div>
              )}
              <div className="text-[8px] text-gray-500 mt-1">
                Suggestions only. Powered for Indian symbols (NSE/BSE mapping).
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-1 space-y-3">
              {chartTabs.map((tab) => (
                <div key={tab.id} className="border border-gray-800 rounded-md p-1 bg-gray-900/40">
                  <div className="flex justify-between items-center gap-1 mb-2">
                    <div>
                      <div className="text-[8px] font-bold text-white">{tab.symbol}</div>
                      <div className="text-[8px] text-gray-500">{tab.title}</div>
                    </div>
                    <button
                      onClick={() => removeChartTab(tab.id)}
                      className="text-[8px] px-2 py-0.5 border border-gray-700 rounded text-gray-400 hover:text-neonRed hover:border-neonRed/50"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="flex gap-1 flex-wrap mb-2">
                    {TIMEFRAMES.map((frame) => (
                      <button
                        key={`${tab.id}-${frame}`}
                        onClick={() => setTabTimeframe(tab.id, frame)}
                        className={`text-[8px] px-1.5 py-0.5 rounded border ${tab.timeframe === frame ? 'border-neonGreen/60 text-neonGreen bg-neonGreen/10' : 'border-gray-700 text-gray-400'
                          }`}
                      >
                        {frame}
                      </button>
                    ))}
                  </div>
                  <div className="h-72 w-full rounded border border-gray-800 overflow-hidden">
                    <iframe
                      title={`${tab.symbol}-${tab.timeframe}`}
                      src={tab.embedUrl}
                      className="w-full h-full border-0"
                      loading="lazy"
                    />
                  </div>
                  <div className="mt-1 flex justify-between items-center gap-1">
                    <span className="text-[8px] text-gray-500">
                      View: {tab.timeframe} line chart
                    </span>
                    <a
                      href={tab.fullChartUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[8px] text-neonAmber hover:text-neonGreen"
                    >
                      Open live in TradingView
                    </a>
                  </div>
                </div>
              ))}
              {chartTabs.length === 0 && (
                <div className="text-center text-[8px] text-gray-500 py-6">Add a symbol to open chart tabs (max {MAX_CHARTS}).</div>
              )}
            </div>
          </div>

          <div key="watchlist" className="break-inside-avoid mb-2 min-h-[120px] bg-surface border border-gray-800 flex flex-col resize-y overflow-hidden">
            <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
              <div className="flex items-center gap-1">
                <span className="text-[8px] uppercase tracking-widest text-gray-500 font-bold">Smart Watchlist</span>
                <span className="text-[8px] bg-neonGreen/10 text-neonGreen border border-neonGreen/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-neonGreen animate-pulse"></span> Live
                </span>
              </div>
              <span className="text-[8px] text-neonAmber">Curated</span>
            </div>
            <div className="flex-1 overflow-y-auto p-1 space-y-2">
              {WATCHLIST_SEED.length === 0 ? (
                <p className="text-[8px] text-gray-600 text-center">Loading watchlist...</p>
              ) : WATCHLIST_SEED.map((item) => (
                <div key={item.symbol} className="border border-gray-800 rounded p-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] text-white font-bold">{item.symbol}</span>
                    <span className="text-[8px] text-neonGreen">Target Rs {item.target}</span>
                  </div>
                  <div className="text-[8px] text-gray-500">{item.name}</div>
                  <div className="text-[8px] text-gray-300 mt-1">{item.thesis}</div>
                </div>
              ))}
            </div>
          </div>

          <div key="buytoday" className="break-inside-avoid mb-2 min-h-[120px] bg-surface border border-gray-800 flex flex-col resize-y overflow-hidden">
            <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
              <div className="flex items-center gap-1">
                <span className="text-[8px] uppercase tracking-widest text-gray-500 font-bold">Better To Buy Today</span>
                <span className="text-[8px] bg-neonGreen/10 text-neonGreen border border-neonGreen/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-neonGreen animate-pulse"></span> Live
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-1 space-y-2">
              {BUY_TODAY.length === 0 ? (
                <p className="text-[8px] text-gray-600 text-center">Scanning momentum...</p>
              ) : BUY_TODAY.map((item) => (
                <div key={item.symbol} className="p-1 border border-neonGreen/30 rounded bg-neonGreen/5">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-bold text-white">{item.symbol}</span>
                    <span className="text-[8px] text-neonGreen">{item.conviction}</span>
                  </div>
                  <div className="text-[8px] text-gray-300 mt-1">{item.reason}</div>
                </div>
              ))}
            </div>
          </div>

          <div key="fallen" className="break-inside-avoid mb-2 min-h-[120px] bg-surface border border-gray-800 flex flex-col resize-y overflow-hidden">
            <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
              <div className="flex items-center gap-1">
                <span className="text-[8px] uppercase tracking-widest text-gray-500 font-bold">Stocks Down A Lot Today</span>
                <span className="text-[8px] bg-neonGreen/10 text-neonGreen border border-neonGreen/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-neonGreen animate-pulse"></span> Live
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-1 space-y-2">
              {FALLEN_STOCKS.length === 0 ? (
                <p className="text-[8px] text-gray-600 text-center">No stocks down significantly.</p>
              ) : FALLEN_STOCKS.map((item) => (
                <div key={item.symbol} className="p-1 border border-neonRed/30 rounded bg-neonRed/5">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-bold text-white">{item.symbol}</span>
                    <span className="text-[8px] text-neonRed">{item.down}</span>
                  </div>
                  <div className="text-[8px] text-gray-300 mt-1">{item.note}</div>
                </div>
              ))}
            </div>
          </div>

          <div key="insights" className="break-inside-avoid mb-2 min-h-[120px] bg-surface border border-gray-800 flex flex-col resize-y overflow-hidden">
            <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
              <span className="text-[8px] uppercase tracking-widest text-gray-500 font-bold">AI Insights</span>
              <span className="text-[8px] text-neonAmber font-bold">ALERT</span>
            </div>
            <div className="flex-1 overflow-y-auto p-1 space-y-3">
              {loading && <p className="text-[8px] text-gray-600">Initializing AI models...</p>}
              {insights.map((insight: any, idx: number) => (
                <div
                  key={idx}
                  className="border-l-2 pl-2 py-1"
                  style={{ borderColor: insight.sentiment === 'Bullish' ? '#00ff41' : insight.sentiment === 'Bearish' ? '#ff003c' : '#ffb000' }}
                >
                  <div className="text-[8px] font-bold uppercase text-gray-500">{insight.type}</div>
                  <div className="text-[8px] text-gray-200 mt-0.5">{insight.message}</div>
                  <div className={`text-[8px] mt-1 font-bold ${insight.sentiment === 'Bullish' ? 'text-neonGreen' : insight.sentiment === 'Bearish' ? 'text-neonRed' : 'text-neonAmber'}`}>
                    {insight.sentiment}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div key="news" className="break-inside-avoid mb-2 min-h-[120px] bg-surface border border-gray-800 flex flex-col resize-y overflow-hidden">
            <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
              <div className="flex items-center gap-1">
                <span className="text-[8px] uppercase tracking-widest text-gray-500 font-bold">News Sentinel</span>
                <span className="text-[8px] bg-neonGreen/10 text-neonGreen border border-neonGreen/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-neonGreen animate-pulse"></span> Live
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-1 space-y-2">
              {loading && <p className="text-[8px] text-gray-600">Scanning headlines...</p>}
              {news.map((n: any, idx: number) => (
                <div key={idx} className="py-2 border-b border-gray-800/50 hover:bg-white/5 px-1 rounded cursor-pointer">
                  <div className="text-[8px] text-gray-200">{n.headline}</div>
                  <div className="flex justify-between items-center mt-1">
                    <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded ${n.impact === 'Positive' ? 'bg-neonGreen/15 text-neonGreen' : 'bg-neonRed/15 text-neonRed'}`}>
                      {n.impact}
                    </span>
                    <span className="text-[8px] text-gray-600">{n.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div key="financials" className="break-inside-avoid mb-2 bg-surface border border-gray-800 flex flex-col hover:border-gray-600 transition-colors">
            <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
              <div className="flex items-center gap-1">
                <span className="text-[8px] uppercase tracking-widest text-gray-500 font-bold">Financial Summary</span>
                <span className="text-[8px] bg-neonGreen/10 text-neonGreen border border-neonGreen/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-neonGreen animate-pulse"></span> Live
                </span>
              </div>
              <span className="text-[8px] text-neonAmber">Q3 FY26</span>
            </div>
            <div className="flex-1 overflow-y-auto p-1 space-y-3">
              <div className="text-[8px] text-gray-500 mb-1">Reliance Industries (Consolidated)</div>
              {FINANCIALS_DATA.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-gray-800/50 pb-2 last:border-0">
                  <span className="text-[8px] text-gray-300">{item.metric}</span>
                  <div className="text-right">
                    <div className="text-[8px] font-mono font-bold text-white">{item.value}</div>
                    <div className={`text-[8px] font-bold ${item.status === 'good' ? 'text-neonGreen' : 'text-gray-500'}`}>{item.growth}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div key="risk" className="break-inside-avoid mb-2 bg-surface border border-gray-800 flex flex-col hover:border-gray-600 transition-colors">
            <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
              <span className="text-[8px] uppercase tracking-widest text-gray-500 font-bold">Risk Meter</span>
            </div>
            <div className="flex-1 overflow-y-auto p-1 flex flex-col justify-center items-center">
              <div className={`px-4 py-2 rounded border border-gray-700 font-bold tracking-widest text-sm ${RISK_PROFILE.bg} ${RISK_PROFILE.color}`}>
                {RISK_PROFILE.level}
              </div>
              <div className="w-full mt-4 space-y-2 text-[8px]">
                <div className="flex justify-between border-b border-gray-800/50 pb-1">
                  <span className="text-gray-500">Beta (vs NIFTY)</span>
                  <span className="font-mono text-white">{RISK_PROFILE.beta}</span>
                </div>
                <div className="flex justify-between border-b border-gray-800/50 pb-1">
                  <span className="text-gray-500">30D Volatility</span>
                  <span className="font-mono text-white">{RISK_PROFILE.volatility}</span>
                </div>
                <div className="flex justify-between border-b border-gray-800/50 pb-1">
                  <span className="text-gray-500">Active Warnings</span>
                  <span className="text-gray-400">{RISK_PROFILE.warning}</span>
                </div>
              </div>
            </div>
          </div>
      </div>
      <Analytics />
    </div>
  );
}

export default App;
