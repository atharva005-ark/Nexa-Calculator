import React, { useEffect, useState } from 'react';
import { hideNativeSplash } from '../../lib/platform/capacitorBridge';

export const SplashScreen: React.FC = () => {
  const [visible, setVisible] = useState(() => {
    try {
      return !sessionStorage.getItem('nexa-splash-shown');
    } catch {
      return false;
    }
  });
  const [fading, setFading] = useState(false);

  useEffect(() => {
    void hideNativeSplash();
    if (!visible) return;
    const t1 = setTimeout(() => setFading(true), 220);
    const t2 = setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem('nexa-splash-shown', '1');
      } catch {
        // ignore
      }
    }, 420);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#07090E] text-white transition-opacity duration-200 pointer-events-none ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex items-center gap-3.5">
        <img
          src="/icon.svg"
          alt="NEXA Calculator"
          className="w-14 h-14 rounded-2xl shadow-lg shadow-blue-600/20"
        />
        <div>
          <div className="font-display text-2xl font-bold tracking-tight nexa-gradient-text">
            NEXA Calculator
          </div>
          <div className="text-xs text-slate-400 tracking-wide">
            Precision Scientific & Symbolic Suite
          </div>
        </div>
      </div>
    </div>
  );
};
