export default function WidgetError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="ws-error flex flex-col items-center justify-center h-full p-4 text-center font-mono">
      <div className="ws-error-title text-neonRed font-bold text-xs uppercase tracking-wider mb-2">⚠ DATA UNAVAILABLE</div>
      <div className="ws-error-msg text-[10px] text-gray-400 mb-3 leading-normal max-w-[200px]">{message}</div>
      <button 
        className="ws-retry px-2.5 py-1 text-[10px] font-bold text-black bg-neonAmber hover:bg-amber-400 rounded transition-colors focus:outline-none cursor-pointer" 
        onClick={onRetry}
      >
        RETRY
      </button>
    </div>
  );
}
