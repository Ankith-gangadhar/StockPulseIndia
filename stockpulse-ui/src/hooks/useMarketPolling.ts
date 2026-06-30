import { useEffect, useState } from "react";
import { getMarketStatus } from "../services/stockApi";
import type { MarketStatus } from "../services/stockApi";

export function useMarketPolling() {
  const [status, setStatus] = useState<MarketStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const s = await getMarketStatus();
      if (s) {
        setStatus(s);
        setError(null);
      } else {
        setError("Could not retrieve market status");
      }
    } catch {
      setError("Could not retrieve market status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const runLoad = async () => {
      if (active) await load();
    };
    runLoad();

    // Check status every minute
    const id = setInterval(runLoad, 60_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const session = status?.session ?? "closed";
  const pollInterval = session === "open" ? 60_000 : (session === "pre-market" || session === "post-market") ? 120_000 : 0;

  return { status, isMarketOpen: status?.isOpen ?? false, pollInterval, loading, error };
}
