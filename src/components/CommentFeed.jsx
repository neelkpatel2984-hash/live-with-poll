import { useMemo } from 'react';
import { ref, remove } from 'firebase/database';
import { db, roomCommentsPath } from '../firebase/config';

export default function CommentFeed({ roomCode, comments, isAdmin }) {
  const sorted = useMemo(() => {
    const entries = Object.entries(comments || {}).map(([id, c]) => ({
      id,
      ...c,
    }));
    entries.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return entries;
  }, [comments]);

  async function handleDelete(commentId) {
    if (!isAdmin || !commentId) return;
    await remove(ref(db, `${roomCommentsPath(roomCode)}/${commentId}`));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Live comments
        </p>
        <span className="text-xs text-slate-500 dark:text-slate-500">
          {sorted.length} total
        </span>
      </div>
      <ul className="max-h-64 space-y-2 overflow-y-auto pr-1 text-sm">
        {sorted.length === 0 ? (
          <li className="rounded-lg border border-dashed border-white/20 px-3 py-6 text-center text-slate-500 dark:border-slate-600/40 dark:text-slate-500">
            No comments yet.
          </li>
        ) : (
          sorted.map((c) => (
            <li
              key={c.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 dark:border-slate-600/30 dark:bg-slate-900/40"
            >
              <div>
                <p className="text-xs font-semibold text-cyan-800 dark:text-cyan-300">
                  {c.displayName || 'Guest'}
                </p>
                <p className="mt-0.5 text-slate-800 dark:text-slate-100">{c.text}</p>
              </div>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  className="shrink-0 rounded-md border border-red-500/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-700 hover:bg-red-500/10 dark:text-red-300"
                >
                  Delete
                </button>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
