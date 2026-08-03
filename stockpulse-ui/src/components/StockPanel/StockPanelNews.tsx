import type { NewsItem } from '../../services/stockApi';

interface Props { news: NewsItem[]; }

const SENTIMENT_CONFIG = {
  positive: { color: 'text-neonGreen', dot: '▲', bg: 'rgba(57,255,20,0.06)' },
  negative: { color: 'text-neonRed',   dot: '▼', bg: 'rgba(255,49,49,0.06)' },
  neutral:  { color: 'text-gray-500',  dot: '●', bg: 'rgba(255,255,255,0.02)' },
};

function relativeTime(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  } catch { return ''; }
}

export default function StockPanelNews({ news }: Props) {
  return (
    <div className="px-4 py-3">
      <div className="text-[10px] text-gray-500 tracking-widest font-mono mb-2">RECENT NEWS</div>
      <div className="space-y-2">
        {news.map((item, i) => {
          const sentiment = (item.sentiment?.toLowerCase() ?? 'neutral') as keyof typeof SENTIMENT_CONFIG;
          const cfg = SENTIMENT_CONFIG[sentiment] ?? SENTIMENT_CONFIG.neutral;
          return (
            <a
              key={i}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-2 rounded border border-gray-800/50 hover:border-gray-700 transition-colors cursor-pointer"
              style={{ background: cfg.bg }}
            >
              <div className="flex items-start gap-1.5">
                <span className={`text-[10px] ${cfg.color} mt-0.5 shrink-0`}>{cfg.dot}</span>
                <span className="text-[11px] text-gray-300 leading-tight font-mono line-clamp-2">{item.headline}</span>
              </div>
              <div className="flex justify-between mt-1 text-[9px] font-mono text-gray-600">
                <span>{item.source}</span>
                <span>{relativeTime(item.publishedAt)}</span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
