import { useEffect, useMemo, useState } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';
import { setStocks, setConnectionStatus } from './features/stockSlice';
import { fetchDashboardData } from './features/dashboardSlice';
import { ResponsiveGridLayout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const API_BASE = 'http://localhost:5200';
const MAX_CHARTS = 10;
const TIMEFRAMES = ['15m', '1h', '6h', '1d', '1w', '1m', '6m', '1y', '3y', '5y'] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

type ChartTab = {
  id: string;
  symbol: string;
  title: string;
  timeframe: Timeframe;
};

const WATCHLIST_SEED = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', target: '3120', thesis: 'Refining margin expansion + telecom ARPU support.' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', target: '1560', thesis: 'Loan growth remains resilient with improving NIM trend.' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', target: '3950', thesis: 'Order pipeline and rupee weakness can aid margins.' },
  { symbol: 'INFY', name: 'Infosys', target: '1725', thesis: 'Large-deal wins and valuation support after correction.' },
  { symbol: 'LT', name: 'Larsen & Toubro', target: '4050', thesis: 'Capex cycle and strong execution pipeline.' },
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

const TRADER_INDEXES = [
  { name: 'NIFTY 50', value: '24,850', change: '+0.42%' },
  { name: 'SENSEX', value: '81,420', change: '+0.38%' },
  { name: 'BANK NIFTY', value: '53,780', change: '-0.24%' },
  { name: 'NIFTY FIN SERVICE', value: '24,215', change: '-0.18%' },
  { name: 'NIFTY IT', value: '37,940', change: '+0.96%' },
  { name: 'NIFTY MIDCAP 100', value: '56,480', change: '+0.21%' },
];

const RISK_CHECKLIST = [
  'Track RBI policy commentary and bond yields before taking leveraged positions.',
  'Avoid averaging blindly in stocks breaking multi-week support with high volume.',
  'Keep stop-loss and position sizing fixed before market open.',
  'Watch FII and DII flows after 2:30 PM for late-session trend reversals.',
];

const CRITICAL_NEWS = [
  { tag: 'Macro', title: 'US CPI print this week may alter global rate-cut expectations.', impact: 'High Impact' },
  { tag: 'Policy', title: 'Potential changes in crude import duty can affect OMC profitability.', impact: 'High Impact' },
  { tag: 'Currency', title: 'Rupee volatility near 84 may pressure import-heavy sectors.', impact: 'Medium Impact' },
  { tag: 'Earnings', title: 'Large-cap banking earnings due next week; sentiment pivot likely.', impact: 'High Impact' },
];

const MOCK_CHART_POINTS = [22, 24, 23, 25, 27, 26, 29, 31, 30, 33, 35, 34];
const makeChartId = () => `chart-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { stocks, status } = useSelector((state: RootState) => state.stock);
  const { insights, news, loading } = useSelector((state: RootState) => state.dashboard);
  const [chartQuery, setChartQuery] = useState('');
  const [chartTabs, setChartTabs] = useState<ChartTab[]>([
    { id: makeChartId(), symbol: 'NIFTY 50', title: 'NIFTY 50 Index', timeframe: '1d' },
  ]);

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

    connection
      .start()
      .then(() => {
        dispatch(setConnectionStatus('connected'));
      })
      .catch(() => {
        dispatch(setConnectionStatus('error'));
      });

    return () => {
      connection.stop();
    };
  }, [dispatch]);

  const symbolOptions = useMemo(() => {
    const stockSymbols = stocks.map((s) => ({
      symbol: s.symbol,
      title: s.name || s.symbol,
    }));
    return [
      ...stockSymbols,
      { symbol: 'NIFTY 50', title: 'NIFTY 50 Index' },
      { symbol: 'SENSEX', title: 'BSE SENSEX' },
      { symbol: 'BANK NIFTY', title: 'NIFTY Bank Index' },
      { symbol: 'RELIANCE', title: 'Reliance Industries' },
      { symbol: 'TCS', title: 'Tata Consultancy Services' },
      { symbol: 'HDFCBANK', title: 'HDFC Bank' },
      { symbol: 'INFY', title: 'Infosys' },
      { symbol: 'ITC', title: 'ITC Ltd' },
    ];
  }, [stocks]);

  const addChartTab = () => {
    if (chartTabs.length >= MAX_CHARTS) return;
    const query = chartQuery.trim().toUpperCase();
    if (!query) return;

    const match = symbolOptions.find(
      (option) => option.symbol.toUpperCase() === query || option.title.toUpperCase().includes(query),
    );
    const selected = match ?? { symbol: query, title: `${query} Custom Chart` };

    setChartTabs((prev) => [
      ...prev,
      { id: makeChartId(), symbol: selected.symbol, title: selected.title, timeframe: '1d' },
    ]);
    setChartQuery('');
  };

  const removeChartTab = (id: string) => {
    setChartTabs((prev) => prev.filter((tab) => tab.id !== id));
  };

  const setTabTimeframe = (id: string, timeframe: Timeframe) => {
    setChartTabs((prev) => prev.map((tab) => (tab.id === id ? { ...tab, timeframe } : tab)));
  };

  const layout = [
    { i: 'quotes', x: 0, y: 0, w: 3, h: 5 },
    { i: 'chart', x: 3, y: 0, w: 6, h: 6 },
    { i: 'insights', x: 9, y: 0, w: 3, h: 3 },
    { i: 'news', x: 9, y: 3, w: 3, h: 3 },
    { i: 'watchlist', x: 0, y: 5, w: 4, h: 4 },
    { i: 'buytoday', x: 4, y: 6, w: 4, h: 3 },
    { i: 'fallen', x: 8, y: 6, w: 4, h: 3 },
    { i: 'indexes', x: 0, y: 9, w: 6, h: 3 },
    { i: 'risk', x: 6, y: 9, w: 3, h: 3 },
    { i: 'criticalNews', x: 9, y: 9, w: 3, h: 3 },
  ];

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
        <ResponsiveGridLayout
          layouts={{ lg: layout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={80}
          width={window.innerWidth - 20}
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
            <div className="px-3 pt-3 flex gap-2">
              <input
                value={chartQuery}
                onChange={(e) => setChartQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addChartTab();
                }}
                placeholder="Search symbol (RELIANCE, NIFTY 50)"
                className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-100 placeholder:text-gray-500"
              />
              <button
                onClick={addChartTab}
                disabled={chartTabs.length >= MAX_CHARTS}
                className="px-3 py-1 text-xs font-bold rounded border border-neonAmber/40 text-neonAmber disabled:text-gray-500 disabled:border-gray-700"
              >
                Add Chart
              </button>
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
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          tab.timeframe === frame ? 'border-neonGreen/60 text-neonGreen bg-neonGreen/10' : 'border-gray-700 text-gray-400'
                        }`}
                      >
                        {frame}
                      </button>
                    ))}
                  </div>
                  <div className="h-20 w-full bg-gradient-to-b from-gray-900 to-gray-950 rounded border border-gray-800 p-2">
                    <div className="h-full flex items-end gap-1">
                      {MOCK_CHART_POINTS.map((point, idx) => (
                        <div
                          key={`${tab.id}-p-${idx}`}
                          style={{ height: `${point * 2}%` }}
                          className="flex-1 bg-neonAmber/70 rounded-sm"
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mt-1 text-[10px] text-gray-500">View: {tab.timeframe} - Ready for TradingView chart integration.</div>
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

          <div key="indexes" className="bg-surface border border-gray-800 flex flex-col">
            <div className="drag-handle cursor-move flex justify-between items-center px-3 py-2 border-b border-gray-800 bg-gray-900/60 select-none">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Indexes Traders Track</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2">
              {TRADER_INDEXES.map((idx) => (
                <div key={idx.name} className="border border-gray-800 rounded p-2">
                  <div className="text-[10px] text-gray-500">{idx.name}</div>
                  <div className="text-sm font-bold text-white">{idx.value}</div>
                  <div className={`text-[10px] font-bold ${idx.change.startsWith('-') ? 'text-neonRed' : 'text-neonGreen'}`}>{idx.change}</div>
                </div>
              ))}
            </div>
          </div>

          <div key="risk" className="bg-surface border border-gray-800 flex flex-col">
            <div className="drag-handle cursor-move flex justify-between items-center px-3 py-2 border-b border-gray-800 bg-gray-900/60 select-none">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Things To Keep In Mind</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {RISK_CHECKLIST.map((item, idx) => (
                <div key={idx} className="text-[10px] text-gray-300 border-l-2 border-neonAmber/40 pl-2">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div key="criticalNews" className="bg-surface border border-gray-800 flex flex-col">
            <div className="drag-handle cursor-move flex justify-between items-center px-3 py-2 border-b border-gray-800 bg-gray-900/60 select-none">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Critical Future News</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {CRITICAL_NEWS.map((item, idx) => (
                <div key={idx} className="border border-gray-800 rounded p-2">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-neonAmber">{item.tag}</span>
                    <span className="text-[9px] text-neonRed">{item.impact}</span>
                  </div>
                  <div className="text-[10px] text-gray-200 mt-1">{item.title}</div>
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
        </ResponsiveGridLayout>
      </div>
    </div>
  );
}

export default App;
