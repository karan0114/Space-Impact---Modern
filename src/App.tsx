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
import { GameEngine } from './game/gameEngine';
import { soundEngine } from './game/audio/soundEngine';
import { GameMode, GameState, GameStats, HUDData, ThemeMode } from './game/types';

export default function App() {
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('MENU');
  const [gameMode, setGameMode] = useState<GameMode>('CAMPAIGN');
  const [highScore, setHighScore] = useState<number>(0);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('space_impact_theme');
    return saved === 'SAKURA_PINK' || saved === 'CYBER' ? saved : 'CYBER';
  });
  const [isMuted, setIsMuted] = useState<boolean>(soundEngine.getMuted());
  const [crtEnabled, setCrtEnabled] = useState<boolean>(() => {
    return localStorage.getItem('space_impact_crt') !== 'false';
  });
  const [forceTouchControls, setForceTouchControls] = useState<boolean>(false);

  const [finalStats, setFinalStats] = useState<GameStats>({
    score: 0,
    stageReached: 1,
    enemiesKilled: 0,
    shotsFired: 0,
    shotsHit: 0,
    accuracy: 100,
    bossesDefeated: 0,
    playTimeSeconds: 0
  });

  const [hudData, setHudData] = useState<HUDData>({
    hp: 100,
    maxHp: 100,
    shieldHp: 0,
    lives: 3,
    score: 0,
    highScore: 0,
    stage: 1,
    mode: 'CAMPAIGN',
    weaponTier: 1,
    primaryWeapon: 'SINGLE_BLASTER',
    secondaryAmmo: 3,
    selectedSecondary: 'HOMING_MISSILES',
    boss: null,
    combo: 0,
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
  }, []);

  const handleEngineReady = (engine: GameEngine) => {
    engineRef.current = engine;
    setHighScore(engine.highScore);
    setTheme(engine.theme);
  };

  const handleHUDUpdate = (hud: HUDData) => {
    setHudData(hud);
    if (hud.theme && hud.theme !== theme) {
      setTheme(hud.theme);
    }
  };

  const handleStateChange = (state: GameState, stats?: GameStats) => {
    setGameState(state);
    if (stats) {
      setFinalStats(stats);
      if (stats.score > highScore) {
        setHighScore(stats.score);
      }
    }
  };

  const handleStartGame = (mode: GameMode) => {
    setGameMode(mode);
    if (engineRef.current) {
      engineRef.current.start(mode, 1);
    }
  };

  const handleRestart = () => {
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
      className={`w-screen h-screen relative overflow-hidden text-slate-100 select-none touch-none overscroll-none transition-colors duration-500 ${
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
          touchControlsForced={forceTouchControls}
          onToggleMute={handleToggleMute}
          onToggleCRT={handleToggleCRT}
          onToggleTouchControls={handleToggleTouchControls}
          onToggleAutoFire={handleToggleAutoFire}
          onToggleTheme={handleToggleTheme}
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
          onStartGame={handleStartGame}
          onToggleMute={handleToggleMute}
          onToggleCRT={handleToggleCRT}
          onToggleTheme={handleToggleTheme}
        />
      )}

      {/* Tactical Pause Modal */}
      {gameState === 'PAUSED' && (
        <PauseModal
          isMuted={isMuted}
          crtEnabled={crtEnabled}
          theme={theme}
          onResume={handleResume}
          onRestart={handleRestart}
          onReturnToMenu={handleReturnToMenu}
          onToggleMute={handleToggleMute}
          onToggleCRT={handleToggleCRT}
          onToggleTheme={handleToggleTheme}
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
    </main>
  );
}
