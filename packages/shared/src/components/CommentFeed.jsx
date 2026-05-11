import { useEffect, useMemo, useState } from 'react';
import { ref, remove, onValue } from 'firebase/database';
import { db, roomCommentsPath } from '../firebase/config';
import { COMMENT_PRIVACY } from '../utils/helpers';

export default function CommentFeed({
  roomCode,
  comments: commentsProp,
  isAdmin,
  commentPrivacy = COMMENT_PRIVACY.PUBLIC,
  participantId,
}) {
  const [liveComments, setLiveComments] = useState({});

  useEffect(() => {
    if (!roomCode || commentsProp !== undefined) return undefined;
    const cRef = ref(db, roomCommentsPath(roomCode));
    return onValue(cRef, (snap) => setLiveComments(snap.val() || {}));
  }, [roomCode, commentsProp]);

  const comments = commentsProp === undefined ? liveComments : commentsProp;

  const sorted = useMemo(() => {
    const entries = Object.entries(comments || {}).map(([id, c]) => ({
      id,
      ...c,
    }));
    entries.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return entries;
  }, [comments]);

  const visible = useMemo(() => {
    if (isAdmin || commentPrivacy !== COMMENT_PRIVACY.PRIVATE) return sorted;
    return sorted.filter((c) => c.authorId === participantId);
  }, [sorted, isAdmin, commentPrivacy, participantId]);

  async function handleDelete(commentId) {
    if (!isAdmin || !commentId) return;
    await remove(ref(db, `${roomCommentsPath(roomCode)}/${commentId}`));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          Live comments
        </p>
        <span className="text-xs text-neutral-500">{visible.length} shown</span>
      </div>
      <ul className="max-h-64 space-y-2 overflow-y-auto pr-1 text-sm">
        {visible.length === 0 ? (
          <li className="rounded-lg border border-dashed border-white/15 px-3 py-6 text-center text-neutral-500">
            {commentPrivacy === COMMENT_PRIVACY.PRIVATE && !isAdmin
              ? 'No comments from you yet.'
              : 'No comments yet.'}
          </li>
        ) : (
          visible.map((c) => (
            <li
              key={c.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
            >
              <div>
                <p className="text-xs font-semibold text-red-300">
                  {c.displayName || 'Guest'}
                </p>
                <p className="mt-0.5 text-neutral-100">{c.text}</p>
              </div>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  className="shrink-0 rounded-md border border-red-500/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-300 hover:bg-red-950/40"
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
