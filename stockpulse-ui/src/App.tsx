import { useEffect } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';
import { setStocks, setConnectionStatus } from './features/stockSlice';
import { fetchDashboardData } from './features/dashboardSlice';
import { ResponsiveGridLayout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const API_BASE = 'http://localhost:5200';

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { stocks, status } = useSelector((state: RootState) => state.stock);
  const { insights, news, loading } = useSelector((state: RootState) => state.dashboard);

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
      .then(() => {
        dispatch(setConnectionStatus('connected'));
      })
      .catch(() => {
        dispatch(setConnectionStatus('error'));
      });

    return () => { connection.stop(); };
  }, [dispatch]);

  const layout = [
    { i: 'quotes', x: 0, y: 0, w: 3, h: 5 },
    { i: 'chart', x: 3, y: 0, w: 6, h: 5 },
    { i: 'insights', x: 9, y: 0, w: 3, h: 3 },
    { i: 'news', x: 9, y: 3, w: 3, h: 3 },
  ];

  return (
    <div className="min-h-screen bg-background font-mono text-gray-200">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-3 border-b border-gray-800 bg-surface">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-neonGreen animate-pulse" />
          <h1 className="text-lg font-bold tracking-widest text-white">
            STOCK<span className="text-neonAmber">PULSE</span>{' '}
            <span className="text-gray-500">INDIA</span>
          </h1>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>NSE / BSE</span>
          <span className="text-gray-700">|</span>
          <span>
            STATUS:{' '}
            <span className={status === 'connected' ? 'text-neonGreen' : 'text-neonRed'}>
              ● {status === 'connected' ? 'LIVE' : status.toUpperCase()}
            </span>
          </span>
          <span className="text-gray-700">|</span>
          <span>{new Date().toLocaleTimeString('en-IN', { hour12: false })} IST</span>
        </div>
      </header>

      {/* Grid */}
      <div className="p-2">
        <ResponsiveGridLayout
          layouts={{ lg: layout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={80}
          width={window.innerWidth - 20}
        >
          {/* ── LIVE QUOTES ── */}
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
                      <div className="text-sm font-mono">₹{stock.price?.toFixed(2)}</div>
                      <div className={`text-[10px] font-bold ${(stock.change ?? 0) >= 0 ? 'text-neonGreen' : 'text-neonRed'}`}>
                        {(stock.change ?? 0) >= 0 ? '▲' : '▼'} {Math.abs(stock.changePercent ?? 0).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── CHART AREA ── */}
          <div key="chart" className="bg-surface border border-gray-800 flex flex-col">
            <div className="drag-handle cursor-move flex justify-between items-center px-3 py-2 border-b border-gray-800 bg-gray-900/60 select-none">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Market Overview</span>
              <span className="text-[10px] text-gray-600">NIFTY 50 · SENSEX · BANK NIFTY</span>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-bold text-neonAmber mb-2">24,850</div>
                <div className="text-xs text-neonGreen">▲ +0.42% today</div>
                <div className="text-[10px] text-gray-600 mt-4">Candlestick chart available after API connection</div>
              </div>
            </div>
          </div>

          {/* ── AI INSIGHTS ── */}
          <div key="insights" className="bg-surface border border-gray-800 flex flex-col">
            <div className="drag-handle cursor-move flex justify-between items-center px-3 py-2 border-b border-gray-800 bg-gray-900/60 select-none">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">AI Insights</span>
              <span className="text-[10px] text-neonAmber font-bold">● ALERT</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {loading && <p className="text-xs text-gray-600">Initializing AI models...</p>}
              {insights.map((insight: any, idx: number) => (
                <div key={idx} className="border-l-2 pl-2 py-1" style={{ borderColor: insight.sentiment === 'Bullish' ? '#00ff41' : insight.sentiment === 'Bearish' ? '#ff003c' : '#ffb000' }}>
                  <div className="text-[10px] font-bold uppercase text-gray-500">{insight.type}</div>
                  <div className="text-xs text-gray-200 mt-0.5">{insight.message}</div>
                  <div className={`text-[10px] mt-1 font-bold ${insight.sentiment === 'Bullish' ? 'text-neonGreen' : insight.sentiment === 'Bearish' ? 'text-neonRed' : 'text-neonAmber'}`}>
                    {insight.sentiment}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── NEWS ── */}
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
        </ResponsiveGridLayout>
      </div>
    </div>
  );
}

export default App;
