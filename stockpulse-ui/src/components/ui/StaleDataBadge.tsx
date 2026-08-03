import { useState, useEffect } from 'react';

export default function StaleDataBadge({ lastUpdatedAt }: { lastUpdatedAt: Date }) {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    setStale(Date.now() - lastUpdatedAt.getTime() > 30 * 60_000);
  }, [lastUpdatedAt]);

  if (!stale) return null;
  return (
    <span className="ws-stale text-[8px] bg-neonAmber/15 text-neonAmber border border-neonAmber/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 font-mono">
      ⚠ STALE
    </span>
  );
}
