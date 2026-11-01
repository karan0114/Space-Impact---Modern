import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX, Tv, Heart, Sparkles } from 'lucide-react';
import { ThemeMode } from '../game/types';

interface PauseModalProps {
  isMuted: boolean;
  crtEnabled: boolean;
  theme?: ThemeMode;
  onResume: () => void;
  onRestart: () => void;
  onReturnToMenu: () => void;
  onToggleMute: () => void;
  onToggleCRT: () => void;
  onToggleTheme?: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isMuted,
  crtEnabled,
  theme = 'CYBER',
  onResume,
  onRestart,
  onReturnToMenu,
  onToggleMute,
  onToggleCRT,
  onToggleTheme
}) => {
  const isPink = theme === 'SAKURA_PINK';

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs select-none">
      <div
        className={`w-full max-w-sm bg-slate-900 border p-6 rounded-xl shadow-2xl text-center animate-fade-in ${
          isPink
            ? 'border-pink-500/50 shadow-[0_0_30px_rgba(244,114,182,0.25)]'
            : 'border-slate-700'
        }`}
      >
        <h2 className={`text-xl font-arcade tracking-widest mb-1 ${isPink ? 'text-pink-300' : 'text-white'}`}>
          TACTICAL PAUSE
        </h2>
        <p className="text-xs font-mono text-slate-400 mb-6">
          SIMULATION SUSPENDED · AWAITING PILOT ORDERS
        </p>

        <div className="flex flex-col gap-2.5 mb-5">
          <button
            onClick={onResume}
            className={`w-full py-3 text-white font-arcade text-xs tracking-wider rounded-lg shadow-lg flex items-center justify-center gap-2 active:scale-98 transition-all ${
              isPink
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 shadow-[0_0_15px_rgba(244,114,182,0.4)]'
                : 'bg-cyan-600 hover:bg-cyan-500 shadow-lg'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>RESUME MISSION</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs rounded-lg flex items-center justify-center gap-2 active:scale-98 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESTART SECTOR</span>
          </button>

          <button
            onClick={onReturnToMenu}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs rounded-lg flex items-center justify-center gap-2 active:scale-98 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>RETURN TO TITLE</span>
          </button>
        </div>

        {/* Quick Settings Bar */}
        <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-800 text-xs font-mono text-slate-400">
          {onToggleTheme && (
            <>
              <button
                onClick={onToggleTheme}
                className="flex items-center gap-1.5 hover:text-white transition-colors"
                title="Toggle Theme"
              >
                {isPink ? (
                  <Heart className="w-4 h-4 text-pink-400 fill-pink-400/50" />
                ) : (
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                )}
                <span>{isPink ? 'SAKURA' : 'CYBER'}</span>
              </button>
              <span className="text-slate-700">|</span>
            </>
          )}

          <button
            onClick={onToggleMute}
            className="flex items-center gap-1.5 hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            <span>{isMuted ? 'UNMUTE' : 'MUTE'}</span>
          </button>

          <span className="text-slate-700">|</span>

          <button
            onClick={onToggleCRT}
            className="flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <Tv className="w-4 h-4" />
            <span>CRT {crtEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
