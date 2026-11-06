import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocFromServer
} from 'firebase/firestore';
import rawConfig from '../../firebase-applet-config.json';
import { ShipUpgrades, DailyMission } from './types';
import { saveShipUpgrades, savePlayerCoins, getPlayerCoins, getShipUpgrades } from './upgrades';
import { getDailyMissions, saveDailyMissions } from './dailyMissions';

// Resolve Firebase configuration dynamically from environment or local config
const resolvedConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (rawConfig as any).apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (rawConfig as any).authDomain || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || (rawConfig as any).projectId || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || (rawConfig as any).storageBucket || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || (rawConfig as any).messagingSenderId || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || (rawConfig as any).appId || '',
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || (rawConfig as any).firestoreDatabaseId || ''
};

export const isFirebaseConfigured = Boolean(
  resolvedConfig.apiKey &&
  resolvedConfig.apiKey.length > 5 &&
  resolvedConfig.apiKey.startsWith('AIzaSy')
);

// Initialize Firebase App & Services safely
let appInstance: any = null;
let authInstance: any = null;
let dbInstance: any = null;

if (isFirebaseConfigured) {
  try {
    appInstance = initializeApp(resolvedConfig);
    authInstance = getAuth(appInstance);
    const dbId = resolvedConfig.firestoreDatabaseId;
    dbInstance = dbId && dbId !== '(default)'
      ? getFirestore(appInstance, dbId)
      : getFirestore(appInstance);
  } catch (err) {
    console.warn('Firebase services initialization warning:', err);
  }
}

export const app = appInstance;
export const auth = authInstance;
export const db = dbInstance;

// Providers
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope('email');
facebookProvider.addScope('public_profile');

export interface PlayerUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  providerId: string;
}

export interface PlayerProgressData {
  highScore: number;
  coins: number;
  upgrades: ShipUpgrades;
  dailyMissions: DailyMission[];
  lastPlayedMap?: string;
  updatedAt: string;
}

// Startup connection verification
export async function testFirestoreConnection(): Promise<boolean> {
  if (!db) return false;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client offline status detected. Ensure network connection.');
    }
    // Test doc might not exist, but network reachability is verified if error is not offline
    return true;
  }
}

// Initial fire-and-forget verification
testFirestoreConnection().catch(() => {});

// Auth Helpers
export async function signInWithGoogle(): Promise<{ user: PlayerUser | null; error?: string }> {
  if (!auth) {
    return { user: null, error: 'Firebase Auth is not available. Please check configuration.' };
  }
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    return {
      user: {
        uid: cred.user.uid,
        displayName: cred.user.displayName || 'Space Ace',
        email: cred.user.email,
        photoURL: cred.user.photoURL,
        providerId: 'google.com'
      }
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Google sign-in failed';
    return { user: null, error: message };
  }
}

export async function signInWithFacebook(): Promise<{ user: PlayerUser | null; error?: string }> {
  if (!auth) {
    return { user: null, error: 'Firebase Auth is not available. Please check configuration.' };
  }
  try {
    const cred = await signInWithPopup(auth, facebookProvider);
    return {
      user: {
        uid: cred.user.uid,
        displayName: cred.user.displayName || 'Vanguard Pilot',
        email: cred.user.email,
        photoURL: cred.user.photoURL,
        providerId: 'facebook.com'
      }
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Facebook sign-in failed';
    return { user: null, error: message };
  }
}

export async function signOutPlayer(): Promise<void> {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Error signing out:', err);
  }
}

export function subscribeToAuth(callback: (user: PlayerUser | null) => void): () => void {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      callback({
        uid: user.uid,
        displayName: user.displayName || 'Cosmic Pilot',
        email: user.email,
        photoURL: user.photoURL,
        providerId: user.providerData?.[0]?.providerId || 'password'
      });
    } else {
      callback(null);
    }
  });
}

// Cloud Data Sync Logic: Merges Local & Cloud intelligently
export async function syncPlayerDataWithCloud(
  user: PlayerUser,
  lastSelectedMap?: string
): Promise<{
  coins: number;
  highScore: number;
  upgrades: ShipUpgrades;
  missions: DailyMission[];
}> {
  if (!db) {
    return {
      coins: getPlayerCoins(),
      highScore: parseInt(localStorage.getItem('space_impact_highscore') || '0', 10) || 0,
      upgrades: getShipUpgrades(),
      missions: getDailyMissions()
    };
  }
  const userDocRef = doc(db, 'users', user.uid);
  
  // 1. Read local state
  const localCoins = getPlayerCoins();
  const localUpgrades = getShipUpgrades();
  const localMissions = getDailyMissions();
  const localHighScore = parseInt(localStorage.getItem('space_impact_highscore') || '0', 10) || 0;

  try {
    const snapshot = await getDoc(userDocRef);
    let finalCoins = localCoins;
    let finalHighScore = localHighScore;
    let finalUpgrades = { ...localUpgrades };
    let finalMissions = [...localMissions];

    if (snapshot.exists()) {
      const cloudData = snapshot.data() as Partial<PlayerProgressData>;
      
      // Coins: Preserve highest or merge balance safely
      if (typeof cloudData.coins === 'number') {
        finalCoins = Math.max(localCoins, cloudData.coins);
      }
      
      // High Score: Preserve highest personal best
      if (typeof cloudData.highScore === 'number') {
        finalHighScore = Math.max(localHighScore, cloudData.highScore);
      }

      // Upgrades: Merge highest tiers unlocked
      if (cloudData.upgrades) {
        finalUpgrades = {
          blasterPower: Math.max(localUpgrades.blasterPower, cloudData.upgrades.blasterPower || 0),
          reinforcedHull: Math.max(localUpgrades.reinforcedHull, cloudData.upgrades.reinforcedHull || 0),
          shieldGenerator: Math.max(localUpgrades.shieldGenerator, cloudData.upgrades.shieldGenerator || 0),
          magnetTurbine: Math.max(localUpgrades.magnetTurbine, cloudData.upgrades.magnetTurbine || 0),
          hyperThrusters: Math.max(localUpgrades.hyperThrusters, cloudData.upgrades.hyperThrusters || 0)
        };
      }

      // Daily missions: Merge claim status if matching current day
      if (Array.isArray(cloudData.dailyMissions) && cloudData.dailyMissions.length > 0) {
        const cloudMissionsMap = new Map(cloudData.dailyMissions.map((m) => [m.id, m]));
        finalMissions = localMissions.map((loc) => {
          const c = cloudMissionsMap.get(loc.id);
          if (!c) return loc;
          return {
            ...loc,
            current: Math.max(loc.current, c.current || 0),
            claimed: loc.claimed || Boolean(c.claimed)
          };
        });
      }
    }

    // 2. Persist merged values to Local Storage
    savePlayerCoins(finalCoins);
    localStorage.setItem('space_impact_highscore', String(finalHighScore));
    saveShipUpgrades(finalUpgrades);
    saveDailyMissions(finalMissions);

    // 3. Write merged profile back to Firestore
    const payload: PlayerProgressData = {
      highScore: finalHighScore,
      coins: finalCoins,
      upgrades: finalUpgrades,
      dailyMissions: finalMissions,
      lastPlayedMap: lastSelectedMap || 'NEBULA_STATION',
      updatedAt: new Date().toISOString()
    };

    await setDoc(userDocRef, {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      providerId: user.providerId,
      ...payload
    }, { merge: true });

    return {
      coins: finalCoins,
      highScore: finalHighScore,
      upgrades: finalUpgrades,
      missions: finalMissions
    };
  } catch (err) {
    console.error('Failed to sync data with cloud:', err);
    return {
      coins: localCoins,
      highScore: localHighScore,
      upgrades: localUpgrades,
      missions: localMissions
    };
  }
}

// Background fire-and-forget save to Firestore after matches or upgrades
export async function pushLocalDataToCloud(
  user: PlayerUser,
  lastSelectedMap?: string
): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const coins = getPlayerCoins();
    const upgrades = getShipUpgrades();
    const missions = getDailyMissions();
    const highScore = parseInt(localStorage.getItem('space_impact_highscore') || '0', 10) || 0;

    await setDoc(
      userDocRef,
      {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        highScore,
        coins,
        upgrades,
        dailyMissions: missions,
        lastPlayedMap: lastSelectedMap || 'NEBULA_STATION',
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed background save to Firestore:', err);
  }
}
