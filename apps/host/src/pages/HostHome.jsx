import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, set, get } from 'firebase/database';
import { db, roomMetaPath } from '@shared/firebase/config.js';
import {
  generateRoomCode,
  generateAdminToken,
  MODES,
  adminStorageKey,
  RESPONSE_PRIVACY,
  QUIZ_PHASE,
} from '@shared/utils/helpers.js';
import { DEFAULT_MUSIC_TRACK_ID, DEFAULT_MUSIC_VOLUME } from '@shared/constants/musicTracks.js';
import GlassCard from '@shared/components/GlassCard.jsx';

export default function HostHome() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleCreateSession() {
    setError('');
    setBusy(true);
    try {
      let code = generateRoomCode();
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const snap = await get(ref(db, roomMetaPath(code)));
        if (!snap.exists()) break;
        code = generateRoomCode();
      }

      const adminToken = generateAdminToken();
      await set(ref(db, roomMetaPath(code)), {
        adminToken,
        mode: MODES.LIVE_POLL,
        activeQuestionId: null,
        createdAt: Date.now(),
        responsePrivacy: RESPONSE_PRIVACY.PUBLIC,
        sessionStatus: 'live',
        musicTrackId: DEFAULT_MUSIC_TRACK_ID,
        musicVolume: DEFAULT_MUSIC_VOLUME,
        quizPhase: QUIZ_PHASE.IDLE,
        quizActiveQuestionId: null,
        quizOpenedAt: null,
      });

      localStorage.setItem(adminStorageKey(code), adminToken);
      navigate(`/admin/${code}`);
    } catch (e) {
      console.error(e);
      setError('Could not create session. Check Firebase configuration.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <GlassCard>
        <h1 className="text-2xl font-bold text-neutral-50">Live with Poll — Host</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Create a room to get a 5-digit PIN. Participants use the main site — not
          this console — to join.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={handleCreateSession}
          className="glass-input mt-6 w-full rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-900/40 disabled:opacity-60"
        >
          {busy ? 'Creating…' : 'Create new room'}
        </button>
      </GlassCard>
      {error ? (
        <p
          className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-center text-sm text-red-100"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
