import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ref, set, get } from 'firebase/database';
import { db, roomMetaPath, roomPath } from '@shared/firebase/config.js';
import {
  generateRoomCode,
  generateAdminToken,
  generateId,
  MODES,
  writeHostCredential,
  RESPONSE_PRIVACY,
  COMMENT_PRIVACY,
  QUIZ_PHASE,
  trackHostRoom,
} from '@shared/utils/helpers.js';
import { DEFAULT_MUSIC_TRACK_ID, DEFAULT_MUSIC_VOLUME } from '@shared/constants/musicTracks.js';
import GlassCard from '@shared/components/GlassCard.jsx';

const DEFAULT_QUIZ_ID = 'default';

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
      const bundleKey = generateId('hb');

      await set(ref(db, roomPath(code)), {
        meta: {
          mode: MODES.LIVE_POLL,
          activeQuestionId: null,
          createdAt: Date.now(),
          responsePrivacy: RESPONSE_PRIVACY.PUBLIC,
          commentPrivacy: COMMENT_PRIVACY.PUBLIC,
          commentsHidden: false,
          sessionStatus: 'live',
          musicTrackId: DEFAULT_MUSIC_TRACK_ID,
          musicVolume: DEFAULT_MUSIC_VOLUME,
          quizPhase: QUIZ_PHASE.IDLE,
          quizActiveQuestionId: null,
          quizOpenedAt: null,
          quizFullMode: false,
          activeQuizId: DEFAULT_QUIZ_ID,
          quizzes: {
            [DEFAULT_QUIZ_ID]: { title: 'Quiz 1', order: 0 },
          },
        },
        _hb: {
          [bundleKey]: { adminToken },
        },
      });

      writeHostCredential(code, adminToken, bundleKey);
      trackHostRoom(code);
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
          Create a room to get a 5-digit PIN. Participants use the main site — not this console — to
          join.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={busy}
            onClick={handleCreateSession}
            className="glass-input w-full rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-900/40 disabled:opacity-60 sm:flex-1"
          >
            {busy ? 'Creating…' : 'Create new room'}
          </button>
          <Link
            to="/rooms"
            className="glass-input w-full rounded-xl px-4 py-3 text-center text-sm font-semibold text-neutral-100 no-underline sm:flex-1"
          >
            My rooms
          </Link>
        </div>
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
