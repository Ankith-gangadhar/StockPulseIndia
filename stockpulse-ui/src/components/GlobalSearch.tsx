import { useState, useEffect, useRef, useCallback } from 'react';
import { getApiBaseUrl } from '../services/stockApi';

interface Suggestion {
  symbol: string;
  name: string;
  tradingViewSymbol: string;
}

interface GlobalSearchProps {
  onSelectStock: (symbol: string) => void;
}

export default function GlobalSearch({ onSelectStock }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const BASE = getApiBaseUrl();

  // Global keyboard shortcut: "/" to focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setShowDropdown(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Debounced fetch
  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return; }
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BASE}/api/market/symbols?query=${encodeURIComponent(query.trim())}`);
        if (res.ok) setSuggestions(await res.json());
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [query, BASE]);

  const selectStock = useCallback((symbol: string) => {
    onSelectStock(symbol);
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
  }, [onSelectStock]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && activeIdx >= 0) selectStock(suggestions[activeIdx].symbol);
    if (e.key === 'Escape') setShowDropdown(false);
  };

  return (
    <div className="relative w-72">
      <div className="flex items-center gap-2 bg-gray-900/80 border border-gray-700 rounded px-3 py-1.5 focus-within:border-neonGreen/50 focus-within:shadow-[0_0_8px_rgba(57,255,20,0.2)] transition-all">
        <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setShowDropdown(true); setActiveIdx(-1); }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder='Search stock... ( / )'
          className="flex-1 bg-transparent text-xs text-gray-200 placeholder:text-gray-600 outline-none font-mono"
        />
        {query && (
          <button onClick={() => { setQuery(''); setSuggestions([]); }} className="text-gray-600 hover:text-gray-400 text-xs">✕</button>
        )}
      </div>

      {showDropdown && (query.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-gray-950 border border-gray-700 rounded-md max-h-64 overflow-y-auto shadow-2xl">
          {loading && <div className="px-3 py-2 text-xs text-gray-500 font-mono">Scanning markets...</div>}
          {!loading && suggestions.length === 0 && (
            <div className="px-3 py-2 text-xs text-neonRed font-mono">No match for "{query}"</div>
          )}
          {!loading && suggestions.map((s, i) => (
            <button
              key={s.symbol}
              onClick={() => selectStock(s.symbol)}
              className={`w-full text-left px-3 py-2 hover:bg-white/5 border-b border-gray-800 last:border-b-0 transition-colors ${i === activeIdx ? 'bg-neonGreen/10' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-100 font-mono">{s.symbol}</span>
                <span className="text-[10px] text-neonGreen/60">NSE</span>
              </div>
              <div className="text-[10px] text-gray-500 truncate mt-0.5">{s.name}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
