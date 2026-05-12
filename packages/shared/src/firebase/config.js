/**
 * Realtime Database URL helpers. Deploy strict rules from the repo root file
 * `database.rules.json` (Firebase console → Realtime Database → Rules).
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function createFirebaseApp() {
  if (getApps().length) return getApp();
  return initializeApp(firebaseConfig);
}

export const app = createFirebaseApp();
export const db = getDatabase(app);

/** Call before RTDB writes; surfaces missing .env instead of opaque Firebase errors. */
export function assertFirebaseEnv() {
  const url = import.meta.env.VITE_FIREBASE_DATABASE_URL;
  if (!url || !String(url).trim()) {
    throw new Error(
      'Missing VITE_FIREBASE_DATABASE_URL. Add a .env file at the repo root (see .env.example) and restart the dev server.'
    );
  }
}

/** RTDB paths — wipe `rooms/{roomCode}` to clear a session */
export const roomPath = (roomCode) => `rooms/${roomCode}`;
export const roomMetaPath = (roomCode) => `rooms/${roomCode}/meta`;
export const roomQuestionsPath = (roomCode) => `rooms/${roomCode}/questions`;
export const roomQuestionPath = (roomCode, questionId) =>
  `rooms/${roomCode}/questions/${questionId}`;
export const roomResponsesPath = (roomCode) => `rooms/${roomCode}/responses`;
export const roomResponsePath = (roomCode, questionId, participantId) =>
  `rooms/${roomCode}/responses/${questionId}/${participantId}`;
export const roomCommentsPath = (roomCode) => `rooms/${roomCode}/comments`;
export const roomEmojiEventsPath = (roomCode) => `rooms/${roomCode}/emojiEvents`;
/** Append-only feed for admin live feed (query by ts, limitToLast). */
export const roomAnswerFeedPath = (roomCode) => `rooms/${roomCode}/answerFeed`;
/** Participant presence: `rooms/{code}/presence/{participantId}`. */
export const roomPresencePath = (roomCode) => `rooms/${roomCode}/presence`;
/** Host-only bundle path (random key in localStorage). Not read by participant app. */
export const roomHostBundlePath = (roomCode, bundleKey) =>
  `rooms/${roomCode}/_hb/${bundleKey}`;
/** Per-user last emoji ts for rules-friendly rate limiting. */
export const roomEmojiRatePath = (roomCode, participantId) =>
  `rooms/${roomCode}/emojiRate/${participantId}`;
