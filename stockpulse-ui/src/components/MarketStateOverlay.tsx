import { useEffect, useState, useRef } from 'react';
import { getMarketStatus } from '../services/stockApi';

export default function MarketStateOverlay() {
  const [show, setShow] = useState(false);
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const prevIsOpen = useRef<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const status = await getMarketStatus();
      if (!status) return;
      // Only show overlay when state CHANGES
      if (prevIsOpen.current !== null && prevIsOpen.current !== status.isOpen) {
        setIsOpen(status.isOpen);
        setShow(true);
        setTimeout(() => setShow(false), 3000);
      }
      prevIsOpen.current = status.isOpen;
    };

    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!show || isOpen === null) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      style={{ animation: 'fadeInOut 3s ease-in-out forwards' }}
    >
      <div className={`px-16 py-8 border-2 ${isOpen ? 'border-neonGreen text-neonGreen' : 'border-neonRed text-neonRed'} bg-black/80 backdrop-blur-md`}>
        <div className="text-4xl font-bold tracking-[0.3em] text-center font-mono">
          {isOpen ? 'MARKET OPEN' : 'MARKET CLOSED'}
        </div>
        <div className="text-center text-xs tracking-widest mt-2 opacity-60">
          {isOpen ? 'NSE/BSE Session Active' : 'Trading Halted'}
        </div>
      </div>
    </div>
  );
}
