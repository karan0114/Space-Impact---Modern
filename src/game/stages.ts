import { StageConfig } from './types';

export const CAMPAIGN_STAGES: StageConfig[] = [
  {
    stageNumber: 1,
    title: 'SECTOR 1: ORBITAL DEFENSE',
    subtitle: 'Interception vanguard detected in low Earth orbit',
    backgroundHue: '#050811',
    duration: 38, // seconds before boss arrives
    bossType: 'SQUID_TITAN',
    bossName: 'SQUID TITAN',
    bossHp: 600,
    enemyPool: ['SCOUT', 'DRONE', 'SQUID'],
    spawnInterval: 1.6
  },
  {
    stageNumber: 2,
    title: 'SECTOR 2: MECHA FORTRESS',
    subtitle: 'Breach the automated orbital defense perimeter',
    backgroundHue: '#080d1a',
    duration: 44,
    bossType: 'MECHA_FORTRESS',
    bossName: 'MECHA FORTRESS MK-IV',
    bossHp: 1000,
    enemyPool: ['DRONE', 'INTERCEPTOR', 'TURRET', 'MINE'],
    spawnInterval: 1.4
  },
  {
    stageNumber: 3,
    title: 'SECTOR 3: ASTEROID MINEFIELD',
    subtitle: 'Navigate high-density debris and armed cruiser convoys',
    backgroundHue: '#090910',
    duration: 48,
    bossType: 'CYBER_DREADNOUGHT',
    bossName: 'CYBER DREADNOUGHT',
    bossHp: 1500,
    enemyPool: ['MINE', 'CRUISER', 'SCOUT', 'INTERCEPTOR'],
    spawnInterval: 1.25
  },
  {
    stageNumber: 4,
    title: 'SECTOR 4: BIO-ALIEN NEST',
    subtitle: 'Xenomorphic alien fleet and bone leviathans',
    backgroundHue: '#0f0518',
    duration: 52,
    bossType: 'SKULL_LEVIATHAN',
    bossName: 'SKULL LEVIATHAN',
    bossHp: 2100,
    enemyPool: ['BIO_SERPENT', 'SQUID', 'INTERCEPTOR', 'CRUISER'],
    spawnInterval: 1.15
  },
  {
    stageNumber: 5,
    title: 'SECTOR 5: THE OVERMIND CORE',
    subtitle: 'Final offensive into the heart of the alien motherfleet',
    backgroundHue: '#080210',
    duration: 58,
    bossType: 'OVERMIND_CORE',
    bossName: 'THE ALIEN OVERMIND',
    bossHp: 3000,
    enemyPool: ['CRUISER', 'TURRET', 'BIO_SERPENT', 'MINE', 'INTERCEPTOR'],
    spawnInterval: 1.0
  }
];

export function getStageConfig(stageNumber: number): StageConfig {
  const index = Math.min(Math.max(1, stageNumber), CAMPAIGN_STAGES.length) - 1;
  return CAMPAIGN_STAGES[index];
}
