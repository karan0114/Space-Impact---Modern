import React from 'react';
import { GameMode, GameStats, ThemeMode } from '../game/types';
import { GAME_MAPS } from '../game/maps';
import { getPlayerCoins } from '../game/upgrades';
import { RotateCcw, Home, Trophy, Skull, Award, Coins } from 'lucide-react';

interface GameOverModalProps {
  isVictory: boolean;
  stats: GameStats;
  highScore: number;
  mode: GameMode;
  theme?: ThemeMode;
  onRestart: () => void;
  onReturnToMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isVictory,
  stats,
  highScore,
  mode,
  theme = 'CYBER',
  onRestart,
  onReturnToMenu
}) => {
  const isNewHighScore = stats.score >= highScore && stats.score > 0;
  const isPink = theme === 'SAKURA_PINK';

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 pt-safe pb-safe pl-[max(16px,env(safe-area-inset-left,16px))] pr-[max(16px,env(safe-area-inset-right,16px))] bg-slate-950/85 backdrop-blur-xs select-none">
      <div
        className={`w-full max-w-md bg-slate-900 border-2 ${
          isVictory
            ? isPink
              ? 'border-pink-500 shadow-[0_0_35px_rgba(244,114,182,0.4)]'
              : 'border-emerald-500 shadow-[0_0_35px_rgba(16,185,129,0.3)]'
            : 'border-rose-600 shadow-[0_0_35px_rgba(239,68,68,0.3)]'
        } p-6 md:p-8 rounded-xl text-center animate-fade-in`}
      >
        <div
          className={`inline-flex p-3 rounded-full mb-3 border ${
            isVictory ? 'bg-emerald-950 border-emerald-500/50 text-emerald-400' : 'bg-rose-950 border-rose-500/50 text-rose-400'
          }`}
        >
          {isVictory ? <Award className="w-8 h-8" /> : <Skull className="w-8 h-8" />}
        </div>

        <h2 className="text-xl md:text-2xl font-arcade text-white tracking-widest mb-1">
          {isVictory ? 'CAMPAIGN VICTORY!' : 'MISSION FAILED'}
        </h2>
        <p className="text-xs font-mono text-slate-400 mb-5">
          {isVictory
            ? 'THE OVERMIND IS DESTROYED · GALAXY IS LIBERATED'
            : 'HULL INTEGRITY COMPROMISED · SHIP LOST IN DEEP SPACE'}
        </p>

        {isNewHighScore && (
          <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-950 border border-amber-500/80 rounded-full text-amber-300 font-arcade text-[10px] animate-pulse">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>NEW ALL-TIME RECORD!</span>
          </div>
        )}

        {/* Stats Table */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-4 mb-6 space-y-2 text-xs font-mono text-left">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">FINAL SCORE</span>
            <span className="text-base text-amber-400 font-bold tabular-nums">
              {stats.score.toLocaleString()} PTS
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">ALL-TIME HIGH</span>
            <span className="text-slate-200 tabular-nums font-semibold">
              {Math.max(stats.score, highScore).toLocaleString()} PTS
            </span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
            <span className="text-slate-400">SECTORS REACHED</span>
            <span className="text-cyan-400 font-bold tabular-nums">
              {mode === 'CAMPAIGN' ? `STAGE ${stats.stageReached}/5` : `SURVIVAL RUN`}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">HOSTILES ELIMINATED</span>
            <span className="text-slate-200 tabular-nums">
              {stats.enemiesKilled} SHIPS
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">ACCURACY</span>
            <span className="text-emerald-400 tabular-nums font-semibold">
              {stats.accuracy}%
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">BOSSES SLAIN</span>
            <span className="text-amber-400 tabular-nums font-semibold">
              {stats.bossesDefeated} TITANS
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">MAX COMBO STREAK</span>
            <span className={`${isPink ? 'text-pink-300' : 'text-cyan-400'} tabular-nums font-bold`}>
              {stats.maxCombo || 0} HITS
            </span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>COINS EXTRACTED</span>
            </span>
            <span className="text-amber-400 font-bold tabular-nums">
              +{stats.coinsCollected || 0} COINS
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">TOTAL VAULT BALANCE</span>
            <span className="text-slate-200 font-semibold tabular-nums">
              {getPlayerCoins().toLocaleString()} COINS
            </span>
          </div>

          {stats.mapId && GAME_MAPS[stats.mapId] && (
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500">MAP / SECTOR</span>
              <span className="text-cyan-300 font-semibold">
                {GAME_MAPS[stats.mapId].name} ({GAME_MAPS[stats.mapId].difficulty})
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onRestart}
            className={`w-full py-3.5 text-white font-arcade text-xs tracking-wider rounded-lg shadow-lg flex items-center justify-center gap-2 active:scale-98 transition-all ${
              isPink
                ? 'bg-gradient-to-r from-pink-600 via-rose-500 to-pink-500 hover:from-pink-500 hover:to-rose-400 shadow-[0_0_20px_rgba(244,114,182,0.5)]'
                : 'bg-cyan-600 hover:bg-cyan-500 shadow-lg'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>PLAY AGAIN</span>
          </button>

          <button
            onClick={onReturnToMenu}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-mono text-xs rounded-lg flex items-center justify-center gap-2 active:scale-98 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>TITLE MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
