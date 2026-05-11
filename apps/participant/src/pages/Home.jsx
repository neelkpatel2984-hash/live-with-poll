import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { db, roomMetaPath } from '@shared/firebase/config.js';
import { participantNameKey } from '@shared/utils/helpers.js';
import GlassCard from '@shared/components/GlassCard.jsx';

const HOST_APP_URL = (import.meta.env.VITE_HOST_APP_URL || '').replace(/\/$/, '');

export default function Home() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleJoinRoom(e) {
    e.preventDefault();
    setError('');
    const code = joinCode.replace(/\D/g, '').slice(0, 5);
    const name = joinName.trim();
    if (code.length !== 5) {
      setError('Enter a valid 5-digit room PIN.');
      return;
    }
    if (!name) {
      setError('Please enter your name.');
      return;
    }

    setBusy(true);
    try {
      const snap = await get(ref(db, roomMetaPath(code)));
      if (!snap.exists()) {
        setError('Room not found. Check the PIN with your host.');
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
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
      <div className="text-center">
        <h1 className="text-balance text-3xl font-bold tracking-tight text-neutral-50 sm:text-4xl">
          Live with Poll
        </h1>
        <p className="mt-3 text-neutral-400">
          Enter the room PIN and your name — no accounts, no long sign-up.
        </p>
      </div>

      <GlassCard>
        <h2 className="text-lg font-semibold text-neutral-50">Join as participant</h2>
        <form className="mt-4 space-y-3" onSubmit={handleJoinRoom}>
          <div>
            <label
              htmlFor="room-code"
              className="block text-xs font-medium uppercase tracking-wide text-neutral-500"
            >
              Room PIN
            </label>
            <input
              id="room-code"
              inputMode="numeric"
              maxLength={5}
              autoComplete="off"
              placeholder="e.g. 48291"
              value={joinCode}
              onChange={(ev) => setJoinCode(ev.target.value)}
              className="glass-input mt-1 w-full rounded-xl px-3 py-2.5 text-neutral-50 outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="display-name"
              className="block text-xs font-medium uppercase tracking-wide text-neutral-500"
            >
              Your name
            </label>
            <input
              id="display-name"
              maxLength={40}
              autoComplete="name"
              placeholder="How you appear in the room"
              value={joinName}
              onChange={(ev) => setJoinName(ev.target.value)}
              className="glass-input mt-1 w-full rounded-xl px-3 py-2.5 text-neutral-50 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="glass-input w-full rounded-xl border border-red-500/35 bg-red-950/40 px-4 py-3 text-sm font-semibold text-red-50 transition hover:bg-red-900/50 disabled:opacity-60"
          >
            {busy ? 'Joining…' : 'Join room'}
          </button>
        </form>
      </GlassCard>

      {error ? (
        <p
          className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-center text-sm text-red-100"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {HOST_APP_URL ? (
        <p className="text-center text-sm text-neutral-500">
          Hosting?{' '}
          <a href={HOST_APP_URL} className="font-semibold text-red-300 underline">
            Open host console
          </a>
        </p>
      ) : (
        <p className="text-center text-sm text-neutral-500">
          Participants only — hosts use the separate host deployment.
        </p>
      )}
    </div>
  );
}
