import React, { useState } from 'react';
import {
  X,
  User,
  ShieldCheck,
  RefreshCw,
  LogOut,
  Sparkles,
  AlertCircle,
  Coins,
  Trophy,
  CheckCircle2
} from 'lucide-react';
import {
  PlayerUser,
  signInWithGoogle,
  signInWithFacebook,
  signOutPlayer,
  syncPlayerDataWithCloud
} from '../game/firebase';
import { soundEngine } from '../game/audio/soundEngine';
import { getPlayerCoins, getShipUpgrades } from '../game/upgrades';
import { MapId } from '../game/types';

interface AuthModalProps {
  user: PlayerUser | null;
  selectedMap: MapId;
  onClose: () => void;
  onProfileSynced?: (data: { coins: number; highScore: number }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  user,
  selectedMap,
  onClose,
  onProfileSynced
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const coins = getPlayerCoins();
  const upgrades = getShipUpgrades();
  const totalUpgradeTiers =
    upgrades.blasterPower +
    upgrades.reinforcedHull +
    upgrades.shieldGenerator +
    upgrades.magnetTurbine +
    upgrades.hyperThrusters;

  const highScore =
    typeof window !== 'undefined'
      ? parseInt(localStorage.getItem('space_impact_highscore') || '0', 10) || 0
      : 0;

  const handleGoogleLogin = async () => {
    soundEngine.menuClick();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await signInWithGoogle();
      if (res.error) {
        setErrorMsg(res.error);
      } else if (res.user) {
        soundEngine.powerUp();
        setSuccessMsg('Signed in with Google! Syncing cloud progress...');
        const syncResult = await syncPlayerDataWithCloud(res.user, selectedMap);
        onProfileSynced?.({ coins: syncResult.coins, highScore: syncResult.highScore });
        setSuccessMsg('Cloud profile synchronized successfully!');
      }
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    soundEngine.menuClick();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await signInWithFacebook();
      if (res.error) {
        setErrorMsg(res.error);
      } else if (res.user) {
        soundEngine.powerUp();
        setSuccessMsg('Signed in with Facebook! Syncing cloud progress...');
        const syncResult = await syncPlayerDataWithCloud(res.user, selectedMap);
        onProfileSynced?.({ coins: syncResult.coins, highScore: syncResult.highScore });
        setSuccessMsg('Cloud profile synchronized successfully!');
      }
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Facebook login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!user) return;
    soundEngine.menuClick();
    setLoading(true);
    setErrorMsg(null);
    try {
      const syncResult = await syncPlayerDataWithCloud(user, selectedMap);
      onProfileSynced?.({ coins: syncResult.coins, highScore: syncResult.highScore });
      soundEngine.powerUp();
      setSuccessMsg('Pilot profile synced with cloud database!');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    soundEngine.menuClick();
    setLoading(true);
    setErrorMsg(null);
    try {
      await signOutPlayer();
      setSuccessMsg('Signed out successfully.');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Sign out error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-slate-950/95 border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-950/60 p-5 sm:p-6 overflow-hidden max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow corner accents */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wider text-cyan-200">
                PILOT CLOUD PROFILE
              </h2>
              <p className="text-[11px] text-cyan-400/70 font-mono tracking-wide">
                FIREBASE SYNC & PROGRESS RECOVERY
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundEngine.menuClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="mb-3 p-2.5 rounded-lg bg-red-950/80 border border-red-500/40 flex items-start gap-2 text-red-200 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-3 p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-start gap-2 text-emerald-200 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="overflow-y-auto space-y-4 pr-1">
          {user ? (
            /* Logged In View */
            <div className="space-y-4">
              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-900/90 border border-cyan-500/30">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Pilot'}
                    className="w-12 h-12 rounded-full border border-cyan-400/60 object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
                    <User className="w-6 h-6" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">
                    {user.displayName || 'Vanguard Commander'}
                  </div>
                  <div className="text-xs text-slate-400 truncate font-mono">
                    {user.email || 'Cloud Pilot'}
                  </div>
                  <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-[10px] font-semibold text-cyan-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {user.providerId === 'facebook.com' ? 'Facebook Linked' : 'Google Linked'}
                  </div>
                </div>
              </div>

              {/* Progress Summary Cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-amber-500/30 flex flex-col items-center text-center">
                  <Coins className="w-4 h-4 text-amber-400 mb-1" />
                  <span className="text-[10px] text-amber-400/80 font-mono font-medium">RESERVE</span>
                  <span className="text-sm font-black text-amber-300">{coins}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-purple-500/30 flex flex-col items-center text-center">
                  <Trophy className="w-4 h-4 text-purple-400 mb-1" />
                  <span className="text-[10px] text-purple-400/80 font-mono font-medium">BEST SCORE</span>
                  <span className="text-sm font-black text-purple-300">{highScore}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-cyan-500/30 flex flex-col items-center text-center">
                  <Sparkles className="w-4 h-4 text-cyan-400 mb-1" />
                  <span className="text-[10px] text-cyan-400/80 font-mono font-medium">UPGRADES</span>
                  <span className="text-sm font-black text-cyan-300">{totalUpgradeTiers}/25</span>
                </div>
              </div>

              {/* Sync Action */}
              <button
                onClick={handleManualSync}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-cyan-900/40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'SYNCING PROGRESS...' : 'SYNC WITH CLOUD NOW'}
              </button>

              {/* Logout Button */}
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white font-medium text-xs transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                SIGN OUT
              </button>
            </div>
          ) : (
            /* Logged Out View */
            <div className="space-y-3.5">
              <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-xs text-cyan-300 leading-relaxed">
                Connect your social account to backup your spaceship hangar upgrades, gold coins, daily combat mission rewards, and sector records in the cloud!
              </div>

              {/* Google Login Button */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs tracking-wide shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {/* Official Google Icon */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.645-5.19 3.645-9.15z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.74-2.1-6.68-4.93H1.21v3.13C3.26 21.46 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.32 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.6H1.21C.44 8.14 0 9.99 0 12s.44 3.86 1.21 5.4l4.11-3.13z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.54 1.21 6.6l4.11 3.13c.94-2.83 3.58-4.96 6.68-4.96z"
                  />
                </svg>
                CONTINUE WITH GOOGLE
              </button>

              {/* Facebook Login Button */}
              <button
                onClick={handleFacebookLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-xs tracking-wide shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {/* Official Facebook Icon */}
                <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                CONTINUE WITH FACEBOOK
              </button>

              {/* Anonymous guest note */}
              <div className="pt-2 text-center">
                <span className="text-[11px] text-slate-500 font-mono">
                  Offline cadets can play without signing in. Your progress will automatically merge whenever you link an account.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
