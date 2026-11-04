import { ShipUpgradeKey, ShipUpgrades, UpgradeTierInfo } from './types';

export const MAX_UPGRADE_TIER = 5;

export const UPGRADE_DEFINITIONS: Record<
  ShipUpgradeKey,
  {
    name: string;
    description: string;
    icon: string;
    tiers: UpgradeTierInfo[];
  }
> = {
  blasterPower: {
    name: 'PLASMA CANNON',
    description: 'Increases blaster destructive output, penetration and projectile velocity.',
    icon: 'Zap',
    tiers: [
      { tier: 1, cost: 80, title: 'OVERCHARGED COILS', bonusDesc: '+20% Damage & Faster Velocity' },
      { tier: 2, cost: 200, title: 'DUAL FOCUS CRYSTALS', bonusDesc: '+40% Damage & Tighter Stream' },
      { tier: 3, cost: 450, title: 'QUANTUM ACCELERATOR', bonusDesc: '+65% Damage & Pierce Chance' },
      { tier: 4, cost: 900, title: 'TACHYON CONDENSER', bonusDesc: '+90% Damage & Rapid Recoil' },
      { tier: 5, cost: 1800, title: 'HYPER-MATTER BLASTER', bonusDesc: '+120% Damage & Screen Obliteration' }
    ]
  },
  reinforcedHull: {
    name: 'NANITE HULL ARMOR',
    description: 'Upgrades spacecraft titanium plating, boosting Maximum Hull HP and defense.',
    icon: 'Shield',
    tiers: [
      { tier: 1, cost: 70, title: 'COMPOSITE PLATING', bonusDesc: 'Max HP: 120 (+5% Defense)' },
      { tier: 2, cost: 180, title: 'ABLATIVE ALLOY', bonusDesc: 'Max HP: 145 (+10% Defense)' },
      { tier: 3, cost: 400, title: 'REACTIVE MATRIX', bonusDesc: 'Max HP: 170 (+15% Defense)' },
      { tier: 4, cost: 850, title: 'CARBON NANO-MESH', bonusDesc: 'Max HP: 200 (+20% Defense)' },
      { tier: 5, cost: 1700, title: 'DREADNOUGHT BULWARK', bonusDesc: 'Max HP: 240 (+25% Defense)' }
    ]
  },
  shieldGenerator: {
    name: 'KINETIC DEFLECTOR',
    description: 'Installs energy deflector barriers that auto-recharge after avoiding damage.',
    icon: 'Radio',
    tiers: [
      { tier: 1, cost: 100, title: 'IONIC DEFLECTOR I', bonusDesc: '30 Energy Shield (Recharges after 4.5s)' },
      { tier: 2, cost: 250, title: 'IONIC DEFLECTOR II', bonusDesc: '55 Energy Shield (Recharges after 4.0s)' },
      { tier: 3, cost: 550, title: 'PHASE BARRIER', bonusDesc: '80 Energy Shield (Recharges after 3.5s)' },
      { tier: 4, cost: 1100, title: 'PRISMATIC AEGIS', bonusDesc: '110 Energy Shield (Recharges after 3.0s)' },
      { tier: 5, cost: 2200, title: 'SINGULARITY SHIELD', bonusDesc: '150 Energy Shield (Recharges after 2.5s)' }
    ]
  },
  magnetTurbine: {
    name: 'GRAVITON MAGNET',
    description: 'Generates a tractor vortex that automatically pulls floating gold coins and power-ups.',
    icon: 'Magnet',
    tiers: [
      { tier: 1, cost: 60, title: 'FLUX TRACTOR I', bonusDesc: 'Pull Radius: 100px' },
      { tier: 2, cost: 160, title: 'FLUX TRACTOR II', bonusDesc: 'Pull Radius: 160px' },
      { tier: 3, cost: 380, title: 'GRAVITATIONAL SIPHON', bonusDesc: 'Pull Radius: 230px' },
      { tier: 4, cost: 800, title: 'WARP VORTEX', bonusDesc: 'Pull Radius: 310px' },
      { tier: 5, cost: 1600, title: 'BLACK HOLE SCOOP', bonusDesc: 'Pull Radius: 420px (Full Screen Reach)' }
    ]
  },
  hyperThrusters: {
    name: 'ION AFTERBURNERS',
    description: 'Enhances sub-light thruster impulse, giving faster flight agility and evasive dodge speed.',
    icon: 'Gauge',
    tiers: [
      { tier: 1, cost: 50, title: 'AFTERBURNER MK-1', bonusDesc: '+10% Speed & Smooth Gliding' },
      { tier: 2, cost: 140, title: 'AFTERBURNER MK-2', bonusDesc: '+20% Speed & Evasion' },
      { tier: 3, cost: 320, title: 'WARP VECTORING', bonusDesc: '+32% Speed & Instant Acceleration' },
      { tier: 4, cost: 700, title: 'ANTIMATTER JETS', bonusDesc: '+45% Speed & Fluid Control' },
      { tier: 5, cost: 1400, title: 'LIGHT-SPEED DRIVE', bonusDesc: '+60% Speed & Master Pilot Agility' }
    ]
  }
};

const UPGRADES_STORAGE_KEY = 'space_impact_ship_upgrades';
const COINS_STORAGE_KEY = 'space_impact_coins';

export function getPlayerCoins(): number {
  if (typeof window === 'undefined') return 0;
  const saved = localStorage.getItem(COINS_STORAGE_KEY);
  if (!saved) return 150; // Welcome pilot starting bonus
  const num = parseInt(saved, 10);
  return isNaN(num) ? 150 : num;
}

export function savePlayerCoins(coins: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(COINS_STORAGE_KEY, String(Math.max(0, Math.floor(coins))));
}

export function addPlayerCoins(amount: number): number {
  const current = getPlayerCoins();
  const next = current + Math.max(0, Math.floor(amount));
  savePlayerCoins(next);
  return next;
}

export function getShipUpgrades(): ShipUpgrades {
  const defaults: ShipUpgrades = {
    blasterPower: 0,
    reinforcedHull: 0,
    shieldGenerator: 0,
    magnetTurbine: 0,
    hyperThrusters: 0
  };

  if (typeof window === 'undefined') return defaults;

  try {
    const raw = localStorage.getItem(UPGRADES_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      blasterPower: Math.min(MAX_UPGRADE_TIER, Math.max(0, parsed.blasterPower || 0)),
      reinforcedHull: Math.min(MAX_UPGRADE_TIER, Math.max(0, parsed.reinforcedHull || 0)),
      shieldGenerator: Math.min(MAX_UPGRADE_TIER, Math.max(0, parsed.shieldGenerator || 0)),
      magnetTurbine: Math.min(MAX_UPGRADE_TIER, Math.max(0, parsed.magnetTurbine || 0)),
      hyperThrusters: Math.min(MAX_UPGRADE_TIER, Math.max(0, parsed.hyperThrusters || 0))
    };
  } catch {
    return defaults;
  }
}

export function saveShipUpgrades(upgrades: ShipUpgrades): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(UPGRADES_STORAGE_KEY, JSON.stringify(upgrades));
}

export function buyShipUpgrade(key: ShipUpgradeKey): { success: boolean; newTier: number; remainingCoins: number } {
  const currentUpgrades = getShipUpgrades();
  const currentTier = currentUpgrades[key] || 0;
  if (currentTier >= MAX_UPGRADE_TIER) {
    return { success: false, newTier: currentTier, remainingCoins: getPlayerCoins() };
  }

  const nextTierInfo = UPGRADE_DEFINITIONS[key].tiers[currentTier];
  const userCoins = getPlayerCoins();

  if (userCoins < nextTierInfo.cost) {
    return { success: false, newTier: currentTier, remainingCoins: userCoins };
  }

  const nextCoins = userCoins - nextTierInfo.cost;
  savePlayerCoins(nextCoins);

  currentUpgrades[key] = currentTier + 1;
  saveShipUpgrades(currentUpgrades);

  return { success: true, newTier: currentTier + 1, remainingCoins: nextCoins };
}
