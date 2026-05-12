import { useEffect, useRef, useState } from 'react';
import {
  ref,
  onValue,
  query,
  limitToLast,
  orderByKey,
} from 'firebase/database';
import { db, roomEmojiEventsPath } from '../firebase/config';

/** Longer than longest animation so particles are not culled mid-float */
const TTL_MS = 6500;

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
      {particles.map((p) => {
        const x = Math.min(94, Math.max(6, p.x));
        const duration = 2.8 + (p.id.length % 5) * 0.35;
        const drift = (p.id.length % 7) * 6 - 18;
        return (
          <span
            key={p.id}
            className="pointer-events-none fixed bottom-0 z-[61] text-3xl leading-none sm:text-4xl"
            style={{
              left: `${x}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <span
              className="emoji-fizz inline-block drop-shadow-lg"
              style={{
                animationDuration: `${duration}s`,
                ['--fizz-drift']: `${drift}px`,
              }}
            >
              {p.emoji}
            </span>
          </span>
        );
      })}
    </div>
  );
}
