import { useEffect, useState } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';
import { setStocks, setConnectionStatus } from './features/stockSlice';
import { fetchDashboardData } from './features/dashboardSlice';
import { Analytics } from '@vercel/analytics/react';
import { Responsive as ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import {
  LiveQuotesWidget,
  SmartWatchlistWidget,
  BuyTodayWidget,
  FallenStocksWidget,
  AIInsightsWidget,
  NewsSentinelWidget,
  FinancialSummaryWidget,
  RiskMeterWidget,
  ScreenerMetricWidget
} from './components/Widgets';

const defaultLayout = [
  { i: 'quotes', x: 0, y: 0, w: 1, h: 2, minW: 1, minH: 1 },
  { i: 'screener-PE', x: 1, y: 0, w: 1, h: 2, minW: 1, minH: 1 },
  { i: 'screener-ROE', x: 2, y: 0, w: 1, h: 2, minW: 1, minH: 1 },
  { i: 'screener-DEBT', x: 3, y: 0, w: 1, h: 2, minW: 1, minH: 1 },
  { i: 'screener-GROWTH', x: 4, y: 0, w: 1, h: 2, minW: 1, minH: 1 },
  { i: 'screener-TECH', x: 0, y: 2, w: 1, h: 2, minW: 1, minH: 1 },
  { i: 'watchlist', x: 1, y: 2, w: 1, h: 2, minW: 1, minH: 1 },
  { i: 'buytoday', x: 2, y: 2, w: 1, h: 2, minW: 1, minH: 1 },
  { i: 'fallen', x: 3, y: 2, w: 1, h: 2, minW: 1, minH: 1 },
  { i: 'financials', x: 4, y: 2, w: 1, h: 2, minW: 1, minH: 1 },
  { i: 'chart', x: 0, y: 4, w: 3, h: 4, minW: 2, minH: 3 },
  { i: 'insights', x: 3, y: 4, w: 2, h: 2, minW: 1, minH: 1 },
  { i: 'news', x: 3, y: 6, w: 1, h: 2, minW: 1, minH: 1 },
  { i: 'risk', x: 4, y: 6, w: 1, h: 2, minW: 1, minH: 1 },
];

const API_BASE = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5200'
  : 'https://stockpulseindia.onrender.com';
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

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { status } = useSelector((state: RootState) => state.stock);

  const [chartQuery, setChartQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [chartTabs, setChartTabs] = useState<ChartTab[]>([]);
  
  const [layout, setLayout] = useState(defaultLayout);
  const { width, containerRef, mounted } = useContainerWidth();

  const [screenerData, setScreenerData] = useState<any[]>([]);
  
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
      .withUrl(`${API_BASE}/stockhub`)
      .configureLogging(LogLevel.Information)
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
    <div ref={containerRef} className="min-h-screen bg-background font-mono text-gray-200">
      <header className="flex justify-between items-center px-6 py-3 border-b border-gray-800 bg-surface">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-neonGreen animate-pulse" />
          <h1 className="text-lg font-bold tracking-widest text-white">
            STOCK<span className="text-neonAmber">PULSE</span> <span className="text-gray-500">ANKITH</span>
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

      {mounted && (() => {
        const Grid = ResponsiveGridLayout as any;
        return (
          <Grid
            className="layout"
            width={width}
            layouts={{ lg: layout }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 5, md: 4, sm: 3, xs: 2, xxs: 1 }}
            rowHeight={100}
            onLayoutChange={(newLayout: any) => setLayout(newLayout)}
            draggableHandle=".drag-handle"
            margin={[8, 8]}
          >
            <div key="quotes" className="h-full"><LiveQuotesWidget /></div>
            <div key="screener-PE" className="h-full"><ScreenerMetricWidget tabName="PE" screenerData={screenerData} /></div>
            <div key="screener-ROE" className="h-full"><ScreenerMetricWidget tabName="ROE" screenerData={screenerData} /></div>
            <div key="screener-DEBT" className="h-full"><ScreenerMetricWidget tabName="DEBT" screenerData={screenerData} /></div>
            <div key="screener-GROWTH" className="h-full"><ScreenerMetricWidget tabName="GROWTH" screenerData={screenerData} /></div>
            <div key="screener-TECH" className="h-full"><ScreenerMetricWidget tabName="TECH" screenerData={screenerData} /></div>

            <div key="chart" className="h-full bg-surface border border-gray-800 flex flex-col overflow-hidden">
              <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
                <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">Chart Station</span>
                <span className="text-xs text-gray-600">{chartTabs.length}/{MAX_CHARTS} charts</span>
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

              <div className="flex-1 overflow-hidden mt-3 relative bg-black flex flex-col">
                {chartTabs.length > 0 && (
                  <div className="flex bg-gray-900/50 border-b border-gray-800 overflow-x-auto no-scrollbar shrink-0">
                    {chartTabs.map((tab) => (
                      <div key={tab.id} className="flex items-center gap-1 border-r border-gray-800 px-2 py-1 bg-surface hover:bg-white/5 transition-colors group">
                        <span className="text-xs font-bold text-gray-300 whitespace-nowrap">{tab.symbol}</span>
                        <div className="flex gap-0.5 ml-1">
                          {TIMEFRAMES.map((tf) => (
                            <button
                              key={tf}
                              onClick={() => setTabTimeframe(tab.id, tf)}
                              className={`text-[10px] px-1 rounded ${tab.timeframe === tf ? 'bg-neonAmber text-black font-bold' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                              {tf}
                            </button>
                          ))}
                        </div>
                        <button onClick={() => removeChartTab(tab.id)} className="ml-1 text-gray-600 hover:text-neonRed">×</button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-1 space-y-1">
                  {chartTabs.map((tab) => (
                    <div key={tab.id} className="w-full h-[350px] shrink-0 border border-gray-800 bg-black relative rounded overflow-hidden">
                      <div className="absolute top-1 left-1 z-10 px-1 bg-black/80 rounded border border-gray-800 text-xs text-gray-400 font-bold">
                        {tab.symbol} • {tab.timeframe}
                      </div>
                      <iframe src={tab.embedUrl} className="w-full h-full border-0" allow="fullscreen" />
                    </div>
                  ))}
                  {chartTabs.length === 0 && (
                    <div className="text-center text-xs text-gray-500 py-6">Add a symbol to open chart tabs (max {MAX_CHARTS}).</div>
                  )}
                </div>
              </div>
            </div>

            <div key="watchlist" className="h-full"><SmartWatchlistWidget /></div>
            <div key="buytoday" className="h-full"><BuyTodayWidget /></div>
            <div key="fallen" className="h-full"><FallenStocksWidget /></div>
            <div key="insights" className="h-full"><AIInsightsWidget /></div>
            <div key="news" className="h-full"><NewsSentinelWidget /></div>
            <div key="financials" className="h-full"><FinancialSummaryWidget /></div>
            <div key="risk" className="h-full"><RiskMeterWidget /></div>
          </Grid>
        );
      })()}
      <Analytics />
    </div>
  );
}

export default App;
