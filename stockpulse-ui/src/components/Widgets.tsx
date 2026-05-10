import { useSelector } from 'react-redux';
import type { RootState } from '../store';


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

export const LiveQuotesWidget = () => {
  const { stocks } = useSelector((state: RootState) => state.stock);
  return (
    <div className="h-full bg-surface border border-gray-800 hover:border-gray-600 transition-colors flex flex-col overflow-hidden">
      <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
        <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">Live Quotes</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-neonGreen/10 text-neonGreen border border-neonGreen/20">LIVE</span>
      </div>
      <div className="flex-1 overflow-y-auto p-1 space-y-2">
        {stocks.length === 0 ? (
          <p className="text-xs text-gray-600 mt-4 text-center">Waiting for market data...</p>
        ) : (
          stocks.map((stock: any) => (
            <div key={stock.symbol} className="flex justify-between items-center py-1.5 px-2 border-b border-gray-800/60 hover:bg-white/5 rounded transition-colors group cursor-pointer">
              <div>
                <div className="text-sm font-bold text-white group-hover:text-neonAmber transition-colors">{stock.symbol}</div>
                <div className="text-xs text-gray-600">{stock.name}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono">Rs {stock.price?.toFixed(2)}</div>
                <div className={`text-xs font-bold ${(stock.change ?? 0) >= 0 ? 'text-neonGreen' : 'text-neonRed'}`}>
                  {(stock.change ?? 0) >= 0 ? 'UP' : 'DOWN'} {Math.abs(stock.changePercent ?? 0).toFixed(2)}%
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const SmartWatchlistWidget = () => {
  const { stocks } = useSelector((state: RootState) => state.stock);
  const liveStocks = stocks as any[];
  const WATCHLIST_SEED = liveStocks.length ? liveStocks
    .slice(0, 4)
    .map(s => ({
      symbol: s.symbol,
      name: s.name,
      target: (s.price * 1.15).toFixed(0),
      thesis: 'Technically looking strong above moving averages.'
    })) : [];

  return (
    <div className="h-full bg-surface border border-gray-800 flex flex-col overflow-hidden">
      <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
        <div className="flex items-center gap-1">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">Smart Watchlist</span>
          <span className="text-xs bg-neonGreen/10 text-neonGreen border border-neonGreen/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-neonGreen animate-pulse"></span> Live
          </span>
        </div>
        <span className="text-xs text-neonAmber">Curated</span>
      </div>
      <div className="flex-1 overflow-y-auto p-1 space-y-2">
        {WATCHLIST_SEED.length === 0 ? (
          <p className="text-xs text-gray-600 text-center mt-2">Loading watchlist...</p>
        ) : WATCHLIST_SEED.map((item) => (
          <div key={item.symbol} className="border border-gray-800 rounded p-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-white font-bold">{item.symbol}</span>
              <span className="text-xs text-neonGreen">Target Rs {item.target}</span>
            </div>
            <div className="text-xs text-gray-500">{item.name}</div>
            <div className="text-xs text-gray-300 mt-1">{item.thesis}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const BuyTodayWidget = () => {
  const { stocks } = useSelector((state: RootState) => state.stock);
  const liveStocks = stocks as any[];
  const BUY_TODAY = liveStocks.length ? liveStocks
    .filter(s => s.changePercent > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 3)
    .map(s => ({
      symbol: s.symbol,
      conviction: s.changePercent > 2 ? 'High' : 'Medium',
      reason: `Strong bullish momentum, up ${s.changePercent.toFixed(2)}% today.`
    })) : [];

  return (
    <div className="h-full bg-surface border border-gray-800 flex flex-col overflow-hidden">
      <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
        <div className="flex items-center gap-1">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">Better To Buy Today</span>
          <span className="text-xs bg-neonGreen/10 text-neonGreen border border-neonGreen/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-neonGreen animate-pulse"></span> Live
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-1 space-y-2">
        {BUY_TODAY.length === 0 ? (
          <p className="text-xs text-gray-600 text-center mt-2">Scanning momentum...</p>
        ) : BUY_TODAY.map((item) => (
          <div key={item.symbol} className="p-1 border border-neonGreen/30 rounded bg-neonGreen/5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white">{item.symbol}</span>
              <span className="text-xs text-neonGreen">{item.conviction}</span>
            </div>
            <div className="text-xs text-gray-300 mt-1">{item.reason}</div>
          </div>
        ))}
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

export const FinancialSummaryWidget = () => (
  <div className="h-full bg-surface border border-gray-800 flex flex-col hover:border-gray-600 transition-colors">
    <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
      <div className="flex items-center gap-1">
        <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">Financial Summary</span>
        <span className="text-xs bg-neonGreen/10 text-neonGreen border border-neonGreen/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-neonGreen animate-pulse"></span> Live
        </span>
      </div>
      <span className="text-xs text-neonAmber">Q3 FY26</span>
    </div>
    <div className="flex-1 overflow-y-auto p-1 space-y-3">
      <div className="text-xs text-gray-500 mb-1">Reliance Industries</div>
      {FINANCIALS_DATA.map((item, idx) => (
        <div key={idx} className="flex justify-between items-center border-b border-gray-800/50 pb-2 last:border-0">
          <span className="text-xs text-gray-300">{item.metric}</span>
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-white">{item.value}</div>
            <div className={`text-xs font-bold ${item.status === 'good' ? 'text-neonGreen' : 'text-gray-500'}`}>{item.growth}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const RiskMeterWidget = () => (
  <div className="h-full bg-surface border border-gray-800 flex flex-col hover:border-gray-600 transition-colors">
    <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
      <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">Risk Meter</span>
    </div>
    <div className="flex-1 overflow-y-auto p-1 flex flex-col justify-center items-center">
      <div className={`px-4 py-2 rounded border border-gray-700 font-bold tracking-widest text-sm ${RISK_PROFILE.bg} ${RISK_PROFILE.color}`}>
        {RISK_PROFILE.level}
      </div>
      <div className="w-full mt-4 space-y-2 text-xs">
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
);

export const ScreenerMetricWidget = ({ tabName, screenerData }: { tabName: string, screenerData: any[] }) => {
  let filtered: any[] = [];
  let description = '';
  if (tabName === 'PE') {
    filtered = screenerData.filter(s => s.isPeHealthy).slice(0, 5);
    description = "Healthy P/E Ratio (10-25x)";
  } else if (tabName === 'ROE') {
    filtered = screenerData.filter(s => s.isRoeGood).slice(0, 5);
    description = "Strong ROE (>15%)";
  } else if (tabName === 'DEBT') {
    filtered = screenerData.filter(s => s.isDebtLow).slice(0, 5);
    description = "Low Debt to Equity (<0.5)";
  } else if (tabName === 'GROWTH') {
    filtered = screenerData.filter(s => s.isGrowthStrong).slice(0, 5);
    description = "High Revenue & Profit Growth";
  } else if (tabName === 'TECH') {
    filtered = screenerData.filter(s => s.isTechnicalBuy).slice(0, 5);
    description = "RSI < 30 OR MACD Positive";
  }

  return (
    <div className="h-full bg-surface border border-gray-800 flex flex-col overflow-hidden">
      <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
        <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">{tabName} Screener</span>
        <span className="text-xs px-1 py-0.5 rounded bg-neonAmber/10 text-neonAmber border border-neonAmber/20">DATA</span>
      </div>
      <div className="flex-1 overflow-y-auto p-1 space-y-2">
        {screenerData.length === 0 ? (
          <p className="text-xs text-gray-600 mt-4 text-center">Loading {tabName} metrics...</p>
        ) : (
          <>
            <div className="text-xs text-center text-gray-500 mb-2 italic px-1 truncate" title={description}>{description}</div>
            {filtered.length === 0 ? <p className="text-xs text-center text-gray-500 mt-2">No stocks match.</p> : null}
            {filtered.map(item => (
              <div key={item.symbol} className="flex justify-between items-center p-1.5 border border-gray-800/40 bg-white/5 hover:bg-white/10 rounded transition-colors group">
                <div className="overflow-hidden">
                  <div className="text-sm font-bold text-white group-hover:text-neonAmber transition-colors truncate">{item.symbol}</div>
                  <div className="text-xs text-gray-500 truncate" title={item.companyName}>{item.companyName}</div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <div className="text-sm font-mono text-neonGreen">Rs {item.price ? item.price.toFixed(2) : '0.00'}</div>
                  {tabName === 'PE' && <div className="text-xs text-gray-400">PE: {item.pe ? item.pe.toFixed(1) : 'N/A'}</div>}
                  {tabName === 'ROE' && <div className="text-xs text-gray-400">ROE: {item.roe ? item.roe.toFixed(1) : 'N/A'}%</div>}
                  {tabName === 'DEBT' && <div className="text-xs text-gray-400">D/E: {item.debtToEquity ? item.debtToEquity.toFixed(2) : 'N/A'}</div>}
                  {tabName === 'GROWTH' && <div className="text-xs text-gray-400">Growth: {item.revenueGrowth ? item.revenueGrowth.toFixed(1) : 'N/A'}%</div>}
                  {tabName === 'TECH' && <div className="text-xs text-gray-400">RSI: {item.rsi ? item.rsi.toFixed(1) : 'N/A'}</div>}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
