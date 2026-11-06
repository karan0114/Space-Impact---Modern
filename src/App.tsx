/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameHUD } from './components/GameHUD';
import { TitleScreen } from './components/TitleScreen';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { VirtualControls } from './components/VirtualControls';
import { ShipUpgradesModal } from './components/ShipUpgradesModal';
import { DailyMissionsModal } from './components/DailyMissionsModal';
import { AuthModal } from './components/AuthModal';
import { GameEngine } from './game/gameEngine';
import { soundEngine } from './game/audio/soundEngine';
import { GameMode, GameState, GameStats, HUDData, ThemeMode, MapId } from './game/types';
import { GAME_MAPS, MAP_ORDER } from './game/maps';
import { getPlayerCoins } from './game/upgrades';
import { PlayerUser, subscribeToAuth, pushLocalDataToCloud, syncPlayerDataWithCloud } from './game/firebase';

export default function App() {
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('MENU');
  const [gameMode, setGameMode] = useState<GameMode>('CAMPAIGN');
  const [highScore, setHighScore] = useState<number>(0);
  const [currentUser, setCurrentUser] = useState<PlayerUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('space_impact_theme');
    return saved === 'SAKURA_PINK' || saved === 'CYBER' ? saved : 'CYBER';
  });
  const [selectedMapId, setSelectedMapId] = useState<MapId>(() => {
    const saved = localStorage.getItem('space_impact_selected_map') as MapId;
    return saved && GAME_MAPS[saved] ? saved : 'NEBULA_STATION';
  });
  const [playerCoins, setPlayerCoins] = useState<number>(() => getPlayerCoins());
  const [showUpgradesModal, setShowUpgradesModal] = useState<boolean>(false);
  const [showMissionsModal, setShowMissionsModal] = useState<boolean>(false);

  const [isMuted, setIsMuted] = useState<boolean>(soundEngine.getMuted());
  const [crtEnabled, setCrtEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('space_impact_crt');
    if (saved !== null) return saved === 'true';
    const isMobile = typeof window !== 'undefined' && (window.innerWidth <= 1024 || 'ontouchstart' in window);
    return !isMobile;
  });
  const [forceTouchControls, setForceTouchControls] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    return typeof document !== 'undefined' && Boolean(document.fullscreenElement);
  });

  const [finalStats, setFinalStats] = useState<GameStats>({
    score: 0,
    stageReached: 1,
    enemiesKilled: 0,
    shotsFired: 0,
    shotsHit: 0,
    accuracy: 100,
    bossesDefeated: 0,
    playTimeSeconds: 0,
    maxCombo: 0,
    coinsCollected: 0,
    mapId: 'NEBULA_STATION'
  });

  const [hudData, setHudData] = useState<HUDData>({
    hp: 100,
    maxHp: 100,
    shieldHp: 0,
    lives: 3,
    score: 0,
    highScore: 0,
    coins: 0,
    sessionCoins: 0,
    currentMapId: 'NEBULA_STATION',
    stage: 1,
    mode: 'CAMPAIGN',
    weaponTier: 1,
    primaryWeapon: 'SINGLE_BLASTER',
    secondaryAmmo: 3,
    selectedSecondary: 'HOMING_MISSILES',
    boss: null,
    combo: 0,
    comboMultiplier: 1.0,
    comboTimerRatio: 0,
    transitioningSector: false,
    autoFire: true,
    touchControlsActive: false,
    theme: 'CYBER'
  });

  useEffect(() => {
    const saved = localStorage.getItem('space_impact_highscore');
    if (saved) {
      setHighScore(parseInt(saved, 10) || 0);
    }

    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);

    const unsubAuth = subscribeToAuth((usr) => {
      setCurrentUser(usr);
      if (usr) {
        syncPlayerDataWithCloud(usr, selectedMapId).then((res) => {
          setPlayerCoins(res.coins);
          setHighScore(res.highScore);
          if (engineRef.current) {
            engineRef.current.refreshUpgradesAndCoins();
          }
        });
      }
    });

    return () => {
      unsubAuth();
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    };
  }, [selectedMapId]);

  const ensureLandscape = async (withFullscreen = false) => {
    try {
      if (withFullscreen && !document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        const docEl = document.documentElement as any;
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }
      }

      if (typeof screen !== 'undefined' && screen.orientation && 'lock' in screen.orientation) {
        await (screen.orientation as any).lock('landscape');
      }
    } catch (err) {
      console.warn('Landscape orientation notice:', err);
    }
  };

  useEffect(() => {
    // Attempt landscape orientation immediately on startup even on home screen
    ensureLandscape(false);

    // Also attempt on first interaction anywhere on home screen
    const onFirstInteraction = () => {
      ensureLandscape(false);
    };

    window.addEventListener('pointerdown', onFirstInteraction, { once: true });
    window.addEventListener('touchstart', onFirstInteraction, { once: true });

    return () => {
      window.removeEventListener('pointerdown', onFirstInteraction);
      window.removeEventListener('touchstart', onFirstInteraction);
    };
  }, []);

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        await ensureLandscape(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  };

  const handleToggleSafeFit = () => {
    if (engineRef.current) {
      engineRef.current.toggleSafeFitMode();
    }
  };

  const handleSelectMap = (mapId: MapId) => {
    setSelectedMapId(mapId);
    if (engineRef.current) {
      engineRef.current.setMap(mapId);
    }
    localStorage.setItem('space_impact_selected_map', mapId);
  };

  const handleCycleMap = () => {
    const currentIndex = MAP_ORDER.indexOf(selectedMapId);
    const nextIndex = (currentIndex + 1) % MAP_ORDER.length;
    handleSelectMap(MAP_ORDER[nextIndex]);
  };

  const handleOpenUpgrades = () => {
    soundEngine.menuClick();
    setShowUpgradesModal(true);
  };

  const handleOpenMissions = () => {
    soundEngine.menuClick();
    setShowMissionsModal(true);
  };

  const handleCoinsOrUpgradesUpdated = () => {
    const currentCoins = getPlayerCoins();
    setPlayerCoins(currentCoins);
    if (engineRef.current) {
      engineRef.current.refreshUpgradesAndCoins();
    }
    if (currentUser) {
      pushLocalDataToCloud(currentUser, selectedMapId);
    }
  };

  const handleEngineReady = (engine: GameEngine) => {
    engineRef.current = engine;
    setHighScore(engine.highScore);
    setTheme(engine.theme);
    engine.setMap(selectedMapId);
    engine.refreshUpgradesAndCoins();
    setPlayerCoins(getPlayerCoins());
  };

  const handleHUDUpdate = (hud: HUDData) => {
    setHudData(hud);
    if (hud.theme && hud.theme !== theme) {
      setTheme(hud.theme);
    }
    if (hud.coins !== undefined) {
      setPlayerCoins(hud.coins);
    }
  };

  const handleStateChange = (state: GameState, stats?: GameStats) => {
    setGameState(state);
    if (stats) {
      setFinalStats({ ...stats, mapId: selectedMapId });
      if (stats.score > highScore) {
        setHighScore(stats.score);
      }
      setPlayerCoins(getPlayerCoins());
      if (currentUser) {
        pushLocalDataToCloud(currentUser, selectedMapId);
      }
    }
  };

  const handleStartGame = (mode: GameMode) => {
    setGameMode(mode);
    ensureLandscape(true);
    if (engineRef.current) {
      engineRef.current.start(mode, 1);
    }
  };

  const handleRestart = () => {
    ensureLandscape(true);
    if (engineRef.current) {
      engineRef.current.start(gameMode, 1);
    }
  };

  const handleReturnToMenu = () => {
    setGameState('MENU');
    if (engineRef.current) {
      engineRef.current.state = 'MENU';
    }
  };

  const handlePause = () => {
    if (engineRef.current) {
      engineRef.current.pause();
    }
  };

  const handleResume = () => {
    ensureLandscape(true);
    if (engineRef.current) {
      engineRef.current.resume();
    }
  };

  const handleToggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleCRT = () => {
    const nextVal = !crtEnabled;
    setCrtEnabled(nextVal);
    localStorage.setItem('space_impact_crt', String(nextVal));
  };

  const handleToggleTouchControls = () => {
    setForceTouchControls((prev) => !prev);
  };

  const handleToggleAutoFire = () => {
    if (engineRef.current) {
      engineRef.current.toggleAutoFire();
    }
  };

  const handleToggleTheme = () => {
    if (engineRef.current) {
      const next = engineRef.current.toggleTheme();
      setTheme(next);
    } else {
      const next = theme === 'CYBER' ? 'SAKURA_PINK' : 'CYBER';
      setTheme(next);
      localStorage.setItem('space_impact_theme', next);
      soundEngine.menuClick();
    }
  };

  const handleFireSecondary = () => {
    if (engineRef.current) {
      engineRef.current.fireSecondary();
    }
  };

  const handleSwitchSecondary = () => {
    if (engineRef.current) {
      engineRef.current.switchSecondary();
    }
  };

  const isPink = theme === 'SAKURA_PINK';

  return (
    <main
      className={`w-full h-full h-[100dvh] min-h-[100dvh] max-h-[100dvh] relative overflow-hidden text-slate-100 select-none touch-none overscroll-none transition-colors duration-500 ${
        isPink ? 'bg-[#0e0614]' : 'bg-[#050811]'
      }`}
    >

      {/* 60fps Isolated Canvas Viewport with Touch Drag Navigation */}
      <GameCanvas
        onEngineReady={handleEngineReady}
        onHUDUpdate={handleHUDUpdate}
        onStateChange={handleStateChange}
        crtEnabled={crtEnabled}
      />

      {/* Low-Occlusion HUD Overlay during active play / pause */}
      {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
        <GameHUD
          hud={hudData}
          isMuted={isMuted}
          crtEnabled={crtEnabled}
          isFullscreen={isFullscreen}
          onToggleMute={handleToggleMute}
          onToggleCRT={handleToggleCRT}
          onToggleAutoFire={handleToggleAutoFire}
          onToggleTheme={handleToggleTheme}
          onToggleFullscreen={handleToggleFullscreen}
          onToggleSafeFit={handleToggleSafeFit}
          onPause={handlePause}
          onFireSecondary={handleFireSecondary}
          onSwitchSecondary={handleSwitchSecondary}
        />
      )}

      {/* On-screen touch controls for phones & tablets */}
      {gameState === 'PLAYING' && (
        <VirtualControls
          engine={engineRef.current}
          forceVisible={forceTouchControls}
          theme={theme}
        />
      )}

      {/* Title Screen Modal */}
      {gameState === 'MENU' && (
        <TitleScreen
          highScore={highScore}
          isMuted={isMuted}
          crtEnabled={crtEnabled}
          theme={theme}
          isFullscreen={isFullscreen}
          selectedMapId={selectedMapId}
          coins={playerCoins}
          user={currentUser}
          onOpenAuth={() => setShowAuthModal(true)}
          onSelectMap={handleSelectMap}
          onCycleMap={handleCycleMap}
          onOpenUpgrades={handleOpenUpgrades}
          onOpenMissions={handleOpenMissions}
          onStartGame={handleStartGame}
          onToggleMute={handleToggleMute}
          onToggleCRT={handleToggleCRT}
          onToggleTheme={handleToggleTheme}
          onToggleFullscreen={handleToggleFullscreen}
          onEnsureLandscape={ensureLandscape}
        />
      )}

      {/* Tactical Pause Modal */}
      {gameState === 'PAUSED' && (
        <PauseModal
          isMuted={isMuted}
          crtEnabled={crtEnabled}
          theme={theme}
          isFullscreen={isFullscreen}
          onResume={handleResume}
          onRestart={handleRestart}
          onReturnToMenu={handleReturnToMenu}
          onToggleMute={handleToggleMute}
          onToggleCRT={handleToggleCRT}
          onToggleTheme={handleToggleTheme}
          onToggleFullscreen={handleToggleFullscreen}
        />
      )}

      {/* Mission Failed or Campaign Victory Modal */}
      {(gameState === 'GAME_OVER' || gameState === 'VICTORY') && (
        <GameOverModal
          isVictory={gameState === 'VICTORY'}
          stats={finalStats}
          highScore={highScore}
          mode={gameMode}
          theme={theme}
          onRestart={handleRestart}
          onReturnToMenu={handleReturnToMenu}
        />
      )}

      {/* Ship Upgrades Hangar Depot Modal */}
      {showUpgradesModal && (
        <ShipUpgradesModal
          theme={theme}
          onClose={() => {
            setShowUpgradesModal(false);
            handleCoinsOrUpgradesUpdated();
          }}
          onUpgraded={handleCoinsOrUpgradesUpdated}
        />
      )}

      {/* Daily Combat Missions Modal */}
      {showMissionsModal && (
        <DailyMissionsModal
          theme={theme}
          onClose={() => {
            setShowMissionsModal(false);
            handleCoinsOrUpgradesUpdated();
          }}
          onClaimed={handleCoinsOrUpgradesUpdated}
        />
      )}

      {/* Cloud Profile & Social Auth Modal */}
      {showAuthModal && (
        <AuthModal
          user={currentUser}
          selectedMap={selectedMapId}
          onClose={() => setShowAuthModal(false)}
          onProfileSynced={(data) => {
            setPlayerCoins(data.coins);
            setHighScore(data.highScore);
            if (engineRef.current) {
              engineRef.current.refreshUpgradesAndCoins();
            }
          }}
        />
      )}
    </main>
  );
}
