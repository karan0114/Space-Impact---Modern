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

    // Viewport-accurate measurement for Brave, Chrome, Safari dynamic toolbars
    const measureViewport = () => {
      if (typeof window !== 'undefined' && window.visualViewport) {
        const vw = Math.floor(window.visualViewport.width);
        const vh = Math.floor(window.visualViewport.height);
        if (vw > 0 && vh > 0) {
          return { w: vw, h: vh };
        }
      }
      return {
        w: Math.floor(container.clientWidth || window.innerWidth),
        h: Math.floor(container.clientHeight || window.innerHeight)
      };
    };

    const initialSize = measureViewport();
    canvas.width = initialSize.w;
    canvas.height = initialSize.h;

    const engine = new GameEngine(canvas);
    engine.onHUDUpdate = onHUDUpdate;
    engine.onStateChange = onStateChange;
    engineRef.current = engine;

    onEngineReady(engine);

    let lastW = initialSize.w;
    let lastH = initialSize.h;

    const updateSize = () => {
      const { w, h } = measureViewport();
      if (w > 0 && h > 0 && (Math.abs(w - lastW) > 2 || Math.abs(h - lastH) > 2)) {
        lastW = w;
        lastH = h;
        engine.resize(w, h);
      }
    };

    // Resize observer for responsive canvas container
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const nw = Math.floor(width);
        const nh = Math.floor(height);
        if (nw > 0 && nh > 0 && (Math.abs(nw - lastW) > 2 || Math.abs(nh - lastH) > 2)) {
          lastW = nw;
          lastH = nh;
          engine.resize(nw, nh);
        }
      }
    });

    resizeObserver.observe(container);

    // Dynamic browser chrome & orientation listeners (Brave, Chrome, Safari)
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateSize);
      window.addEventListener('orientationchange', updateSize);
      window.visualViewport?.addEventListener('resize', updateSize);
      document.addEventListener('fullscreenchange', updateSize);
      document.addEventListener('webkitfullscreenchange', updateSize);
    }

    return () => {
      resizeObserver.disconnect();
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', updateSize);
        window.removeEventListener('orientationchange', updateSize);
        window.visualViewport?.removeEventListener('resize', updateSize);
        document.removeEventListener('fullscreenchange', updateSize);
        document.removeEventListener('webkitfullscreenchange', updateSize);
      }
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
