import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { useState, useEffect, useCallback } from 'react';
import { getScreener, clearApiCache } from '../services/stockApi';
import type { ScreenerResult } from '../services/stockApi';


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
