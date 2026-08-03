interface MetricRowProps {
  label: string;
  value: number | null | undefined;
  format: 'number' | 'percent' | 'boolean';
  decimals?: number;
  // For "lower is better" metrics (PE, D/E, Beta):
  goodBelow?: number;
  cautionBelow?: number;
  // For "higher is better" metrics (ROE, Growth):
  goodAbove?: number;
  cautionAbove?: number;
  higherIsBetter?: boolean;
  // For RSI-style mid-range:
  isMidRange?: boolean;
  // For boolean metrics:
  positiveLabel?: string;
  negativeLabel?: string;
  // Optional tooltip
  tooltip?: string;
}

type Signal = 'good' | 'caution' | 'bad' | 'neutral';

function getSignal(props: MetricRowProps): Signal {
  const v = props.value;
  if (v == null) return 'neutral';

  if (props.format === 'boolean') return v === 1 ? 'good' : 'caution';

  if (props.isMidRange) {
    // RSI: good between goodAbove and goodBelow
    if (props.goodAbove != null && props.goodBelow != null) {
      if (v >= props.goodAbove && v <= props.goodBelow) return 'good';
      if (props.cautionAbove != null && props.cautionBelow != null) {
        if (v >= props.cautionAbove && v <= props.cautionBelow) return 'caution';
      }
      return 'bad';
    }
  }

  if (props.goodBelow != null) {
    if (v < props.goodBelow) return 'good';
    if (props.cautionBelow != null && v < props.cautionBelow) return 'caution';
    return 'bad';
  }

  if (props.goodAbove != null) {
    if (v > props.goodAbove) return 'good';
    if (props.cautionAbove != null && v > props.cautionAbove) return 'caution';
    return 'bad';
  }

  return 'neutral';
}

const SIGNAL_STYLES: Record<Signal, { dot: string; label: string; text: string }> = {
  good:    { dot: '●', label: 'GOOD',    text: 'text-neonGreen' },
  caution: { dot: '●', label: 'WATCH',   text: 'text-neonAmber' },
  bad:     { dot: '●', label: 'RISK',    text: 'text-neonRed'   },
  neutral: { dot: '○', label: '--',      text: 'text-gray-600'  },
};

function formatValue(props: MetricRowProps): string {
  const v = props.value;
  if (v == null) return '--';
  if (props.format === 'boolean') return v === 1 ? (props.positiveLabel ?? 'Yes') : (props.negativeLabel ?? 'No');
  if (props.format === 'percent') return `${v.toFixed(props.decimals ?? 1)}%`;
  return v.toFixed(props.decimals ?? 2);
}

function getThresholdHint(props: MetricRowProps): string {
  if (props.goodBelow != null) return `Good: <${props.goodBelow}`;
  if (props.goodAbove != null) return `Good: >${props.goodAbove}${props.format === 'percent' ? '%' : ''}`;
  if (props.isMidRange && props.goodAbove != null && props.goodBelow != null)
    return `Ideal: ${props.goodAbove}–${props.goodBelow}`;
  return '';
}

export default function MetricRow(props: MetricRowProps) {
  const signal = getSignal(props);
  const style = SIGNAL_STYLES[signal];
  const displayValue = formatValue(props);
  const hint = getThresholdHint(props);

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-800/40 last:border-b-0 group">
      <div className="flex items-center gap-1.5">
        <span className={`text-[11px] font-mono ${style.text}`}>{style.dot}</span>
        <span className="text-xs text-gray-400 font-mono">{props.label}</span>
        {hint && (
          <span className="text-[9px] text-gray-700 font-mono hidden group-hover:inline transition-all">
            ({hint})
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-gray-200 font-mono">{displayValue}</span>
        <span className={`text-[9px] font-mono ${style.text} w-10 text-right`}>{style.label}</span>
      </div>
    </div>
  );
}
