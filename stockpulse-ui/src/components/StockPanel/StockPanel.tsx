import { useEffect } from 'react';
import { useStockPanel } from '../../hooks/useStockPanel';
import BuyVerdictCard from './BuyVerdictCard';
import MetricRow from './MetricRow';
import RangeBar52W from './RangeBar52W';
import QuarterlyMiniChart from './QuarterlyMiniChart';
import StockPanelNews from './StockPanelNews';
import type { Fundamentals } from '../../services/stockApi';

interface StockPanelProps {
  symbol: string | null;
  onClose: () => void;
}

export default function StockPanel({ symbol, onClose }: StockPanelProps) {
  const { data, loading, error } = useStockPanel(symbol);
  const { fundamentals: f, technical: t, buySignal, quarterly, news } = data;

  // ESC key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      {symbol && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-[420px] bg-gray-950/95 border-l border-gray-800 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${symbol ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ backdropFilter: 'blur(20px)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-800 bg-black/40">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-neonGreen animate-pulse" />
              <h2 className="text-lg font-bold text-white font-mono tracking-wide">{symbol ?? '—'}</h2>
              {f?.sector && (
                <span className="text-[10px] px-2 py-0.5 bg-neonGreen/10 text-neonGreen border border-neonGreen/20 rounded font-mono">
                  {f.sector.toUpperCase()}
                </span>
              )}
            </div>
            {f && (
              <div className="mt-1 flex items-center gap-3">
                <span className="text-xl font-bold text-white font-mono">
                  ₹{f.price?.toFixed(2) ?? '--'}
                </span>
                {f.changePercent != null && (
                  <span className={`text-sm font-bold font-mono ${f.changePercent >= 0 ? 'text-neonGreen' : 'text-neonRed'}`}>
                    {f.changePercent >= 0 ? '▲' : '▼'} {Math.abs(f.changePercent).toFixed(2)}%
                  </span>
                )}
              </div>
            )}
            {f?.marketCap && (
              <div className="text-[10px] text-gray-500 mt-0.5 font-mono">
                Mkt Cap: ₹{(f.marketCap / 1e7).toFixed(0)}Cr
                {f.marketCap > 2e12 ? ' · LARGE CAP' : f.marketCap > 2e11 ? ' · MID CAP' : ' · SMALL CAP'}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none mt-1">✕</button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <div className="w-6 h-6 border-2 border-neonGreen border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-gray-500 font-mono tracking-widest">LOADING DOSSIER...</span>
            </div>
          )}
          {error && (
            <div className="m-4 p-3 border border-neonRed/30 bg-neonRed/5 rounded text-xs text-neonRed font-mono">{error}</div>
          )}
          {!loading && !error && symbol && (
            <>
              {buySignal && <BuyVerdictCard buySignal={buySignal} />}

              {/* Fundamentals section */}
              {f && (
                <div className="p-4 border-b border-gray-800/50">
                  <div className="text-[10px] text-gray-500 tracking-widest font-mono mb-3">FUNDAMENTAL ANALYSIS</div>
                  <MetricRow label="PE Ratio" value={f.peRatio} format="number" decimals={1} goodBelow={25} cautionBelow={40} />
                  <MetricRow label="Forward PE" value={f.forwardPe} format="number" decimals={1} goodBelow={20} cautionBelow={35} />
                  <MetricRow label="ROE" value={f.roe} format="percent" goodAbove={15} cautionAbove={10} />
                  <MetricRow label="Debt / Equity" value={f.debtToEquity} format="number" decimals={2} goodBelow={0.5} cautionBelow={1.5} />
                  <MetricRow label="EPS Growth" value={f.earningsGrowth} format="percent" goodAbove={15} cautionAbove={5} />
                  <MetricRow label="Revenue Growth" value={f.revenueGrowth} format="percent" goodAbove={15} cautionAbove={5} />
                  <MetricRow label="Dividend Yield" value={f.dividendYield} format="percent" goodAbove={1} cautionAbove={0.5} higherIsBetter />
                  <MetricRow label="Beta" value={f.beta} format="number" decimals={2} goodBelow={1.2} cautionBelow={1.8} />
                </div>
              )}

              {/* Valuation section */}
              {f && f.eps != null && f.bookValue != null && f.eps > 0 && f.bookValue > 0 && (
                <ValuationSection fundamentals={f} />
              )}

              {/* Technicals section */}
              {t && (
                <div className="p-4 border-b border-gray-800/50">
                  <div className="text-[10px] text-gray-500 tracking-widest font-mono mb-3">TECHNICAL ANALYSIS</div>
                  <MetricRow label="RSI (14)" value={t.rsi} format="number" decimals={1} goodAbove={40} goodBelow={65} cautionAbove={30} cautionBelow={75} isMidRange />
                  <MetricRow label="MACD Signal" value={t.macdCrossover ? 1 : 0} format="boolean" positiveLabel="Bullish Crossover" negativeLabel="No Crossover" />
                  <MetricRow label="MACD Line" value={t.macdLine} format="number" decimals={3} goodAbove={0} cautionAbove={-0.5} higherIsBetter />
                </div>
              )}

              {/* 52W Range */}
              {f && <RangeBar52W price={f.price} low={f.week52Low} high={f.week52High} />}

              {/* Quarterly results */}
              {quarterly && <QuarterlyMiniChart quarterly={quarterly} />}

              {/* News */}
              {news.length > 0 && <StockPanelNews news={news} />}
            </>
          )}
        </div>

        {/* Footer actions */}
        {symbol && (
          <div className="p-3 border-t border-gray-800 bg-black/40 flex gap-2">
            <button
              onClick={() => {
                const saved = JSON.parse(localStorage.getItem('stockpulse_watchlist') || '[]');
                if (!saved.includes(symbol)) {
                  localStorage.setItem('stockpulse_watchlist', JSON.stringify([...saved, symbol]));
                  // Dispatch storage event to trigger updates in the watchlist widget
                  window.dispatchEvent(new Event('storage'));
                }
              }}
              className="flex-1 py-2 text-xs font-bold border border-neonAmber/40 text-neonAmber hover:bg-neonAmber/10 rounded font-mono transition-colors"
            >
              + WATCHLIST
            </button>
            <button
              onClick={() => { window.dispatchEvent(new CustomEvent('openChart', { detail: symbol })); onClose(); }}
              className="flex-1 py-2 text-xs font-bold border border-neonGreen/40 text-neonGreen hover:bg-neonGreen/10 rounded font-mono transition-colors"
            >
              OPEN CHART →
            </button>
          </div>
        )}
      </div>
    </>
  );
}

interface ValuationProps { fundamentals: Fundamentals; }

function ValuationSection({ fundamentals: f }: ValuationProps) {
  const eps = f.eps ?? 0;
  const bv = f.bookValue ?? 0;
  const pe = f.peRatio ?? 0;
  const growth = f.earningsGrowth ?? 0;

  // Graham Number
  const grahamNumber = (eps > 0 && bv > 0) ? Math.sqrt(22.5 * eps * bv) : null;
  const price = f.price ?? 0;
  const upside = grahamNumber && price > 0 ? ((grahamNumber - price) / price) * 100 : null;
  const isUndervalued = upside != null && upside > 0;

  // PEG Ratio
  const peg = (pe > 0 && growth > 0) ? pe / growth : null;
  const pegSignal = peg == null ? 'neutral' : peg < 1 ? 'good' : peg < 2 ? 'caution' : 'bad';

  return (
    <div className="px-4 py-3 border-b border-gray-800/50">
      <div className="text-[10px] text-gray-500 tracking-widest font-mono mb-3">VALUATION ANALYSIS</div>

      {/* Graham Number */}
      {grahamNumber != null && (
        <div className="mb-3 p-3 rounded border border-gray-800/50 bg-gray-900/30">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[9px] text-gray-600 font-mono">GRAHAM NUMBER</div>
              <div className="text-base font-bold font-mono text-white mt-0.5">₹{grahamNumber.toFixed(2)}</div>
              <div className="text-[9px] text-gray-600 font-mono mt-0.5">√(22.5 × EPS × BookValue)</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] text-gray-600 font-mono">vs CURRENT PRICE</div>
              <div className={`text-base font-bold font-mono mt-0.5 ${isUndervalued ? 'text-neonGreen' : 'text-neonRed'}`}>
                {upside != null ? `${isUndervalued ? '+' : ''}${upside.toFixed(1)}%` : '--'}
              </div>
              <div className={`text-[10px] font-mono mt-0.5 ${isUndervalued ? 'text-neonGreen' : 'text-neonRed'}`}>
                {isUndervalued ? '● UNDERVALUED' : '● OVERVALUED'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PEG Ratio */}
      {peg != null && (
        <div className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-mono ${pegSignal === 'good' ? 'text-neonGreen' : pegSignal === 'caution' ? 'text-neonAmber' : 'text-neonRed'}`}>●</span>
            <span className="text-xs text-gray-400 font-mono">PEG Ratio</span>
            <span className="text-[9px] text-gray-700 font-mono">(Good: &lt;1)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-200 font-mono">{peg.toFixed(2)}</span>
            <span className={`text-[9px] font-mono w-10 text-right ${pegSignal === 'good' ? 'text-neonGreen' : pegSignal === 'caution' ? 'text-neonAmber' : 'text-neonRed'}`}>
              {pegSignal === 'good' ? 'GOOD' : pegSignal === 'caution' ? 'WATCH' : 'RISK'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
