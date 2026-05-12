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
            className="pointer-events-none fixed bottom-0 z-[61] text-4xl leading-none sm:text-5xl md:text-6xl"
            style={{
              left: `${x}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <span
              className="emoji-fizz inline-block drop-shadow-2xl animate-pulse"
              style={{
                animationDuration: `${duration}s`,
                ['--fizz-drift']: `${drift}px`,
                filter: 'drop-shadow(0 0 20px rgba(255, 100, 100, 0.8)) drop-shadow(0 0 40px rgba(255, 150, 150, 0.4))',
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
