import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ref, onValue, set, push } from 'firebase/database';
import {
  db,
  roomMetaPath,
  roomQuestionsPath,
  roomResponsesPath,
  roomCommentsPath,
  roomResponsePath,
  roomEmojiEventsPath,
} from '@shared/firebase/config.js';
import {
  MODES,
  QUESTION_TYPES,
  getOrCreateParticipantId,
  participantNameKey,
  normalizeAnswerValue,
  RESPONSE_PRIVACY,
  QUIZ_PHASE,
  computeQuizPoints,
  answersMatch,
  aggregateLeaderboardFromResponses,
  roomAllowsParticipantPdf,
} from '@shared/utils/helpers.js';
import { burstConfetti, leaderboardConfetti } from '@shared/utils/confettiFx.js';
import { QUICK_EMOJIS } from '@shared/constants/quickEmojis.js';
import GlassCard from '@shared/components/GlassCard.jsx';
import BackButton from '@shared/components/BackButton.jsx';
import MusicPlayer from '@shared/components/MusicPlayer.jsx';
import EmojiFizzLayer from '@shared/components/EmojiFizzLayer.jsx';
import CommentFeed from '@shared/components/CommentFeed.jsx';
import LeaderboardPanel from '@shared/components/LeaderboardPanel.jsx';
import LiveResults from '@shared/components/LiveResults.jsx';

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
  const prevQuizPhaseRef = useRef(null);

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

  const responsePrivacy = meta?.responsePrivacy || RESPONSE_PRIVACY.PUBLIC;
  const isPrivate = responsePrivacy === RESPONSE_PRIVACY.PRIVATE;

  const leaderboardRows = useMemo(
    () => aggregateLeaderboardFromResponses(responses, questions),
    [responses, questions]
  );

  const filteredLeaderboard = useMemo(() => {
    if (!isPrivate) return leaderboardRows;
    return leaderboardRows.filter((r) => r.participantId === participantId);
  }, [isPrivate, leaderboardRows, participantId]);

  useEffect(() => {
    const phase = meta?.quizPhase;
    const prev = prevQuizPhaseRef.current;
    prevQuizPhaseRef.current = phase;
    if (!meta || meta.mode !== MODES.QUIZ) return;
    if (phase === QUIZ_PHASE.REVEALED && prev !== QUIZ_PHASE.REVEALED) {
      void burstConfetti(0.75);
    }
    if (phase === QUIZ_PHASE.LEADERBOARD && prev !== QUIZ_PHASE.LEADERBOARD) {
      void leaderboardConfetti();
    }
  }, [meta?.quizPhase, meta?.mode, meta]);

  const visibleQuestions = useMemo(() => {
    if (!meta) return [];
    if (meta.mode === MODES.FORM) return questionList;
    if (meta.mode === MODES.LIVE_POLL) {
      if (!meta.activeQuestionId) return [];
      return questionList.filter((q) => q.id === meta.activeQuestionId);
    }
    if (meta.mode === MODES.QUIZ) {
      if (
        meta.quizPhase === QUIZ_PHASE.LEADERBOARD ||
        meta.quizPhase === QUIZ_PHASE.IDLE
      ) {
        return [];
      }
      if (!meta.quizActiveQuestionId) return [];
      return questionList.filter((q) => q.id === meta.quizActiveQuestionId);
    }
    return [];
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
    const basePayload = {
      participantId,
      displayName: question.showNames ? displayName.trim() : '',
      answer: normalizeAnswerValue(question.type, value),
      ts: Date.now(),
    };

    let pointsEarned = null;
    let correct = null;

    if (meta.mode === MODES.QUIZ && meta.quizPhase === QUIZ_PHASE.QUESTION) {
      const openedAt = meta.quizOpenedAt || 0;
      const ca = question.correctAnswer;
      correct = answersMatch(question.type, value, ca);
      pointsEarned = computeQuizPoints({
        correct,
        doublePoints: !!question.doublePoints,
        answeredAt: basePayload.ts,
        openedAt,
        timeLimitMs: question.timeLimitMs || 30000,
      });
    }

    await set(ref(db, roomResponsePath(roomCode, question.id, participantId)), {
      ...basePayload,
      ...(pointsEarned != null ? { pointsEarned, correct } : {}),
    });
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

  async function sendEmoji(emoji) {
    if (!displayName.trim()) return;
    const evRef = push(ref(db, roomEmojiEventsPath(roomCode)));
    await set(evRef, {
      emoji,
      authorId: participantId,
      displayName: displayName.trim(),
      ts: Date.now(),
      x: Math.random() * 100,
    });
  }

  async function handleDownloadPdf() {
    const { buildParticipantPdf } = await import('@shared/utils/pdfParticipant.js');
    const mineByQ = {};
    Object.entries(responses).forEach(([qid, byUser]) => {
      if (byUser && byUser[participantId]) mineByQ[qid] = byUser[participantId];
    });
    const rank =
      leaderboardRows.findIndex((r) => r.participantId === participantId) + 1;
    const doc = buildParticipantPdf({
      title: 'Live with Poll — your summary',
      mode: meta.mode,
      displayName,
      roomCode,
      questions: questionList,
      responsesByQuestionId: mineByQ,
      leaderboardRank: meta.mode === MODES.QUIZ ? rank || null : null,
    });
    doc.save(`live-with-poll-${roomCode}-${participantId}.pdf`);
  }

  const musicTrackId = meta?.musicTrackId || 'off';
  const musicVolume =
    meta?.musicVolume != null ? Number(meta.musicVolume) : 0.35;
  const showPdf =
    meta?.sessionStatus === 'ended' &&
    roomAllowsParticipantPdf(questions) &&
    (meta.mode === MODES.FORM || meta.mode === MODES.QUIZ);

  if (loadError || (meta === null && !loadError)) {
    return (
      <GlassCard className="mx-auto max-w-lg text-center">
        <p className="text-neutral-100">{loadError || 'Connecting…'}</p>
        <Link
          to="/"
          className="mt-4 inline-block text-sm font-semibold text-red-300"
        >
          ← Join home
        </Link>
      </GlassCard>
    );
  }

  if (!displayName.trim()) {
    return (
      <GlassCard className="mx-auto max-w-lg">
        <div className="mb-3">
          <BackButton to="/">Back</BackButton>
        </div>
        <h1 className="text-lg font-semibold text-neutral-50">Join room {roomCode}</h1>
        <p className="mt-2 text-sm text-neutral-400">Enter your name to participate.</p>
        <form className="mt-4 space-y-3" onSubmit={handleSaveName}>
          <input
            className="glass-input w-full rounded-xl px-3 py-2.5 text-neutral-50"
            placeholder="Your name"
            value={nameInput}
            onChange={(ev) => setNameInput(ev.target.value)}
            maxLength={40}
            autoFocus
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow"
          >
            Continue
          </button>
        </form>
        <button
          type="button"
          className="mt-3 w-full text-xs text-neutral-500 underline"
          onClick={() => navigate('/')}
        >
          Cancel
        </button>
      </GlassCard>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <MusicPlayer musicTrackId={musicTrackId} musicVolume={musicVolume} />
      <EmojiFizzLayer roomCode={roomCode} enabled={meta.mode === MODES.EMOJI} />

      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">You are in</p>
            <h1 className="text-xl font-bold text-neutral-50">
              Room <span className="text-red-400">{roomCode}</span>
            </h1>
            <p className="text-sm text-neutral-400">
              Hi, {displayName}. Mode:{' '}
              <span className="font-semibold text-neutral-200">{meta.mode}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <BackButton to="/">Back</BackButton>
            <Link
              to="/"
              className="glass-input rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-100 no-underline"
            >
              Leave
            </Link>
          </div>
        </div>
      </GlassCard>

      {showPdf ? (
        <GlassCard>
          <h2 className="text-sm font-semibold text-neutral-50">Your download</h2>
          <p className="mt-1 text-xs text-neutral-500">
            The host ended the session and enabled participant PDF exports.
          </p>
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="mt-3 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Download PDF
          </button>
        </GlassCard>
      ) : null}

      {meta.mode === MODES.LIVE_POLL && !meta.activeQuestionId ? (
        <GlassCard>
          <p className="text-center text-sm text-neutral-400">
            Waiting for the host to push a live question…
          </p>
        </GlassCard>
      ) : null}

      {meta.mode === MODES.QUIZ && meta.quizPhase === QUIZ_PHASE.IDLE ? (
        <GlassCard>
          <p className="text-center text-sm text-neutral-400">
            Quiz is idle. The host will push the first question shortly.
          </p>
        </GlassCard>
      ) : null}

      {meta.mode === MODES.QUIZ && meta.quizPhase === QUIZ_PHASE.LEADERBOARD ? (
        <GlassCard>
          <LeaderboardPanel
            rows={isPrivate ? filteredLeaderboard : leaderboardRows}
            title={isPrivate ? 'Your result (private room)' : 'Leaderboard'}
          />
        </GlassCard>
      ) : null}

      {visibleQuestions.map((q) => {
        const answerDisabled =
          meta.mode === MODES.QUIZ && meta.quizPhase !== QUIZ_PHASE.QUESTION;
        const showResultsChart =
          !isPrivate &&
          meta.mode === MODES.QUIZ &&
          meta.quizPhase === QUIZ_PHASE.REVEALED &&
          responses[q.id];

        return (
          <GlassCard key={q.id}>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-semibold text-neutral-50">{q.text}</h2>
              {localAnswers[q.id] ? (
                <span className="shrink-0 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200">
                  Saved
                </span>
              ) : null}
            </div>

            {meta.mode === MODES.QUIZ && meta.quizPhase === QUIZ_PHASE.QUESTION ? (
              <p className="mt-2 text-xs text-neutral-400">
                Answer fast for more points. Double points:{' '}
                {q.doublePoints ? 'on' : 'off'}.
              </p>
            ) : null}

            {showResultsChart ? (
              <div className="mt-4 h-56 text-neutral-100">
                <LiveResults question={q} responses={responses[q.id] || {}} />
              </div>
            ) : null}

            {q.type === QUESTION_TYPES.MCQ ? (
              <div className="mt-4 flex flex-col gap-2">
                {(q.options || []).map((opt) => {
                  const isCorrect =
                    meta.mode === MODES.QUIZ &&
                    meta.quizPhase === QUIZ_PHASE.REVEALED &&
                    answersMatch(q.type, opt, q.correctAnswer);
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={answerDisabled}
                      onClick={() => {
                        if (!answerDisabled) submitAnswer(q, opt);
                      }}
                      className={`glass-input rounded-xl px-4 py-3 text-left text-sm font-medium text-neutral-50 transition hover:bg-white/10 disabled:opacity-50 ${
                        isCorrect ? 'ring-2 ring-emerald-400/80' : ''
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {(q.type === QUESTION_TYPES.YES_NO || q.type === QUESTION_TYPES.TRUE_FALSE) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {(q.options || []).map((opt) => {
                  const isCorrect =
                    meta.mode === MODES.QUIZ &&
                    meta.quizPhase === QUIZ_PHASE.REVEALED &&
                    answersMatch(q.type, opt, q.correctAnswer);
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={answerDisabled}
                      onClick={() => {
                        if (!answerDisabled) submitAnswer(q, opt);
                      }}
                      className={`glass-input flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-neutral-50 disabled:opacity-50 ${
                        isCorrect ? 'ring-2 ring-emerald-400/80' : ''
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {q.type === QUESTION_TYPES.RATING ? (
              <div className="mt-4">
                <p className="text-xs text-neutral-500">Pick 0–10.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Array.from({ length: 11 }, (_, n) => {
                    const isCorrect =
                      meta.mode === MODES.QUIZ &&
                      meta.quizPhase === QUIZ_PHASE.REVEALED &&
                      answersMatch(q.type, n, q.correctAnswer);
                    return (
                      <button
                        key={n}
                        type="button"
                        disabled={answerDisabled}
                        onClick={() => {
                          if (!answerDisabled) submitAnswer(q, n);
                        }}
                        className={`glass-input h-10 w-10 rounded-lg text-sm font-semibold text-neutral-50 disabled:opacity-50 ${
                          isCorrect ? 'ring-2 ring-emerald-400/80' : ''
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </GlassCard>
        );
      })}

      {meta.mode === MODES.EMOJI ? (
        <GlassCard>
          <h2 className="text-sm font-semibold text-neutral-50">Live emoji</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Tap an emoji — it floats up for everyone in the room.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {QUICK_EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => sendEmoji(em)}
                className="glass-input rounded-xl px-3 py-2 text-2xl leading-none"
              >
                {em}
              </button>
            ))}
          </div>
        </GlassCard>
      ) : null}

      {meta.mode === MODES.COMMENT ||
      meta.mode === MODES.FORM ||
      meta.mode === MODES.LIVE_POLL ||
      meta.mode === MODES.QUIZ ? (
        <GlassCard>
          <h2 className="text-sm font-semibold text-neutral-50">Comments</h2>
          <p className="mt-1 text-xs text-neutral-500">
            {meta.mode === MODES.COMMENT
              ? 'This session is comment-first — keep the conversation going.'
              : 'Visible to everyone in the room.'}
          </p>
          <CommentFeed roomCode={roomCode} />
          <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={submitComment}>
            <input
              className="glass-input flex-1 rounded-xl px-3 py-2 text-sm text-neutral-50"
              placeholder="Write a comment…"
              value={commentText}
              onChange={(ev) => setCommentText(ev.target.value)}
              maxLength={500}
            />
            <button
              type="submit"
              className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow"
            >
              Post
            </button>
          </form>
        </GlassCard>
      ) : null}
    </div>
  );
}
