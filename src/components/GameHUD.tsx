import React from 'react';
import { HUDData } from '../game/types';
import { GAME_MAPS } from '../game/maps';
import {
  Volume2,
  VolumeX,
  Pause,
  Tv,
  Shield,
  Bomb,
  Crosshair,
  Zap,
  Sparkles,
  Heart,
  Maximize,
  Minimize,
  Smartphone,
  Coins
} from 'lucide-react';

interface GameHUDProps {
  hud: HUDData;
  isMuted: boolean;
  crtEnabled: boolean;
  isFullscreen?: boolean;
  onToggleMute: () => void;
  onToggleCRT: () => void;
  onToggleAutoFire: () => void;
  onToggleTheme: () => void;
  onToggleFullscreen?: () => void;
  onToggleSafeFit?: () => void;
  onPause: () => void;
  onFireSecondary: () => void;
  onSwitchSecondary: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  isMuted,
  crtEnabled,
  isFullscreen = false,
  onToggleMute,
  onToggleCRT,
  onToggleAutoFire,
  onToggleTheme,
  onToggleFullscreen,
  onToggleSafeFit,
  onPause,
  onFireSecondary,
  onSwitchSecondary
}) => {
  const isPink = hud.theme === 'SAKURA_PINK';
  const hpPercent = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));

  const weaponNames: Record<string, string> = {
    SINGLE_BLASTER: 'VULCAN I',
    TWIN_BLASTER: 'TWIN LASER',
    SPREAD_VULCAN: 'SPREAD III',
    PLASMA_BEAM: 'PLASMA BEAM'
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between py-2 sm:py-3.5 select-none pt-safe pb-safe pl-[max(16px,env(safe-area-inset-left,16px))] pr-[max(16px,env(safe-area-inset-right,16px))] sm:px-6">
      {/* Top Status Cluster */}
      <div className="flex items-start justify-between gap-2 sm:gap-4 w-full">
        {/* Left: Hull Health & Lives */}
        <div
          className={`flex flex-col gap-1 border backdrop-blur-xs px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg shadow-lg pointer-events-auto transition-colors ${
            isPink
              ? 'bg-rose-950/80 border-pink-700/60 shadow-[0_0_12px_rgba(244,114,182,0.2)]'
              : 'bg-slate-950/80 border-slate-800/80 shadow-lg'
          }`}
        >
          {/* Health Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <span
              className={`text-[9px] sm:text-[10px] font-arcade tracking-wider ${
                isPink ? 'text-pink-300' : 'text-cyan-400'
              }`}
            >
              HULL
            </span>
            <div className="w-20 sm:w-28 md:w-36 h-2.5 sm:h-3 bg-slate-900 border border-slate-700 rounded-xs overflow-hidden relative">
              <div
                className={`h-full transition-all duration-150 ${
                  isPink
                    ? hpPercent > 50
                      ? 'bg-gradient-to-r from-pink-500 to-rose-400'
                      : hpPercent > 25
                      ? 'bg-amber-500'
                      : 'bg-rose-600'
                    : hpPercent > 50
                    ? 'bg-emerald-500'
                    : hpPercent > 25
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${hpPercent}%` }}
              />
              {hud.shieldHp > 0 && (
                <div
                  className={`absolute inset-y-0 left-0 border-r border-white animate-pulse ${
                    isPink ? 'bg-pink-400/80' : 'bg-cyan-400/80'
                  }`}
                  style={{ width: `${Math.min(100, hud.shieldHp * 2)}%` }}
                />
              )}
            </div>
            <span className="text-[11px] sm:text-xs font-mono tabular-nums text-slate-200 font-bold min-w-[42px] sm:min-w-[50px]">
              {hud.hp}/{hud.maxHp}
            </span>
          </div>

          {/* Lives & Shield Status */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <span className="text-[8px] sm:text-[9px] font-arcade text-slate-500">SHIPS</span>
              <div className="flex items-center gap-0.5 sm:gap-1">
                {Array.from({ length: Math.max(0, hud.lives) }).map((_, i) => (
                  <svg
                    key={i}
                    className={`w-3 h-3 sm:w-3.5 sm:h-3.5 drop-shadow-[0_0_4px_rgba(244,114,182,0.8)] ${
                      isPink ? 'text-pink-400' : 'text-cyan-400'
                    }`}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M21 12l-18 9 5-9-5-9z" />
                  </svg>
                ))}
              </div>
            </div>

            {hud.shieldHp > 0 && (
              <span
                className={`flex items-center gap-1 text-[9px] sm:text-[10px] font-mono ${
                  isPink ? 'text-pink-300' : 'text-cyan-300'
                }`}
              >
                <Shield className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${isPink ? 'text-pink-400' : 'text-cyan-400'}`} />
                <span>SHIELD {hud.shieldHp}</span>
              </span>
            )}
          </div>
        </div>

        {/* Center: Boss Health Bar */}
        {hud.boss && hud.boss.active && (
          <div className="flex-1 max-w-xs sm:max-w-md mx-auto bg-slate-950/90 border border-rose-900/80 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-xl pointer-events-auto">
            <div className="flex items-center justify-between text-[9px] sm:text-[11px] font-arcade text-rose-400 mb-1">
              <span className="flex items-center gap-1 truncate max-w-[150px] sm:max-w-none">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                {hud.boss.name}
              </span>
              <span className="font-mono tabular-nums text-rose-300">
                {Math.round((hud.boss.hp / hud.boss.maxHp) * 100)}%
              </span>
            </div>
            <div className="w-full h-2 sm:h-3 bg-slate-900 border border-rose-950 rounded-xs overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-600 to-amber-500 transition-all duration-100"
                style={{
                  width: `${Math.max(0, Math.min(100, (hud.boss.hp / hud.boss.maxHp) * 100))}%`
                }}
              />
            </div>
          </div>
        )}

        {/* Right: Controls Toolbar & Score Box */}
        <div className="flex flex-col items-end gap-1.5 pointer-events-auto">
          {/* Top Quick Actions Bar (Never overlaps with bottom-right mobile thumb action controls!) */}
          <div
            className={`flex items-center gap-1 sm:gap-1.5 border backdrop-blur-xs p-1 sm:p-1.5 rounded-lg shadow-lg pointer-events-auto transition-colors ${
              isPink ? 'bg-rose-950/85 border-pink-700/60' : 'bg-slate-950/85 border-slate-800/80'
            }`}
          >
            {/* Pink Sakura Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              title={isPink ? 'Switch to Cyber Neon Theme' : 'Switch to Sakura Pink Theme (Female Pilot Edition)'}
              className={`p-1 sm:p-1.5 rounded transition-all active:scale-90 ${
                isPink
                  ? 'bg-pink-600/40 border border-pink-400 text-pink-200 shadow-[0_0_8px_rgba(244,114,182,0.6)]'
                  : 'text-slate-400 hover:text-pink-300 hover:bg-slate-900'
              }`}
            >
              {isPink ? <Heart className="w-3.5 h-3.5 fill-pink-400 text-pink-300" /> : <Sparkles className="w-3.5 h-3.5" />}
            </button>

            {/* Auto-Fire Toggle */}
            <button
              onClick={onToggleAutoFire}
              title={hud.autoFire ? 'Auto-Fire Enabled (Click to toggle)' : 'Auto-Fire Disabled (Click to toggle)'}
              className={`p-1 sm:p-1.5 rounded transition-colors ${
                hud.autoFire
                  ? isPink
                    ? 'bg-pink-950 border border-pink-600 text-pink-300'
                    : 'bg-cyan-950 border border-cyan-700 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
            </button>

            {/* CRT Scanline Toggle */}
            <button
              onClick={onToggleCRT}
              title={crtEnabled ? 'Disable CRT Scanlines' : 'Enable CRT Scanlines'}
              className={`p-1 sm:p-1.5 rounded transition-colors ${
                crtEnabled
                  ? isPink
                    ? 'bg-pink-950 border border-pink-700 text-pink-300'
                    : 'bg-cyan-950 border border-cyan-700 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
            </button>

            {/* Safe Bounds Toggle (Android / Mobile Optimization) */}
            {onToggleSafeFit && (
              <button
                onClick={onToggleSafeFit}
                title={
                  hud.safeFitMode !== false
                    ? 'Android Safe Bounds Active - Click to toggle Full Stretch'
                    : 'Full Screen Stretch Active - Click for Android Safe Bounds'
                }
                className={`p-1 sm:p-1.5 rounded transition-colors ${
                  hud.safeFitMode !== false
                    ? isPink
                      ? 'bg-pink-900/60 border border-pink-500 text-pink-200'
                      : 'bg-cyan-950 border border-cyan-600 text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Fullscreen Immersive Mode Toggle */}
            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Immersive Fullscreen'}
                className={`p-1 sm:p-1.5 rounded transition-colors ${
                  isFullscreen
                    ? isPink
                      ? 'bg-pink-900/60 border border-pink-500 text-pink-200'
                      : 'bg-emerald-950 border border-emerald-600 text-emerald-300'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Sound Mute Toggle */}
            <button
              onClick={onToggleMute}
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
              className="p-1 sm:p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded transition-colors"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-slate-300" />}
            </button>

            {/* High-Visibility PAUSE Button (Safely isolated from thumbs) */}
            <button
              onClick={onPause}
              title="Pause Game (Esc or P)"
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md font-arcade text-[8px] sm:text-[9px] active:scale-95 transition-all shadow-md ml-0.5 ${
                isPink
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 border border-pink-300 text-white shadow-[0_0_10px_rgba(244,114,182,0.5)]'
                  : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 border border-amber-300 text-white shadow-[0_0_10px_rgba(245,158,11,0.4)]'
              }`}
            >
              <Pause className="w-3 h-3 fill-current" />
              <span>PAUSE</span>
            </button>
          </div>

          <div
            className={`flex flex-col items-end gap-0.5 sm:gap-1 border backdrop-blur-xs px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg shadow-lg transition-colors ${
              isPink
                ? 'bg-rose-950/80 border-pink-700/60 shadow-[0_0_12px_rgba(244,114,182,0.2)]'
                : 'bg-slate-950/80 border-slate-800/80 shadow-lg'
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className={`text-[9px] sm:text-[10px] font-arcade ${isPink ? 'text-pink-300' : 'text-amber-400'}`}>
                SCORE
              </span>
              {hud.comboMultiplier > 1.0 && (
                <span
                  className={`text-[8px] sm:text-[9px] px-1 py-0.2 rounded font-mono font-bold border tracking-wider animate-pulse ${
                    hud.comboMultiplier >= 5.0
                      ? isPink
                        ? 'bg-pink-500/30 text-pink-200 border-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.6)]'
                        : 'bg-amber-500/30 text-amber-200 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                      : isPink
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                  }`}
                >
                  x{hud.comboMultiplier.toFixed(1)}
                </span>
              )}
              <span className="text-xs sm:text-base font-mono tabular-nums font-bold text-white tracking-wider">
                {hud.score.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 text-[9px] sm:text-[10px] text-slate-400">
              <span className="font-arcade text-slate-500">HI</span>
              <span className="font-mono tabular-nums text-slate-300">
                {Math.max(hud.score, hud.highScore).toLocaleString()}
              </span>
              <span className="text-slate-600">·</span>
              <span className={`font-mono font-semibold ${isPink ? 'text-pink-400' : 'text-cyan-400'}`}>
                {hud.mode === 'CAMPAIGN' ? `STAGE ${hud.stage}` : 'ENDLESS'}
              </span>
            </div>

            {/* Gold Coins Gathered & Map Multiplier Pill */}
            <div className="flex items-center gap-1.5 pt-0.5 border-t border-slate-800/60 w-full justify-between">
              <div className="flex items-center gap-1 text-[9px] font-mono text-amber-300">
                <Coins className="w-3 h-3 text-amber-400 animate-pulse" />
                <span className="font-bold">+{hud.sessionCoins || 0}</span>
                <span className="text-slate-500 text-[8px]">({hud.coins || 0})</span>
              </div>

              {hud.currentMapId && GAME_MAPS[hud.currentMapId] && (
                <span
                  className={`text-[8px] font-mono px-1.5 py-0.2 rounded font-bold border ${
                    GAME_MAPS[hud.currentMapId].difficulty === 'EASY'
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                      : GAME_MAPS[hud.currentMapId].difficulty === 'MEDIUM'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : 'bg-fuchsia-950 text-fuchsia-300 border-fuchsia-800'
                  }`}
                >
                  {GAME_MAPS[hud.currentMapId].difficulty} ({GAME_MAPS[hud.currentMapId].multiplier}x)
                </span>
              )}
            </div>
          </div>

          {/* Arcade Combo Multiplier Indicator */}
          {hud.combo > 0 && (
            <div
              className={`flex flex-col items-end border backdrop-blur-xs px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all duration-150 animate-in fade-in zoom-in-95 ${
                hud.comboMultiplier >= 5.0
                  ? isPink
                    ? 'bg-rose-950/90 border-pink-400 shadow-[0_0_16px_rgba(244,114,182,0.6)]'
                    : 'bg-slate-950/90 border-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.6)]'
                  : hud.comboMultiplier >= 3.0
                  ? isPink
                    ? 'bg-rose-950/85 border-pink-600/80 shadow-[0_0_10px_rgba(244,114,182,0.3)]'
                    : 'bg-slate-950/85 border-amber-500/70 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                  : isPink
                  ? 'bg-rose-950/80 border-pink-700/60'
                  : 'bg-slate-950/80 border-cyan-800/80'
              }`}
            >
              {/* Hit Count & Multiplier Tier */}
              <div className="flex items-center gap-2">
                <div className="flex items-baseline gap-1">
                  <span
                    className={`font-arcade text-xs sm:text-sm font-bold tracking-tight ${
                      hud.comboMultiplier >= 5.0
                        ? 'text-amber-300 animate-pulse'
                        : isPink
                        ? 'text-pink-300'
                        : 'text-cyan-300'
                    }`}
                  >
                    {hud.combo}
                  </span>
                  <span className="text-[8px] sm:text-[9px] font-arcade text-slate-400">HITS</span>
                </div>

                <div
                  className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-extrabold tracking-wider uppercase border flex items-center gap-1 ${
                    hud.comboMultiplier >= 5.0
                      ? isPink
                        ? 'bg-pink-500/30 text-pink-200 border-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.7)]'
                        : 'bg-amber-500/30 text-amber-200 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.7)]'
                      : hud.comboMultiplier >= 3.0
                      ? isPink
                        ? 'bg-pink-900/60 text-pink-300 border-pink-500/60'
                        : 'bg-amber-900/60 text-amber-300 border-amber-500/60'
                      : hud.comboMultiplier >= 2.0
                      ? isPink
                        ? 'bg-purple-900/60 text-purple-300 border-purple-500/60'
                        : 'bg-emerald-900/60 text-emerald-300 border-emerald-500/60'
                      : isPink
                      ? 'bg-rose-900/40 text-pink-300 border-pink-700/40'
                      : 'bg-cyan-950/60 text-cyan-300 border-cyan-700/60'
                  }`}
                >
                  <Zap
                    className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${
                      hud.comboMultiplier >= 5.0 ? 'animate-bounce text-amber-300' : ''
                    }`}
                  />
                  <span>
                    {hud.comboMultiplier >= 5.0
                      ? 'MAX x5.0'
                      : `x${hud.comboMultiplier.toFixed(1)} MULTI`}
                  </span>
                </div>
              </div>

              {/* Combo Decay Timer Gauge Bar */}
              <div className="w-full mt-1 flex flex-col gap-0.5">
                <div className="w-24 sm:w-32 h-1 sm:h-1.5 bg-slate-900/90 rounded-full overflow-hidden border border-slate-700/60 relative">
                  <div
                    className={`h-full transition-all duration-75 rounded-full ${
                      hud.comboTimerRatio < 0.25
                        ? 'bg-rose-500 animate-pulse'
                        : hud.comboTimerRatio < 0.5
                        ? 'bg-amber-500'
                        : isPink
                        ? 'bg-gradient-to-r from-pink-500 to-rose-400'
                        : 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, hud.comboTimerRatio * 100))}%` }}
                  />
                </div>

                {/* Multiplier Milestone Scale */}
                <div className="flex items-center justify-between text-[7px] sm:text-[8px] font-mono text-slate-400 px-0.5">
                  <span className={hud.comboMultiplier >= 1.0 ? (isPink ? 'text-pink-400' : 'text-cyan-400') : 'text-slate-600'}>1x</span>
                  <span className={hud.comboMultiplier >= 2.0 ? (isPink ? 'text-purple-300 font-bold' : 'text-emerald-400 font-bold') : 'text-slate-600'}>2x</span>
                  <span className={hud.comboMultiplier >= 3.0 ? (isPink ? 'text-pink-300 font-bold' : 'text-amber-400 font-bold') : 'text-slate-600'}>3x</span>
                  <span className={hud.comboMultiplier >= 5.0 ? (isPink ? 'text-pink-200 font-bold' : 'text-amber-300 font-bold') : 'text-slate-600'}>5x MAX</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status & Controls Cluster */}
      <div className="flex items-end justify-between gap-2 sm:gap-4 w-full">
        {/* Weapon Armament Status */}
        <div
          className={`flex items-center gap-2 sm:gap-3 border backdrop-blur-xs px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg pointer-events-auto transition-colors ${
            isPink ? 'bg-rose-950/80 border-pink-700/60' : 'bg-slate-950/80 border-slate-800/80'
          }`}
        >
          <div className="flex flex-col">
            <span className="text-[8px] sm:text-[9px] font-arcade text-slate-500">PRIMARY</span>
            <span className={`text-[11px] sm:text-xs font-mono font-bold ${isPink ? 'text-pink-300' : 'text-cyan-300'}`}>
              {weaponNames[hud.primaryWeapon] || 'VULCAN'}
            </span>
          </div>

          <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
            {[1, 2, 3, 4].map((tier) => (
              <div
                key={tier}
                className={`w-1.5 sm:w-2 h-3 sm:h-4 rounded-xs border ${
                  tier <= hud.weaponTier
                    ? isPink
                      ? 'bg-pink-400 border-pink-300 shadow-[0_0_6px_rgba(244,114,182,0.8)]'
                      : 'bg-cyan-400 border-cyan-300 shadow-[0_0_6px_rgba(6,182,212,0.8)]'
                    : 'bg-slate-900 border-slate-800'
                }`}
              />
            ))}
          </div>

          {/* Secondary Ordnance display / button */}
          <div className="flex items-center gap-1.5 sm:gap-2 border-l border-slate-800 pl-2 sm:pl-3">
            <button
              onClick={onSwitchSecondary}
              title="Click to switch secondary weapon (or press X)"
              className="flex items-center gap-1 px-1.5 sm:px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded text-amber-300 text-[10px] sm:text-xs font-mono transition-colors"
            >
              {hud.selectedSecondary === 'HOMING_MISSILES' ? (
                <>
                  <Crosshair className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">MISSILES</span>
                </>
              ) : (
                <>
                  <Bomb className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">EMP NUKE</span>
                </>
              )}
            </button>

            <button
              onClick={onFireSecondary}
              disabled={hud.secondaryAmmo <= 0}
              title="Launch secondary weapon (or press K / X)"
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] sm:text-xs font-mono font-bold transition-all ${
                hud.secondaryAmmo > 0
                  ? isPink
                    ? 'bg-pink-600/40 hover:bg-pink-600/60 border border-pink-400 text-pink-100 active:scale-95 shadow-[0_0_8px_rgba(244,114,182,0.4)]'
                    : 'bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500 text-amber-200 active:scale-95 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                  : 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              <span>x{hud.secondaryAmmo}</span>
              <span className="text-[10px] text-amber-400/80 hidden md:inline">[K]</span>
            </button>
          </div>
        </div>

        {/* Desktop Controls Legend (Hidden on touch devices so mobile VirtualControls has 100% thumb clearance) */}
        <div className="hidden md:flex items-center gap-2 text-[9px] font-mono text-slate-500 bg-slate-950/60 border border-slate-800/60 px-3 py-1.5 rounded-lg pointer-events-none">
          <span>[SPACE] FIRE</span>
          <span>·</span>
          <span>[K] NUKE</span>
          <span>·</span>
          <span>[X] SWITCH</span>
          <span>·</span>
          <span>[P] PAUSE</span>
        </div>
      </div>
    </div>
  );
};
