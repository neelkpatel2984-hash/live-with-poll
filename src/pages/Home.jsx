import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ref,
  set,
  get,
} from 'firebase/database';
import { db, roomMetaPath } from '../firebase/config';
import {
  generateRoomCode,
  generateAdminToken,
  MODES,
  adminStorageKey,
  participantNameKey,
} from '../utils/helpers';
import GlassCard from '../components/GlassCard';

export default function Home() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
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

  async function handleJoinRoom(e) {
    e.preventDefault();
    setError('');
    const code = joinCode.replace(/\D/g, '').slice(0, 5);
    const name = joinName.trim();
    if (code.length !== 5) {
      setError('Enter a valid 5-digit room code.');
      return;
    }
    if (!name) {
      setError('Please enter your first name.');
      return;
    }

    setBusy(true);
    try {
      const snap = await get(ref(db, roomMetaPath(code)));
      if (!snap.exists()) {
        setError('Room not found. Check the code with your trainer.');
        return;
      }
      localStorage.setItem(participantNameKey(code), name);
      navigate(`/room/${code}`, { state: { displayName: name } });
    } catch (err) {
      console.error(err);
      setError('Could not join. Check your connection and Firebase config.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="text-center">
        <h1 className="text-balance text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Live polls & forms for your session
        </h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          Trainers host a room; participants join with a code — no accounts
          required.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <GlassCard>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Host a session
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Creates a 5-digit room code and opens your admin dashboard.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={handleCreateSession}
            className="glass-input mt-5 w-full rounded-xl px-4 py-3 text-sm font-semibold text-cyan-900 shadow-sm transition hover:bg-cyan-500/20 disabled:opacity-60 dark:text-cyan-100 dark:hover:bg-cyan-500/15"
          >
            {busy ? 'Creating…' : 'Create room'}
          </button>
        </GlassCard>

        <GlassCard>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Join as participant
          </h2>
          <form className="mt-4 space-y-3" onSubmit={handleJoinRoom}>
            <div>
              <label
                htmlFor="room-code"
                className="block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400"
              >
                Room code
              </label>
              <input
                id="room-code"
                inputMode="numeric"
                maxLength={5}
                autoComplete="off"
                placeholder="e.g. 48291"
                value={joinCode}
                onChange={(ev) => setJoinCode(ev.target.value)}
                className="glass-input mt-1 w-full rounded-xl px-3 py-2.5 text-slate-900 outline-none dark:text-slate-100"
              />
            </div>
            <div>
              <label
                htmlFor="first-name"
                className="block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400"
              >
                First name
              </label>
              <input
                id="first-name"
                maxLength={40}
                autoComplete="given-name"
                placeholder="How you appear in the room"
                value={joinName}
                onChange={(ev) => setJoinName(ev.target.value)}
                className="glass-input mt-1 w-full rounded-xl px-3 py-2.5 text-slate-900 outline-none dark:text-slate-100"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="glass-input w-full rounded-xl bg-violet-500/20 px-4 py-3 text-sm font-semibold text-violet-950 transition hover:bg-violet-500/30 disabled:opacity-60 dark:text-violet-100 dark:hover:bg-violet-500/25"
            >
              {busy ? 'Joining…' : 'Join room'}
            </button>
          </form>
        </GlassCard>
      </div>

      {error ? (
        <p
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-800 dark:text-red-200"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <p className="text-center text-xs text-slate-500 dark:text-slate-500">
        Tip: after hosting, bookmark your admin URL or keep this tab open.{' '}
        <Link to="/" className="text-cyan-700 underline dark:text-cyan-400">
          Refresh home
        </Link>{' '}
        anytime.
      </p>
    </div>
  );
}
