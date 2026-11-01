export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'STAGE_CLEAR' | 'GAME_OVER' | 'VICTORY';

export type GameMode = 'CAMPAIGN' | 'ENDLESS';

export type PrimaryWeapon = 'SINGLE_BLASTER' | 'TWIN_BLASTER' | 'SPREAD_VULCAN' | 'PLASMA_BEAM';

export type SecondaryWeapon = 'HOMING_MISSILES' | 'SCREEN_NUKE';

export type PowerUpType = 'WEAPON_UPGRADE' | 'SECONDARY_AMMO' | 'SHIELD' | 'LIFE' | 'SCORE_GEM';

export type EnemyType =
  | 'SCOUT'
  | 'DRONE'
  | 'SQUID'
  | 'MINE'
  | 'INTERCEPTOR'
  | 'CRUISER'
  | 'BIO_SERPENT'
  | 'TURRET';

export type BossType =
  | 'SQUID_TITAN'
  | 'MECHA_FORTRESS'
  | 'CYBER_DREADNOUGHT'
  | 'SKULL_LEVIATHAN'
  | 'OVERMIND_CORE';

export interface PlayerState {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  hp: number;
  maxHp: number;
  lives: number;
  weaponTier: number; // 1 to 4
  primaryWeapon: PrimaryWeapon;
  secondaryAmmo: number; // Count of secondary weapons available
  selectedSecondary: SecondaryWeapon;
  invulnerableTime: number; // seconds remaining
  shieldHp: number;
  lastFireTime: number;
  isShooting: boolean;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  isPlayer: boolean;
  type: 'BULLET' | 'PLASMA' | 'LASER_BEAM' | 'MISSILE' | 'ENEMY_BULLET' | 'ENEMY_PLASMA' | 'BOSS_BEAM';
  targetId?: string; // For homing missiles
  lifeTime: number;
  color?: string;
  penetrating?: boolean;
}

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  scoreValue: number;
  pattern: 'STRAIGHT' | 'SINE' | 'ZIGZAG' | 'DIVE' | 'FLOAT_SHOOT' | 'SERPENT';
  age: number;
  lastShootTime: number;
  shootInterval: number;
  hitFlashTime: number;
  phaseOffset?: number;
  color?: string;
}

export interface Boss {
  id: string;
  type: BossType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  phase: number;
  age: number;
  attackTimer: number;
  hitFlashTime: number;
  shieldActive: boolean;
  targetY: number;
}

export interface PowerUp {
  id: string;
  type: PowerUpType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  age: number;
}

export type ThemeMode = 'CYBER' | 'SAKURA_PINK';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  shape?: 'CIRCLE' | 'SQUARE' | 'SPARK' | 'RING' | 'DEBRIS';
  rotation?: number;
  vRot?: number;
  ringRadius?: number;
  ringSpeed?: number;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  fontSize: number;
}

export interface StageConfig {
  stageNumber: number;
  title: string;
  subtitle: string;
  backgroundHue: string;
  duration: number; // Approximate wave duration before boss
  bossType: BossType;
  bossName: string;
  bossHp: number;
  enemyPool: EnemyType[];
  spawnInterval: number;
}

export interface HUDData {
  hp: number;
  maxHp: number;
  shieldHp: number;
  lives: number;
  score: number;
  highScore: number;
  stage: number;
  mode: GameMode;
  weaponTier: number;
  primaryWeapon: PrimaryWeapon;
  secondaryAmmo: number;
  selectedSecondary: SecondaryWeapon;
  boss: {
    active: boolean;
    name: string;
    hp: number;
    maxHp: number;
  } | null;
  combo: number;
  transitioningSector: boolean;
  transitionNextStage?: number;
  autoFire: boolean;
  touchControlsActive: boolean;
  theme: ThemeMode;
}

export interface GameStats {
  score: number;
  stageReached: number;
  enemiesKilled: number;
  shotsFired: number;
  shotsHit: number;
  accuracy: number;
  bossesDefeated: number;
  playTimeSeconds: number;
}
