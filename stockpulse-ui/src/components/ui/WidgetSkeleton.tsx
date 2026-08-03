export default function WidgetSkeleton({ rows = 5, title = '' }: { rows?: number; title?: string }) {
  return (
    <div className="h-full bg-surface border border-gray-800 widget-card flex flex-col overflow-hidden">
      <div className="drag-handle flex items-center px-3 py-2 border-b border-gray-800 bg-gray-900/60">
        <div className="h-2 w-24 bg-gray-700 rounded animate-pulse" />
        {title && <span className="ml-2 text-[10px] text-gray-600 tracking-widest">{title}</span>}
      </div>
      <div className="flex-1 p-3 space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="h-3 bg-gray-800 rounded animate-pulse"
              style={{
                width: `${60 + Math.random() * 30}%`,
                animationDelay: `${i * 0.1}s`,
                background: 'linear-gradient(90deg, #1a1c1e 25%, rgba(57,255,20,0.06) 50%, #1a1c1e 75%)',
                backgroundSize: '200% 100%',
                animation: `shimmer 1.5s infinite ${i * 0.1}s`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
