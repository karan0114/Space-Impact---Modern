import React, { useRef, useState, useEffect } from 'react';
import { GameEngine } from '../game/gameEngine';
import { ThemeMode } from '../game/types';
import { Crosshair, Bomb, Zap, Heart } from 'lucide-react';

interface VirtualControlsProps {
  engine: GameEngine | null;
  forceVisible?: boolean;
  theme?: ThemeMode;
}

export const VirtualControls: React.FC<VirtualControlsProps> = ({
  engine,
  forceVisible = false,
  theme = 'CYBER'
}) => {
  const isPink = theme === 'SAKURA_PINK';

  const [isTouchEnvironment, setIsTouchEnvironment] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.innerWidth <= 1024
    );
  });

  const dpadRef = useRef<HTMLDivElement>(null);
  const [activeDpad, setActiveDpad] = useState({ x: 0, y: 0 });
  const [isFiring, setIsFiring] = useState(false);
  const [autoFireActive, setAutoFireActive] = useState(true);

  useEffect(() => {
    const onWindowTouch = () => {
      setIsTouchEnvironment(true);
    };
    window.addEventListener('touchstart', onWindowTouch, { once: true });
    return () => {
      window.removeEventListener('touchstart', onWindowTouch);
    };
  }, []);

  useEffect(() => {
    if (engine) {
      setAutoFireActive(engine.autoFire);
    }
  }, [engine]);

  if (!isTouchEnvironment && !forceVisible) {
    return null;
  }

  const handleDpadTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!dpadRef.current || !engine) return;
    const rect = dpadRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = touch.clientX - centerX;
    const deltaY = touch.clientY - centerY;
    const dist = Math.hypot(deltaX, deltaY);

    if (dist < 8) {
      engine.virtualDpad = { x: 0, y: 0 };
      setActiveDpad({ x: 0, y: 0 });
      return;
    }

    const normX = deltaX / dist;
    const normY = deltaY / dist;

    engine.virtualDpad = { x: normX, y: normY };
    setActiveDpad({ x: normX, y: normY });
  };

  const handleDpadEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (engine) {
      engine.virtualDpad = { x: 0, y: 0 };
    }
    setActiveDpad({ x: 0, y: 0 });
  };

  const handleFireStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!engine) return;
    engine.virtualShooting = true;
    setIsFiring(true);
  };

  const handleFireEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!engine) return;
    engine.virtualShooting = false;
    setIsFiring(false);
  };

  const handleToggleAutoFire = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!engine) return;
    const nextVal = engine.toggleAutoFire();
    setAutoFireActive(nextVal);
  };

  const handleSecondary = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!engine) return;
    engine.fireSecondary();
  };

  const handleSwitchSecondary = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!engine) return;
    engine.switchSecondary();
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-20 select-none pb-safe">
      {/* On-screen touch pilot hint */}
      <div
        className={`absolute top-16 left-1/2 -translate-x-1/2 text-[10px] font-mono px-3 py-1 rounded-full border backdrop-blur-xs hidden sm:block pointer-events-none transition-colors ${
          isPink
            ? 'text-pink-300 bg-pink-950/70 border-pink-700/60 shadow-[0_0_10px_rgba(244,114,182,0.3)]'
            : 'text-cyan-400/80 bg-slate-950/70 border-cyan-900/60 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
        }`}
      >
        TOUCH & SLIDE ANYWHERE TO PILOT
      </div>

      {/* Left: Directional Touch Pad */}
      <div className="absolute left-3 bottom-4 md:left-6 md:bottom-6 pointer-events-auto touch-none">
        <div
          ref={dpadRef}
          onTouchStart={handleDpadTouch}
          onTouchMove={handleDpadTouch}
          onTouchEnd={handleDpadEnd}
          onTouchCancel={handleDpadEnd}
          className={`relative w-28 h-28 sm:w-36 sm:h-36 rounded-full backdrop-blur-xs flex items-center justify-center transition-all ${
            isPink
              ? 'bg-rose-950/70 border-2 border-pink-500/50 active:border-pink-300 shadow-[0_0_16px_rgba(244,114,182,0.3)]'
              : 'bg-slate-950/70 border-2 border-cyan-500/40 active:border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
          }`}
        >
          {/* Central Thumb Knob */}
          <div
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex items-center justify-center transition-transform duration-75 ${
              isPink
                ? 'bg-gradient-to-br from-pink-500 to-rose-700 border-pink-200 shadow-[0_0_12px_rgba(244,114,182,0.7)]'
                : 'bg-gradient-to-br from-cyan-500/80 to-slate-800 border-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.6)]'
            }`}
            style={{
              transform: `translate(${activeDpad.x * 22}px, ${activeDpad.y * 22}px)`
            }}
          >
            {isPink ? (
              <Heart className="w-3.5 h-3.5 text-white/90 fill-white" />
            ) : (
              <div className="w-3.5 h-3.5 rounded-full bg-white/80" />
            )}
          </div>

          {/* D-Pad Directional Indicators */}
          <div className={`absolute top-1.5 text-[9px] font-arcade ${isPink ? 'text-pink-300' : 'text-cyan-400/80'}`}>
            ▲
          </div>
          <div className={`absolute bottom-1.5 text-[9px] font-arcade ${isPink ? 'text-pink-300' : 'text-cyan-400/80'}`}>
            ▼
          </div>
          <div className={`absolute left-1.5 text-[9px] font-arcade ${isPink ? 'text-pink-300' : 'text-cyan-400/80'}`}>
            ◀
          </div>
          <div className={`absolute right-1.5 text-[9px] font-arcade ${isPink ? 'text-pink-300' : 'text-cyan-400/80'}`}>
            ▶
          </div>
        </div>
      </div>

      {/* Right: Phone Action Cluster */}
      <div className="absolute right-3 bottom-4 md:right-6 md:bottom-6 flex items-end gap-2.5 sm:gap-3 pointer-events-auto touch-none">
        {/* Secondary ordnance switch & fire */}
        <div className="flex flex-col gap-2 items-center">
          {/* Auto-fire toggle button */}
          <button
            onTouchStart={handleToggleAutoFire}
            onClick={handleToggleAutoFire}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border flex flex-col items-center justify-center active:scale-90 transition-all ${
              autoFireActive
                ? isPink
                  ? 'bg-pink-600 border-pink-200 text-white shadow-[0_0_12px_rgba(244,114,182,0.8)]'
                  : 'bg-cyan-600/80 border-cyan-300 text-white shadow-[0_0_10px_rgba(6,182,212,0.6)]'
                : 'bg-slate-900/80 border-slate-700 text-slate-400'
            }`}
            title="Toggle Auto-Fire"
          >
            <Zap className="w-4 h-4" />
            <span className="text-[7px] font-mono leading-none mt-0.5">AUTO</span>
          </button>

          {/* Swap Ordnance button */}
          <button
            onTouchStart={handleSwitchSecondary}
            onClick={handleSwitchSecondary}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border flex items-center justify-center active:scale-90 transition-colors ${
              isPink
                ? 'bg-rose-950/80 border-pink-700 hover:border-pink-500 text-pink-300'
                : 'bg-slate-900/80 border-slate-700 hover:border-slate-500 text-amber-400'
            }`}
            title="Switch Ordnance (Missiles / EMP)"
          >
            {engine?.player.selectedSecondary === 'HOMING_MISSILES' ? (
              <Crosshair className="w-5 h-5" />
            ) : (
              <Bomb className="w-5 h-5 text-rose-400" />
            )}
          </button>

          {/* Launch Special Ordnance Button */}
          <button
            onTouchStart={handleSecondary}
            onClick={handleSecondary}
            disabled={(engine?.player.secondaryAmmo || 0) <= 0}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex flex-col items-center justify-center font-arcade text-[8px] sm:text-[9px] active:scale-90 transition-all ${
              (engine?.player.secondaryAmmo || 0) > 0
                ? isPink
                  ? 'bg-gradient-to-br from-pink-500 to-rose-600 border-pink-200 text-white shadow-[0_0_14px_rgba(244,114,182,0.7)]'
                  : 'bg-amber-600/80 active:bg-amber-500 border-amber-300 text-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                : 'bg-slate-900/80 border-slate-800 text-slate-600'
            }`}
            title="Fire Special Ordnance"
          >
            <span>BOMB</span>
            <span className="text-[8px] font-mono font-bold">x{engine?.player.secondaryAmmo || 0}</span>
          </button>
        </div>

        {/* Primary Fire Button (Large and thumb-friendly) */}
        <button
          onTouchStart={handleFireStart}
          onTouchEnd={handleFireEnd}
          onMouseDown={handleFireStart}
          onMouseUp={handleFireEnd}
          className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 flex flex-col items-center justify-center font-arcade text-[10px] sm:text-xs tracking-wider transition-all active:scale-90 shadow-xl ${
            isFiring
              ? isPink
                ? 'bg-pink-400 border-white text-white shadow-[0_0_24px_rgba(244,114,182,0.95)]'
                : 'bg-cyan-500 border-white text-white shadow-[0_0_20px_rgba(6,182,212,0.9)]'
              : isPink
              ? 'bg-gradient-to-br from-pink-600 to-rose-700 border-pink-300 text-pink-100 shadow-[0_0_16px_rgba(244,114,182,0.6)]'
              : 'bg-cyan-600/80 border-cyan-300 text-cyan-100 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
          }`}
        >
          <span>FIRE</span>
          {autoFireActive && (
            <span className={`text-[7px] mt-0.5 ${isPink ? 'text-pink-200' : 'text-cyan-200'}`}>
              AUTO ON
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
