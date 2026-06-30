export default function WidgetSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="ws-skeleton p-3 flex flex-col h-full justify-between">
      <div className="ws-fetching text-xs font-mono">FETCHING DATA<span className="ws-cursor text-neonGreen font-bold">_</span></div>
      <div className="space-y-2 flex-1 mt-3">
        {Array.from({ length: rows }).map((_, i) => <div key={i} className="ws-line" />)}
      </div>
    </div>
  );
}
