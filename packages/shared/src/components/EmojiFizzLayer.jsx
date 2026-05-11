import { useEffect, useRef, useState } from 'react';
import {
  ref,
  onValue,
  query,
  limitToLast,
  orderByKey,
} from 'firebase/database';
import { db, roomEmojiEventsPath } from '../firebase/config';

const TTL_MS = 4200;

export default function EmojiFizzLayer({ roomCode, enabled }) {
  const [particles, setParticles] = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!roomCode || !enabled) return undefined;
    const base = ref(db, roomEmojiEventsPath(roomCode));
    const q = query(base, orderByKey(), limitToLast(40));
    return onValue(q, (snap) => {
      const val = snap.val() || {};
      const now = Date.now();
      const next = Object.entries(val).map(([id, row]) => ({
        id,
        emoji: row.emoji,
        x: typeof row.x === 'number' ? row.x : Math.random() * 100,
        ts: row.ts || now,
      }));
      setParticles(next.filter((p) => now - p.ts < TTL_MS));
    });
  }, [roomCode, enabled]);

  useEffect(() => {
    if (!roomCode) return undefined;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!enabled) return undefined;
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      setParticles((prev) => prev.filter((p) => now - p.ts < TTL_MS));
    }, 400);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [roomCode, enabled]);

  if (!enabled) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
      aria-hidden
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className="emoji-fizz absolute bottom-0 text-3xl sm:text-4xl drop-shadow-lg"
          style={{
            left: `${p.x}%`,
            animationDuration: `${3 + (p.id.length % 3) * 0.2}s`,
            ['--fizz-drift']: `${(p.id.length % 5) * 8 - 16}px`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
