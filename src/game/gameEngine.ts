import { soundEngine } from './audio/soundEngine';
import { drawBoss, drawEnemy, drawPlayerShip, drawPowerUp, drawProjectile } from './sprites';
import { CAMPAIGN_STAGES, getStageConfig } from './stages';
import { GAME_MAPS, getMapConfig } from './maps';
import { getPlayerCoins, savePlayerCoins, addPlayerCoins, getShipUpgrades } from './upgrades';
import { recordMissionProgress } from './dailyMissions';
import {
  Boss,
  CosmicNebula,
  Enemy,
  EnemyType,
  FloatingText,
  GameMode,
  GameState,
  GameStats,
  GoldCoin,
  HUDData,
  MapId,
  ParallaxStar,
  Particle,
  PlayerState,
  PowerUp,
  PrimaryWeapon,
  Projectile,
  SecondaryWeapon,
  ShipUpgrades,
  StageConfig,
  ThemeMode
} from './types';

export class GameEngine {
  public canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Loop & Time
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private hitStopTimer: number = 0;
  private shakeIntensity: number = 0;

  // Visual Theme (Classic Cyber Neon vs Sakura Cyber Pink for female pilots)
  public theme: ThemeMode = 'CYBER';

  // Game Mode & State
  public state: GameState = 'MENU';
  public mode: GameMode = 'CAMPAIGN';
  public currentStageIndex: number = 1;
  public stageConfig: StageConfig;
  public stageTimer: number = 0;
  public bossWarningTimer: number = 0;

  // Automatic Seamless Sector Transitioning
  public transitioningSector: boolean = false;
  public transitionTimer: number = 0;
  public transitionNextStage: number = 1;

  // Stats & Scoring
  public score: number = 0;
  public highScore: number = 0;
  public combo: number = 0;
  public comboMultiplier: number = 1.0;
  public comboTimer: number = 0;
  public readonly maxComboTimer: number = 2.6;
  public stats: GameStats = {
    score: 0,
    stageReached: 1,
    enemiesKilled: 0,
    shotsFired: 0,
    shotsHit: 0,
    accuracy: 100,
    bossesDefeated: 0,
    playTimeSeconds: 0,
    maxCombo: 0,
    coinsCollected: 0
  };

  // Entities
  public player: PlayerState;
  public projectiles: Projectile[] = [];
  public enemies: Enemy[] = [];
  public boss: Boss | null = null;
  public powerUps: PowerUp[] = [];
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];
  public goldCoins: GoldCoin[] = [];

  // Map & Environmental Backgrounds
  public selectedMapId: MapId = 'NEBULA_STATION';
  private mapImages: Record<MapId, HTMLImageElement>;
  private seamlessMapCanvases: Partial<Record<MapId, HTMLCanvasElement>> = {};
  private mapScrollX: number = 0;
  private lastHudEmitTime: number = 0;

  // Economy & Upgrades
  public coins: number = 0;
  public sessionCoins: number = 0;
  public upgrades: ShipUpgrades = getShipUpgrades();
  private timeSinceLastDamage: number = 0;

  // Parallax Starfield & Cosmic Nebulae
  private parallaxStars: ParallaxStar[] = [];
  private cosmicNebulae: CosmicNebula[] = [];
  public playerVelocity: { vx: number; vy: number } = { vx: 0, vy: 0 };
  private lastPlayerX: number = 60;
  private lastPlayerY: number = 200;

  // Spawning
  private nextEnemySpawn: number = 0;

  // Inputs & Touch Screen Support
  public keys: { [key: string]: boolean } = {};
  public virtualDpad: { x: number; y: number } = { x: 0, y: 0 };
  public virtualShooting: boolean = false;
  public autoFire: boolean = true;
  public touchControlsActive: boolean = false;
  public isDirectDragging: boolean = false;
  private lastTouchPos: { x: number; y: number } | null = null;

  // Android & Mobile Browser Safe Viewport Margins
  public safeLeftMargin: number = 36;
  public safeRightMargin: number = 36;
  public safeTopMargin: number = 16;
  public safeBottomMargin: number = 18;
  public safeFitMode: boolean = true;

  // Callbacks
  public onHUDUpdate?: (hud: HUDData) => void;
  public onStateChange?: (state: GameState, stats?: GameStats) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.ctx.imageSmoothingEnabled = true;
    this.stageConfig = getStageConfig(1);

    // Initialize map backgrounds with auto-preparer for seamless looping
    const setupImg = (id: MapId, url: string) => {
      const img = new Image();
      img.onload = () => {
        this.prepareSeamlessMap(id);
      };
      img.src = url;
      return img;
    };

    this.mapImages = {
      NEBULA_STATION: setupImg('NEBULA_STATION', GAME_MAPS.NEBULA_STATION.imageUrl),
      TOXIC_BELT: setupImg('TOXIC_BELT', GAME_MAPS.TOXIC_BELT.imageUrl),
      SINGULARITY_ABYSS: setupImg('SINGULARITY_ABYSS', GAME_MAPS.SINGULARITY_ABYSS.imageUrl)
    };

    const savedMap = localStorage.getItem('space_impact_selected_map') as MapId;
    if (savedMap && GAME_MAPS[savedMap]) {
      this.selectedMapId = savedMap;
    }

    this.coins = getPlayerCoins();
    this.upgrades = getShipUpgrades();

    // Initialize high score, theme & safe fit mode from storage
    const savedHighScore = localStorage.getItem('space_impact_highscore');
    if (savedHighScore) {
      this.highScore = parseInt(savedHighScore, 10) || 0;
    }

    const savedTheme = localStorage.getItem('space_impact_theme');
    if (savedTheme === 'SAKURA_PINK' || savedTheme === 'CYBER') {
      this.theme = savedTheme;
    }

    const savedSafeFit = localStorage.getItem('space_impact_safefit');
    this.safeFitMode = savedSafeFit !== 'false';

    this.updateSafeMargins();

    // Default player state
    this.player = this.createDefaultPlayer();
    this.lastPlayerX = this.player.x;
    this.lastPlayerY = this.player.y;

    // Create background nebulae & parallax stars
    this.initNebulae();
    this.initStars();

    // Bind keyboard and touch events
    this.bindEvents();
    this.bindTouchEvents();
  }

  public toggleTheme(): ThemeMode {
    this.theme = this.theme === 'CYBER' ? 'SAKURA_PINK' : 'CYBER';
    localStorage.setItem('space_impact_theme', this.theme);
    soundEngine.menuClick();
    this.initNebulae();
    this.initStars();
    this.addFloatingText(
      this.theme === 'SAKURA_PINK' ? 'SAKURA PINK THEME' : 'CYBER NEON THEME',
      this.player.x,
      this.player.y - 12,
      this.theme === 'SAKURA_PINK' ? '#f472b6' : '#06b6d4',
      12
    );
    this.emitHUD();
    return this.theme;
  }

  public updateSafeMargins() {
    const isMobile =
      typeof window !== 'undefined' &&
      (window.innerWidth <= 1024 ||
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0);

    const w = this.canvas.width || (typeof window !== 'undefined' ? window.innerWidth : 800);
    const h = this.canvas.height || (typeof window !== 'undefined' ? window.innerHeight : 450);
    const aspect = w / Math.max(1, h);

    if (!this.safeFitMode) {
      this.safeLeftMargin = 12;
      this.safeRightMargin = 12;
      this.safeTopMargin = 12;
      this.safeBottomMargin = 12;
      return;
    }

    if (isMobile) {
      // Dynamic ratio adaptation across all smartphone form factors:
      if (aspect >= 2.1) {
        // Ultra-wide displays (20:9, 21:9 like Galaxy S/Ultra, Xperia, Motorola, Xiaomi)
        this.safeLeftMargin = Math.max(52, Math.round(w * 0.085));
        this.safeRightMargin = Math.max(52, Math.round(w * 0.085));
        this.safeTopMargin = Math.max(18, Math.round(h * 0.045));
        this.safeBottomMargin = Math.max(22, Math.round(h * 0.06));
      } else if (aspect >= 1.75) {
        // Standard modern landscape smartphone (18:9, 19:9, 19.5:9 like iPhones, Pixel)
        this.safeLeftMargin = Math.max(40, Math.round(w * 0.065));
        this.safeRightMargin = Math.max(40, Math.round(w * 0.065));
        this.safeTopMargin = Math.max(16, Math.round(h * 0.04));
        this.safeBottomMargin = Math.max(20, Math.round(h * 0.055));
      } else if (aspect >= 1.25) {
        // Tablets, foldables (16:10, 3:2, 4:3 iPad / Android tablets)
        this.safeLeftMargin = Math.max(24, Math.round(w * 0.035));
        this.safeRightMargin = Math.max(24, Math.round(w * 0.035));
        this.safeTopMargin = Math.max(16, Math.round(h * 0.035));
        this.safeBottomMargin = Math.max(18, Math.round(h * 0.04));
      } else {
        // Tall portrait ratio (e.g. 9:16, 9:20)
        this.safeLeftMargin = Math.max(16, Math.round(w * 0.035));
        this.safeRightMargin = Math.max(16, Math.round(w * 0.035));
        this.safeTopMargin = Math.max(24, Math.round(h * 0.05));
        this.safeBottomMargin = Math.max(36, Math.round(h * 0.08));
      }
    } else {
      this.safeLeftMargin = 22;
      this.safeRightMargin = 22;
      this.safeTopMargin = 14;
      this.safeBottomMargin = 14;
    }
  }

  public toggleSafeFitMode(): boolean {
    this.safeFitMode = !this.safeFitMode;
    localStorage.setItem('space_impact_safefit', String(this.safeFitMode));
    this.updateSafeMargins();
    soundEngine.menuClick();
    this.addFloatingText(
      this.safeFitMode ? 'ANDROID SAFE BOUNDS: ACTIVE' : 'FULL SCREEN STRETCH: ACTIVE',
      this.canvas.width * 0.5,
      this.canvas.height * 0.5,
      '#38bdf8',
      14
    );
    this.emitHUD();
    return this.safeFitMode;
  }

  public setMap(mapId: MapId) {
    if (GAME_MAPS[mapId]) {
      this.selectedMapId = mapId;
      localStorage.setItem('space_impact_selected_map', mapId);
      soundEngine.menuClick();
      this.emitHUD();
    }
  }

  public refreshUpgradesAndCoins() {
    this.upgrades = getShipUpgrades();
    this.coins = getPlayerCoins();
    if (this.player) {
      const maxHp = 100 + this.upgrades.reinforcedHull * 25;
      this.player.maxHp = maxHp;
      this.player.speed = 340 + this.upgrades.hyperThrusters * 34;
      const shieldTiers = [30, 55, 80, 110, 150];
      const maxShield = this.upgrades.shieldGenerator > 0 ? shieldTiers[this.upgrades.shieldGenerator - 1] : 0;
      this.player.shieldHp = Math.max(this.player.shieldHp, maxShield);
    }
    this.emitHUD();
  }

  private createDefaultPlayer(): PlayerState {
    const w = 48;
    const h = 26;
    this.upgrades = getShipUpgrades();
    this.coins = getPlayerCoins();
    const maxHp = 100 + this.upgrades.reinforcedHull * 25;
    const speed = 340 + this.upgrades.hyperThrusters * 34;
    const shieldTiers = [30, 55, 80, 110, 150];
    const initialShield = this.upgrades.shieldGenerator > 0 ? shieldTiers[this.upgrades.shieldGenerator - 1] : 0;
    this.timeSinceLastDamage = 0;

    return {
      x: Math.max(70, this.safeLeftMargin + 24),
      y: (this.canvas.height || 400) * 0.5 - h * 0.5,
      width: w,
      height: h,
      speed,
      hp: maxHp,
      maxHp,
      lives: 3,
      weaponTier: 1,
      primaryWeapon: 'SINGLE_BLASTER',
      secondaryAmmo: 3,
      selectedSecondary: 'HOMING_MISSILES',
      invulnerableTime: 2.0,
      shieldHp: initialShield,
      lastFireTime: 0,
      isShooting: false
    };
  }

  /**
   * Pre-bakes a natural, forward-oriented seamless looping map texture.
   * Uses center-split offset and soft linear crossfade so left and right
   * edges seamlessly meet without horizontal mirror flips or "pages" folding!
   */
  private prepareSeamlessMap(mapId: MapId) {
    const img = this.mapImages[mapId];
    if (!img || !img.complete || img.naturalWidth <= 0) return;
    try {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      if (!ctx) return;

      const halfW = Math.floor(w / 2);
      const blendW = Math.min(320, Math.floor(w * 0.22));

      // 1. Draw right half of original on left side of canvas
      ctx.drawImage(img, halfW, 0, w - halfW, h, 0, 0, w - halfW, h);
      // Draw left half of original on right side of canvas
      ctx.drawImage(img, 0, 0, halfW, h, w - halfW, 0, halfW, h);

      // 2. Feather the middle seam where original right meets original left
      const seamX = w - halfW;
      const blendCanvas = document.createElement('canvas');
      blendCanvas.width = blendW;
      blendCanvas.height = h;
      const bCtx = blendCanvas.getContext('2d');
      if (bCtx) {
        bCtx.drawImage(img, 0, 0, blendW, h, 0, 0, blendW, h);
        bCtx.globalCompositeOperation = 'destination-in';
        const grad = bCtx.createLinearGradient(0, 0, blendW, 0);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.85)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 1)');
        bCtx.fillStyle = grad;
        bCtx.fillRect(0, 0, blendW, h);

        ctx.drawImage(blendCanvas, seamX - Math.floor(blendW / 2), 0);
      }

      this.seamlessMapCanvases[mapId] = c;
    } catch (e) {
      console.warn('Seamless map preparation skipped:', e);
    }
  }

  private initNebulae() {
    this.cosmicNebulae = [];
    const w = this.canvas.width || 800;
    const h = this.canvas.height || 450;
    const isPink = this.theme === 'SAKURA_PINK';

    const isMobile = typeof window !== 'undefined' && (window.innerWidth <= 1024 || 'ontouchstart' in window);

    // 3 or 4 atmospheric drifting cosmic nebula gas clouds
    const nebulaCount = isMobile ? 3 : 4;
    for (let i = 0; i < nebulaCount; i++) {
      const x = (i / nebulaCount) * w + (Math.random() - 0.5) * (w / nebulaCount);
      const y = Math.random() * h;
      const radius = 170 + Math.random() * 150;
      const baseSpeed = 7 + Math.random() * 10;

      let colorCenter: string;
      let colorEdge: string;

      if (isPink) {
        const palette = [
          { c: 'rgba(244, 63, 94, 0.12)', e: 'rgba(244, 63, 94, 0)' },
          { c: 'rgba(168, 85, 247, 0.10)', e: 'rgba(168, 85, 247, 0)' },
          { c: 'rgba(244, 114, 182, 0.11)', e: 'rgba(244, 114, 182, 0)' },
          { c: 'rgba(217, 70, 239, 0.08)', e: 'rgba(217, 70, 239, 0)' }
        ];
        const item = palette[i % palette.length];
        colorCenter = item.c;
        colorEdge = item.e;
      } else {
        const palette = [
          { c: 'rgba(6, 182, 212, 0.09)', e: 'rgba(6, 182, 212, 0)' },
          { c: 'rgba(59, 130, 246, 0.08)', e: 'rgba(59, 130, 246, 0)' },
          { c: 'rgba(16, 185, 129, 0.08)', e: 'rgba(16, 185, 129, 0)' },
          { c: 'rgba(99, 102, 241, 0.07)', e: 'rgba(99, 102, 241, 0)' }
        ];
        const item = palette[i % palette.length];
        colorCenter = item.c;
        colorEdge = item.e;
      }

      // Pre-render radial gradient onto an offscreen canvas sprite once to eliminate runtime GPU shader compiling
      const nebCanvas = document.createElement('canvas');
      const size = Math.ceil(radius * 2);
      nebCanvas.width = size;
      nebCanvas.height = size;
      const nCtx = nebCanvas.getContext('2d');
      if (nCtx) {
        const grad = nCtx.createRadialGradient(radius, radius, radius * 0.05, radius, radius, radius);
        grad.addColorStop(0, colorCenter);
        grad.addColorStop(0.65, colorCenter.replace(/[\d\.]+\)$/, '0.03)'));
        grad.addColorStop(1, colorEdge);
        nCtx.fillStyle = grad;
        nCtx.beginPath();
        nCtx.arc(radius, radius, radius, 0, Math.PI * 2);
        nCtx.fill();
      }

      this.cosmicNebulae.push({
        x,
        y,
        radius,
        baseSpeed,
        colorCenter,
        colorEdge,
        alpha: 1.0,
        canvas: nebCanvas
      });
    }
  }

  private initStars() {
    this.parallaxStars = [];
    const w = this.canvas.width || 800;
    const h = this.canvas.height || 450;
    const isPink = this.theme === 'SAKURA_PINK';

    // Layer 0: Deep background distant stars - Slow drift, soft glow, micro pinpoints
    const isMobile = typeof window !== 'undefined' && (window.innerWidth <= 1024 || 'ontouchstart' in window);
    const layer0Count = isMobile ? 36 : 75;
    for (let i = 0; i < layer0Count; i++) {
      const baseSpeed = 16 + Math.random() * 20;
      const baseAlpha = 0.25 + Math.random() * 0.35;
      const color = isPink
        ? Math.random() < 0.4
          ? '#fbcfe8'
          : Math.random() < 0.75
          ? '#e0e7ff'
          : '#f472b6'
        : Math.random() < 0.4
        ? '#a5f3fc'
        : Math.random() < 0.75
        ? '#e2e8f0'
        : '#67e8f9';

      this.parallaxStars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        baseSpeed,
        depth: 0.22,
        layer: 0,
        size: 0.8 + Math.random() * 0.5,
        alpha: baseAlpha,
        baseAlpha,
        color,
        twinkleSpeed: 1.5 + Math.random() * 3.0,
        twinklePhase: Math.random() * Math.PI * 2,
        shape: 'DOT'
      });
    }

    // Layer 1: Mid-field cosmic belt stars - Moderate speed, sharp diamonds, crisp celestial color
    const layer1Count = isMobile ? 26 : 55;
    for (let i = 0; i < layer1Count; i++) {
      const baseSpeed = 55 + Math.random() * 50;
      const baseAlpha = 0.55 + Math.random() * 0.35;
      const isDiamond = Math.random() < 0.4;
      const color = isPink
        ? Math.random() < 0.5
          ? '#f472b6'
          : Math.random() < 0.8
          ? '#ffffff'
          : '#fb7185'
        : Math.random() < 0.5
        ? '#22d3ee'
        : Math.random() < 0.8
        ? '#ffffff'
        : '#38bdf8';

      this.parallaxStars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        baseSpeed,
        depth: 0.65,
        layer: 1,
        size: 1.4 + Math.random() * 0.8,
        alpha: baseAlpha,
        baseAlpha,
        color,
        twinkleSpeed: 2.0 + Math.random() * 3.5,
        twinklePhase: Math.random() * Math.PI * 2,
        shape: isDiamond ? 'DIAMOND' : 'DOT'
      });
    }

    // Layer 2: Near foreground velocity stardust - High speed, vibrant, stretch into velocity streaks
    const layer2Count = isMobile ? 16 : 32;
    for (let i = 0; i < layer2Count; i++) {
      const baseSpeed = 135 + Math.random() * 115;
      const baseAlpha = 0.8 + Math.random() * 0.2;
      const color = isPink
        ? Math.random() < 0.4
          ? '#ffffff'
          : Math.random() < 0.75
          ? '#f43f5e'
          : '#f472b6'
        : Math.random() < 0.4
        ? '#ffffff'
        : Math.random() < 0.75
        ? '#06b6d4'
        : '#34d399';

      this.parallaxStars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        baseSpeed,
        depth: 1.25,
        layer: 2,
        size: 2.2 + Math.random() * 1.3,
        alpha: baseAlpha,
        baseAlpha,
        color,
        twinkleSpeed: 3.5 + Math.random() * 4.0,
        twinklePhase: Math.random() * Math.PI * 2,
        shape: 'DOT'
      });
    }
  }

  public resize(width: number, height: number) {
    if (width <= 0 || height <= 0) return;
    if (this.canvas.width === width && this.canvas.height === height) return;
    const oldW = this.canvas.width;
    const oldH = this.canvas.height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.updateSafeMargins();
    
    // Only re-generate background stars/nebulae on first init or significant viewport shift (>80px)
    if (!this.parallaxStars.length || Math.abs(oldW - width) > 80 || Math.abs(oldH - height) > 80) {
      this.initNebulae();
      this.initStars();
    }

    // Dynamically preserve player position when viewport shifts
    if (this.player) {
      if (oldH > 0 && oldH !== height) {
        const relY = this.player.y / oldH;
        this.player.y = relY * height;
      }
      this.player.x = Math.max(
        this.safeLeftMargin,
        Math.min(this.canvas.width - this.player.width - this.safeRightMargin, this.player.x)
      );
      this.player.y = Math.max(
        this.safeTopMargin,
        Math.min(this.canvas.height - this.player.height - this.safeBottomMargin, this.player.y)
      );
    }
  }

  private bindEvents() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      soundEngine.unlock();

      if (e.code === 'KeyK' || e.code === 'KeyX') {
        this.fireSecondary();
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.state === 'PLAYING') {
          this.pause();
        } else if (this.state === 'PAUSED') {
          this.resume();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('blur', () => {
      this.keys = {};
      this.virtualDpad = { x: 0, y: 0 };
      this.virtualShooting = false;
      this.isDirectDragging = false;
      this.lastTouchPos = null;
    });
  }

  /**
   * High-Responsiveness Touch event handling for mobile phones.
   * Maps client touch coordinates to canvas internal resolution with zero lag
   * and provides a comfortable 32px vertical offset so the player's thumb
   * doesn't cover their ship or incoming laser projectiles!
   */
  private bindTouchEvents() {
    const canvas = this.canvas;

    const onTouchStart = (e: TouchEvent) => {
      soundEngine.unlock();
      this.touchControlsActive = true;

      if (this.state !== 'PLAYING') return;

      const touch = e.touches[0];
      if (!touch) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / (rect.width || 1);
      const scaleY = canvas.height / (rect.height || 1);
      const clientX = (touch.clientX - rect.left) * scaleX;
      const clientY = (touch.clientY - rect.top) * scaleY;

      this.isDirectDragging = true;
      this.lastTouchPos = { x: clientX, y: clientY };

      // Gentle vertical glide towards touch position with finger clearance offset
      const targetY = clientY - 32;
      const dy = targetY - (this.player.y + this.player.height * 0.5);
      if (Math.abs(dy) < 160) {
        this.player.y += dy * 0.5;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (this.state !== 'PLAYING' || !this.isDirectDragging || !this.lastTouchPos) return;

      const touch = e.touches[0];
      if (!touch) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / (rect.width || 1);
      const scaleY = canvas.height / (rect.height || 1);
      const currentX = (touch.clientX - rect.left) * scaleX;
      const currentY = (touch.clientY - rect.top) * scaleY;

      const deltaX = (currentX - this.lastTouchPos.x) * 1.35;
      const deltaY = (currentY - this.lastTouchPos.y) * 1.35;

      this.player.x += deltaX;
      this.player.y += deltaY;

      // Clamp within safe margins (clearing phone cutouts and browser sidebars)
      this.player.x = Math.max(
        this.safeLeftMargin,
        Math.min(this.canvas.width - this.player.width - this.safeRightMargin, this.player.x)
      );
      this.player.y = Math.max(
        this.safeTopMargin,
        Math.min(this.canvas.height - this.player.height - this.safeBottomMargin, this.player.y)
      );

      this.lastTouchPos = { x: currentX, y: currentY };
    };

    const onTouchEnd = () => {
      this.isDirectDragging = false;
      this.lastTouchPos = null;
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: true });

    window.addEventListener(
      'touchstart',
      () => {
        this.touchControlsActive = true;
      },
      { once: true }
    );
  }

  // --- Game Lifecycle ---

  public start(mode: GameMode = 'CAMPAIGN', stage: number = 1) {
    this.mode = mode;
    this.currentStageIndex = stage;
    this.stageConfig = getStageConfig(stage);
    this.state = 'PLAYING';
    this.score = 0;
    this.combo = 0;
    this.comboMultiplier = 1.0;
    this.comboTimer = 0;
    this.stageTimer = 0;
    this.bossWarningTimer = 0;
    this.transitioningSector = false;
    this.transitionTimer = 0;

    this.stats = {
      score: 0,
      stageReached: stage,
      enemiesKilled: 0,
      shotsFired: 0,
      shotsHit: 0,
      accuracy: 100,
      bossesDefeated: 0,
      playTimeSeconds: 0,
      maxCombo: 0,
      coinsCollected: 0,
      mapId: this.selectedMapId
    };

    this.sessionCoins = 0;
    this.coins = getPlayerCoins();
    this.upgrades = getShipUpgrades();
    this.goldCoins = [];
    recordMissionProgress('SORTIES', 1);

    this.player = this.createDefaultPlayer();
    this.lastPlayerX = this.player.x;
    this.lastPlayerY = this.player.y;
    this.playerVelocity = { vx: 0, vy: 0 };
    this.initNebulae();
    this.initStars();
    this.projectiles = [];
    this.enemies = [];
    this.boss = null;
    this.powerUps = [];
    this.particles = [];
    this.floatingTexts = [];
    this.nextEnemySpawn = 0.5;

    soundEngine.unlock();
    soundEngine.menuSelect();

    if (!this.isRunning) {
      this.isRunning = true;
      this.lastTime = performance.now();
      this.loop(this.lastTime);
    }

    this.onStateChange?.(this.state);
  }

  public pause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      soundEngine.menuClick();
      this.onStateChange?.(this.state);
    }
  }

  public resume() {
    if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.lastTime = performance.now();
      soundEngine.menuClick();
      this.onStateChange?.(this.state);
    }
  }

  public gameOver() {
    this.state = 'GAME_OVER';
    soundEngine.gameOver();

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('space_impact_highscore', String(this.highScore));
    }

    this.stats.score = this.score;
    this.stats.accuracy =
      this.stats.shotsFired > 0
        ? Math.round((this.stats.shotsHit / this.stats.shotsFired) * 100)
        : 100;
    this.stats.stageReached = this.currentStageIndex;

    this.onStateChange?.(this.state, this.stats);
  }

  public victory() {
    this.state = 'VICTORY';
    soundEngine.stageClear();

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('space_impact_highscore', String(this.highScore));
    }

    this.stats.score = this.score;
    this.stats.accuracy =
      this.stats.shotsFired > 0
        ? Math.round((this.stats.shotsHit / this.stats.shotsFired) * 100)
        : 100;

    this.onStateChange?.(this.state, this.stats);
  }

  public destroy() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  // --- Secondary Weapons ---

  public fireSecondary() {
    if (this.state !== 'PLAYING') return;
    if (this.player.secondaryAmmo <= 0) {
      soundEngine.menuClick();
      this.addFloatingText('NO AMMO!', this.player.x, this.player.y - 10, '#ef4444', 12);
      return;
    }

    this.player.secondaryAmmo--;

    if (this.player.selectedSecondary === 'HOMING_MISSILES') {
      soundEngine.homingMissile();
      this.shakeIntensity = 8;
      // Fire 2 homing missiles
      this.projectiles.push({
        id: Math.random().toString(),
        x: this.player.x + this.player.width,
        y: this.player.y + 4,
        vx: 450,
        vy: -120,
        radius: 6,
        damage: 65,
        isPlayer: true,
        type: 'MISSILE',
        lifeTime: 0
      });
      this.projectiles.push({
        id: Math.random().toString(),
        x: this.player.x + this.player.width,
        y: this.player.y + this.player.height - 4,
        vx: 450,
        vy: 120,
        radius: 6,
        damage: 65,
        isPlayer: true,
        type: 'MISSILE',
        lifeTime: 0
      });
      this.addFloatingText('MISSILES!', this.player.x, this.player.y - 12, '#f59e0b', 14);
    } else {
      // SCREEN NUKE: Massive screen wipe and punchy shake
      soundEngine.nuke();
      this.shakeIntensity = 34;
      this.hitStopTimer = 0.08;

      // Expanding EMP blast ring
      this.particles.push({
        x: this.canvas.width * 0.5,
        y: this.canvas.height * 0.5,
        vx: 0,
        vy: 0,
        size: 5,
        color: this.theme === 'SAKURA_PINK' ? '#f472b6' : '#38bdf8',
        life: 0.65,
        maxLife: 0.65,
        shape: 'RING',
        ringRadius: 10,
        ringSpeed: 700
      });

      // Obliterate all enemy projectiles
      for (const p of this.projectiles) {
        if (!p.isPlayer) {
          this.createExplosion(p.x, p.y, this.theme === 'SAKURA_PINK' ? '#f472b6' : '#38bdf8', 6);
        }
      }
      this.projectiles = this.projectiles.filter((p) => p.isPlayer);

      // Damage or wipe all enemies
      for (const e of this.enemies) {
        e.hp -= 300;
        e.hitFlashTime = 0.2;
        this.createExplosion(e.x + e.width * 0.5, e.y + e.height * 0.5, '#ef4444', 16, true);
      }

      // Massive damage to boss
      if (this.boss) {
        this.boss.hp -= 400;
        this.boss.hitFlashTime = 0.25;
        this.createExplosion(
          this.boss.x + this.boss.width * 0.5,
          this.boss.y + this.boss.height * 0.5,
          '#f59e0b',
          28,
          true
        );
      }

      this.addFloatingText('SCREEN NUKE EMP!', this.canvas.width * 0.5, this.canvas.height * 0.5, '#38bdf8', 26);
    }
  }

  public switchSecondary() {
    this.player.selectedSecondary =
      this.player.selectedSecondary === 'HOMING_MISSILES' ? 'SCREEN_NUKE' : 'HOMING_MISSILES';
    soundEngine.menuClick();
  }

  public toggleAutoFire(): boolean {
    this.autoFire = !this.autoFire;
    soundEngine.menuClick();
    this.addFloatingText(
      this.autoFire ? 'AUTO-FIRE ON' : 'AUTO-FIRE OFF',
      this.player.x,
      this.player.y - 12,
      this.theme === 'SAKURA_PINK' ? '#f472b6' : '#06b6d4',
      12
    );
    this.emitHUD();
    return this.autoFire;
  }

  // --- Main Game Loop (60fps) ---

  private loop = (timestamp: number) => {
    if (!this.isRunning) return;

    const rawDt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    const dt = Math.min(rawDt, 0.05);

    if (this.state === 'PLAYING') {
      this.update(dt, timestamp);
    }

    this.render(timestamp);

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  // --- Simulation Updates ---

  private update(dt: number, timestamp: number) {
    this.stats.playTimeSeconds += dt;
    this.stageTimer += dt;

    // Handle hitstop impact freeze
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dt;
      return;
    }

    // Camera shake decay (smooth exponent)
    if (this.shakeIntensity > 0) {
      this.shakeIntensity *= 0.88;
      if (this.shakeIntensity < 0.2) this.shakeIntensity = 0;
    }

    // Update Combo Decay Timer
    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        if (this.combo >= 15) {
          this.addFloatingText('COMBO EXPIRED', this.player.x, this.player.y - 12, '#94a3b8', 12);
        }
        this.combo = 0;
        this.comboMultiplier = 1.0;
        this.comboTimer = 0;
      }
    }

    // 1. Update Player
    this.updatePlayer(dt, timestamp);

    // Shield Auto-Recharge (Kinetic Deflector Upgrade)
    this.timeSinceLastDamage += dt;
    if (this.upgrades.shieldGenerator > 0) {
      const shieldTiers = [30, 55, 80, 110, 150];
      const maxShield = shieldTiers[this.upgrades.shieldGenerator - 1];
      const rechargeDelay = Math.max(2.0, 4.5 - this.upgrades.shieldGenerator * 0.4);
      if (this.timeSinceLastDamage > rechargeDelay && this.player.shieldHp < maxShield) {
        this.player.shieldHp = Math.min(maxShield, this.player.shieldHp + 22 * dt);
      }
    }

    // Horizontal Map Background Scrolling (Continuous world coordinate)
    const mapBaseSpeed = 42 * this.getStageSpeedMultiplier();
    const warpMult = this.transitioningSector ? 6.0 : 1.0;
    this.mapScrollX += (mapBaseSpeed + Math.max(-20, this.playerVelocity.vx * 0.15)) * warpMult * dt;
    if (this.mapScrollX > 10000000) {
      this.mapScrollX = this.mapScrollX % 200000;
    }
    if (this.mapScrollX < 0) this.mapScrollX = 0;

    // Track smoothed player movement velocity across all input modes (keys, touch drag, D-pad)
    const rawVx = dt > 0 ? (this.player.x - this.lastPlayerX) / dt : 0;
    const rawVy = dt > 0 ? (this.player.y - this.lastPlayerY) / dt : 0;
    const smooth = Math.min(1, dt * 10);
    this.playerVelocity.vx += (rawVx - this.playerVelocity.vx) * smooth;
    this.playerVelocity.vy += (rawVy - this.playerVelocity.vy) * smooth;
    this.lastPlayerX = this.player.x;
    this.lastPlayerY = this.player.y;

    // 2. Update Parallax Starfield & Cosmic Nebulae
    this.updateStarfield(dt);

    // 3. Handle Automatic Sector Transition Sequence
    if (this.transitioningSector) {
      this.transitionTimer -= dt;
      if (this.transitionTimer <= 0) {
        this.transitioningSector = false;
        this.currentStageIndex++;
        this.stageConfig = getStageConfig(this.currentStageIndex);
        this.stageTimer = 0;
        this.bossWarningTimer = 0;
        this.boss = null;
        this.nextEnemySpawn = 0.5;
        this.projectiles = [];
        this.enemies = [];
        this.initNebulae();

        soundEngine.powerUp();
        this.addFloatingText(
          `SECTOR ${this.currentStageIndex} ENGAGED`,
          this.canvas.width * 0.5,
          this.canvas.height * 0.5,
          this.theme === 'SAKURA_PINK' ? '#f472b6' : '#10b981',
          22
        );
      }
    } else {
      this.handleSpawning(dt);
    }

    // 4. Update Projectiles
    this.updateProjectiles(dt);

    // 5. Update Enemies
    this.updateEnemies(dt, timestamp);

    // 6. Update Boss
    if (this.boss) {
      this.updateBoss(dt, timestamp);
    }

    // 7. Update PowerUps
    this.updatePowerUps(dt);

    // 7b. Update Gold Coins
    this.updateGoldCoins(dt);

    // 8. Collisions & Combat
    this.checkCollisions();

    // 9. Particles & Floating Text
    this.updateParticlesAndText(dt);

    // Emit HUD Updates
    this.emitHUD();
  }

  /**
   * Calculates velocity multiplier based on current campaign sector / endless mode survival.
   * Enhances sense of velocity as the ship pushes deeper into alien territory.
   */
  public getStageSpeedMultiplier(): number {
    if (this.mode === 'ENDLESS') {
      const timeBonus = Math.min(1.2, (this.stageTimer / 60) * 0.35);
      const killBonus = Math.min(0.8, (this.stats.enemiesKilled / 75) * 0.3);
      return 1.0 + timeBonus + killBonus;
    }

    switch (this.currentStageIndex) {
      case 1:
        return 1.0; // Sector 1: Orbital Defense - Standard cruising speed
      case 2:
        return 1.25; // Sector 2: Mecha Fortress - High-speed breach
      case 3:
        return 1.55; // Sector 3: Asteroid Minefield - Rapid tactical maneuvering
      case 4:
        return 1.85; // Sector 4: Bio-Alien Nest - Infiltration through hostile swarms
      case 5:
        return 2.25; // Sector 5: Alien Overmind - Terminal velocity assault
      default:
        return 1.0 + Math.min(1.5, (this.currentStageIndex - 1) * 0.3);
    }
  }

  /**
   * Updates multi-layered parallax starfield and cosmic nebulae.
   * Shifts speed based on player movement vector (forward boost, braking, vertical counter-drift)
   * and current campaign sector / endless progression.
   */
  private updateStarfield(dt: number) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const stageMult = this.getStageSpeedMultiplier();
    const warpMult = this.transitioningSector ? 8.0 : 1.0;

    // Normalized player movement influence
    // Forward movement (vx > 0) boosts star speed; backward (vx < 0) reduces it
    const forwardRatio = Math.max(-0.6, Math.min(1.2, this.playerVelocity.vx / (this.player.speed || 340)));
    // Vertical movement (vy) induces subtle counter-drift across parallax depth
    const verticalRatio = Math.max(-1.0, Math.min(1.0, this.playerVelocity.vy / (this.player.speed || 340)));

    // 1. Update Cosmic Nebulae (Deep ambient background layer)
    for (const neb of this.cosmicNebulae) {
      const nebMoveMult = Math.max(0.3, 1.0 + forwardRatio * 0.2);
      const nebSpeed = neb.baseSpeed * stageMult * nebMoveMult * warpMult;
      neb.x -= nebSpeed * dt;
      neb.y += (-verticalRatio * 10) * dt;

      if (neb.x < -neb.radius) {
        neb.x = w + neb.radius + Math.random() * 60;
        neb.y = Math.random() * h;
      }
    }

    // 2. Update Parallax Stars (Multi-layer depth with responsive velocity)
    for (const star of this.parallaxStars) {
      // Movement boost scales with layer depth (foreground stars react much stronger)
      const moveMult = Math.max(0.15, 1.0 + forwardRatio * (0.35 + star.depth * 0.65));
      const currentSpeed = star.baseSpeed * stageMult * moveMult * warpMult;

      star.x -= currentSpeed * dt;

      // Vertical 2.5D parallax drift
      const vertShift = -verticalRatio * (star.depth * 52) * dt;
      star.y += vertShift;

      // Horizontal wrapping
      if (star.x < -40) {
        star.x = w + 10 + Math.random() * 20;
        star.y = Math.random() * h;
      } else if (star.x > w + 45) {
        star.x = -15;
        star.y = Math.random() * h;
      }

      // Vertical wrapping
      if (star.y < -20) {
        star.y = h + 10;
      } else if (star.y > h + 20) {
        star.y = -10;
      }

      // Dynamic twinkle pulse
      star.twinklePhase += star.twinkleSpeed * dt;
      star.alpha = Math.max(0.1, Math.min(1.0, star.baseAlpha * (0.75 + 0.25 * Math.sin(star.twinklePhase))));
    }
  }

  private updatePlayer(dt: number, timestamp: number) {
    const p = this.player;

    if (p.invulnerableTime > 0) {
      p.invulnerableTime = Math.max(0, p.invulnerableTime - dt);
    }

    let dx = 0;
    let dy = 0;

    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;

    if (this.virtualDpad.x !== 0 || this.virtualDpad.y !== 0) {
      dx = this.virtualDpad.x;
      dy = this.virtualDpad.y;
    }

    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    p.x += dx * p.speed * dt;
    p.y += dy * p.speed * dt;

    p.x = Math.max(
      this.safeLeftMargin,
      Math.min(this.canvas.width - p.width - this.safeRightMargin, p.x)
    );
    p.y = Math.max(
      this.safeTopMargin,
      Math.min(this.canvas.height - p.height - this.safeBottomMargin, p.y)
    );

    const isPressingShoot =
      this.keys['Space'] ||
      this.keys['KeyJ'] ||
      this.virtualShooting ||
      this.isDirectDragging ||
      this.autoFire;

    let fireInterval = 0.18;
    if (p.weaponTier === 2) fireInterval = 0.14;
    else if (p.weaponTier === 3) fireInterval = 0.15;
    else if (p.weaponTier >= 4) fireInterval = 0.09;

    if (isPressingShoot && timestamp - p.lastFireTime >= fireInterval * 1000) {
      p.lastFireTime = timestamp;
      this.firePrimary(p);
    }
  }

  private firePrimary(p: PlayerState) {
    this.stats.shotsFired++;
    const blasterMult = 1 + (this.upgrades.blasterPower || 0) * 0.22;

    if (p.weaponTier === 1) {
      soundEngine.laser();
      this.projectiles.push({
        id: Math.random().toString(),
        x: p.x + p.width,
        y: p.y + p.height * 0.5,
        vx: 750,
        vy: 0,
        radius: 4,
        damage: Math.round(28 * blasterMult),
        isPlayer: true,
        type: 'BULLET',
        lifeTime: 0
      });
    } else if (p.weaponTier === 2) {
      soundEngine.twinLaser();
      this.projectiles.push({
        id: Math.random().toString(),
        x: p.x + p.width,
        y: p.y + 4,
        vx: 800,
        vy: 0,
        radius: 4,
        damage: Math.round(26 * blasterMult),
        isPlayer: true,
        type: 'BULLET',
        lifeTime: 0
      });
      this.projectiles.push({
        id: Math.random().toString(),
        x: p.x + p.width,
        y: p.y + p.height - 4,
        vx: 800,
        vy: 0,
        radius: 4,
        damage: Math.round(26 * blasterMult),
        isPlayer: true,
        type: 'BULLET',
        lifeTime: 0
      });
    } else if (p.weaponTier === 3) {
      soundEngine.twinLaser();
      this.projectiles.push({
        id: Math.random().toString(),
        x: p.x + p.width,
        y: p.y + p.height * 0.5,
        vx: 800,
        vy: 0,
        radius: 5,
        damage: Math.round(28 * blasterMult),
        isPlayer: true,
        type: 'BULLET',
        lifeTime: 0
      });
      this.projectiles.push({
        id: Math.random().toString(),
        x: p.x + p.width,
        y: p.y + 2,
        vx: 750,
        vy: -150,
        radius: 4,
        damage: Math.round(22 * blasterMult),
        isPlayer: true,
        type: 'BULLET',
        lifeTime: 0
      });
      this.projectiles.push({
        id: Math.random().toString(),
        x: p.x + p.width,
        y: p.y + p.height - 2,
        vx: 750,
        vy: 150,
        radius: 4,
        damage: Math.round(22 * blasterMult),
        isPlayer: true,
        type: 'BULLET',
        lifeTime: 0
      });
    } else {
      soundEngine.plasmaBeam();
      this.projectiles.push({
        id: Math.random().toString(),
        x: p.x + p.width,
        y: p.y + p.height * 0.5,
        vx: 950,
        vy: 0,
        radius: 6,
        damage: Math.round(42 * blasterMult),
        isPlayer: true,
        type: 'LASER_BEAM',
        penetrating: true,
        lifeTime: 0
      });
    }
  }

  // --- Spawning Logic ---

  private handleSpawning(dt: number) {
    if (this.boss || this.transitioningSector) return;

    if (this.mode === 'CAMPAIGN' && this.stageTimer >= this.stageConfig.duration) {
      if (this.bossWarningTimer === 0 && !this.boss) {
        this.bossWarningTimer = 3.5;
        soundEngine.bossAlarm();
        this.shakeIntensity = 14;
        this.addFloatingText(
          'WARNING: ENEMY BOSS APPROACHING',
          this.canvas.width * 0.5,
          this.canvas.height * 0.5,
          '#ef4444',
          22
        );
      } else if (this.bossWarningTimer > 0) {
        this.bossWarningTimer -= dt;
        if (this.bossWarningTimer <= 0) {
          this.spawnBoss();
        }
      }
      return;
    }

    if (this.mode === 'ENDLESS') {
      const bossThreshold = (this.stats.bossesDefeated + 1) * 6000;
      if (this.score >= bossThreshold && !this.boss) {
        this.spawnEndlessBoss();
        return;
      }
    }

    this.nextEnemySpawn -= dt;
    if (this.nextEnemySpawn <= 0) {
      const pool = this.stageConfig.enemyPool;
      const randomType = pool[Math.floor(Math.random() * pool.length)];
      this.spawnEnemy(randomType);

      const interval = Math.max(0.65, this.stageConfig.spawnInterval - (this.stageTimer / 60) * 0.3);
      this.nextEnemySpawn = interval * (0.8 + Math.random() * 0.4);
    }
  }

  private spawnEnemy(type: EnemyType) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const y = 30 + Math.random() * (h - 80);

    let enemyW = 32;
    let enemyH = 26;
    let hp = 40;
    let score = 100;
    let speed = 160;
    let pattern: Enemy['pattern'] = 'STRAIGHT';
    let shootInterval = 2.2;

    switch (type) {
      case 'SCOUT':
        enemyW = 28;
        enemyH = 24;
        hp = 35;
        score = 80;
        speed = 210;
        pattern = 'SINE';
        shootInterval = 2.5;
        break;
      case 'DRONE':
        enemyW = 34;
        enemyH = 28;
        hp = 65;
        score = 140;
        speed = 150;
        pattern = 'STRAIGHT';
        shootInterval = 2.0;
        break;
      case 'SQUID':
        enemyW = 36;
        enemyH = 32;
        hp = 85;
        score = 180;
        speed = 130;
        pattern = 'ZIGZAG';
        shootInterval = 1.8;
        break;
      case 'MINE':
        enemyW = 28;
        enemyH = 28;
        hp = 110;
        score = 120;
        speed = 90;
        pattern = 'STRAIGHT';
        shootInterval = 999;
        break;
      case 'INTERCEPTOR':
        enemyW = 32;
        enemyH = 22;
        hp = 50;
        score = 160;
        speed = 260;
        pattern = 'DIVE';
        shootInterval = 2.8;
        break;
      case 'CRUISER':
        enemyW = 54;
        enemyH = 44;
        hp = 220;
        score = 350;
        speed = 85;
        pattern = 'FLOAT_SHOOT';
        shootInterval = 1.5;
        break;
      case 'BIO_SERPENT':
        enemyW = 32;
        enemyH = 28;
        hp = 70;
        score = 190;
        speed = 175;
        pattern = 'SERPENT';
        shootInterval = 2.2;
        break;
      case 'TURRET':
        enemyW = 38;
        enemyH = 48;
        hp = 180;
        score = 250;
        speed = 70;
        pattern = 'STRAIGHT';
        shootInterval = 1.6;
        break;
    }

    if (this.mode === 'ENDLESS') {
      const scale = 1 + this.score / 15000;
      hp = Math.round(hp * scale);
      speed = Math.min(320, speed * Math.min(1.5, scale));
    }

    const mapCfg = getMapConfig(this.selectedMapId);
    hp = Math.round(hp * mapCfg.enemyHpMod);
    speed = Math.round(speed * mapCfg.enemySpeedMod);

    this.enemies.push({
      id: Math.random().toString(),
      type,
      x: w + 20,
      y,
      vx: -speed,
      vy: 0,
      width: enemyW,
      height: enemyH,
      hp,
      maxHp: hp,
      scoreValue: score,
      pattern,
      age: 0,
      lastShootTime: 0,
      shootInterval,
      hitFlashTime: 0,
      phaseOffset: Math.random() * Math.PI * 2
    });
  }

  private spawnBoss() {
    const stage = this.stageConfig;
    const mapCfg = getMapConfig(this.selectedMapId);
    const bossHp = Math.round(stage.bossHp * mapCfg.enemyHpMod);
    this.boss = {
      id: 'boss_' + stage.stageNumber,
      type: stage.bossType,
      name: stage.bossName,
      x: this.canvas.width + 40,
      y: this.canvas.height * 0.5 - 75,
      width: 140,
      height: 150,
      hp: bossHp,
      maxHp: bossHp,
      phase: 1,
      age: 0,
      attackTimer: 0,
      hitFlashTime: 0,
      shieldActive: false,
      targetY: this.canvas.height * 0.5 - 75
    };
  }

  private spawnEndlessBoss() {
    const bossTypes: Boss['type'][] = [
      'SQUID_TITAN',
      'MECHA_FORTRESS',
      'CYBER_DREADNOUGHT',
      'SKULL_LEVIATHAN',
      'OVERMIND_CORE'
    ];
    const type = bossTypes[this.stats.bossesDefeated % bossTypes.length];
    const mapCfg = getMapConfig(this.selectedMapId);
    const hp = Math.round((800 + this.stats.bossesDefeated * 450) * mapCfg.enemyHpMod);
    this.boss = {
      id: 'boss_endless_' + this.stats.bossesDefeated,
      type,
      name: 'TITAN ALPHA ' + (this.stats.bossesDefeated + 1),
      x: this.canvas.width + 40,
      y: this.canvas.height * 0.5 - 75,
      width: 140,
      height: 150,
      hp,
      maxHp: hp,
      phase: 1,
      age: 0,
      attackTimer: 0,
      hitFlashTime: 0,
      shieldActive: false,
      targetY: this.canvas.height * 0.5 - 75
    };
    soundEngine.bossAlarm();
  }

  // --- Entity Updates ---

  private updateProjectiles(dt: number) {
    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p) continue;
      p.lifeTime += dt;

      if (p.type === 'MISSILE' && p.isPlayer) {
        if (Math.random() < 0.6) {
          this.particles.push({
            x: p.x - 6,
            y: p.y,
            vx: -40 + (Math.random() - 0.5) * 20,
            vy: (Math.random() - 0.5) * 20,
            size: 2.5,
            color: this.theme === 'SAKURA_PINK' ? 'rgba(244, 114, 182, 0.7)' : 'rgba(245, 158, 11, 0.6)',
            life: 0.25,
            maxLife: 0.25
          });
        }

        let targetX = canvasW + 100;
        let targetY = canvasH * 0.5;
        let found = false;

        if (this.boss) {
          targetX = this.boss.x + this.boss.width * 0.5;
          targetY = this.boss.y + this.boss.height * 0.5;
          found = true;
        } else if (this.enemies.length > 0) {
          let closestDist = Infinity;
          for (const e of this.enemies) {
            if (!e) continue;
            const dist = Math.hypot(e.x - p.x, e.y - p.y);
            if (dist < closestDist) {
              closestDist = dist;
              targetX = e.x + e.width * 0.5;
              targetY = e.y + e.height * 0.5;
              found = true;
            }
          }
        }

        if (found) {
          const angle = Math.atan2(targetY - p.y, targetX - p.x);
          p.vx += Math.cos(angle) * 750 * dt;
          p.vy += Math.sin(angle) * 750 * dt;
          const currentSpeed = Math.hypot(p.vx, p.vy);
          if (currentSpeed > 550) {
            p.vx = (p.vx / currentSpeed) * 550;
            p.vy = (p.vy / currentSpeed) * 550;
          }
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.x < -30 || p.x > canvasW + 40 || p.y < -30 || p.y > canvasH + 30 || p.lifeTime > 5) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updateEnemies(dt: number, timestamp: number) {
    const canvasH = this.canvas.height;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e) continue;
      e.age += dt;
      if (e.hitFlashTime > 0) e.hitFlashTime -= dt;

      switch (e.pattern) {
        case 'SINE':
          e.x += e.vx * dt;
          e.y += Math.sin(e.age * 4 + (e.phaseOffset || 0)) * 140 * dt;
          break;
        case 'ZIGZAG':
          e.x += e.vx * dt;
          e.y += (Math.sin(e.age * 6) > 0 ? 1 : -1) * 90 * dt;
          break;
        case 'DIVE':
          e.x += e.vx * dt;
          const dy = this.player.y - e.y;
          e.y += Math.sign(dy) * Math.min(Math.abs(dy), 130 * dt);
          break;
        case 'SERPENT':
          e.x += e.vx * dt;
          e.y += Math.sin(e.age * 5 + (e.phaseOffset || 0)) * 180 * dt;
          break;
        case 'FLOAT_SHOOT':
          if (e.x > this.canvas.width * 0.65) {
            e.x += e.vx * dt;
          } else {
            e.x += e.vx * 0.25 * dt;
          }
          e.y += Math.sin(e.age * 2) * 50 * dt;
          break;
        default:
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          break;
      }

      e.y = Math.max(10, Math.min(canvasH - e.height - 10, e.y));

      if (
        e.x < this.canvas.width - 20 &&
        e.x > 80 &&
        timestamp - e.lastShootTime > e.shootInterval * 1000
      ) {
        e.lastShootTime = timestamp;
        this.enemyShoot(e);
      }

      if (e.x < -e.width - 40) {
        this.enemies.splice(i, 1);
      }
    }
  }

  private enemyShoot(e: Enemy) {
    soundEngine.enemyLaser();

    if (e.type === 'CRUISER') {
      for (const angleOffset of [-0.25, 0, 0.25]) {
        this.projectiles.push({
          id: Math.random().toString(),
          x: e.x,
          y: e.y + e.height * 0.5,
          vx: -320 * Math.cos(angleOffset),
          vy: 320 * Math.sin(angleOffset),
          radius: 5,
          damage: 18,
          isPlayer: false,
          type: 'ENEMY_PLASMA',
          lifeTime: 0
        });
      }
    } else {
      const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
      const speed = 280;
      this.projectiles.push({
        id: Math.random().toString(),
        x: e.x,
        y: e.y + e.height * 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 4.5,
        damage: 14,
        isPlayer: false,
        type: 'ENEMY_BULLET',
        lifeTime: 0
      });
    }
  }

  private updateBoss(dt: number, timestamp: number) {
    const b = this.boss!;
    b.age += dt;
    b.attackTimer += dt;
    if (b.hitFlashTime > 0) b.hitFlashTime -= dt;

    const bossTargetX = this.canvas.width - b.width - Math.max(32, this.safeRightMargin + 12);
    if (b.x > bossTargetX) {
      b.x -= 120 * dt;
      return;
    }

    if (Math.random() < 0.02) {
      b.targetY = 20 + Math.random() * (this.canvas.height - b.height - 40);
    }
    const dy = b.targetY - b.y;
    b.y += dy * 1.5 * dt;

    const hpRatio = b.hp / b.maxHp;
    if (hpRatio < 0.35) {
      b.phase = 3;
    } else if (hpRatio < 0.65) {
      b.phase = 2;
    }

    const attackThreshold = b.phase === 3 ? 1.2 : b.phase === 2 ? 1.6 : 2.2;
    if (b.attackTimer >= attackThreshold) {
      b.attackTimer = 0;
      this.executeBossAttack(b);
    }
  }

  private executeBossAttack(b: Boss) {
    soundEngine.enemyLaser();
    this.shakeIntensity = Math.min(26, this.shakeIntensity + 5);

    switch (b.type) {
      case 'SQUID_TITAN': {
        const count = b.phase === 3 ? 8 : 5;
        for (let i = 0; i < count; i++) {
          const angle = Math.PI - 0.7 + (i / (count - 1)) * 1.4;
          this.projectiles.push({
            id: Math.random().toString(),
            x: b.x + 10,
            y: b.y + b.height * 0.5,
            vx: -300 * Math.cos(angle - Math.PI),
            vy: 300 * Math.sin(angle - Math.PI),
            radius: 5.5,
            damage: 20,
            isPlayer: false,
            type: 'ENEMY_PLASMA',
            lifeTime: 0
          });
        }
        break;
      }

      case 'MECHA_FORTRESS': {
        this.projectiles.push({
          id: Math.random().toString(),
          x: b.x - 10,
          y: b.y + 25,
          vx: -400,
          vy: -60,
          radius: 7,
          damage: 24,
          isPlayer: false,
          type: 'BOSS_BEAM',
          lifeTime: 0
        });
        this.projectiles.push({
          id: Math.random().toString(),
          x: b.x - 10,
          y: b.y + b.height - 25,
          vx: -400,
          vy: 60,
          radius: 7,
          damage: 24,
          isPlayer: false,
          type: 'BOSS_BEAM',
          lifeTime: 0
        });
        break;
      }

      case 'CYBER_DREADNOUGHT': {
        for (let i = 0; i < 4; i++) {
          const vy = (i - 1.5) * 80;
          this.projectiles.push({
            id: Math.random().toString(),
            x: b.x,
            y: b.y + 30 + i * 25,
            vx: -320,
            vy,
            radius: 5,
            damage: 18,
            isPlayer: false,
            type: 'ENEMY_BULLET',
            lifeTime: 0
          });
        }
        break;
      }

      case 'SKULL_LEVIATHAN': {
        soundEngine.plasmaBeam();
        this.projectiles.push({
          id: Math.random().toString(),
          x: b.x - 20,
          y: b.y + b.height * 0.35,
          vx: -520,
          vy: 0,
          radius: 8,
          damage: 28,
          isPlayer: false,
          type: 'BOSS_BEAM',
          lifeTime: 0
        });
        this.projectiles.push({
          id: Math.random().toString(),
          x: b.x - 20,
          y: b.y + b.height * 0.65,
          vx: -520,
          vy: 0,
          radius: 8,
          damage: 28,
          isPlayer: false,
          type: 'BOSS_BEAM',
          lifeTime: 0
        });
        break;
      }

      case 'OVERMIND_CORE': {
        const count = 10;
        for (let i = 0; i < count; i++) {
          const angle = (i * Math.PI * 2) / count + b.age;
          this.projectiles.push({
            id: Math.random().toString(),
            x: b.x + b.width * 0.5,
            y: b.y + b.height * 0.5,
            vx: Math.cos(angle) * 260,
            vy: Math.sin(angle) * 260,
            radius: 6,
            damage: 22,
            isPlayer: false,
            type: 'ENEMY_PLASMA',
            lifeTime: 0
          });
        }
        break;
      }
    }
  }

  private updatePowerUps(dt: number) {
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      if (!pu) continue;
      pu.age += dt;
      pu.x += pu.vx * dt;
      pu.y += pu.vy * dt;

      if (pu.x < -30) {
        this.powerUps.splice(i, 1);
      }
    }
  }

  public spawnCoins(x: number, y: number, count: number = 1) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 95;
      this.goldCoins.push({
        id: Math.random().toString(),
        x,
        y,
        vx: Math.cos(angle) * speed - 25,
        vy: Math.sin(angle) * speed,
        value: 1,
        radius: 9,
        age: 0,
        rotation: Math.random() * Math.PI * 2
      });
    }
  }

  private updateGoldCoins(dt: number) {
    const p = this.player;
    if (!p) return;
    const magnetTiers = [100, 160, 230, 310, 420];
    const magnetRadius = this.upgrades.magnetTurbine > 0 ? magnetTiers[this.upgrades.magnetTurbine - 1] : 45;
    const playerCenterX = p.x + p.width * 0.5;
    const playerCenterY = p.y + p.height * 0.5;

    for (let i = this.goldCoins.length - 1; i >= 0; i--) {
      const c = this.goldCoins[i];
      if (!c) continue;
      c.age += dt;
      c.rotation += 4.5 * dt;

      const dx = playerCenterX - c.x;
      const dy = playerCenterY - c.y;
      const dist = Math.hypot(dx, dy);

      // Magnet attraction
      if (dist < magnetRadius && dist > 1) {
        const pullFactor = Math.min(650, 260 + (1 - dist / magnetRadius) * 450);
        c.vx += (dx / dist) * pullFactor * dt;
        c.vy += (dy / dist) * pullFactor * dt;
      } else {
        c.vx = (c.vx - 35 * dt) * 0.98;
        c.vy *= 0.98;
      }

      c.x += c.vx * dt;
      c.y += c.vy * dt;

      // Pickup collision with player
      if (dist < c.radius + p.width * 0.45) {
        soundEngine.coin();
        this.sessionCoins += c.value;
        this.coins = addPlayerCoins(c.value);
        this.stats.coinsCollected += c.value;
        recordMissionProgress('COINS', c.value);

        this.addFloatingText('+' + c.value + ' COIN', c.x, c.y - 10, '#facc15', 12);

        // Gold sparkles
        for (let sp = 0; sp < 6; sp++) {
          const sAngle = Math.random() * Math.PI * 2;
          const sSpeed = 30 + Math.random() * 60;
          this.particles.push({
            x: c.x,
            y: c.y,
            vx: Math.cos(sAngle) * sSpeed,
            vy: Math.sin(sAngle) * sSpeed,
            size: 2,
            color: Math.random() < 0.5 ? '#fef08a' : '#f59e0b',
            life: 0.25,
            maxLife: 0.25,
            shape: 'SPARK'
          });
        }

        this.goldCoins.splice(i, 1);
        continue;
      }

      // Despawn offscreen
      if (c.x < -40 || c.age > 16) {
        this.goldCoins.splice(i, 1);
      }
    }
  }

  // --- Collision Detection & Combat Resolution ---

  private checkCollisions() {
    if (this.state !== 'PLAYING') return;
    const p = this.player;

    // 1. Player Projectiles vs Enemies & Boss
    for (let pi = this.projectiles.length - 1; pi >= 0; pi--) {
      const proj = this.projectiles[pi];
      if (!proj || !proj.isPlayer) continue;

      let hit = false;

      // Check vs Boss
      if (this.boss) {
        const b = this.boss;
        if (
          proj.x + proj.radius >= b.x &&
          proj.x - proj.radius <= b.x + b.width &&
          proj.y + proj.radius >= b.y &&
          proj.y - proj.radius <= b.y + b.height
        ) {
          hit = true;
          this.stats.shotsHit++;
          this.registerComboHit();
          b.hp -= proj.damage;
          b.hitFlashTime = 0.08;
          soundEngine.hitEnemy();
          this.createHitSparks(proj.x, proj.y, this.theme === 'SAKURA_PINK' ? '#f472b6' : '#38bdf8');
          this.shakeIntensity = Math.min(22, this.shakeIntensity + 2.5);

          if (b.hp <= 0) {
            this.handleBossDefeated(b);
            return;
          }
        }
      }

      // Check vs Enemies
      if (!hit) {
        for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
          const e = this.enemies[ei];
          if (!e) continue;
          if (
            proj.x + proj.radius >= e.x &&
            proj.x - proj.radius <= e.x + e.width &&
            proj.y + proj.radius >= e.y &&
            proj.y - proj.radius <= e.y + e.height
          ) {
            hit = true;
            this.stats.shotsHit++;
            this.registerComboHit();
            e.hp -= proj.damage;
            e.hitFlashTime = 0.08;
            soundEngine.hitEnemy();
            this.createHitSparks(proj.x, proj.y, this.theme === 'SAKURA_PINK' ? '#f472b6' : '#38bdf8');

            if (e.hp <= 0) {
              this.handleEnemyDefeated(e, ei);
            }
            break;
          }
        }
      }

      if (hit && !proj.penetrating && pi < this.projectiles.length) {
        this.projectiles.splice(pi, 1);
      }
    }

    // 2. Enemy Projectiles vs Player
    if (this.state === 'PLAYING' && p.invulnerableTime <= 0) {
      for (let pi = this.projectiles.length - 1; pi >= 0; pi--) {
        const proj = this.projectiles[pi];
        if (!proj || proj.isPlayer) continue;

        if (
          proj.x + proj.radius >= p.x &&
          proj.x - proj.radius <= p.x + p.width &&
          proj.y + proj.radius >= p.y &&
          proj.y - proj.radius <= p.y + p.height
        ) {
          this.damagePlayer(proj.damage);
          if (pi < this.projectiles.length) {
            this.projectiles.splice(pi, 1);
          }
          if (this.state !== 'PLAYING') return;
          break;
        }
      }
    }

    // 3. Player vs Enemy Craft Collision (kamikaze crash)
    if (this.state === 'PLAYING' && p.invulnerableTime <= 0) {
      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const e = this.enemies[ei];
        if (!e) continue;
        if (
          p.x + p.width >= e.x &&
          p.x <= e.x + e.width &&
          p.y + p.height >= e.y &&
          p.y <= e.y + e.height
        ) {
          this.damagePlayer(35);
          this.createExplosion(e.x + e.width * 0.5, e.y + e.height * 0.5, '#ef4444', 18, true);
          if (ei < this.enemies.length) {
            this.enemies.splice(ei, 1);
          }
          if (this.state !== 'PLAYING') return;
          break;
        }
      }
    }

    // 4. Player vs Power-ups
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      if (!pu) continue;
      const dist = Math.hypot(p.x + p.width * 0.5 - pu.x, p.y + p.height * 0.5 - pu.y);
      if (dist < pu.radius + p.width * 0.4) {
        this.collectPowerUp(pu);
        if (i < this.powerUps.length) {
          this.powerUps.splice(i, 1);
        }
      }
    }
  }

  /**
   * Calculates combo multiplier based on consecutive hits without taking damage.
   * Progression tiers:
   * 0 - 4 hits: 1.0x (Standard)
   * 5 - 11 hits: 1.5x (Cadet Streak)
   * 12 - 21 hits: 2.0x (Ace Pilot)
   * 22 - 34 hits: 2.5x (Sharpshooter)
   * 35 - 51 hits: 3.0x (Hyper Destroyer)
   * 52 - 74 hits: 4.0x (Apex Predator)
   * 75+ hits: 5.0x (MAX MULTIPLIER)
   */
  public calculateMultiplier(hits: number): number {
    if (hits < 5) return 1.0;
    if (hits < 12) return 1.5;
    if (hits < 22) return 2.0;
    if (hits < 35) return 2.5;
    if (hits < 52) return 3.0;
    if (hits < 75) return 4.0;
    return 5.0;
  }

  public registerComboHit() {
    const oldMult = this.comboMultiplier;
    this.combo++;
    recordMissionProgress('COMBO', this.combo);
    if (this.combo > this.stats.maxCombo) {
      this.stats.maxCombo = this.combo;
    }
    this.comboTimer = this.maxComboTimer;

    const newMult = this.calculateMultiplier(this.combo);
    if (newMult > oldMult) {
      this.comboMultiplier = newMult;
      soundEngine.comboUp(newMult);
      this.shakeIntensity = Math.min(24, this.shakeIntensity + 3);
      const isPink = this.theme === 'SAKURA_PINK';
      const label = newMult >= 5.0 ? 'MAX COMBO x5.0!' : `COMBO x${newMult.toFixed(1)}!`;
      this.addFloatingText(
        label,
        this.player.x + 24,
        this.player.y - 18,
        isPink ? '#f472b6' : newMult >= 5.0 ? '#fbbf24' : '#38bdf8',
        newMult >= 5.0 ? 18 : 14
      );
    }
  }

  private damagePlayer(amount: number) {
    const p = this.player;
    soundEngine.playerHit();
    this.shakeIntensity = 22;
    this.hitStopTimer = 0.05;
    this.timeSinceLastDamage = 0;

    // Apply Nanite Hull Plating defense reduction
    const defBonus = Math.min(0.25, (this.upgrades.reinforcedHull || 0) * 0.05);
    amount = Math.max(1, Math.round(amount * (1 - defBonus)));

    // Reset combo streak on taking any hit/damage
    if (this.combo >= 5) {
      soundEngine.comboBreak();
      this.addFloatingText('COMBO BROKEN!', p.x, p.y - 18, '#ef4444', 14);
    }
    this.combo = 0;
    this.comboMultiplier = 1.0;
    this.comboTimer = 0;

    if (p.shieldHp > 0) {
      if (p.shieldHp >= amount) {
        p.shieldHp -= amount;
        this.addFloatingText('SHIELD BLOCKED', p.x, p.y - 12, '#38bdf8', 12);
        return;
      } else {
        const remaining = amount - p.shieldHp;
        p.shieldHp = 0;
        amount = remaining;
      }
    }

    p.hp -= amount;
    this.createExplosion(p.x + p.width * 0.5, p.y + p.height * 0.5, '#ef4444', 16, true);

    if (p.hp <= 0) {
      p.lives--;
      if (p.lives > 0) {
        p.hp = p.maxHp;
        p.invulnerableTime = 3.0;
        p.weaponTier = Math.max(1, p.weaponTier - 1);
        this.addFloatingText('SHIP RESTORED', p.x, p.y - 16, '#f59e0b', 16);
        soundEngine.powerUp();
      } else {
        this.gameOver();
      }
    } else {
      p.invulnerableTime = 1.0;
    }
  }

  private handleEnemyDefeated(e: Enemy, index: number) {
    this.enemies.splice(index, 1);
    this.stats.enemiesKilled++;
    recordMissionProgress('KILLS', 1);

    const mapCfg = getMapConfig(this.selectedMapId);

    // Score scaled by combo multiplier and map difficulty multiplier
    const earnedScore = Math.round(e.scoreValue * this.comboMultiplier * mapCfg.multiplier);
    this.score += earnedScore;

    soundEngine.explosion();
    const isHeavy = e.type === 'CRUISER' || e.type === 'TURRET' || e.type === 'MINE';
    this.createExplosion(
      e.x + e.width * 0.5,
      e.y + e.height * 0.5,
      this.theme === 'SAKURA_PINK' ? '#f472b6' : '#f43f5e',
      isHeavy ? 20 : 12,
      isHeavy
    );
    const scoreText =
      this.comboMultiplier > 1
        ? `+${earnedScore} (x${this.comboMultiplier.toFixed(1)})`
        : `+${earnedScore}`;
    this.addFloatingText(scoreText, e.x, e.y, this.theme === 'SAKURA_PINK' ? '#fb7185' : '#f59e0b', 12);

    // Gold Coin Drops based on Map drop rate
    if (Math.random() < mapCfg.coinDropRate) {
      const coinCount = e.type === 'CRUISER' ? 3 : e.type === 'TURRET' ? 2 : 1;
      this.spawnCoins(e.x + e.width * 0.5, e.y + e.height * 0.5, coinCount);
    }

    if (Math.random() < 0.18 || e.type === 'CRUISER') {
      this.dropPowerUp(e.x + e.width * 0.5, e.y + e.height * 0.5);
    }
  }

  private dropPowerUp(x: number, y: number) {
    const types: PowerUp['type'][] = ['WEAPON_UPGRADE', 'SECONDARY_AMMO', 'SHIELD', 'SCORE_GEM'];
    if (this.player.lives < 3 && Math.random() < 0.2) {
      types.push('LIFE');
    }
    const chosen = types[Math.floor(Math.random() * types.length)];

    this.powerUps.push({
      id: Math.random().toString(),
      type: chosen,
      x,
      y,
      vx: -60,
      vy: 0,
      radius: 13,
      age: 0
    });
  }

  private collectPowerUp(pu: PowerUp) {
    soundEngine.powerUp();
    const p = this.player;
    const isPink = this.theme === 'SAKURA_PINK';

    switch (pu.type) {
      case 'WEAPON_UPGRADE':
        p.weaponTier = Math.min(4, p.weaponTier + 1);
        if (p.weaponTier === 2) p.primaryWeapon = 'TWIN_BLASTER';
        else if (p.weaponTier === 3) p.primaryWeapon = 'SPREAD_VULCAN';
        else if (p.weaponTier >= 4) p.primaryWeapon = 'PLASMA_BEAM';
        this.addFloatingText('WEAPON UPGRADED!', pu.x, pu.y, isPink ? '#f472b6' : '#06b6d4', 16);
        break;

      case 'SECONDARY_AMMO':
        p.secondaryAmmo = Math.min(5, p.secondaryAmmo + 2);
        this.addFloatingText('+2 ORDNANCE!', pu.x, pu.y, '#f59e0b', 16);
        break;

      case 'SHIELD':
        p.shieldHp = 50;
        this.addFloatingText('SHIELD OVERCHARGE!', pu.x, pu.y, isPink ? '#f472b6' : '#38bdf8', 16);
        break;

      case 'LIFE':
        p.lives = Math.min(5, p.lives + 1);
        this.addFloatingText('EXTRA SHIP +1', pu.x, pu.y, '#10b981', 18);
        break;

      case 'SCORE_GEM': {
        const gemScore = Math.round(750 * this.comboMultiplier);
        this.score += gemScore;
        const gemText =
          this.comboMultiplier > 1
            ? `+${gemScore} (x${this.comboMultiplier.toFixed(1)})`
            : `+${gemScore} BONUS`;
        this.addFloatingText(gemText, pu.x, pu.y, isPink ? '#fb7185' : '#ec4899', 16);
        break;
      }
    }
  }

  private handleBossDefeated(b: Boss) {
    this.boss = null;
    this.stats.bossesDefeated++;
    recordMissionProgress('BOSS', 1);

    const mapCfg = getMapConfig(this.selectedMapId);
    const bossScore = Math.round(5000 * Math.min(3.0, this.comboMultiplier) * mapCfg.multiplier);
    this.score += bossScore;
    this.shakeIntensity = 38;
    this.hitStopTimer = 0.12;
    soundEngine.bossExplosion();

    // Cascading shockwaves and fiery explosions
    for (let i = 0; i < 16; i++) {
      setTimeout(() => {
        const ox = b.x + Math.random() * b.width;
        const oy = b.y + Math.random() * b.height;
        this.createExplosion(
          ox,
          oy,
          this.theme === 'SAKURA_PINK' ? '#f472b6' : '#f59e0b',
          28,
          true
        );
        soundEngine.explosion();
      }, i * 65);
    }

    this.addFloatingText(
      `BOSS DESTROYED! +${bossScore}`,
      b.x + b.width * 0.5,
      b.y + b.height * 0.5,
      this.theme === 'SAKURA_PINK' ? '#f472b6' : '#10b981',
      26
    );

    // Large Gold Coin cache drop from Boss
    this.spawnCoins(b.x + b.width * 0.5, b.y + b.height * 0.5, 14);
    this.dropPowerUp(b.x + b.width * 0.5, b.y + b.height * 0.5);

    if (this.mode === 'CAMPAIGN') {
      if (this.currentStageIndex >= CAMPAIGN_STAGES.length) {
        setTimeout(() => {
          this.victory();
        }, 2800);
      } else {
        this.transitioningSector = true;
        this.transitionTimer = 3.6;
        this.transitionNextStage = this.currentStageIndex + 1;

        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 40);
        this.player.secondaryAmmo = Math.min(5, this.player.secondaryAmmo + 1);
        this.player.invulnerableTime = 5.0;

        this.projectiles = this.projectiles.filter((p) => p.isPlayer);
        this.enemies = [];

        soundEngine.stageClear();
      }
    }
  }

  // --- Multi-Layer Particle System (Sparks, Rings, Debris, Smoke) ---

  private createExplosion(
    x: number,
    y: number,
    color: string,
    count: number,
    isHeavy: boolean = false
  ) {
    const isPink = this.theme === 'SAKURA_PINK';
    const mainColor = isPink ? '#f472b6' : color;
    const accentColor = isPink ? '#fb7185' : '#f59e0b';

    // 1. Screenshake impulse
    this.shakeIntensity = Math.min(38, this.shakeIntensity + (isHeavy ? 16 : 8));

    // 2. Expanding Shockwave Ring
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      size: isHeavy ? 3.5 : 2,
      color: mainColor,
      life: 0.45,
      maxLife: 0.45,
      shape: 'RING',
      ringRadius: 4,
      ringSpeed: isHeavy ? 240 : 150
    });

    if (isHeavy) {
      this.particles.push({
        x,
        y,
        vx: 0,
        vy: 0,
        size: 2,
        color: '#ffffff',
        life: 0.35,
        maxLife: 0.35,
        shape: 'RING',
        ringRadius: 2,
        ringSpeed: 280
      });
    }

    // 3. High-velocity Spark Needles
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * (isHeavy ? 340 : 220);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.5 + Math.random() * 2,
        color: Math.random() < 0.4 ? '#ffffff' : mainColor,
        life: 0.25 + Math.random() * 0.3,
        maxLife: 0.55,
        shape: 'SPARK'
      });
    }

    // 4. Rotating Debris Shards
    const debrisCount = Math.max(3, Math.floor(count * 0.5));
    for (let i = 0; i < debrisCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * (isHeavy ? 180 : 130);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 3.5,
        color: Math.random() < 0.5 ? accentColor : isPink ? '#fbcfe8' : '#e2e8f0',
        life: 0.35 + Math.random() * 0.35,
        maxLife: 0.7,
        shape: 'DEBRIS',
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 12
      });
    }

    // 5. Fiery Smoke Puffs
    const smokeCount = Math.max(2, Math.floor(count * 0.4));
    for (let i = 0; i < smokeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 15 + Math.random() * 50;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 6,
        color: isPink ? 'rgba(244, 114, 182, 0.4)' : 'rgba(245, 158, 11, 0.35)',
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        shape: 'CIRCLE'
      });
    }
  }

  private createHitSparks(x: number, y: number, color: string) {
    for (let i = 0; i < 5; i++) {
      const angle = Math.PI * 0.8 + (Math.random() - 0.5) * 1.5;
      const speed = 60 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.5,
        color,
        life: 0.15 + Math.random() * 0.15,
        maxLife: 0.3,
        shape: 'SPARK'
      });
    }
  }

  public addFloatingText(text: string, x: number, y: number, color: string, fontSize: number = 14) {
    this.floatingTexts.push({
      id: Math.random().toString(),
      text,
      x,
      y,
      vy: -40,
      color,
      life: 1.2,
      maxLife: 1.2,
      fontSize
    });
  }

  private updateParticlesAndText(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      if (!pt) continue;
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.95;
      pt.vy *= 0.95;

      if (pt.shape === 'RING' && pt.ringRadius !== undefined && pt.ringSpeed !== undefined) {
        pt.ringRadius += pt.ringSpeed * dt;
      }
      if (pt.shape === 'DEBRIS' && pt.rotation !== undefined && pt.vRot !== undefined) {
        pt.rotation += pt.vRot * dt;
      }

      if (pt.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      if (!ft) continue;
      ft.life -= dt;
      ft.y += ft.vy * dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  // --- Rendering ---

  private render(timestamp: number) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const isPink = this.theme === 'SAKURA_PINK';

    ctx.save();

    // Rotational & Translational Screen-Shake Effect
    if (this.shakeIntensity > 0) {
      const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      const shakeRot = (Math.random() - 0.5) * this.shakeIntensity * 0.0022;
      ctx.translate(shakeX, shakeY);
      ctx.rotate(shakeRot);
    }

    // 1. Background fill
    ctx.fillStyle = isPink ? '#0e0614' : this.stageConfig.backgroundHue || '#050811';
    ctx.fillRect(0, 0, w, h);

    // 1b. Seamless Horizontal Parallax Background Map (Forward Scrolling without Mirror/Page Folds)
    const mapImg = this.mapImages[this.selectedMapId];
    if (mapImg && mapImg.complete && mapImg.naturalWidth > 0) {
      ctx.save();
      const seamlessSource = this.seamlessMapCanvases[this.selectedMapId] || mapImg;
      const srcW = ('naturalWidth' in seamlessSource ? (seamlessSource as HTMLImageElement).naturalWidth : (seamlessSource as HTMLCanvasElement).width) || w;
      const srcH = ('naturalHeight' in seamlessSource ? (seamlessSource as HTMLImageElement).naturalHeight : (seamlessSource as HTMLCanvasElement).height) || h;

      // Maintain aspect ratio while ensuring vertical coverage
      const naturalAspect = srcW / Math.max(1, srcH);
      const tileWidth = Math.max(w, Math.round(h * naturalAspect));
      const tileHeight = h;

      // Pure forward continuous scroll without horizontal mirroring or "pages" crease
      const normalizedScroll = ((this.mapScrollX % tileWidth) + tileWidth) % tileWidth;
      const firstTileX = -normalizedScroll;

      for (let tx = firstTileX; tx < w + 20; tx += tileWidth) {
        ctx.drawImage(seamlessSource, tx, 0, tileWidth, tileHeight);
      }

      // Environmental map atmospheric tint
      if (this.selectedMapId === 'TOXIC_BELT') {
        ctx.fillStyle = 'rgba(6, 78, 59, 0.20)';
        ctx.fillRect(0, 0, w, h);
      } else if (this.selectedMapId === 'SINGULARITY_ABYSS') {
        ctx.fillStyle = 'rgba(46, 16, 101, 0.24)';
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.fillStyle = 'rgba(12, 74, 110, 0.15)';
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();
    }

    // 2. Cosmic Nebulae (Deep Parallax Layer using cached offscreen sprites for maximum FPS)
    for (const neb of this.cosmicNebulae) {
      if (neb.canvas) {
        ctx.drawImage(neb.canvas, neb.x - neb.radius, neb.y - neb.radius);
      } else {
        const grad = ctx.createRadialGradient(
          neb.x, neb.y, neb.radius * 0.05,
          neb.x, neb.y, neb.radius
        );
        grad.addColorStop(0, neb.colorCenter);
        grad.addColorStop(0.65, neb.colorCenter.replace(/[\d\.]+\)$/, '0.03)'));
        grad.addColorStop(1, neb.colorEdge);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(neb.x, neb.y, neb.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Subtle cyber grid (batched single path & stroke for 60fps mobile execution)
    const stageSpeedMult = this.getStageSpeedMultiplier();
    const gridOffsetX = (timestamp * 0.02 * stageSpeedMult) % 48;
    ctx.strokeStyle = isPink ? 'rgba(244, 114, 182, 0.035)' : 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    const gridSize = 48;
    ctx.beginPath();
    for (let x = -gridOffsetX; x < w + gridSize; x += gridSize) {
      if (x >= 0) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Subtle tactical safe bounds markers for mobile / Android screens
    if (this.safeFitMode && (this.safeLeftMargin > 20 || this.safeRightMargin > 20)) {
      const sl = this.safeLeftMargin;
      const sr = w - this.safeRightMargin;
      const st = this.safeTopMargin;
      const sb = h - this.safeBottomMargin;
      const bLen = 14;

      ctx.save();
      ctx.strokeStyle = isPink ? 'rgba(244, 114, 182, 0.25)' : 'rgba(6, 182, 212, 0.22)';
      ctx.lineWidth = 1.5;

      // Top-Left corner
      ctx.beginPath();
      ctx.moveTo(sl + bLen, st);
      ctx.lineTo(sl, st);
      ctx.lineTo(sl, st + bLen);
      ctx.stroke();

      // Bottom-Left corner
      ctx.beginPath();
      ctx.moveTo(sl + bLen, sb);
      ctx.lineTo(sl, sb);
      ctx.lineTo(sl, sb - bLen);
      ctx.stroke();

      // Top-Right corner
      ctx.beginPath();
      ctx.moveTo(sr - bLen, st);
      ctx.lineTo(sr, st);
      ctx.lineTo(sr, st + bLen);
      ctx.stroke();

      // Bottom-Right corner
      ctx.beginPath();
      ctx.moveTo(sr - bLen, sb);
      ctx.lineTo(sr, sb);
      ctx.lineTo(sr, sb - bLen);
      ctx.stroke();

      ctx.restore();
    }

    // 4. Multi-Layer Parallax Starfield & Velocity Streaks
    const warpActive = this.transitioningSector;
    const forwardRatio = Math.max(0, this.playerVelocity.vx / (this.player.speed || 340));

    for (const star of this.parallaxStars) {
      const moveMult = Math.max(0.15, 1.0 + (this.playerVelocity.vx / (this.player.speed || 340)) * (0.35 + star.depth * 0.65));
      const currentSpeed = star.baseSpeed * stageSpeedMult * moveMult;

      // Calculate velocity stretch length
      let streakLength = 0;
      if (warpActive) {
        streakLength = Math.max(30, star.baseSpeed * 0.95);
      } else if (star.layer === 2) {
        // Foreground stars stretch into high-speed streaks
        const velocityFactor = (currentSpeed / 130) * (1.0 + forwardRatio * 0.9);
        if (velocityFactor > 0.85) {
          streakLength = Math.max(star.size * 1.5, star.size * velocityFactor * 2.2);
        }
      } else if (star.layer === 1 && (currentSpeed > 120 || forwardRatio > 0.45)) {
        streakLength = Math.max(star.size * 1.3, star.size * 1.8);
      }

      if (streakLength > star.size * 1.25) {
        // High-velocity streak line
        ctx.strokeStyle = warpActive
          ? isPink
            ? 'rgba(244, 114, 182, 0.85)'
            : 'rgba(34, 211, 238, 0.75)'
          : star.color;
        ctx.globalAlpha = Math.min(1.0, star.alpha * (warpActive ? 1.0 : 0.9));
        ctx.lineWidth = Math.max(1, star.size * (warpActive ? 0.9 : 0.8));
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(star.x + streakLength, star.y);
        ctx.stroke();
        ctx.lineCap = 'butt';
      } else {
        // Sharp star point / diamond
        ctx.fillStyle = star.color;
        ctx.globalAlpha = star.alpha;
        if (star.shape === 'DIAMOND' && star.size >= 1.6) {
          const s = star.size * 1.15;
          ctx.beginPath();
          ctx.moveTo(star.x, star.y - s);
          ctx.lineTo(star.x + s, star.y);
          ctx.lineTo(star.x, star.y + s);
          ctx.lineTo(star.x - s, star.y);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillRect(star.x, star.y, star.size, star.size);
        }
      }
    }
    ctx.globalAlpha = 1.0;

    // 3. Power-ups
    for (const pu of this.powerUps) {
      if (pu) drawPowerUp(ctx, pu, timestamp);
    }

    // 3b. Floating Gold Coins (Gleaming 3D Rotating Medallions)
    for (const c of this.goldCoins) {
      if (!c) continue;
      ctx.save();
      ctx.translate(c.x, c.y);

      const rotScale = Math.cos(c.rotation);
      ctx.scale(Math.abs(rotScale) < 0.1 ? 0.1 : rotScale, 1);

      // Radial Gold Aura
      const aura = ctx.createRadialGradient(0, 0, 2, 0, 0, c.radius * 1.6);
      aura.addColorStop(0, 'rgba(250, 204, 21, 0.45)');
      aura.addColorStop(1, 'rgba(234, 179, 8, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, c.radius * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Coin disc
      const coinGrad = ctx.createLinearGradient(-c.radius, -c.radius, c.radius, c.radius);
      coinGrad.addColorStop(0, '#fef08a');
      coinGrad.addColorStop(0.45, '#eab308');
      coinGrad.addColorStop(1, '#a16207');
      ctx.fillStyle = coinGrad;
      ctx.beginPath();
      ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
      ctx.fill();

      // Outer bezel ring
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Inner ridge ring
      ctx.strokeStyle = '#fef9c3';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, c.radius * 0.65, 0, Math.PI * 2);
      ctx.stroke();

      // Dollar / Credit symbol
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 1);

      ctx.restore();
    }

    // 4. Enemies
    for (const enemy of this.enemies) {
      if (enemy) drawEnemy(ctx, enemy, timestamp);
    }

    // 5. Boss
    if (this.boss) {
      drawBoss(ctx, this.boss, timestamp);
    }

    // 6. Projectiles
    for (const proj of this.projectiles) {
      if (proj) drawProjectile(ctx, proj, this.theme);
    }

    // 7. Player Ship & Kinetic Shield Bubble
    if (this.state === 'PLAYING' || this.state === 'PAUSED') {
      drawPlayerShip(ctx, this.player, timestamp, this.theme);

      // Kinetic Shield Deflector Bubble
      if (this.player.shieldHp > 0) {
        ctx.save();
        const p = this.player;
        const shieldRatio = Math.min(1.0, p.shieldHp / 80);
        // Outer soft glow ring
        ctx.strokeStyle = isPink
          ? 'rgba(244, 114, 182, 0.22)'
          : 'rgba(56, 189, 248, 0.22)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(
          p.x + p.width * 0.45,
          p.y + p.height * 0.5,
          p.width * 0.77,
          p.height * 0.92,
          0,
          0,
          Math.PI * 2
        );
        ctx.stroke();

        // Inner crisp kinetic ring
        ctx.strokeStyle = isPink
          ? `rgba(244, 114, 182, ${0.5 + 0.45 * shieldRatio})`
          : `rgba(56, 189, 248, ${0.5 + 0.45 * shieldRatio})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(
          p.x + p.width * 0.45,
          p.y + p.height * 0.5,
          p.width * 0.74,
          p.height * 0.89,
          0,
          0,
          Math.PI * 2
        );
        ctx.stroke();
        ctx.restore();
      }
    }

    // 8. Enhanced Particle Destroy Effects (Rings, Spark Streaks, Shards)
    for (const pt of this.particles) {
      if (!pt) continue;
      const alpha = Math.max(0, Math.min(1, pt.life / pt.maxLife));
      ctx.save();
      ctx.globalAlpha = alpha;

      if (pt.shape === 'RING' && pt.ringRadius !== undefined) {
        ctx.strokeStyle = pt.color;
        ctx.lineWidth = Math.max(1, (pt.size || 2) * alpha);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (pt.shape === 'SPARK') {
        ctx.strokeStyle = pt.color;
        ctx.lineWidth = pt.size;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x - pt.vx * 0.035, pt.y - pt.vy * 0.035);
        ctx.stroke();
      } else if (pt.shape === 'DEBRIS' && pt.rotation !== undefined) {
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rotation);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.moveTo(0, -pt.size);
        ctx.lineTo(pt.size * 0.7, pt.size * 0.7);
        ctx.lineTo(-pt.size * 0.7, pt.size * 0.7);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // 9. Floating Combat Text
    for (const ft of this.floatingTexts) {
      if (!ft) continue;
      const alpha = ft.life / ft.maxLife;
      ctx.save();
      ctx.font = `bold ${ft.fontSize}px "Press Start 2P", cursive`;
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    // 10. Automatic "MOVING TO NEXT SECTOR..." Cinematic Banner
    if (this.transitioningSector) {
      const bannerH = 120;
      const bannerY = h * 0.5 - bannerH * 0.5;

      ctx.fillStyle = isPink ? 'rgba(28, 10, 36, 0.92)' : 'rgba(7, 12, 26, 0.9)';
      ctx.fillRect(0, bannerY, w, bannerH);

      ctx.strokeStyle = isPink ? '#f472b6' : '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(0, bannerY, w, bannerH);

      ctx.fillStyle = isPink ? '#f472b6' : '#10b981';
      ctx.font = 'bold 15px "Press Start 2P", cursive';
      ctx.textAlign = 'center';
      ctx.fillText(`SECTOR ${this.currentStageIndex} SECURED!`, w * 0.5, bannerY + 32);

      const dots = '.'.repeat(Math.floor((timestamp / 280) % 4));
      ctx.fillStyle = isPink ? '#fb7185' : '#38bdf8';
      ctx.font = 'bold 19px "Press Start 2P", cursive';
      ctx.fillText(`MOVING TO NEXT SECTOR${dots}`, w * 0.5, bannerY + 68);

      const nextStage = CAMPAIGN_STAGES[this.currentStageIndex];
      const nextTitle = nextStage ? nextStage.title : 'HYPERSPACE CORRIDOR';
      ctx.fillStyle = isPink ? '#fbcfe8' : '#94a3b8';
      ctx.font = '13px "Share Tech Mono", monospace';
      ctx.fillText(`WARPING TO ${nextTitle} · REPAIRS & ORDNANCE RESTOCKED`, w * 0.5, bannerY + 98);
    }

    // 11. Boss Warning Banner
    if (this.bossWarningTimer > 0) {
      const flash = Math.sin(timestamp * 0.015) > 0;
      ctx.fillStyle = flash ? 'rgba(239, 68, 68, 0.25)' : 'rgba(15, 23, 42, 0.4)';
      ctx.fillRect(0, h * 0.4, w, 80);

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, h * 0.4, w, 80);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 20px "Press Start 2P", cursive';
      ctx.textAlign = 'center';
      ctx.fillText('WARNING: BOSS APPROACHING', w * 0.5, h * 0.4 + 48);
    }

    ctx.restore();
  }

  // --- HUD Sync helper ---

  private emitHUD(force = false) {
    if (!this.onHUDUpdate) return;
    const now = performance.now();
    if (!force && now - this.lastHudEmitTime < 80) return; // ~12.5 fps throttle prevents React reconciliation thrashing on mobile
    this.lastHudEmitTime = now;

    this.onHUDUpdate({
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      shieldHp: this.player.shieldHp,
      lives: this.player.lives,
      score: this.score,
      highScore: this.highScore,
      coins: this.coins,
      sessionCoins: this.sessionCoins,
      currentMapId: this.selectedMapId,
      stage: this.currentStageIndex,
      mode: this.mode,
      weaponTier: this.player.weaponTier,
      primaryWeapon: this.player.primaryWeapon,
      secondaryAmmo: this.player.secondaryAmmo,
      selectedSecondary: this.player.selectedSecondary,
      boss: this.boss
        ? {
            active: true,
            name: this.boss.name,
            hp: this.boss.hp,
            maxHp: this.boss.maxHp
          }
        : null,
      combo: this.combo,
      comboMultiplier: this.comboMultiplier,
      comboTimerRatio:
        this.maxComboTimer > 0 ? Math.max(0, Math.min(1, this.comboTimer / this.maxComboTimer)) : 0,
      transitioningSector: this.transitioningSector,
      transitionNextStage: this.transitionNextStage,
      autoFire: this.autoFire,
      touchControlsActive: this.touchControlsActive,
      theme: this.theme,
      safeFitMode: this.safeFitMode
    });
  }
}
