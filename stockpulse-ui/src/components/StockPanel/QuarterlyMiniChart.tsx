import type { Quarterly } from '../../services/stockApi';

interface Props { quarterly: Quarterly; }

export default function QuarterlyMiniChart({ quarterly }: Props) {
  const quarters = quarterly.quarters?.slice(-6) ?? [];
  if (quarters.length === 0) return null;

  const revenues = quarters.map(q => q.totalRevenue ?? 0);
  const netIncomes = quarters.map(q => q.netIncome ?? 0);
  const maxRev = Math.max(...revenues, 1);

  return (
    <div className="px-4 py-3 border-b border-gray-800/50">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] text-gray-500 tracking-widest font-mono">QUARTERLY RESULTS</div>
        <div className="flex gap-3 text-[9px] font-mono">
          {quarterly.revenueYoY != null && (
            <span className={quarterly.revenueYoY >= 0 ? 'text-neonGreen' : 'text-neonRed'}>
              Rev YoY: {quarterly.revenueYoY >= 0 ? '+' : ''}{quarterly.revenueYoY.toFixed(1)}%
            </span>
          )}
          {quarterly.netIncomeYoY != null && (
            <span className={quarterly.netIncomeYoY >= 0 ? 'text-neonGreen' : 'text-neonRed'}>
              PAT YoY: {quarterly.netIncomeYoY >= 0 ? '+' : ''}{quarterly.netIncomeYoY.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-1 h-16">
        {quarters.map((q, i) => {
          const revH = revenues[i] ? (revenues[i] / maxRev) * 100 : 0;
          const niH = netIncomes[i] && revenues[i] ? (netIncomes[i] / revenues[i]) * revH : 0;
          const qLabel = q.date ? q.date.slice(0, 7) : `Q${i + 1}`;
          const isPositive = netIncomes[i] != null && netIncomes[i]! >= 0;

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group cursor-default">
              <div className="w-full flex flex-col justify-end" style={{ height: '48px' }}>
                {/* Revenue bar */}
                <div className="w-full rounded-t relative overflow-hidden" style={{ height: `${Math.max(revH, 4)}%`, background: 'rgba(57,255,20,0.15)', border: '1px solid rgba(57,255,20,0.25)' }}>
                  {/* Net income overlay */}
                  <div className="absolute bottom-0 left-0 right-0 rounded-t"
                    style={{ height: `${Math.min(Math.max(niH, 0), 100)}%`, background: isPositive ? 'rgba(57,255,20,0.6)' : 'rgba(255,49,49,0.6)' }} />
                </div>
              </div>
              <div className="text-[8px] text-gray-600 font-mono truncate w-full text-center">{qLabel.slice(2)}</div>
              {/* Tooltip on hover */}
              <div className="hidden group-hover:flex absolute bg-gray-900 border border-gray-700 rounded p-1.5 text-[9px] font-mono text-gray-300 flex-col gap-0.5 z-10 shadow-xl whitespace-nowrap">
                <span className="text-gray-500">{qLabel}</span>
                <span>Rev: ₹{revenues[i] ? (revenues[i] / 1e7).toFixed(0) + 'Cr' : '--'}</span>
                <span className={isPositive ? 'text-neonGreen' : 'text-neonRed'}>PAT: ₹{netIncomes[i] ? (Math.abs(netIncomes[i]!) / 1e7).toFixed(0) + 'Cr' : '--'}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 mt-1.5 text-[9px] font-mono text-gray-600">
        <span><span className="inline-block w-2 h-2 bg-neonGreen/20 border border-neonGreen/30 rounded-sm mr-1" />Revenue</span>
        <span><span className="inline-block w-2 h-2 bg-neonGreen/60 rounded-sm mr-1" />Net Profit</span>
      </div>
    </div>
  );
}
