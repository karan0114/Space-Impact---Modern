// Firebase configuration with environment variable fallbacks
// Safe to commit - does not contain raw private secrets
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ai-studio-spaceimpactretro.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ai-studio-spaceimpactretro-5f6038a2-438e-4911-9b76-52c1bbe6dd6f",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ai-studio-spaceimpactretro-5f6038a2-438e-4911-9b76-52c1bbe6dd6f.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "584391716869",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:584391716869:web:5f6038a2438e49119b7652",
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || ""
};

export default firebaseConfig;
