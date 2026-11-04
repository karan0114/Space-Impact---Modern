import React, { useState } from 'react';
import { DailyMission, ThemeMode } from '../game/types';
import {
  getDailyMissions,
  claimDailyMissionReward
} from '../game/dailyMissions';
import { getPlayerCoins } from '../game/upgrades';
import { soundEngine } from '../game/audio/soundEngine';
import { X, Calendar, CheckCircle2, Gift, Sparkles, Trophy, Crosshair, Coins, Flame } from 'lucide-react';

interface DailyMissionsModalProps {
  theme?: ThemeMode;
  onClose: () => void;
  onClaimed?: () => void;
}

export const DailyMissionsModal: React.FC<DailyMissionsModalProps> = ({
  theme = 'CYBER',
  onClose,
  onClaimed
}) => {
  const isPink = theme === 'SAKURA_PINK';
  const [missions, setMissions] = useState<DailyMission[]>(() => getDailyMissions());
  const [coins, setCoins] = useState<number>(() => getPlayerCoins());
  const [justClaimedId, setJustClaimedId] = useState<string | null>(null);

  const getCategoryIcon = (category: DailyMission['category']) => {
    switch (category) {
      case 'COINS':
        return <Coins className="w-4 h-4 text-amber-400" />;
      case 'KILLS':
        return <Crosshair className="w-4 h-4 text-rose-400" />;
      case 'COMBO':
        return <Flame className="w-4 h-4 text-cyan-400" />;
      case 'BOSS':
        return <Trophy className="w-4 h-4 text-emerald-400" />;
      case 'SORTIES':
        return <Calendar className="w-4 h-4 text-purple-400" />;
    }
  };

  const handleClaim = (missionId: string) => {
    const res = claimDailyMissionReward(missionId);
    if (res.success) {
      soundEngine.missionClaim();
      setJustClaimedId(missionId);
      setCoins(res.totalCoins);
      setMissions(getDailyMissions());
      setTimeout(() => setJustClaimedId(null), 1500);
      onClaimed?.();
    }
  };

  const completedCount = missions.filter((m) => m.current >= m.target).length;
  const claimedCount = missions.filter((m) => m.claimed).length;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-3 sm:p-5 pt-safe pb-safe pl-[max(16px,env(safe-area-inset-left,16px))] pr-[max(16px,env(safe-area-inset-right,16px))] bg-slate-950/85 backdrop-blur-md select-none animate-fade-in">
      <div
        className={`w-full max-w-xl bg-slate-900/95 border-2 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${
          isPink
            ? 'border-pink-500/60 shadow-[0_0_35px_rgba(244,114,182,0.3)]'
            : 'border-emerald-500/50 shadow-[0_0_35px_rgba(16,185,129,0.25)]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`p-2 rounded-lg border ${isPink ? 'bg-pink-950 border-pink-700/60 text-pink-300' : 'bg-emerald-950 border-emerald-800/60 text-emerald-300'}`}>
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-arcade text-xs sm:text-sm text-white tracking-wider flex items-center gap-2">
                <span>DAILY COMBAT ORDERS</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-600 text-emerald-300">
                  {completedCount}/{missions.length} COMPLETE
                </span>
              </h2>
              <p className="text-[10px] sm:text-xs font-mono text-slate-400 mt-0.5">
                COMPLETE ORDERS EACH 24 HOURS FOR MASSIVE GOLD BOUNTIES
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/70 border border-amber-500/60 text-amber-300 font-arcade text-xs shadow-sm">
              <Coins className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>{coins.toLocaleString()}</span>
            </div>

            <button
              onClick={() => {
                soundEngine.menuClick();
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Missions"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mission Cards List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col gap-3">
          {missions.map((mission) => {
            const isComplete = mission.current >= mission.target;
            const progressPercent = Math.min(100, Math.round((mission.current / mission.target) * 100));
            const isJustClaimed = justClaimedId === mission.id;

            return (
              <div
                key={mission.id}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                  isJustClaimed
                    ? 'border-amber-400 bg-amber-950/40 shadow-[0_0_20px_rgba(245,158,11,0.4)] scale-[1.01]'
                    : mission.claimed
                    ? 'border-slate-800/80 bg-slate-950/30 opacity-70'
                    : isComplete
                    ? 'border-emerald-500/60 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                      {getCategoryIcon(mission.category)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-arcade text-xs text-slate-100 tracking-wider">
                          {mission.title}
                        </span>
                        {mission.claimed && (
                          <span className="font-arcade text-[9px] text-slate-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> CLAIMED
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {mission.description}
                      </p>

                      {/* Progress Bar */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                          <div
                            className={`h-full transition-all duration-500 ${
                              isComplete
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-slate-300 shrink-0 min-w-14 text-right">
                          {mission.current} / {mission.target}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Claim Button / Reward Badge */}
                  <div className="shrink-0">
                    {mission.claimed ? (
                      <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 font-arcade text-[10px]">
                        DONE
                      </div>
                    ) : isComplete ? (
                      <button
                        onClick={() => handleClaim(mission.id)}
                        className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-lg font-arcade text-[10px] tracking-wider bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.5)] flex items-center gap-1.5 animate-pulse"
                      >
                        <Gift className="w-3.5 h-3.5" />
                        <span>CLAIM +{mission.rewardCoins}</span>
                      </button>
                    ) : (
                      <div className="px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center gap-1.5 text-amber-400 font-arcade text-[10px]">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <span>+{mission.rewardCoins}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>DAILY REFRESH: MIDNIGHT LOCAL TIME</span>
          <span className="text-emerald-400">ALL BOUNTIES MULTIPLIED BY ACTIVE MAP RATIO</span>
        </div>
      </div>
    </div>
  );
};
