import React, { useState, useRef } from 'react';
import { GameMode, ThemeMode, MapId } from '../game/types';
import { GAME_MAPS, MAP_ORDER } from '../game/maps';
import { soundEngine } from '../game/audio/soundEngine';
import { getDailyMissions } from '../game/dailyMissions';
import { PlayerUser } from '../game/firebase';
import {
  Play,
  Flame,
  HelpCircle,
  Trophy,
  Volume2,
  VolumeX,
  Tv,
  ArrowRight,
  Shield,
  Heart,
  Sparkles,
  Maximize,
  Minimize,
  Coins,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  Compass,
  Zap,
  User,
  ShieldCheck
} from 'lucide-react';

interface TitleScreenProps {
  highScore: number;
  isMuted: boolean;
  crtEnabled: boolean;
  theme?: ThemeMode;
  isFullscreen?: boolean;
  selectedMapId: MapId;
  coins: number;
  user?: PlayerUser | null;
  onOpenAuth?: () => void;
  onSelectMap: (mapId: MapId) => void;
  onCycleMap: () => void;
  onOpenUpgrades: () => void;
  onOpenMissions: () => void;
  onStartGame: (mode: GameMode) => void;
  onToggleMute: () => void;
  onToggleCRT: () => void;
  onToggleTheme: () => void;
  onToggleFullscreen?: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  highScore,
  isMuted,
  crtEnabled,
  theme = 'CYBER',
  isFullscreen = false,
  selectedMapId,
  coins,
  user,
  onOpenAuth,
  onSelectMap,
  onCycleMap,
  onOpenUpgrades,
  onOpenMissions,
  onStartGame,
  onToggleMute,
  onToggleCRT,
  onToggleTheme,
  onToggleFullscreen
}) => {
  const [activeTab, setActiveTab] = useState<'MAIN' | 'CONTROLS' | 'SCORES'>('MAIN');
  const isPink = theme === 'SAKURA_PINK';
  const currentMap = GAME_MAPS[selectedMapId] || GAME_MAPS.NEBULA_STATION;
  const currentMapIndex = MAP_ORDER.indexOf(selectedMapId);
  const nextMapIndex = (currentMapIndex + 1) % MAP_ORDER.length;
  const nextMap = GAME_MAPS[MAP_ORDER[nextMapIndex]];

  // Touch Swipe Gesture Detection for Mobile Smartphones
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = endX - touchStartXRef.current;
    const diffY = endY - touchStartYRef.current;

    // Detect horizontal swipe if deltaX > 35 and horizontal dominant over vertical
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 35) {
      if (diffX < 0) {
        // Swiped Left -> Advance to next map
        const nextId = MAP_ORDER[(currentMapIndex + 1) % MAP_ORDER.length];
        onSelectMap(nextId);
        soundEngine.menuClick();
      } else {
        // Swiped Right -> Go to previous map
        const prevId = MAP_ORDER[(currentMapIndex - 1 + MAP_ORDER.length) % MAP_ORDER.length];
        onSelectMap(prevId);
        soundEngine.menuClick();
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const handleStart = (mode: GameMode) => {
    soundEngine.unlock();
    soundEngine.menuSelect();
    if (onToggleFullscreen && !isFullscreen) {
      onToggleFullscreen();
    }
    onStartGame(mode);
  };

  const missions = getDailyMissions();
  const completedMissionsCount = missions.filter((m) => m.current >= m.target && !m.claimed).length;

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-between p-2 sm:p-4 md:p-6 pt-safe pb-safe pl-[max(12px,env(safe-area-inset-left,12px))] pr-[max(12px,env(safe-area-inset-right,12px))] bg-slate-950/85 backdrop-blur-xs select-none overflow-y-auto">
      {/* Top Header Utilities */}
      <header className="w-full max-w-4xl flex items-center justify-between text-[11px] sm:text-xs text-slate-400 gap-1.5 sm:gap-2 shrink-0 py-1">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className={`font-arcade tracking-wider ${isPink ? 'text-pink-400' : 'text-cyan-400'}`}>
            NOKIA 3310
          </span>
          <span className="text-slate-600 hidden xs:inline">·</span>
          <span className="hidden xs:inline">{isPink ? 'SAKURA' : 'COMBAT'}</span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Cloud Auth / Profile Button */}
          <button
            onClick={() => {
              soundEngine.menuClick();
              onOpenAuth?.();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-mono font-medium border transition-all active:scale-95 ${
              user
                ? 'bg-cyan-950/80 border-cyan-400/60 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                : 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:text-white hover:border-cyan-500/60'
            }`}
            title="Google / Facebook Cloud Account & Save Sync"
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Pilot'}
                className="w-3.5 h-3.5 rounded-full object-cover border border-cyan-400/80"
              />
            ) : user ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <User className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span className="truncate max-w-[80px] sm:max-w-[120px]">
              {user?.displayName ? user.displayName.split(' ')[0] : 'SIGN IN'}
            </span>
            {user && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          </button>

          {/* Gold Coins Wallet Header Button */}
          <button
            onClick={onOpenUpgrades}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-950/70 hover:bg-amber-900/70 border border-amber-500/60 text-amber-300 font-arcade text-[10px] sm:text-xs shadow-[0_0_8px_rgba(245,158,11,0.25)] transition-all"
            title="Open Spaceship Hangar & Upgrades"
          >
            <Coins className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="tabular-nums font-bold">{coins.toLocaleString()}</span>
          </button>

          {/* Theme Switcher Button */}
          <button
            onClick={() => {
              soundEngine.menuClick();
              onToggleTheme();
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all border ${
              isPink
                ? 'bg-pink-950/80 border-pink-500/60 text-pink-300 hover:text-pink-100'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-cyan-300'
            }`}
            title="Toggle Theme (Cyber Neon / Sakura Pink)"
          >
            {isPink ? (
              <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400/50" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span className="hidden md:inline">{isPink ? 'SAKURA' : 'CYBER'}</span>
          </button>

          <button
            onClick={onToggleCRT}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              crtEnabled
                ? isPink
                  ? 'bg-pink-950 border border-pink-800 text-pink-300'
                  : 'bg-cyan-950 border border-cyan-800 text-cyan-300'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Retro CRT Scanlines"
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">CRT</span>
          </button>

          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors border ${
                isFullscreen
                  ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (Hide Browser UI)'}
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            onClick={onToggleMute}
            className="flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
            title="Sound effects"
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Volume2 className={`w-3.5 h-3.5 ${isPink ? 'text-pink-400' : 'text-cyan-400'}`} />
            )}
          </button>
        </div>
      </header>

      {/* Main Responsive Center Column: Auto-scaling and scroll-protected */}
      <div className="flex flex-col items-center justify-center my-auto w-full max-w-lg text-center py-1.5 sm:py-2">
        {/* Retro Logo: Dynamically scales down on small Android screens */}
        <div className="relative mb-2 sm:mb-3">
          <svg
            className={`w-52 xs:w-64 sm:w-76 md:w-88 h-auto ${
              isPink
                ? 'drop-shadow-[0_0_20px_rgba(244,63,94,0.5)]'
                : 'drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]'
            }`}
            viewBox="0 0 360 76"
            fill="none"
          >
            <path
              d="M10 18 L350 18 L330 62 L30 62 Z"
              fill={isPink ? 'rgba(244, 63, 94, 0.1)' : 'rgba(6, 182, 212, 0.08)'}
              stroke={isPink ? '#f43f5e' : '#06b6d4'}
              strokeWidth="2"
            />
            <text
              x="180"
              y="42"
              textAnchor="middle"
              className="font-arcade text-xl sm:text-2xl font-bold fill-white tracking-widest"
              style={{
                filter: isPink ? 'drop-shadow(0 0 8px #f472b6)' : 'drop-shadow(0 0 8px #22d3ee)'
              }}
            >
              SPACE IMPACT
            </text>
            <text
              x="180"
              y="55"
              textAnchor="middle"
              className="font-mono text-[8px] sm:text-[9px] font-semibold tracking-[0.25em]"
              fill={isPink ? '#f472b6' : '#22d3ee'}
            >
              {isPink ? 'SAKURA COMBAT SYSTEM' : 'RETRO COMBAT SYSTEM'}
            </text>
          </svg>
        </div>

        {/* Dynamic Center Panels */}
        {activeTab === 'MAIN' && (
          <div className="flex flex-col gap-2 sm:gap-2.5 w-full">
            {/* Streamlined Swipeable Map Selector Card */}
            <div
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className={`relative rounded-xl border-2 overflow-hidden bg-slate-900/90 shadow-lg transition-all ${
                selectedMapId === 'TOXIC_BELT'
                  ? 'border-emerald-500/70 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                  : selectedMapId === 'SINGULARITY_ABYSS'
                  ? 'border-fuchsia-500/70 shadow-[0_0_15px_rgba(217,70,239,0.25)]'
                  : 'border-cyan-500/70 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
              }`}
            >
              {/* Map Image Preview Banner */}
              <div className="relative h-20 sm:h-24 w-full overflow-hidden bg-slate-950">
                <img
                  src={currentMap.imageUrl}
                  alt={currentMap.name}
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                {/* Left/Right Carousel Nav Chevrons */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const prevId = MAP_ORDER[(currentMapIndex - 1 + MAP_ORDER.length) % MAP_ORDER.length];
                    onSelectMap(prevId);
                    soundEngine.menuClick();
                  }}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-700/60 active:scale-90"
                  title="Previous Map"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextId = MAP_ORDER[(currentMapIndex + 1) % MAP_ORDER.length];
                    onSelectMap(nextId);
                    soundEngine.menuClick();
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-700/60 active:scale-90"
                  title="Next Map"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {/* Map Tag & Difficulty Badge */}
                <div className="absolute top-1.5 left-2 flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[8px] sm:text-[9px] font-arcade font-bold tracking-wider border ${
                      currentMap.difficulty === 'EASY'
                        ? 'bg-cyan-950/90 text-cyan-300 border-cyan-400'
                        : currentMap.difficulty === 'MEDIUM'
                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-400'
                        : 'bg-fuchsia-950/90 text-fuchsia-300 border-fuchsia-400'
                    }`}
                  >
                    {currentMap.difficulty} · {currentMap.multiplier}x SCORE
                  </span>
                </div>

                {/* Map Title overlay */}
                <div className="absolute bottom-1.5 left-3 right-3 text-left">
                  <div className="text-white font-arcade text-xs sm:text-sm tracking-wider flex items-center justify-between">
                    <span className="truncate mr-2">{currentMap.name}</span>
                    <span className="text-[9px] sm:text-[10px] font-mono text-amber-300 shrink-0">
                      +{Math.round(currentMap.coinDropRate * 100)}% COINS
                    </span>
                  </div>
                </div>
              </div>

              {/* Integrated Map Switcher Strip */}
              <div className="px-2.5 py-1.5 bg-slate-950/95 flex items-center justify-between gap-1.5 border-t border-slate-800 text-[10px] font-mono">
                <button
                  onClick={() => {
                    soundEngine.menuClick();
                    onCycleMap();
                  }}
                  className="flex items-center gap-1 text-slate-300 hover:text-cyan-300 transition-colors text-[10px]"
                >
                  <Layers className="w-3 h-3 text-cyan-400" />
                  <span>CHANGE MAP</span>
                  <ArrowRight className="w-2.5 h-2.5 text-cyan-400" />
                </button>

                <div className="flex items-center gap-1">
                  {MAP_ORDER.map((mId) => {
                    const cfg = GAME_MAPS[mId];
                    const isSelected = mId === selectedMapId;
                    return (
                      <button
                        key={mId}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectMap(mId);
                        }}
                        className={`px-2 py-0.5 rounded text-[8px] font-arcade transition-all ${
                          isSelected
                            ? cfg.difficulty === 'EASY'
                              ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                              : cfg.difficulty === 'MEDIUM'
                              ? 'bg-emerald-500 text-slate-950 font-bold shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                              : 'bg-fuchsia-500 text-slate-950 font-bold shadow-[0_0_8px_rgba(217,70,239,0.8)]'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {cfg.difficulty[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Primary Launch Grid: Side-by-Side or Responsive Stack */}
            <div className="grid grid-cols-2 gap-2">
              {/* Start Campaign Button */}
              <button
                onClick={() => handleStart('CAMPAIGN')}
                className={`group flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 text-white font-arcade text-xs tracking-wider rounded-lg active:scale-95 transition-all shadow-md ${
                  isPink
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 shadow-[0_0_15px_rgba(244,114,182,0.4)]'
                    : 'bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 shadow-[0_0_15px_rgba(6,182,212,0.35)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span className="truncate">CAMPAIGN</span>
                </div>
                <span className="text-[9px] text-cyan-200 hidden xs:inline">5 SEC</span>
              </button>

              {/* Endless Survival Button */}
              <button
                onClick={() => handleStart('ENDLESS')}
                className="group flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-900 hover:bg-slate-800 border border-amber-500/50 hover:border-amber-400 text-amber-300 font-arcade text-xs tracking-wider rounded-lg shadow-md active:scale-95 transition-all"
              >
                <div className="flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30 shrink-0" />
                  <span className="truncate">ENDLESS</span>
                </div>
                <span className="text-[9px] text-amber-400/80 hidden xs:inline">SCORE</span>
              </button>
            </div>

            {/* Secondary 2x2 Action Matrix */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onOpenUpgrades}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-900/90 hover:bg-slate-800 border border-amber-500/40 hover:border-amber-400 rounded-lg text-[11px] text-amber-300 font-mono transition-all active:scale-95 shadow-sm group"
                title="Spend gold coins on ship blaster, hull, shields and magnet"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="font-semibold truncate">UPGRADE SHIP</span>
              </button>

              <button
                onClick={onOpenMissions}
                className="relative flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-900/90 hover:bg-slate-800 border border-emerald-500/40 hover:border-emerald-400 rounded-lg text-[11px] text-emerald-300 font-mono transition-all active:scale-95 shadow-sm group"
                title="View and claim 24-hour combat orders"
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="font-semibold truncate">DAILY MISSIONS</span>
                {completedMissionsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1 px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-arcade text-[8px] animate-pulse shadow-md">
                    +{completedMissionsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  soundEngine.menuClick();
                  setActiveTab('CONTROLS');
                }}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-[11px] text-slate-300 font-mono transition-all active:scale-95"
              >
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span className="truncate">HOW TO PLAY</span>
              </button>

              <button
                onClick={() => {
                  soundEngine.menuClick();
                  setActiveTab('SCORES');
                }}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-[11px] text-slate-300 font-mono transition-all active:scale-95"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span className="truncate">HALL OF FAME</span>
              </button>
            </div>

            {/* Android / Mobile Fullscreen Prompt (if not already in fullscreen) */}
            {!isFullscreen && onToggleFullscreen && (
              <button
                onClick={() => {
                  soundEngine.menuClick();
                  onToggleFullscreen();
                }}
                className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg border border-cyan-500/40 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-200 text-[10px] font-mono tracking-wider transition-all active:scale-95"
              >
                <Maximize className="w-3 h-3 text-cyan-400" />
                <span>TAP TO ENTER FULLSCREEN (HIDES BROWSER BARS)</span>
              </button>
            )}
          </div>
        )}

        {/* How to Play / Controls Screen */}
        {activeTab === 'CONTROLS' && (
          <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 p-4 sm:p-5 rounded-xl text-left shadow-xl animate-fade-in">
            <h3 className="font-arcade text-xs text-cyan-400 mb-3 flex items-center justify-between">
              <span>PILOT FLIGHT MANUAL</span>
              <button
                onClick={() => setActiveTab('MAIN')}
                className="text-[10px] text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded"
              >
                [BACK]
              </button>
            </h3>

            <div className="space-y-2 text-xs text-slate-300 font-mono">
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Ship Maneuvering</span>
                <span className="font-bold text-white">Touch Drag / WASD / Arrows</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Primary Blaster</span>
                <span className="font-bold text-cyan-400">Auto-Fire / Spacebar</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Ordnance (Nukes/Missiles)</span>
                <span className="font-bold text-amber-400">Tap HUD / Key [K]</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Switch Ordnance</span>
                <span className="font-bold text-purple-400">Key [E] / Tap Icon</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Combo Multiplier</span>
                <span className="font-bold text-emerald-400">Consecutive Hits (Up to 10x)</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Cloud Progression</span>
                <span className="font-bold text-blue-400">Google & Facebook Sync</span>
              </div>
            </div>
          </div>
        )}

        {/* High Scores Screen */}
        {activeTab === 'SCORES' && (
          <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 p-4 sm:p-5 rounded-xl text-left shadow-xl animate-fade-in">
            <h3 className="font-arcade text-xs text-amber-400 mb-3 flex items-center justify-between">
              <span>PILOT HALL OF FAME</span>
              <button
                onClick={() => setActiveTab('MAIN')}
                className="text-[10px] text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded"
              >
                [BACK]
              </button>
            </h3>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center p-2 rounded bg-amber-950/40 border border-amber-500/30">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-200 font-bold">1. {user?.displayName || 'COMMANDER'}</span>
                </div>
                <span className="font-arcade text-amber-300 font-bold">{highScore.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-slate-950/40 border border-slate-800 text-slate-400">
                <span>2. SECTOR ACE</span>
                <span className="font-arcade">28,500</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-slate-950/40 border border-slate-800 text-slate-400">
                <span>3. VOID VANGUARD</span>
                <span className="font-arcade">19,200</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info: Safe margin aware */}
      <footer className="w-full max-w-4xl flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-slate-400 shrink-0 pt-1 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-slate-500">BEST RECORD:</span>
          <span className={`font-arcade font-bold ${isPink ? 'text-pink-400' : 'text-cyan-400'}`}>
            {highScore.toLocaleString()} PTS
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-500">
          <span>{user ? 'CLOUD SYNCED ✓' : 'LOCAL GUEST'}</span>
        </div>
      </footer>
    </div>
  );
};
