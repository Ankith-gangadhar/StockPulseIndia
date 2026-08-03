import type { BuySignal } from '../../services/stockApi';

const SIGNAL_CONFIG = {
  'STRONG BUY': { color: 'var(--neonGreen, #39ff14)', bg: 'rgba(57,255,20,0.08)', border: 'rgba(57,255,20,0.4)', glow: '0 0 20px rgba(57,255,20,0.3)' },
  'BUY':        { color: '#7fff00',   bg: 'rgba(127,255,0,0.06)', border: 'rgba(127,255,0,0.3)', glow: '0 0 12px rgba(127,255,0,0.2)' },
  'HOLD':       { color: '#ffb300',   bg: 'rgba(255,179,0,0.06)', border: 'rgba(255,179,0,0.3)', glow: '0 0 12px rgba(255,179,0,0.2)' },
  'AVOID':      { color: '#ff3131',   bg: 'rgba(255,49,49,0.08)', border: 'rgba(255,49,49,0.4)', glow: '0 0 20px rgba(255,49,49,0.3)' },
} as const;

type SignalKey = keyof typeof SIGNAL_CONFIG;

interface Props { buySignal: BuySignal; }

export default function BuyVerdictCard({ buySignal }: Props) {
  const key = (buySignal.signal?.toUpperCase() ?? 'HOLD') as SignalKey;
  const cfg = SIGNAL_CONFIG[key] ?? SIGNAL_CONFIG['HOLD'];
  const score = Math.min(100, Math.max(0, buySignal.score ?? 0));

  return (
    <div
      className="m-4 p-4 rounded border"
      style={{ background: cfg.bg, borderColor: cfg.border, boxShadow: cfg.glow }}
    >
      {/* Verdict label */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] text-gray-500 tracking-widest font-mono mb-0.5">SIGNAL VERDICT</div>
          <div className="text-2xl font-black font-mono tracking-wider" style={{ color: cfg.color }}>
            {buySignal.signal ?? 'HOLD'}
          </div>
        </div>
        {/* Score circle */}
        <div className="relative w-16 h-16">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="14" fill="none"
              stroke={cfg.color}
              strokeWidth="3"
              strokeDasharray={`${(score / 100) * 87.96} 87.96`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-black font-mono" style={{ color: cfg.color }}>{score}</span>
            <span className="text-[8px] text-gray-500 font-mono">/100</span>
          </div>
        </div>
      </div>

      {/* Score bar */}
      <div className="mb-3">
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${score}%`, background: cfg.color }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-gray-600 font-mono mt-1">
          <span>AVOID</span><span>HOLD</span><span>BUY</span><span>STRONG BUY</span>
        </div>
      </div>

      {/* Reasons */}
      {buySignal.reasons && buySignal.reasons.length > 0 && (
        <div className="space-y-1">
          <div className="text-[9px] text-gray-600 tracking-widest font-mono">SIGNAL REASONS</div>
          {buySignal.reasons.slice(0, 4).map((reason, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10px] text-gray-400 font-mono">
              <span style={{ color: cfg.color }} className="mt-0.5 shrink-0">▸</span>
              {reason}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
