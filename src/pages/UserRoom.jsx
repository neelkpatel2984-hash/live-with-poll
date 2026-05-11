import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ref, onValue, set, push } from 'firebase/database';
import {
  db,
  roomMetaPath,
  roomQuestionsPath,
  roomResponsesPath,
  roomCommentsPath,
  roomResponsePath,
} from '../firebase/config';
import {
  MODES,
  QUESTION_TYPES,
  getOrCreateParticipantId,
  participantNameKey,
  normalizeAnswerValue,
} from '../utils/helpers';
import GlassCard from '../components/GlassCard';

function sortedQuestions(questionsMap) {
  const list = Object.values(questionsMap || {});
  list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return list;
}

export default function UserRoom() {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [meta, setMeta] = useState(null);
  const [questions, setQuestions] = useState({});
  const [responses, setResponses] = useState({});
  const [loadError, setLoadError] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [displayName, setDisplayName] = useState(() => {
    const fromNav = location.state?.displayName;
    if (fromNav && String(fromNav).trim()) return String(fromNav).trim();
    try {
      return localStorage.getItem(participantNameKey(roomCode)) || '';
    } catch {
      return '';
    }
  });
  const [commentText, setCommentText] = useState('');
  const [localAnswers, setLocalAnswers] = useState({});

  const participantId = useMemo(() => getOrCreateParticipantId(), []);

  useEffect(() => {
    const fromNav = location.state?.displayName;
    if (fromNav && String(fromNav).trim()) {
      const n = String(fromNav).trim();
      setDisplayName(n);
      try {
        localStorage.setItem(participantNameKey(roomCode), n);
      } catch {
        /* ignore */
      }
    }
  }, [location.state, roomCode]);

  useEffect(() => {
    if (!roomCode) return undefined;
    const metaRef = ref(db, roomMetaPath(roomCode));
    return onValue(
      metaRef,
      (snap) => {
        if (!snap.exists()) {
          setLoadError('This room does not exist or has been deleted.');
          setMeta(null);
          return;
        }
        setLoadError('');
        setMeta(snap.val());
      },
      () => setLoadError('Could not connect to the room.')
    );
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode || !meta) return undefined;
    const qRef = ref(db, roomQuestionsPath(roomCode));
    return onValue(qRef, (snap) => setQuestions(snap.val() || {}));
  }, [roomCode, meta]);

  useEffect(() => {
    if (!roomCode || !meta) return undefined;
    const rRef = ref(db, roomResponsesPath(roomCode));
    return onValue(rRef, (snap) => {
      const val = snap.val() || {};
      setResponses(val);
      const mine = {};
      Object.entries(val).forEach(([qid, byUser]) => {
        if (byUser && byUser[participantId]) mine[qid] = byUser[participantId];
      });
      setLocalAnswers(mine);
    });
  }, [roomCode, meta, participantId]);

  const questionList = useMemo(() => sortedQuestions(questions), [questions]);

  const visibleQuestions = useMemo(() => {
    if (!meta) return [];
    if (meta.mode === MODES.FORM) return questionList;
    if (!meta.activeQuestionId) return [];
    return questionList.filter((q) => q.id === meta.activeQuestionId);
  }, [meta, questionList]);

  function handleSaveName(e) {
    e.preventDefault();
    const n = nameInput.trim();
    if (!n) return;
    setDisplayName(n);
    try {
      localStorage.setItem(participantNameKey(roomCode), n);
    } catch {
      /* ignore */
    }
    navigate(`/room/${roomCode}`, { replace: true, state: { displayName: n } });
  }

  async function submitAnswer(question, value) {
    if (!displayName.trim()) return;
    const payload = {
      participantId,
      displayName: question.showNames ? displayName.trim() : '',
      answer: normalizeAnswerValue(question.type, value),
      ts: Date.now(),
    };
    await set(
      ref(db, roomResponsePath(roomCode, question.id, participantId)),
      payload
    );
  }

  async function submitComment(e) {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || !displayName.trim()) return;
    const cRef = push(ref(db, roomCommentsPath(roomCode)));
    await set(cRef, {
      authorId: participantId,
      displayName: displayName.trim(),
      text,
      ts: Date.now(),
    });
    setCommentText('');
  }

  if (loadError || (meta === null && !loadError)) {
    return (
      <GlassCard className="mx-auto max-w-lg text-center">
        <p className="text-slate-800 dark:text-slate-100">
          {loadError || 'Connecting…'}
        </p>
        <Link
          to="/"
          className="mt-4 inline-block text-sm font-semibold text-cyan-700 dark:text-cyan-400"
        >
          ← Back to home
        </Link>
      </GlassCard>
    );
  }

  if (!displayName.trim()) {
    return (
      <GlassCard className="mx-auto max-w-lg">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
          Join room {roomCode}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Enter your first name to participate.
        </p>
        <form className="mt-4 space-y-3" onSubmit={handleSaveName}>
          <input
            className="glass-input w-full rounded-xl px-3 py-2.5 text-slate-900 dark:text-slate-100"
            placeholder="First name"
            value={nameInput}
            onChange={(ev) => setNameInput(ev.target.value)}
            maxLength={40}
            autoFocus
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow dark:bg-cyan-500"
          >
            Continue
          </button>
        </form>
        <button
          type="button"
          className="mt-3 w-full text-xs text-slate-500 underline dark:text-slate-500"
          onClick={() => navigate('/')}
        >
          Cancel
        </button>
      </GlassCard>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              You are in
            </p>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Room <span className="text-cyan-600 dark:text-cyan-400">{roomCode}</span>
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Hi, {displayName}.{' '}
              {meta.mode === MODES.LIVE_POLL ? (
                <span>Live poll mode — the host controls the active question.</span>
              ) : (
                <span>Form mode — answer all questions below.</span>
              )}
            </p>
          </div>
          <Link
            to="/"
            className="glass-input rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 no-underline dark:text-slate-100"
          >
            Leave
          </Link>
        </div>
      </GlassCard>

      {meta.mode === MODES.LIVE_POLL && !meta.activeQuestionId ? (
        <GlassCard>
          <p className="text-center text-sm text-slate-600 dark:text-slate-300">
            The host has not pushed a live question yet. Sit tight — this page
            updates automatically.
          </p>
        </GlassCard>
      ) : null}

      {visibleQuestions.map((q) => (
        <GlassCard key={q.id}>
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {q.text}
            </h2>
            {localAnswers[q.id] ? (
              <span className="shrink-0 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                Saved
              </span>
            ) : null}
          </div>

          {q.type === QUESTION_TYPES.MCQ ? (
            <div className="mt-4 flex flex-col gap-2">
              {(q.options || []).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => submitAnswer(q, opt)}
                  className="glass-input rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-900 transition hover:bg-white/20 dark:text-slate-50 dark:hover:bg-slate-800/50"
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : null}

          {(q.type === QUESTION_TYPES.YES_NO ||
            q.type === QUESTION_TYPES.TRUE_FALSE) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {(q.options || []).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => submitAnswer(q, opt)}
                  className="glass-input flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-50"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {q.type === QUESTION_TYPES.RATING ? (
            <div className="mt-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tap a number from 0 (low) to 10 (high).
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {Array.from({ length: 11 }, (_, n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => submitAnswer(q, n)}
                    className="glass-input h-10 w-10 rounded-lg text-sm font-semibold text-slate-900 dark:text-slate-50"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </GlassCard>
      ))}

      <GlassCard>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Comments
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Visible to everyone in the room and on the host dashboard.
        </p>
        <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={submitComment}>
          <input
            className="glass-input flex-1 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
            placeholder="Share a thought or question…"
            value={commentText}
            onChange={(ev) => setCommentText(ev.target.value)}
            maxLength={500}
          />
          <button
            type="submit"
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow dark:bg-violet-500"
          >
            Post
          </button>
        </form>
      </GlassCard>
    </div>
  );
}
