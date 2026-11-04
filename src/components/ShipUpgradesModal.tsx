import React, { useState } from 'react';
import { ShipUpgradeKey, ShipUpgrades, ThemeMode } from '../game/types';
import {
  UPGRADE_DEFINITIONS,
  MAX_UPGRADE_TIER,
  buyShipUpgrade,
  getPlayerCoins,
  getShipUpgrades
} from '../game/upgrades';
import { soundEngine } from '../game/audio/soundEngine';
import { X, Zap, Shield, Radio, Magnet, Gauge, Coins, CheckCircle, ArrowRight } from 'lucide-react';

interface ShipUpgradesModalProps {
  theme?: ThemeMode;
  onClose: () => void;
  onUpgraded?: () => void;
}

export const ShipUpgradesModal: React.FC<ShipUpgradesModalProps> = ({
  theme = 'CYBER',
  onClose,
  onUpgraded
}) => {
  const isPink = theme === 'SAKURA_PINK';
  const [upgrades, setUpgrades] = useState<ShipUpgrades>(() => getShipUpgrades());
  const [coins, setCoins] = useState<number>(() => getPlayerCoins());
  const [lastUpgradedKey, setLastUpgradedKey] = useState<ShipUpgradeKey | null>(null);

  const upgradeKeys: ShipUpgradeKey[] = [
    'blasterPower',
    'reinforcedHull',
    'shieldGenerator',
    'magnetTurbine',
    'hyperThrusters'
  ];

  const getIcon = (key: ShipUpgradeKey) => {
    switch (key) {
      case 'blasterPower':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'reinforcedHull':
        return <Shield className="w-4 h-4 text-emerald-400" />;
      case 'shieldGenerator':
        return <Radio className="w-4 h-4 text-cyan-400" />;
      case 'magnetTurbine':
        return <Magnet className="w-4 h-4 text-purple-400" />;
      case 'hyperThrusters':
        return <Gauge className="w-4 h-4 text-rose-400" />;
    }
  };

  const handleBuy = (key: ShipUpgradeKey) => {
    const res = buyShipUpgrade(key);
    if (res.success) {
      soundEngine.upgradeSuccess();
      setUpgrades(getShipUpgrades());
      setCoins(res.remainingCoins);
      setLastUpgradedKey(key);
      setTimeout(() => setLastUpgradedKey(null), 1200);
      onUpgraded?.();
    } else {
      soundEngine.menuClick();
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-3 sm:p-5 pt-safe pb-safe pl-[max(16px,env(safe-area-inset-left,16px))] pr-[max(16px,env(safe-area-inset-right,16px))] bg-slate-950/85 backdrop-blur-md select-none animate-fade-in">
      <div
        className={`w-full max-w-2xl bg-slate-900/95 border-2 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${
          isPink
            ? 'border-pink-500/60 shadow-[0_0_35px_rgba(244,114,182,0.3)]'
            : 'border-cyan-500/50 shadow-[0_0_35px_rgba(6,182,212,0.25)]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`p-2 rounded-lg border ${isPink ? 'bg-pink-950 border-pink-700/60 text-pink-300' : 'bg-cyan-950 border-cyan-800/60 text-cyan-300'}`}>
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-arcade text-xs sm:text-sm text-white tracking-wider flex items-center gap-2">
                <span>SPACESHIP HANGAR & UPGRADES</span>
              </h2>
              <p className="text-[10px] sm:text-xs font-mono text-slate-400 mt-0.5">
                ENHANCE COMBAT SUBSYSTEMS WITH EXTRACTED GOLD COINS
              </p>
            </div>
          </div>

          {/* Player Coin Wallet Badge */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/70 border border-amber-500/60 text-amber-300 font-arcade text-xs shadow-[0_0_12px_rgba(245,158,11,0.25)]">
              <Coins className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>{coins.toLocaleString()}</span>
            </div>

            <button
              onClick={() => {
                soundEngine.menuClick();
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Hangar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Upgrade Cards List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col gap-3">
          {upgradeKeys.map((key) => {
            const def = UPGRADE_DEFINITIONS[key];
            const currentTier = upgrades[key] || 0;
            const isMaxed = currentTier >= MAX_UPGRADE_TIER;
            const nextTierInfo = !isMaxed ? def.tiers[currentTier] : null;
            const canAfford = nextTierInfo ? coins >= nextTierInfo.cost : false;
            const isJustUpgraded = lastUpgradedKey === key;

            return (
              <div
                key={key}
                className={`p-3 sm:p-4 rounded-xl border transition-all ${
                  isJustUpgraded
                    ? 'border-emerald-400 bg-emerald-950/40 shadow-[0_0_20px_rgba(16,185,129,0.35)] scale-[1.01]'
                    : isMaxed
                    ? 'border-slate-800 bg-slate-950/40 opacity-90'
                    : 'border-slate-800/80 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left info */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 mt-0.5">
                      {getIcon(key)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-arcade text-xs text-slate-100 tracking-wider">
                          {def.name}
                        </span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          TIER {currentTier}/{MAX_UPGRADE_TIER}
                        </span>
                        {isMaxed && (
                          <span className="font-arcade text-[9px] text-emerald-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> MAXED
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] font-mono text-slate-400 mt-1 line-clamp-1 sm:line-clamp-none">
                        {def.description}
                      </p>

                      {/* Tier Progress Pips */}
                      <div className="flex items-center gap-1.5 mt-2.5">
                        {Array.from({ length: MAX_UPGRADE_TIER }).map((_, idx) => (
                          <div
                            key={idx}
                            className={`h-2 flex-1 rounded-sm transition-all ${
                              idx < currentTier
                                ? isPink
                                  ? 'bg-gradient-to-r from-pink-500 to-rose-400 shadow-[0_0_8px_rgba(244,114,182,0.6)]'
                                  : 'bg-gradient-to-r from-cyan-500 to-emerald-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                                : 'bg-slate-800 border border-slate-700/50'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Next Tier bonus description */}
                      {nextTierInfo && (
                        <div className="mt-2 text-[10px] sm:text-[11px] font-mono flex items-center gap-1.5 text-cyan-300">
                          <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span>
                            Next: <strong className="text-white">{nextTierInfo.title}</strong> — {nextTierInfo.bonusDesc}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Buy Button */}
                  <div className="shrink-0 flex flex-col items-end justify-center self-center">
                    {isMaxed ? (
                      <div className="px-3 py-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-arcade text-[10px]">
                        MAX
                      </div>
                    ) : (
                      <button
                        onClick={() => handleBuy(key)}
                        disabled={!canAfford}
                        className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-lg font-arcade text-[10px] tracking-wider transition-all flex items-center gap-1.5 active:scale-95 shadow-md ${
                          canAfford
                            ? isPink
                              ? 'bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 text-white shadow-[0_0_15px_rgba(244,114,182,0.4)]'
                              : 'bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-bold shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                            : 'bg-slate-800/80 border border-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Coins className="w-3.5 h-3.5" />
                        <span>{nextTierInfo?.cost}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer tip */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-950/80 border-t border-slate-800 text-center text-[10px] font-mono text-slate-500">
          PRO-TIP: EQUIP THE GRAVITON MAGNET TO AUTO-SIPHON GOLD COINS FROM DISTANT COMBAT SECTORS
        </div>
      </div>
    </div>
  );
};
