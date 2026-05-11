import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ref, onValue, update, push, remove, set } from 'firebase/database';
import {
  db,
  roomMetaPath,
  roomQuestionsPath,
  roomResponsesPath,
  roomCommentsPath,
  roomPath,
} from '../firebase/config';
import {
  MODES,
  QUESTION_TYPES,
  adminStorageKey,
  defaultOptionsForType,
} from '../utils/helpers';
import GlassCard from '../components/GlassCard';
import QuestionCard from '../components/QuestionCard';
import LiveResults from '../components/LiveResults';
import CommentFeed from '../components/CommentFeed';

function sortedQuestions(questionsMap) {
  const list = Object.values(questionsMap || {});
  list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return list;
}

export default function AdminDashboard() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [meta, setMeta] = useState(null);
  const [questions, setQuestions] = useState({});
  const [responses, setResponses] = useState({});
  const [comments, setComments] = useState({});
  const [authError, setAuthError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [newText, setNewText] = useState('');
  const [newType, setNewType] = useState(QUESTION_TYPES.MCQ);
  const [mcqOptions, setMcqOptions] = useState(
    defaultOptionsForType(QUESTION_TYPES.MCQ).join('\n')
  );
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);

  const adminToken =
    typeof window !== 'undefined'
      ? localStorage.getItem(adminStorageKey(roomCode))
      : null;

  useEffect(() => {
    if (!roomCode) return undefined;
    if (!adminToken) {
      setAuthError('missing_token');
      return undefined;
    }

    const metaRef = ref(db, roomMetaPath(roomCode));
    return onValue(
      metaRef,
      (snap) => {
        if (!snap.exists()) {
          setLoadError('Room not found.');
          setMeta(null);
          return;
        }
        const data = snap.val();
        if (data.adminToken !== adminToken) {
          setAuthError('invalid_token');
          setMeta(null);
          return;
        }
        setAuthError('');
        setLoadError('');
        setMeta(data);
      },
      () => setLoadError('Could not load room metadata.')
    );
  }, [roomCode, adminToken]);

  useEffect(() => {
    if (!roomCode || authError || !meta) return undefined;
    const qRef = ref(db, roomQuestionsPath(roomCode));
    return onValue(
      qRef,
      (snap) => setQuestions(snap.val() || {}),
      () => setLoadError('Could not load questions.')
    );
  }, [roomCode, meta, authError]);

  useEffect(() => {
    if (!roomCode || authError || !meta) return undefined;
    const rRef = ref(db, roomResponsesPath(roomCode));
    return onValue(rRef, (snap) => setResponses(snap.val() || {}));
  }, [roomCode, meta, authError]);

  useEffect(() => {
    if (!roomCode || authError || !meta) return undefined;
    const cRef = ref(db, roomCommentsPath(roomCode));
    return onValue(cRef, (snap) => setComments(snap.val() || {}));
  }, [roomCode, meta, authError]);

  const questionList = useMemo(() => sortedQuestions(questions), [questions]);

  useEffect(() => {
    if (!questionList.length) {
      setSelectedQuestionId(null);
      return;
    }
    if (
      meta?.activeQuestionId &&
      questionList.some((q) => q.id === meta.activeQuestionId)
    ) {
      setSelectedQuestionId(meta.activeQuestionId);
      return;
    }
    setSelectedQuestionId((prev) =>
      prev && questionList.some((q) => q.id === prev)
        ? prev
        : questionList[0].id
    );
  }, [questionList, meta?.activeQuestionId]);

  const selectedQuestion =
    questionList.find((q) => q.id === selectedQuestionId) || null;
  const selectedResponses = selectedQuestion
    ? responses[selectedQuestion.id] || {}
    : {};

  const recentResponses = useMemo(() => {
    const rows = [];
    Object.entries(responses).forEach(([qid, byUser]) => {
      const q = questions[qid];
      Object.entries(byUser || {}).forEach(([pid, row]) => {
        rows.push({
          key: `${qid}-${pid}`,
          qid,
          qText: q?.text || 'Question',
          showNames: q?.showNames !== false,
          ...row,
        });
      });
    });
    rows.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return rows.slice(0, 50);
  }, [responses, questions]);

  async function handleModeChange(mode) {
    await update(ref(db, roomMetaPath(roomCode)), { mode });
  }

  async function handleSetActive(questionId) {
    await update(ref(db, roomMetaPath(roomCode)), {
      activeQuestionId: questionId,
    });
    setSelectedQuestionId(questionId);
  }

  async function handleTogglePrivacy(questionId, showNames) {
    await update(ref(db, `${roomQuestionsPath(roomCode)}/${questionId}`), {
      showNames,
    });
  }

  async function handleDeleteQuestion(questionId) {
    await remove(ref(db, `${roomQuestionsPath(roomCode)}/${questionId}`));
    await remove(ref(db, `${roomResponsesPath(roomCode)}/${questionId}`));
    if (meta?.activeQuestionId === questionId) {
      await update(ref(db, roomMetaPath(roomCode)), { activeQuestionId: null });
    }
  }

  async function handleAddQuestion(e) {
    e.preventDefault();
    const text = newText.trim();
    if (!text) return;

    const options =
      newType === QUESTION_TYPES.MCQ
        ? mcqOptions
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
        : defaultOptionsForType(newType);

    if (newType === QUESTION_TYPES.MCQ && options.length < 2) return;

    const qRef = push(ref(db, roomQuestionsPath(roomCode)));
    const id = qRef.key;
    const order =
      questionList.reduce((max, q) => Math.max(max, q.order ?? 0), 0) + 1;

    await set(qRef, {
      id,
      text,
      type: newType,
      options,
      showNames: true,
      order,
      createdAt: Date.now(),
    });

    setNewText('');
    setMcqOptions(defaultOptionsForType(QUESTION_TYPES.MCQ).join('\n'));
    setNewType(QUESTION_TYPES.MCQ);
    await handleSetActive(id);
  }

  async function handleWipeSession() {
    if (
      !window.confirm(
        'Delete this entire room from Firebase? This cannot be undone.'
      )
    ) {
      return;
    }
    await remove(ref(db, roomPath(roomCode)));
    localStorage.removeItem(adminStorageKey(roomCode));
    navigate('/');
  }

  if (authError === 'missing_token') {
    return (
      <GlassCard className="mx-auto max-w-lg text-center">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
          Admin access needed
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Open the dashboard from the same browser where you created the room,
          or create a new session from home.
        </p>
        <Link
          to="/"
          className="mt-4 inline-block rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Back to home
        </Link>
      </GlassCard>
    );
  }

  if (authError === 'invalid_token') {
    return (
      <GlassCard className="mx-auto max-w-lg text-center">
        <h1 className="text-lg font-semibold text-red-700 dark:text-red-300">
          Unauthorized
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          This browser is not the host for this room code.
        </p>
        <Link to="/" className="mt-4 inline-block text-cyan-700 dark:text-cyan-400">
          ← Home
        </Link>
      </GlassCard>
    );
  }

  if (loadError || !meta) {
    return (
      <GlassCard className="mx-auto max-w-lg text-center">
        <p className="text-slate-700 dark:text-slate-200">
          {loadError || 'Loading…'}
        </p>
        <Link to="/" className="mt-4 inline-block text-cyan-700 dark:text-cyan-400">
          ← Home
        </Link>
      </GlassCard>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Admin
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Room <span className="text-cyan-600 dark:text-cyan-400">{roomCode}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Share the code with participants. Data lives under{' '}
            <code className="rounded bg-black/5 px-1 dark:bg-white/10">
              rooms/{roomCode}
            </code>{' '}
            — delete the node after training to wipe the session.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleWipeSession}
            className="rounded-xl border border-red-500/50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-500/10 dark:text-red-300"
          >
            Wipe session
          </button>
          <Link
            to={`/room/${roomCode}`}
            state={{ displayName: 'Host (preview)' }}
            className="glass-input rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 no-underline dark:text-slate-100"
          >
            Open participant view
          </Link>
        </div>
      </div>

      <GlassCard>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Session mode
        </h2>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Live poll shows one question at a time (uses “live” question). Form
          mode shows every question to participants at once.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleModeChange(MODES.LIVE_POLL)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              meta.mode === MODES.LIVE_POLL
                ? 'bg-cyan-600 text-white shadow dark:bg-cyan-500'
                : 'glass-input text-slate-800 dark:text-slate-100'
            }`}
          >
            Live poll mode
          </button>
          <button
            type="button"
            onClick={() => handleModeChange(MODES.FORM)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              meta.mode === MODES.FORM
                ? 'bg-violet-600 text-white shadow dark:bg-violet-500'
                : 'glass-input text-slate-800 dark:text-slate-100'
            }`}
          >
            Form mode
          </button>
        </div>
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Add question
          </h2>
          <form className="mt-4 space-y-3" onSubmit={handleAddQuestion}>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Type
              </label>
              <select
                value={newType}
                onChange={(ev) => {
                  const t = ev.target.value;
                  setNewType(t);
                  if (t === QUESTION_TYPES.MCQ) {
                    setMcqOptions(
                      defaultOptionsForType(QUESTION_TYPES.MCQ).join('\n')
                    );
                  }
                }}
                className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
              >
                <option value={QUESTION_TYPES.MCQ}>Multiple choice</option>
                <option value={QUESTION_TYPES.YES_NO}>Yes / No</option>
                <option value={QUESTION_TYPES.TRUE_FALSE}>True / False</option>
                <option value={QUESTION_TYPES.RATING}>Rating (0–10)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Prompt
              </label>
              <textarea
                value={newText}
                onChange={(ev) => setNewText(ev.target.value)}
                rows={2}
                className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
                placeholder="What do you want to ask?"
              />
            </div>
            {newType === QUESTION_TYPES.MCQ ? (
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Options (one per line)
                </label>
                <textarea
                  value={mcqOptions}
                  onChange={(ev) => setMcqOptions(ev.target.value)}
                  rows={4}
                  className="glass-input mt-1 w-full rounded-xl px-3 py-2 font-mono text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
            ) : null}
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md"
            >
              Add to session
            </button>
          </form>

          <div className="mt-8 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Your questions
            </h3>
            {questionList.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-500">
                No questions yet.
              </p>
            ) : (
              questionList.map((q) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  mode={meta.mode}
                  isActive={meta.activeQuestionId === q.id}
                  onTogglePrivacy={handleTogglePrivacy}
                  onSelectActive={handleSetActive}
                  onDelete={handleDeleteQuestion}
                />
              ))
            )}
          </div>
        </GlassCard>

        <div className="flex flex-col gap-6">
          <GlassCard>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Chart target
              </h2>
              {questionList.length ? (
                <select
                  value={selectedQuestionId || ''}
                  onChange={(ev) => setSelectedQuestionId(ev.target.value)}
                  className="glass-input max-w-full rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-100"
                >
                  {questionList.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.text.slice(0, 60)}
                      {q.text.length > 60 ? '…' : ''}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
            <LiveResults question={selectedQuestion} responses={selectedResponses} />
          </GlassCard>

          <GlassCard>
            <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
              Live response feed
            </h2>
            <ul className="max-h-56 space-y-2 overflow-y-auto text-xs">
              {recentResponses.length === 0 ? (
                <li className="text-slate-500 dark:text-slate-500">
                  Waiting for responses…
                </li>
              ) : (
                recentResponses.map((r) => (
                  <li
                    key={r.key}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 dark:border-slate-600/30 dark:bg-slate-900/30"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {r.showNames ? r.displayName || 'Participant' : 'Anonymous'}
                    </span>
                    <span className="text-slate-500 dark:text-slate-500"> · </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {r.qText}
                    </span>
                    <span className="text-slate-500 dark:text-slate-500"> → </span>
                    <span className="text-cyan-800 dark:text-cyan-300">
                      {String(r.answer)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </GlassCard>

          <GlassCard>
            <CommentFeed roomCode={roomCode} comments={comments} isAdmin />
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
