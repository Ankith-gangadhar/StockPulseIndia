import { useEffect, useState } from "react";
import { getFundamentals } from "../services/stockApi";
import type { Fundamentals } from "../services/stockApi";
import { useMarketPolling } from "../hooks/useMarketPolling";

export default function MarketStatusBar() {
  const { status, isMarketOpen, pollInterval } = useMarketPolling();
  const [nifty, setNifty] = useState<Fundamentals | null>(null);
  const [sensex, setSensex] = useState<Fundamentals | null>(null);
  const [timeStr, setTimeStr] = useState("");

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Kolkata",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      };
      const dateOptions: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short"
      };
      const now = new Date();
      const time = now.toLocaleTimeString("en-IN", options);
      const date = now.toLocaleDateString("en-IN", dateOptions);
      setTimeStr(`${time} IST (${date})`);
    };

    updateTime();
    const id = setInterval(updateTime, 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch index data
  const fetchIndices = async () => {
    try {
      const [niftyData, sensexData] = await Promise.all([
        getFundamentals("^NSEI"),
        getFundamentals("^BSESN")
      ]);
      setNifty(niftyData);
      setSensex(sensexData);
    } catch (e) {
      console.error("Failed to load index metrics for status bar", e);
    }
  };

  useEffect(() => {
    fetchIndices();
    if (pollInterval > 0) {
      const id = setInterval(fetchIndices, pollInterval);
      return () => clearInterval(id);
    }
  }, [pollInterval]);

  const session = status?.session ?? "closed";
  const remainingMinutes = status?.remainingMinutes ?? 0;
  const h = Math.floor(remainingMinutes / 60);
  const m = remainingMinutes % 60;

  let countdownText = "";
  if (session === "open") {
    countdownText = `CLOSES IN ${h}h ${m}m`;
  } else if (session === "pre-market") {
    countdownText = `PRE-MARKET — OPENS IN ${remainingMinutes}m`;
  } else {
    countdownText = `OPENS IN ${h}h ${m}m`;
  }

  const formatChange = (f: Fundamentals) => {
    const isPos = (f.changePercent ?? 0) >= 0;
    const arrow = isPos ? "▲" : "▼";
    const color = isPos ? "text-neonGreen" : "text-neonRed";
    return (
      <span className={`font-bold ml-1.5 ${color}`}>
        {arrow} {Math.abs(f.change ?? 0).toFixed(1)} ({Math.abs(f.changePercent ?? 0).toFixed(2)}%)
      </span>
    );
  };

  return (
    <div className="bg-surface border-b border-gray-800 text-[10px] font-mono py-1.5 px-6 flex flex-col md:flex-row justify-between items-center gap-2 select-none">
      {/* Left: Market Status */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          {isMarketOpen ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neonGreen opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-neonGreen"></span>
            </>
          ) : (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-600"></span>
          )}
        </span>
        <span className="font-bold text-white uppercase tracking-wider">
          NSE {isMarketOpen ? "OPEN" : "CLOSED"}
        </span>
        <span className="text-gray-600">|</span>
        <span className="text-neonAmber font-bold uppercase">{countdownText}</span>
      </div>

      {/* Center: Indices */}
      <div className="flex items-center gap-4 text-gray-400">
        {nifty && (
          <div className="flex items-center">
            <span className="text-gray-500 font-bold uppercase mr-1">NIFTY 50:</span>
            <span className="text-white font-bold">{nifty.price?.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
            {formatChange(nifty)}
          </div>
        )}
        <span className="text-gray-800 hidden md:inline">/</span>
        {sensex && (
          <div className="flex items-center">
            <span className="text-gray-500 font-bold uppercase mr-1">SENSEX:</span>
            <span className="text-white font-bold">{sensex.price?.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
            {formatChange(sensex)}
          </div>
        )}
      </div>

      {/* Right: IST Clock */}
      <div className="text-gray-500 font-bold tracking-wide">
        {timeStr}
      </div>
    </div>
  );
}
