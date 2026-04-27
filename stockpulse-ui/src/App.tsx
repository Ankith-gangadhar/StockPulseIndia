import { useEffect, useState } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';
import { setStocks, setConnectionStatus } from './features/stockSlice';
import { fetchDashboardData } from './features/dashboardSlice';
import { Analytics } from '@vercel/analytics/react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const API_BASE = 'http://localhost:5200';
const MAX_CHARTS = 10;
const TIMEFRAMES = ['15m', '1h', '6h', '1d', '1w', '1m', '6m', '1y', '3y', '5y'] as const;
type Timeframe = (typeof TIMEFRAMES)[number];
const AnyGridLayout = GridLayout as any;

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

const WATCHLIST_SEED = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', target: '3120', thesis: 'Refining margin expansion + telecom ARPU support.' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', target: '1560', thesis: 'Loan growth remains resilient with improving NIM trend.' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', target: '3950', thesis: 'Order pipeline and rupee weakness can aid margins.' },
  { symbol: 'INFY', name: 'Infosys', target: '1725', thesis: 'Large-deal wins and valuation support after correction.' },
];

const BUY_TODAY = [
  { symbol: 'BHARTIARTL', reason: 'Telecom tariff hike probability improving earnings visibility.', conviction: 'High' },
  { symbol: 'SUNPHARMA', reason: 'Defensive earnings with positive US specialty pipeline.', conviction: 'Medium' },
  { symbol: 'TITAN', reason: 'Jewellery demand remains robust; margin normalization expected.', conviction: 'Medium' },
];

const FALLEN_STOCKS = [
  { symbol: 'ADANIPORTS', down: '-4.6%', note: 'Sharp fall on profit-booking; watch support zone before entry.' },
  { symbol: 'SBIN', down: '-3.9%', note: 'Rate sensitivity and treasury concerns hit banking sentiment.' },
  { symbol: 'WIPRO', down: '-3.3%', note: 'IT outlook jitters after cautious management commentary.' },
];

const makeChartId = () => `chart-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const initialLayout = [
  { i: 'quotes', x: 0, y: 0, w: 3, h: 5, minW: 2, minH: 3 },
  { i: 'chart', x: 3, y: 0, w: 6, h: 7, minW: 4, minH: 4 },
  { i: 'insights', x: 9, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
  { i: 'news', x: 9, y: 3, w: 3, h: 4, minW: 2, minH: 2 },
  { i: 'watchlist', x: 0, y: 5, w: 4, h: 4, minW: 3, minH: 3 },
  { i: 'buytoday', x: 4, y: 7, w: 4, h: 3, minW: 2, minH: 2 },
  { i: 'fallen', x: 8, y: 7, w: 4, h: 3, minW: 2, minH: 2 },
];

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
  const [layout, setLayout] = useState(initialLayout);
  const [gridWidth, setGridWidth] = useState(Math.max(1200, window.innerWidth - 24));

  useEffect(() => {
    dispatch(fetchDashboardData());

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
    const onResize = () => setGridWidth(Math.max(1200, window.innerWidth - 24));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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

  useEffect(() => {
    const seedDefaultChart = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/market/chart-config?symbol=NIFTY 50&timeframe=1d`);
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
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>NSE / BSE</span>
          <span className="text-gray-700">|</span>
          <span>
            STATUS: <span className={status === 'connected' ? 'text-neonGreen' : 'text-neonRed'}>● {status === 'connected' ? 'LIVE' : status.toUpperCase()}</span>
          </span>
          <span className="text-gray-700">|</span>
          <span>{new Date().toLocaleTimeString('en-IN', { hour12: false })} IST</span>
        </div>
      </header>

      <div className="p-2">
        <AnyGridLayout
          layout={layout}
          onLayoutChange={(next: any) => setLayout(next)}
          cols={12}
          width={gridWidth}
          rowHeight={80}
          margin={[8, 8]}
          containerPadding={[4, 4]}
          isResizable
          resizeHandles={['se']}
          draggableHandle=".drag-handle"
          useCSSTransforms
        >
          <div key="quotes" className="bg-surface border border-gray-800 hover:border-gray-600 transition-colors flex flex-col">
            <div className="drag-handle cursor-move flex justify-between items-center px-3 py-2 border-b border-gray-800 bg-gray-900/60 select-none">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Live Quotes</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-neonGreen/10 text-neonGreen border border-neonGreen/20">LIVE</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {stocks.length === 0 ? (
                <p className="text-xs text-gray-600 mt-4 text-center">Waiting for market data...</p>
              ) : (
                stocks.map((stock: any) => (
                  <div key={stock.symbol} className="flex justify-between items-center py-1.5 px-2 border-b border-gray-800/60 hover:bg-white/5 rounded transition-colors group cursor-pointer">
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-neonAmber transition-colors">{stock.symbol}</div>
                      <div className="text-[10px] text-gray-600">{stock.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono">Rs {stock.price?.toFixed(2)}</div>
                      <div className={`text-[10px] font-bold ${(stock.change ?? 0) >= 0 ? 'text-neonGreen' : 'text-neonRed'}`}>
                        {(stock.change ?? 0) >= 0 ? 'UP' : 'DOWN'} {Math.abs(stock.changePercent ?? 0).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div key="chart" className="bg-surface border border-gray-800 flex flex-col">
            <div className="drag-handle cursor-move flex justify-between items-center px-3 py-2 border-b border-gray-800 bg-gray-900/60 select-none">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Chart Station</span>
              <span className="text-[10px] text-gray-600">{chartTabs.length}/{MAX_CHARTS} charts</span>
            </div>
            <div className="px-3 pt-3">
              <div className="relative flex gap-2">
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
                  className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-100 placeholder:text-gray-500"
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
                    {isLoadingSuggestions && <div className="px-2 py-2 text-[10px] text-gray-500">Loading symbols...</div>}
                    {!isLoadingSuggestions && suggestions.length === 0 && <div className="px-2 py-2 text-[10px] text-neonRed">No symbol matches found.</div>}
                    {!isLoadingSuggestions && suggestions.map((option) => (
                      <button
                        key={`${option.symbol}-${option.tradingViewSymbol}`}
                        onClick={() => {
                          setChartQuery(option.symbol);
                          setSelectedSuggestion(option);
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-2 py-1.5 hover:bg-white/10 border-b border-gray-800 last:border-b-0"
                      >
                        <div className="text-xs text-white">{option.symbol}</div>
                        <div className="text-[10px] text-gray-500">{option.name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {chartQuery && !selectedSuggestion && !isLoadingSuggestions && (
                <div className="text-[10px] text-neonRed mt-1">Please select one symbol from suggestions.</div>
              )}
              <div className="text-[10px] text-gray-500 mt-1">
                Suggestions only. Powered for Indian symbols (NSE/BSE mapping).
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {chartTabs.map((tab) => (
                <div key={tab.id} className="border border-gray-800 rounded-md p-2 bg-gray-900/40">
                  <div className="flex justify-between items-center gap-2 mb-2">
                    <div>
                      <div className="text-xs font-bold text-white">{tab.symbol}</div>
                      <div className="text-[10px] text-gray-500">{tab.title}</div>
                    </div>
                    <button
                      onClick={() => removeChartTab(tab.id)}
                      className="text-[10px] px-2 py-0.5 border border-gray-700 rounded text-gray-400 hover:text-neonRed hover:border-neonRed/50"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="flex gap-1 flex-wrap mb-2">
                    {TIMEFRAMES.map((frame) => (
                      <button
                        key={`${tab.id}-${frame}`}
                        onClick={() => setTabTimeframe(tab.id, frame)}
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${tab.timeframe === frame ? 'border-neonGreen/60 text-neonGreen bg-neonGreen/10' : 'border-gray-700 text-gray-400'
                          }`}
                      >
                        {frame}
                      </button>
                    ))}
                  </div>
                  <div className="h-56 w-full rounded border border-gray-800 overflow-hidden">
                    <iframe
                      title={`${tab.symbol}-${tab.timeframe}`}
                      src={tab.embedUrl}
                      className="w-full h-full border-0"
                      loading="lazy"
                    />
                  </div>
                  <div className="mt-1 flex justify-between items-center gap-2">
                    <span className="text-[10px] text-gray-500">
                      View: {tab.timeframe} line chart
                    </span>
                    <a
                      href={tab.fullChartUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-neonAmber hover:text-neonGreen"
                    >
                      Open live in TradingView
                    </a>
                  </div>
                </div>
              ))}
              {chartTabs.length === 0 && (
                <div className="text-center text-xs text-gray-500 py-6">Add a symbol to open chart tabs (max {MAX_CHARTS}).</div>
              )}
            </div>
          </div>

          <div key="watchlist" className="bg-surface border border-gray-800 flex flex-col">
            <div className="drag-handle cursor-move flex justify-between items-center px-3 py-2 border-b border-gray-800 bg-gray-900/60 select-none">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Smart Watchlist</span>
              <span className="text-[10px] text-neonAmber">Curated</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {WATCHLIST_SEED.map((item) => (
                <div key={item.symbol} className="border border-gray-800 rounded p-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white font-bold">{item.symbol}</span>
                    <span className="text-[10px] text-neonGreen">Target Rs {item.target}</span>
                  </div>
                  <div className="text-[10px] text-gray-500">{item.name}</div>
                  <div className="text-[10px] text-gray-300 mt-1">{item.thesis}</div>
                </div>
              ))}
            </div>
          </div>

          <div key="buytoday" className="bg-surface border border-gray-800 flex flex-col">
            <div className="drag-handle cursor-move flex justify-between items-center px-3 py-2 border-b border-gray-800 bg-gray-900/60 select-none">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Better To Buy Today</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {BUY_TODAY.map((item) => (
                <div key={item.symbol} className="p-2 border border-neonGreen/30 rounded bg-neonGreen/5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white">{item.symbol}</span>
                    <span className="text-[10px] text-neonGreen">{item.conviction}</span>
                  </div>
                  <div className="text-[10px] text-gray-300 mt-1">{item.reason}</div>
                </div>
              ))}
            </div>
          </div>

          <div key="fallen" className="bg-surface border border-gray-800 flex flex-col">
            <div className="drag-handle cursor-move flex justify-between items-center px-3 py-2 border-b border-gray-800 bg-gray-900/60 select-none">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Stocks Down A Lot Today</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {FALLEN_STOCKS.map((item) => (
                <div key={item.symbol} className="p-2 border border-neonRed/30 rounded bg-neonRed/5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white">{item.symbol}</span>
                    <span className="text-[10px] text-neonRed">{item.down}</span>
                  </div>
                  <div className="text-[10px] text-gray-300 mt-1">{item.note}</div>
                </div>
              ))}
            </div>
          </div>

          <div key="insights" className="bg-surface border border-gray-800 flex flex-col">
            <div className="drag-handle cursor-move flex justify-between items-center px-3 py-2 border-b border-gray-800 bg-gray-900/60 select-none">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">AI Insights</span>
              <span className="text-[10px] text-neonAmber font-bold">ALERT</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {loading && <p className="text-xs text-gray-600">Initializing AI models...</p>}
              {insights.map((insight: any, idx: number) => (
                <div
                  key={idx}
                  className="border-l-2 pl-2 py-1"
                  style={{ borderColor: insight.sentiment === 'Bullish' ? '#00ff41' : insight.sentiment === 'Bearish' ? '#ff003c' : '#ffb000' }}
                >
                  <div className="text-[10px] font-bold uppercase text-gray-500">{insight.type}</div>
                  <div className="text-xs text-gray-200 mt-0.5">{insight.message}</div>
                  <div className={`text-[10px] mt-1 font-bold ${insight.sentiment === 'Bullish' ? 'text-neonGreen' : insight.sentiment === 'Bearish' ? 'text-neonRed' : 'text-neonAmber'}`}>
                    {insight.sentiment}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div key="news" className="bg-surface border border-gray-800 flex flex-col">
            <div className="drag-handle cursor-move flex justify-between items-center px-3 py-2 border-b border-gray-800 bg-gray-900/60 select-none">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">News Sentinel</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading && <p className="text-xs text-gray-600">Scanning headlines...</p>}
              {news.map((n: any, idx: number) => (
                <div key={idx} className="py-2 border-b border-gray-800/50 hover:bg-white/5 px-1 rounded cursor-pointer">
                  <div className="text-xs text-gray-200">{n.headline}</div>
                  <div className="flex justify-between items-center mt-1">
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${n.impact === 'Positive' ? 'bg-neonGreen/15 text-neonGreen' : 'bg-neonRed/15 text-neonRed'}`}>
                      {n.impact}
                    </span>
                    <span className="text-[9px] text-gray-600">{n.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AnyGridLayout>
      </div>
      <Analytics />
    </div>
  );
}

export default App;
