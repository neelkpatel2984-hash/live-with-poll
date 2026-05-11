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
