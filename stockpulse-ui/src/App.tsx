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
import GlobalSearch from './components/GlobalSearch';
import StockPanel from './components/StockPanel/StockPanel';
import ChartStation from './components/ChartStation';
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
import { FIIDIIWidget } from './components/widgets/FIIDIIWidget';
import MarketStatusBar from './components/MarketStatusBar';
import MarketStateOverlay from './components/MarketStateOverlay';
import { getMarketStatus } from './services/stockApi';

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
  { i: 'fiidii', x: 0, y: 8, w: 1, h: 2, minW: 1, minH: 1 },
];

import { getApiBaseUrl } from './services/stockApi';

const API_BASE = getApiBaseUrl();
function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { status } = useSelector((state: RootState) => state.stock);

  const [panelSymbol, setPanelSymbol] = useState<string | null>(null);
  
  const [layout, setLayout] = useState(defaultLayout);
  const { width, containerRef, mounted } = useContainerWidth();
  const [marketOpen, setMarketOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const symbol = (e as CustomEvent).detail as string;
      if (symbol) setPanelSymbol(symbol);
    };
    window.addEventListener('openStockPanel', handler);
    return () => window.removeEventListener('openStockPanel', handler);
  }, []);

  useEffect(() => {
    getMarketStatus().then(s => { if (s) setMarketOpen(s.isOpen); });
    const iv = setInterval(() => getMarketStatus().then(s => { if (s) setMarketOpen(s.isOpen); }), 60000);
    return () => clearInterval(iv);
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
      } catch (e) {
        console.error('Failed to fetch live quotes:', e);
      }
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

  return (
    <div ref={containerRef} className={`min-h-screen bg-background font-mono text-gray-200 scan-sweep ${marketOpen === false ? 'market-closed-dim' : 'market-open-bright'}`}>
      <MarketStateOverlay />
      <header className="flex justify-between items-center px-6 py-3 border-b border-gray-800 bg-surface">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-neonGreen animate-pulse" />
          <h1 className="text-lg font-bold tracking-widest text-white neon-text">
            STOCK<span className="text-neonAmber">PULSE</span> <span className="text-gray-500">ANKITH</span>
          </h1>
        </div>
        <GlobalSearch onSelectStock={(symbol) => setPanelSymbol(symbol)} />
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
      <StockPanel symbol={panelSymbol} onClose={() => setPanelSymbol(null)} />
      <MarketStatusBar />

      {mounted && (() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Grid = ResponsiveGridLayout as any;
        return (
          <div className="grid-bg relative">
          <Grid
            className="layout relative z-10"
            width={width}
            layouts={{ lg: layout }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 5, md: 4, sm: 3, xs: 2, xxs: 1 }}
            rowHeight={100}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onLayoutChange={(newLayout: any) => setLayout(newLayout)}
            draggableHandle=".drag-handle"
            margin={[8, 8]}
          >
            <div key="quotes" className="h-full"><LiveQuotesWidget /></div>
            <div key="screener-PE" className="h-full"><ScreenerMetricWidget tabName="PE" /></div>
            <div key="screener-ROE" className="h-full"><ScreenerMetricWidget tabName="ROE" /></div>
            <div key="screener-DEBT" className="h-full"><ScreenerMetricWidget tabName="DEBT" /></div>
            <div key="screener-GROWTH" className="h-full"><ScreenerMetricWidget tabName="GROWTH" /></div>
            <div key="screener-TECH" className="h-full"><ScreenerMetricWidget tabName="TECH" /></div>

            <div key="chart" className="h-full bg-surface border border-gray-800 flex flex-col overflow-hidden widget-card">
              <ChartStation apiBase={API_BASE} />
            </div>

            <div key="watchlist" className="h-full"><SmartWatchlistWidget /></div>
            <div key="buytoday" className="h-full"><BuyTodayWidget /></div>
            <div key="fallen" className="h-full"><FallenStocksWidget /></div>
            <div key="insights" className="h-full"><AIInsightsWidget /></div>
            <div key="news" className="h-full"><NewsSentinelWidget /></div>
            <div key="financials" className="h-full"><FinancialSummaryWidget /></div>
            <div key="risk" className="h-full"><RiskMeterWidget /></div>
            <div key="fiidii" className="h-full"><FIIDIIWidget /></div>
          </Grid>
          </div>
        );
      })()}
      <Analytics />
    </div>
  );
}

export default App;
