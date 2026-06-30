import { useEffect, useState } from "react";
import { getFiiDii, FiiDii } from "../../services/stockApi";
import MetricTooltip from "../ui/MetricTooltip";
import WidgetSkeleton from "../ui/WidgetSkeleton";
import WidgetError from "../ui/WidgetError";
import StaleDataBadge from "../ui/StaleDataBadge";

export function FIIDIIWidget() {
  const [data, setData] = useState<FiiDii[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getFiiDii();
      setData(res);
      setLastUpdated(new Date());
    } catch {
      setError("Failed to fetch FII/DII flow data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <WidgetSkeleton rows={3} />;
  if (error) return <WidgetError message={error} onRetry={fetchData} />;

  const isEmpty = !data || data.length === 0;

  // Format helper
  const formatFlow = (val: number) => {
    const abs = Math.abs(val).toLocaleString("en-IN", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1
    });
    return val >= 0 ? `+₹${abs} Cr` : `-₹${abs} Cr`;
  };

  // Today is the first item (newest)
  const today = !isEmpty ? data[0] : null;

  // Context line
  let contextLine = "No FII/DII flow data for today.";
  if (today) {
    const val = today.fiiNetValue;
    if (val > 1000) {
      contextLine = "FIIs are BUYING HEAVILY — bullish signal.";
    } else if (val < -1000) {
      contextLine = "FIIs are SELLING HEAVILY — markets may face pressure.";
    } else if (val >= -500 && val <= 500) {
      contextLine = "FII activity is neutral today.";
    } else {
      contextLine = val >= 0 ? "FIIs are net buyers today." : "FIIs are net sellers today.";
    }
  }

  // 5-day bars math
  const recentDays = data.slice(0, 5).reverse(); // order chronologically for the chart (left to right)
  const maxAbs = Math.max(...recentDays.map(d => Math.abs(d.fiiNetValue)), 1);

  const tooltipText = "FIIs are foreign funds (e.g. Vanguard, BlackRock). Heavy buying tends to lift Indian markets; heavy selling pressures them. DIIs (LIC, mutual funds) often buy when FIIs sell.";

  return (
    <div className="h-full bg-surface border border-gray-800 flex flex-col hover:border-gray-600 transition-colors overflow-hidden font-mono text-[10px]">
      <div className="drag-handle cursor-move flex justify-between items-center px-1.5 py-0.5 border-b border-gray-800 bg-gray-900/60 select-none">
        <div className="flex items-center gap-1.5">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">FII / DII Flows</span>
          {lastUpdated && <StaleDataBadge lastUpdatedAt={lastUpdated} />}
        </div>
        <button onClick={fetchData} className="text-gray-555 hover:text-white" title="Refresh">↺</button>
      </div>

      <div className="flex-1 p-2 flex flex-col justify-between">
        {isEmpty ? (
          <div className="flex-1 flex items-center justify-center text-center p-2 text-gray-550 text-[9px] leading-normal">
            FII/DII data unavailable right now (NSE limits cloud access).
          </div>
        ) : (
          <>
            {/* Net Flows */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="border border-gray-850 bg-black/10 p-1.5 rounded">
                <MetricTooltip content={tooltipText} position="top">
                  <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider cursor-help border-b border-dashed border-gray-700 pb-0.5 mb-1 inline-block">
                    FII Net Flow
                  </div>
                </MetricTooltip>
                {today && (
                  <div className={`text-xs font-bold ${today.fiiNetValue >= 0 ? "text-neonGreen" : "text-neonRed"}`}>
                    {formatFlow(today.fiiNetValue)}
                  </div>
                )}
              </div>

              <div className="border border-gray-850 bg-black/10 p-1.5 rounded">
                <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider pb-0.5 mb-1">
                  DII Net Flow
                </div>
                {today && (
                  <div className={`text-xs font-bold ${today.diiNetValue >= 0 ? "text-neonGreen" : "text-neonRed"}`}>
                    {formatFlow(today.diiNetValue)}
                  </div>
                )}
              </div>
            </div>

            {/* 5-Day Chart */}
            <div className="mb-2">
              <div className="text-[8px] text-gray-550 uppercase tracking-widest font-bold mb-1 select-none text-center">
                FII 5-Day Net Trend (Cr)
              </div>
              <div className="relative h-14 w-full border border-gray-850/50 bg-black/10 rounded flex items-center justify-around py-1">
                {/* Zero Centerline */}
                <div className="absolute left-0 right-0 top-1/2 border-t border-gray-800 border-dashed z-0 pointer-events-none" />

                {recentDays.map((d, idx) => {
                  const val = d.fiiNetValue;
                  const heightPct = (Math.abs(val) / maxAbs) * 45; // max 45% height in either direction
                  const isPositive = val >= 0;

                  return (
                    <div key={idx} className="relative h-full flex flex-col justify-center items-center w-8 group">
                      {isPositive ? (
                        <div
                          className="absolute w-2.5 bg-neonGreen/80 hover:bg-neonGreen rounded-t-sm z-10 transition-all cursor-help"
                          style={{ height: `${heightPct}%`, bottom: "50%" }}
                          title={`${d.date}: ${formatFlow(val)}`}
                        />
                      ) : (
                        <div
                          className="absolute w-2.5 bg-neonRed/80 hover:bg-neonRed rounded-b-sm z-10 transition-all cursor-help"
                          style={{ height: `${heightPct}%`, top: "50%" }}
                          title={`${d.date}: ${formatFlow(val)}`}
                        />
                      )}
                      <span className="absolute bottom-0 text-[7px] text-gray-600 scale-90 select-none">
                        {d.date.split("-")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Context Line */}
            <div className="text-[9px] text-gray-300 font-bold border-l-2 border-neonAmber pl-1.5 py-0.5 leading-normal">
              {contextLine}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
