import React, { useState } from 'react';
import { GameMode, ThemeMode } from '../game/types';
import { soundEngine } from '../game/audio/soundEngine';
import { Play, Flame, HelpCircle, Trophy, Volume2, VolumeX, Tv, ArrowRight, Shield, Crosshair, Bomb, Heart, Sparkles } from 'lucide-react';

interface TitleScreenProps {
  highScore: number;
  isMuted: boolean;
  crtEnabled: boolean;
  theme?: ThemeMode;
  onStartGame: (mode: GameMode) => void;
  onToggleMute: () => void;
  onToggleCRT: () => void;
  onToggleTheme: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  highScore,
  isMuted,
  crtEnabled,
  theme = 'CYBER',
  onStartGame,
  onToggleMute,
  onToggleCRT,
  onToggleTheme
}) => {
  const [activeTab, setActiveTab] = useState<'MAIN' | 'CONTROLS' | 'SCORES'>('MAIN');
  const isPink = theme === 'SAKURA_PINK';

  const handleStart = (mode: GameMode) => {
    soundEngine.unlock();
    soundEngine.menuSelect();
    onStartGame(mode);
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-between p-3 sm:p-6 md:p-10 bg-slate-950/80 backdrop-blur-xs select-none overflow-y-auto">
      {/* Top Header Utilities */}
      <div className="w-full max-w-4xl flex items-center justify-between text-[11px] sm:text-xs text-slate-400">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className={`font-arcade tracking-wider ${isPink ? 'text-pink-400' : 'text-cyan-400'}`}>
            NOKIA 3310
          </span>
          <span className="text-slate-600">·</span>
          <span>{isPink ? 'SAKURA EDITION' : 'ARCADE SHMUP'}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Switcher Button */}
          <button
            onClick={() => {
              soundEngine.menuClick();
              onToggleTheme();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all border ${
              isPink
                ? 'bg-pink-950/80 border-pink-500/60 text-pink-300 hover:text-pink-100 shadow-[0_0_12px_rgba(244,114,182,0.35)]'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-cyan-300'
            }`}
            title="Toggle Theme (Cyber Neon / Sakura Pink)"
          >
            {isPink ? (
              <>
                <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400/50" />
                <span>SAKURA PINK</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>CYBER NEON</span>
              </>
            )}
          </button>

          <button
            onClick={onToggleCRT}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
              crtEnabled
                ? isPink
                  ? 'bg-pink-950 border border-pink-800 text-pink-300'
                  : 'bg-cyan-950 border border-cyan-800 text-cyan-300'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>CRT {crtEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={onToggleMute}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Volume2 className={`w-3.5 h-3.5 ${isPink ? 'text-pink-400' : 'text-cyan-400'}`} />
            )}
            <span>{isMuted ? 'MUTED' : 'CHIPTUNE'}</span>
          </button>
        </div>
      </div>

      {/* Main Title Centerpiece */}
      <div className="flex flex-col items-center justify-center my-auto max-w-xl w-full text-center">
        {/* Bespoke Retro Logo */}
        <div className="relative mb-6">
          <svg
            className={`w-72 md:w-96 h-auto ${
              isPink
                ? 'drop-shadow-[0_0_25px_rgba(244,63,94,0.6)]'
                : 'drop-shadow-[0_0_25px_rgba(6,182,212,0.6)]'
            }`}
            viewBox="0 0 360 80"
            fill="none"
          >
            {/* Outer border glow */}
            <path
              d="M10 20 L350 20 L330 65 L30 65 Z"
              fill={isPink ? 'rgba(244, 63, 94, 0.1)' : 'rgba(6, 182, 212, 0.08)'}
              stroke={isPink ? '#f43f5e' : '#06b6d4'}
              strokeWidth="2"
            />
            {/* Main title text */}
            <text
              x="180"
              y="44"
              textAnchor="middle"
              className="font-arcade text-2xl font-bold fill-white tracking-widest"
              style={{
                filter: isPink ? 'drop-shadow(0 0 8px #f472b6)' : 'drop-shadow(0 0 8px #22d3ee)'
              }}
            >
              SPACE IMPACT
            </text>
            <text
              x="180"
              y="58"
              textAnchor="middle"
              className="font-mono text-[9px] font-semibold tracking-[0.3em]"
              fill={isPink ? '#f472b6' : '#22d3ee'}
            >
              {isPink ? 'SAKURA COMBAT SYSTEM' : 'RETRO COMBAT SYSTEM'}
            </text>
          </svg>
        </div>

        {/* Dynamic Center Panels */}
        {activeTab === 'MAIN' && (
          <div className="flex flex-col gap-3 w-full max-w-sm">
            {/* Start Campaign Button */}
            <button
              onClick={() => handleStart('CAMPAIGN')}
              className={`group relative flex items-center justify-between px-6 py-3.5 text-white font-arcade text-xs tracking-wider rounded-lg active:scale-98 transition-all ${
                isPink
                  ? 'bg-gradient-to-r from-pink-600 via-rose-500 to-pink-500 hover:from-pink-500 hover:to-rose-400 shadow-[0_0_20px_rgba(244,114,182,0.5)]'
                  : 'bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Play className="w-4 h-4 fill-current" />
                <span>START CAMPAIGN</span>
              </div>
              <span className={`text-[10px] group-hover:translate-x-1 transition-transform ${isPink ? 'text-pink-100' : 'text-cyan-200'}`}>
                5 SECTORS
              </span>
            </button>

            {/* Endless Survival Button */}
            <button
              onClick={() => handleStart('ENDLESS')}
              className="group relative flex items-center justify-between px-6 py-3.5 bg-slate-900 hover:bg-slate-800 border border-amber-500/50 hover:border-amber-400 text-amber-300 font-arcade text-xs tracking-wider rounded-lg shadow-md active:scale-98 transition-all"
            >
              <div className="flex items-center gap-3">
                <Flame className="w-4 h-4 text-amber-400 fill-amber-400/30" />
                <span>ENDLESS SURVIVAL</span>
              </div>
              <span className="text-[10px] text-amber-400/80 group-hover:translate-x-1 transition-transform">
                SCORE RUN
              </span>
            </button>

            {/* Secondary navigation tabs */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={() => {
                  soundEngine.menuClick();
                  setActiveTab('CONTROLS');
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded text-xs text-slate-300 font-mono transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span>HOW TO PLAY</span>
              </button>

              <button
                onClick={() => {
                  soundEngine.menuClick();
                  setActiveTab('SCORES');
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded text-xs text-slate-300 font-mono transition-colors"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>HALL OF FAME</span>
              </button>
            </div>
          </div>
        )}

        {/* How to Play / Controls Screen */}
        {activeTab === 'CONTROLS' && (
          <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 p-5 rounded-lg text-left shadow-xl animate-fade-in">
            <h3 className="font-arcade text-xs text-cyan-400 mb-3 flex items-center justify-between">
              <span>PILOT FLIGHT MANUAL</span>
              <button
                onClick={() => setActiveTab('MAIN')}
                className="text-[10px] text-slate-400 hover:text-white"
              >
                [BACK]
              </button>
            </h3>

            <div className="space-y-3 text-xs text-slate-300 font-mono">
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Ship Maneuvering</span>
                <span className="font-bold text-white">WASD or Arrow Keys / Touch D-pad</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Primary Blaster</span>
                <span className="font-bold text-cyan-400">Spacebar or [J] / Fire Button</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Launch Secondary</span>
                <span className="font-bold text-amber-400">[K] or [X] (Homing Missiles / Nuke)</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Pause Tactical HUD</span>
                <span className="font-bold text-white">Esc or [P]</span>
              </div>
            </div>

            {/* Power-up Guide */}
            <div className="mt-4 pt-3 border-t border-slate-800">
              <span className="text-[10px] font-arcade text-slate-400 block mb-2">TACTICAL ORDNANCE CAPSULES</span>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-400 text-cyan-300 flex items-center justify-center font-bold text-[10px]">W</span>
                  <span>Weapon Upgrade</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-950 border border-amber-400 text-amber-300 flex items-center justify-center font-bold text-[10px]">M</span>
                  <span>+2 Missiles/Nuke</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-950 border border-blue-400 text-blue-300 flex items-center justify-center font-bold text-[10px]">S</span>
                  <span>Energy Shield</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-400 text-emerald-300 flex items-center justify-center font-bold text-[10px]">♥</span>
                  <span>+1 Extra Ship</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('MAIN')}
              className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-mono text-center transition-colors"
            >
              Return to Flight Deck
            </button>
          </div>
        )}

        {/* Hall of Fame / High Scores */}
        {activeTab === 'SCORES' && (
          <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 p-5 rounded-lg text-left shadow-xl animate-fade-in">
            <h3 className="font-arcade text-xs text-amber-400 mb-3 flex items-center justify-between">
              <span>RECORD ARCHIVE</span>
              <button
                onClick={() => setActiveTab('MAIN')}
                className="text-[10px] text-slate-400 hover:text-white"
              >
                [BACK]
              </button>
            </h3>

            <div className="bg-slate-950 p-4 rounded border border-slate-800 text-center mb-4">
              <span className="text-[10px] font-arcade text-slate-400 block mb-1">ALL-TIME HIGH SCORE</span>
              <span className="text-2xl font-mono tabular-nums font-bold text-amber-400 tracking-wider">
                {highScore.toLocaleString()} PTS
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">1. ACE PILOT</span>
                <span className="text-amber-300 font-bold tabular-nums">{Math.max(highScore, 15000).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">2. NO-DEATH RUN</span>
                <span className="text-slate-300 tabular-nums">11,200</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">3. CADET VANGUARD</span>
                <span className="text-slate-400 tabular-nums">7,500</span>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('MAIN')}
              className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-mono text-center transition-colors"
            >
              Return to Flight Deck
            </button>
          </div>
        )}
      </div>

      {/* Control Hint Line (Per Game Craft Guidelines) */}
      <div className="text-[10px] sm:text-[11px] font-mono text-slate-400 text-center py-2">
        <span className="hidden sm:inline">WASD Move · Space Action · K/X Special · Esc Pause</span>
        <span className="sm:hidden">Touch & Drag anywhere to fly · Virtual D-Pad & Fire buttons</span>
      </div>
    </div>
  );
};
