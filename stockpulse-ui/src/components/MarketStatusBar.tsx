import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { useEffect, useState } from 'react';
import { getMarketStatus } from '../services/stockApi';
import type { MarketStatus } from '../services/stockApi';


export default function MarketStatusBar() {
  const stocks = useSelector((state: RootState) => state.stock.stocks);
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);

  useEffect(() => {
    getMarketStatus().then(s => { if (s) setMarketStatus(s); });
    const interval = setInterval(() => {
      getMarketStatus().then(s => { if (s) setMarketStatus(s); });
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Build ticker items from live stocks
  const tickerItems = stocks.length > 0 ? stocks : [];

  return (
    <div className="border-b border-gray-800 bg-black/40 overflow-hidden relative" style={{ height: '28px' }}>
      {/* Market status pill - left fixed */}
      <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center px-3 bg-black border-r border-gray-800">
        <div className={`w-1.5 h-1.5 rounded-full mr-2 ${marketStatus?.isOpen ? 'bg-neonGreen animate-pulse' : 'bg-red-500'}`} />
        <span className="text-[10px] font-bold tracking-widest text-gray-400">
          {marketStatus?.isOpen ? 'MARKET OPEN' : 'MARKET CLOSED'}
        </span>
        {!marketStatus?.isOpen && marketStatus?.nextOpenIst && (
          <span className="ml-2 text-[9px] text-gray-600">Opens {marketStatus.nextOpenIst}</span>
        )}
      </div>

      {/* Scrolling ticker */}
      <div className="ml-36 h-full overflow-hidden">
        <div className="flex items-center h-full animate-ticker whitespace-nowrap">
          {[...tickerItems, ...tickerItems].map((stock, i) => (
            <span key={`${stock.symbol}-${i}`} className="inline-flex items-center gap-2 mx-6 text-[11px]">
              <span className="text-gray-400 font-bold tracking-wide">{stock.symbol}</span>
              <span className="text-white font-mono">
                ₹{stock.price != null ? stock.price.toFixed(2) : '--'}
              </span>
              {stock.changePercent != null && (
                <span className={`font-bold ${stock.changePercent >= 0 ? 'text-neonGreen' : 'text-neonRed'}`}>
                  {stock.changePercent >= 0 ? '▲' : '▼'} {Math.abs(stock.changePercent).toFixed(2)}%
                </span>
              )}
              <span className="text-gray-700">·</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
