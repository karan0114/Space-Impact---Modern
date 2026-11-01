import { soundEngine } from './audio/soundEngine';
import { drawBoss, drawEnemy, drawPlayerShip, drawPowerUp, drawProjectile } from './sprites';
import { CAMPAIGN_STAGES, getStageConfig } from './stages';
import {
  Boss,
  Enemy,
  EnemyType,
  FloatingText,
  GameMode,
  GameState,
  GameStats,
  HUDData,
  Particle,
  PlayerState,
  PowerUp,
  PrimaryWeapon,
  Projectile,
  SecondaryWeapon,
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
  public stats: GameStats = {
    score: 0,
    stageReached: 1,
    enemiesKilled: 0,
    shotsFired: 0,
    shotsHit: 0,
    accuracy: 100,
    bossesDefeated: 0,
    playTimeSeconds: 0
  };

  // Entities
  public player: PlayerState;
  public projectiles: Projectile[] = [];
  public enemies: Enemy[] = [];
  public boss: Boss | null = null;
  public powerUps: PowerUp[] = [];
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];

  // Starfield
  private stars: Array<{ x: number; y: number; speed: number; size: number; alpha: number }> = [];

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

  // Callbacks
  public onHUDUpdate?: (hud: HUDData) => void;
  public onStateChange?: (state: GameState, stats?: GameStats) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.stageConfig = getStageConfig(1);

    // Initialize high score & theme from storage
    const savedHighScore = localStorage.getItem('space_impact_highscore');
    if (savedHighScore) {
      this.highScore = parseInt(savedHighScore, 10) || 0;
    }

    const savedTheme = localStorage.getItem('space_impact_theme');
    if (savedTheme === 'SAKURA_PINK' || savedTheme === 'CYBER') {
      this.theme = savedTheme;
    }

    // Default player state
    this.player = this.createDefaultPlayer();

    // Create background stars
    this.initStars();

    // Bind keyboard and touch events
    this.bindEvents();
    this.bindTouchEvents();
  }

  public toggleTheme(): ThemeMode {
    this.theme = this.theme === 'CYBER' ? 'SAKURA_PINK' : 'CYBER';
    localStorage.setItem('space_impact_theme', this.theme);
    soundEngine.menuClick();
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

  private createDefaultPlayer(): PlayerState {
    const w = 48;
    const h = 26;
    return {
      x: 60,
      y: (this.canvas.height || 400) * 0.5 - h * 0.5,
      width: w,
      height: h,
      speed: 340,
      hp: 100,
      maxHp: 100,
      lives: 3,
      weaponTier: 1,
      primaryWeapon: 'SINGLE_BLASTER',
      secondaryAmmo: 3,
      selectedSecondary: 'HOMING_MISSILES',
      invulnerableTime: 2.0,
      shieldHp: 0,
      lastFireTime: 0,
      isShooting: false
    };
  }

  private initStars() {
    this.stars = [];
    const count = 120;
    const w = this.canvas.width || 800;
    const h = this.canvas.height || 450;
    for (let i = 0; i < count; i++) {
      const speed =
        Math.random() < 0.6
          ? 25 + Math.random() * 30
          : Math.random() < 0.9
          ? 70 + Math.random() * 40
          : 140 + Math.random() * 60;
      this.stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        speed,
        size: speed > 100 ? 2 : speed > 50 ? 1.5 : 1,
        alpha: 0.3 + Math.random() * 0.7
      });
    }
  }

  public resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.initStars();
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

      // Clamp within screen bounds
      const margin = 8;
      this.player.x = Math.max(margin, Math.min(this.canvas.width - this.player.width - margin, this.player.x));
      this.player.y = Math.max(margin, Math.min(this.canvas.height - this.player.height - margin, this.player.y));

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
      playTimeSeconds: 0
    };

    this.player = this.createDefaultPlayer();
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

    // 1. Update Player
    this.updatePlayer(dt, timestamp);

    // 2. Update Starfield
    const starSpeedMult = this.transitioningSector ? 6.5 : 1.0;
    for (const star of this.stars) {
      star.x -= star.speed * starSpeedMult * dt;
      if (star.x < 0) {
        star.x = this.canvas.width + 10;
        star.y = Math.random() * this.canvas.height;
      }
    }

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

    // 8. Collisions & Combat
    this.checkCollisions();

    // 9. Particles & Floating Text
    this.updateParticlesAndText(dt);

    // Emit HUD Updates
    this.emitHUD();
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

    const margin = 8;
    p.x = Math.max(margin, Math.min(this.canvas.width - p.width - margin, p.x));
    p.y = Math.max(margin, Math.min(this.canvas.height - p.height - margin, p.y));

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

    if (p.weaponTier === 1) {
      soundEngine.laser();
      this.projectiles.push({
        id: Math.random().toString(),
        x: p.x + p.width,
        y: p.y + p.height * 0.5,
        vx: 750,
        vy: 0,
        radius: 4,
        damage: 28,
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
        damage: 26,
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
        damage: 26,
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
        damage: 28,
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
        damage: 22,
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
        damage: 22,
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
        damage: 42,
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
    this.boss = {
      id: 'boss_' + stage.stageNumber,
      type: stage.bossType,
      name: stage.bossName,
      x: this.canvas.width + 40,
      y: this.canvas.height * 0.5 - 75,
      width: 140,
      height: 150,
      hp: stage.bossHp,
      maxHp: stage.bossHp,
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
    const hp = 800 + this.stats.bossesDefeated * 450;
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

    if (b.x > this.canvas.width - b.width - 30) {
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

  private damagePlayer(amount: number) {
    const p = this.player;
    soundEngine.playerHit();
    this.shakeIntensity = 22;
    this.hitStopTimer = 0.05;
    this.combo = 0;

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
    this.combo++;

    const comboMult = Math.min(3.0, 1.0 + (this.combo - 1) * 0.1);
    const earnedScore = Math.round(e.scoreValue * comboMult);
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
    this.addFloatingText('+' + earnedScore, e.x, e.y, this.theme === 'SAKURA_PINK' ? '#fb7185' : '#f59e0b', 12);

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

      case 'SCORE_GEM':
        this.score += 750;
        this.addFloatingText('+750 BONUS', pu.x, pu.y, isPink ? '#fb7185' : '#ec4899', 16);
        break;
    }
  }

  private handleBossDefeated(b: Boss) {
    this.boss = null;
    this.stats.bossesDefeated++;
    this.score += 5000;
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
      'BOSS DESTROYED! +5000',
      b.x + b.width * 0.5,
      b.y + b.height * 0.5,
      this.theme === 'SAKURA_PINK' ? '#f472b6' : '#10b981',
      26
    );
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

    // Subtle cyber grid
    ctx.strokeStyle = isPink ? 'rgba(244, 114, 182, 0.04)' : 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    const gridSize = 48;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 2. Parallax Starfield & Hyperspace Trails
    if (this.transitioningSector) {
      ctx.strokeStyle = isPink ? 'rgba(244, 114, 182, 0.8)' : 'rgba(34, 211, 238, 0.6)';
      ctx.lineWidth = 2;
      for (const star of this.stars) {
        ctx.beginPath();
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(star.x + star.speed * 0.8, star.y);
        ctx.stroke();
      }
    } else {
      for (const star of this.stars) {
        ctx.fillStyle = isPink
          ? `rgba(254, 205, 211, ${star.alpha})`
          : `rgba(255, 255, 255, ${star.alpha})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      }
    }

    // 3. Power-ups
    for (const pu of this.powerUps) {
      if (pu) drawPowerUp(ctx, pu, timestamp);
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

    // 7. Player Ship
    if (this.state === 'PLAYING' || this.state === 'PAUSED') {
      drawPlayerShip(ctx, this.player, timestamp, this.theme);
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
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (pt.shape === 'SPARK') {
        ctx.strokeStyle = pt.color;
        ctx.lineWidth = pt.size;
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 6;
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
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 6;
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
      ctx.shadowColor = isPink ? '#f43f5e' : '#06b6d4';
      ctx.shadowBlur = 12;
      ctx.font = 'bold 19px "Press Start 2P", cursive';
      ctx.fillText(`MOVING TO NEXT SECTOR${dots}`, w * 0.5, bannerY + 68);
      ctx.shadowBlur = 0;

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
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 10;
      ctx.font = 'bold 20px "Press Start 2P", cursive';
      ctx.textAlign = 'center';
      ctx.fillText('WARNING: BOSS APPROACHING', w * 0.5, h * 0.4 + 48);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  // --- HUD Sync helper ---

  private emitHUD() {
    if (!this.onHUDUpdate) return;
    this.onHUDUpdate({
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      shieldHp: this.player.shieldHp,
      lives: this.player.lives,
      score: this.score,
      highScore: this.highScore,
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
      transitioningSector: this.transitioningSector,
      transitionNextStage: this.transitionNextStage,
      autoFire: this.autoFire,
      touchControlsActive: this.touchControlsActive,
      theme: this.theme
    });
  }
}
