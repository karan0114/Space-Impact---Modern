import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/gameEngine';
import { GameMode, GameState, GameStats, HUDData } from '../game/types';

interface GameCanvasProps {
  onEngineReady: (engine: GameEngine) => void;
  onHUDUpdate: (hud: HUDData) => void;
  onStateChange: (state: GameState, stats?: GameStats) => void;
  crtEnabled: boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  onEngineReady,
  onHUDUpdate,
  onStateChange,
  crtEnabled
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    // Initial sizing
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const engine = new GameEngine(canvas);
    engine.onHUDUpdate = onHUDUpdate;
    engine.onStateChange = onStateChange;
    engineRef.current = engine;

    onEngineReady(engine);

    // Resize observer for responsive canvas
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          engine.resize(Math.floor(width), Math.floor(height));
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      engine.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-[#050811] ${
        crtEnabled ? 'crt-overlay crt-vignette' : ''
      }`}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full select-none"
        tabIndex={0}
      />
    </div>
  );
};
