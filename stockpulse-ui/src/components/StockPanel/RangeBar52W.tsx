interface Props {
  price: number | null;
  low: number | null;
  high: number | null;
}

export default function RangeBar52W({ price, low, high }: Props) {
  if (!price || !low || !high || high === low) return null;

  const position = Math.max(0, Math.min(100, ((price - low) / (high - low)) * 100));
  const signal = position < 30 ? 'good' : position < 70 ? 'caution' : 'bad';
  const signalColor = signal === 'good' ? '#39ff14' : signal === 'caution' ? '#ffb300' : '#ff3131';
  const signalLabel = signal === 'good' ? 'Near 52W Low — Potential Entry' : signal === 'bad' ? 'Near 52W High — Caution' : 'Mid Range';

  return (
    <div className="px-4 py-3 border-b border-gray-800/50">
      <div className="text-[10px] text-gray-500 tracking-widest font-mono mb-2">52-WEEK RANGE</div>
      <div className="relative h-2 bg-gray-800 rounded-full mb-2">
        {/* Gradient fill */}
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${position}%`, background: `linear-gradient(90deg, #39ff14, ${signalColor})` }} />
        {/* Current price marker */}
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white bg-gray-900 shadow-lg"
          style={{ left: `${position}%`, transform: `translateX(-50%) translateY(-50%)` }} />
      </div>
      <div className="flex justify-between text-[9px] font-mono text-gray-500">
        <span>₹{low.toFixed(0)} <span className="text-gray-700">52W LOW</span></span>
        <span style={{ color: signalColor }} className="text-[10px]">{position.toFixed(0)}% of range</span>
        <span className="text-right">₹{high.toFixed(0)} <span className="text-gray-700">52W HIGH</span></span>
      </div>
      <div className="mt-1.5 text-[10px] font-mono text-center" style={{ color: signalColor }}>
        {signalLabel}
      </div>
    </div>
  );
}
