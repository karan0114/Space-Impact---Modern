import { DailyMission, MissionCategory } from './types';
import { addPlayerCoins } from './upgrades';

const DAILY_STORAGE_KEY = 'space_impact_daily_missions';

const DEFAULT_MISSIONS_TEMPLATE: Omit<DailyMission, 'current' | 'claimed'>[] = [
  {
    id: 'm_coins_40',
    title: 'VOID SCAVENGER',
    description: 'Gather 40 floating Gold Coins across combat sectors',
    target: 40,
    rewardCoins: 250,
    category: 'COINS'
  },
  {
    id: 'm_kills_30',
    title: 'SWARM EXTERMINATOR',
    description: 'Obliterate 30 hostile invaders in any sector',
    target: 30,
    rewardCoins: 300,
    category: 'KILLS'
  },
  {
    id: 'm_combo_8',
    title: 'LASER VIRTUOSO',
    description: 'Achieve an unbroken 8x combat combo multiplier',
    target: 8,
    rewardCoins: 220,
    category: 'COMBO'
  },
  {
    id: 'm_boss_1',
    title: 'TITAN SLAYER',
    description: 'Defeat any Sector Boss in Campaign or Endless mode',
    target: 1,
    rewardCoins: 450,
    category: 'BOSS'
  },
  {
    id: 'm_sorties_2',
    title: 'COMBAT CADET',
    description: 'Launch and deploy on at least 2 combat missions today',
    target: 2,
    rewardCoins: 200,
    category: 'SORTIES'
  }
];

interface StoredMissionsData {
  date: string;
  missions: DailyMission[];
}

function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function getDailyMissions(): DailyMission[] {
  if (typeof window === 'undefined') {
    return DEFAULT_MISSIONS_TEMPLATE.map((m) => ({ ...m, current: 0, claimed: false }));
  }

  const today = getTodayDateString();

  try {
    const raw = localStorage.getItem(DAILY_STORAGE_KEY);
    if (raw) {
      const data: StoredMissionsData = JSON.parse(raw);
      if (data.date === today && Array.isArray(data.missions) && data.missions.length > 0) {
        return data.missions;
      }
    }
  } catch {
    // Fall back to generating new
  }

  // Generate fresh missions for today
  const freshMissions: DailyMission[] = DEFAULT_MISSIONS_TEMPLATE.map((m) => ({
    ...m,
    current: 0,
    claimed: false
  }));

  saveDailyMissions(freshMissions);
  return freshMissions;
}

export function saveDailyMissions(missions: DailyMission[]): void {
  if (typeof window === 'undefined') return;
  const payload: StoredMissionsData = {
    date: getTodayDateString(),
    missions
  };
  localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(payload));
}

export function recordMissionProgress(category: MissionCategory, amount: number): {
  updated: boolean;
  completedNow: DailyMission[];
} {
  const missions = getDailyMissions();
  let updated = false;
  const completedNow: DailyMission[] = [];

  for (const mission of missions) {
    if (mission.claimed) continue;
    if (mission.category === category) {
      const wasComplete = mission.current >= mission.target;
      if (category === 'COMBO') {
        mission.current = Math.max(mission.current, Math.floor(amount));
      } else {
        mission.current = Math.min(mission.target, mission.current + Math.floor(amount));
      }
      updated = true;
      if (!wasComplete && mission.current >= mission.target) {
        completedNow.push(mission);
      }
    }
  }

  if (updated) {
    saveDailyMissions(missions);
  }

  return { updated, completedNow };
}

export function claimDailyMissionReward(missionId: string): { success: boolean; reward: number; totalCoins: number } {
  const missions = getDailyMissions();
  const mission = missions.find((m) => m.id === missionId);

  if (!mission || mission.claimed || mission.current < mission.target) {
    return { success: false, reward: 0, totalCoins: 0 };
  }

  mission.claimed = true;
  saveDailyMissions(missions);

  const totalCoins = addPlayerCoins(mission.rewardCoins);

  return { success: true, reward: mission.rewardCoins, totalCoins };
}

export function hasClaimableMissions(): boolean {
  const missions = getDailyMissions();
  return missions.some((m) => !m.claimed && m.current >= m.target);
}
