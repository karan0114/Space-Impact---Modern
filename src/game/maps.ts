import { MapConfig, MapId } from './types';

// Real generated high-resolution 16:9 space backgrounds
import easyBgUrl from '../assets/images/bg_easy_nebula_station_1793768357157.jpg';
import mediumBgUrl from '../assets/images/bg_medium_toxic_belt_1793768370742.jpg';
import hardBgUrl from '../assets/images/bg_hard_singularity_1793768384137.jpg';

export const GAME_MAPS: Record<MapId, MapConfig> = {
  NEBULA_STATION: {
    id: 'NEBULA_STATION',
    name: 'NEBULA STATION',
    subtitle: 'CELESTIAL REFUGE',
    difficulty: 'EASY',
    description:
      'Deep navy space with glowing blue-violet nebulae, distant starfields, and floating metallic space station debris. Ideal for combat calibration.',
    multiplier: 1.0,
    imageUrl: easyBgUrl,
    themeColor: '#0ea5e9',
    accentColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.45)',
    enemySpeedMod: 0.95,
    enemyHpMod: 0.95,
    coinDropRate: 0.45
  },
  TOXIC_BELT: {
    id: 'TOXIC_BELT',
    name: 'TOXIC ASTEROID BELT',
    subtitle: 'RADIOACTIVE HAZARD',
    difficulty: 'MEDIUM',
    description:
      'Dark green radioactive asteroid belt with a glowing toxic nebula, broken alien spacecraft hulls, and dense orbital debris fields.',
    multiplier: 1.5,
    imageUrl: mediumBgUrl,
    themeColor: '#10b981',
    accentColor: '#34d399',
    glowColor: 'rgba(52, 211, 153, 0.45)',
    enemySpeedMod: 1.15,
    enemyHpMod: 1.15,
    coinDropRate: 0.6
  },
  SINGULARITY_ABYSS: {
    id: 'SINGULARITY_ABYSS',
    name: 'SINGULARITY ABYSS',
    subtitle: 'BLACK HOLE VOID',
    difficulty: 'HARD',
    description:
      'Deep cosmic void orbiting an enormous black hole with magenta gravitational distortions, intense radiation, and extreme hostile swarms.',
    multiplier: 2.0,
    imageUrl: hardBgUrl,
    themeColor: '#d946ef',
    accentColor: '#f43f5e',
    glowColor: 'rgba(217, 70, 239, 0.5)',
    enemySpeedMod: 1.3,
    enemyHpMod: 1.25,
    coinDropRate: 0.8
  }
};

export const MAP_ORDER: MapId[] = ['NEBULA_STATION', 'TOXIC_BELT', 'SINGULARITY_ABYSS'];

export function getMapConfig(mapId: MapId): MapConfig {
  return GAME_MAPS[mapId] || GAME_MAPS.NEBULA_STATION;
}
