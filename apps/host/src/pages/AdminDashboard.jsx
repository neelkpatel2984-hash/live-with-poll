import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ref,
  onValue,
  update,
  push,
  remove,
  set,
  get,
  query,
  orderByChild,
  limitToLast,
} from 'firebase/database';
import {
  db,
  roomMetaPath,
  roomQuestionsPath,
  roomResponsesPath,
  roomCommentsPath,
  roomPath,
  roomAnswerFeedPath,
  roomPresencePath,
  roomHostBundlePath,
} from '@shared/firebase/config.js';
import {
  MODES,
  QUESTION_TYPES,
  defaultOptionsForType,
  RESPONSE_PRIVACY,
  COMMENT_PRIVACY,
  QUIZ_PHASE,
  aggregateLeaderboardFromResponses,
  readHostCredential,
  adminStorageKey,
  generateId,
  defaultVisibleModesCheckboxes,
  visibleModesFromCheckboxes,
} from '@shared/utils/helpers.js';
import {
  exportQuestionsToCsv,
  parseQuestionsCsv,
  buildDemoCsv,
} from '@shared/utils/csvQuestions.js';
import { burstConfetti, leaderboardConfetti } from '@shared/utils/confettiFx.js';
import { MUSIC_TRACKS, DEFAULT_MUSIC_VOLUME } from '@shared/constants/musicTracks.js';
import GlassCard from '@shared/components/GlassCard.jsx';
import QuestionCard from '../components/QuestionCard.jsx';
import LiveResults from '@shared/components/LiveResults.jsx';
import CommentFeed from '@shared/components/CommentFeed.jsx';
import OverallChart from '@shared/components/OverallChart.jsx';
import LeaderboardPanel from '@shared/components/LeaderboardPanel.jsx';
import MusicPlayer from '@shared/components/MusicPlayer.jsx';

function participantJoinBase() {
  const u = import.meta.env.VITE_PARTICIPANT_APP_URL?.replace(/\/$/, '');
  return u || '';
}

function participantRoomUrl(roomCode) {
  const b = participantJoinBase();
  if (b) return `${b}/room/${roomCode}`;
  return `${window.location.origin}/room/${roomCode}`;
}

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
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [doublePoints, setDoublePoints] = useState(false);
  const [timeLimitSec, setTimeLimitSec] = useState(30);
  const [allowParticipantPdf, setAllowParticipantPdf] = useState(false);
  const [visibleModesBox, setVisibleModesBox] = useState({
    form: true,
    live_poll: true,
    quiz: true,
  });
  const [setPdfDownloads, setSetPdfDownloads] = useState({
    quiz: {},
    form: {},
    livePoll: {},
  });
  const [filterListByActiveSet, setFilterListByActiveSet] = useState(true);
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [addPanelOpen, setAddPanelOpen] = useState(true);
  const [chartView, setChartView] = useState('per');
  const [quizPushId, setQuizPushId] = useState(null);
  const [feedRows, setFeedRows] = useState([]);
  const [presenceCount, setPresenceCount] = useState(0);
  const [localMusicVol, setLocalMusicVol] = useState(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newFormTitle, setNewFormTitle] = useState('');
  const [newLivePollTitle, setNewLivePollTitle] = useState('');
  const csvInputRef = useRef(null);
  const musicVolDebounceRef = useRef(null);
  const confettiCancelRef = useRef(null);

  const [focusTick, setFocusTick] = useState(0);
  useEffect(() => {
    const bump = () => setFocusTick((n) => n + 1);
    window.addEventListener('focus', bump);
    return () => window.removeEventListener('focus', bump);
  }, []);

  useEffect(() => {
    if (!roomCode) return undefined;
    const cred = readHostCredential(roomCode);
    if (!cred?.token) {
      setAuthError('missing_token');
      return undefined;
    }

    const metaRef = ref(db, roomMetaPath(roomCode));
    return onValue(
      metaRef,
      async (snap) => {
        if (!snap.exists()) {
          setLoadError('Room not found.');
          setMeta(null);
          return;
        }
        const data = snap.val();
        let ok = false;
        if (data.adminToken) {
          ok = data.adminToken === cred.token;
        } else if (cred.bundleKey) {
          const tSnap = await get(
            ref(db, `${roomHostBundlePath(roomCode, cred.bundleKey)}/adminToken`)
          );
          ok = tSnap.val() === cred.token;
        }
        if (!ok) {
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
  }, [roomCode, focusTick]);

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

  useEffect(() => {
    if (!roomCode || authError || !meta) return undefined;
    const feedQ = query(
      ref(db, roomAnswerFeedPath(roomCode)),
      orderByChild('ts'),
      limitToLast(50)
    );
    return onValue(feedQ, (snap) => {
      const val = snap.val() || {};
      const rows = Object.entries(val).map(([id, row]) => ({ id, ...row }));
      rows.sort((a, b) => (b.ts || 0) - (a.ts || 0));
      setFeedRows(rows.slice(0, 50));
    });
  }, [roomCode, meta, authError]);

  useEffect(() => {
    if (!roomCode || authError || !meta) return undefined;
    const pRef = ref(db, roomPresencePath(roomCode));
    return onValue(pRef, (snap) => {
      const v = snap.val() || {};
      setPresenceCount(Object.keys(v).length);
    });
  }, [roomCode, meta, authError]);

  const questionList = useMemo(() => sortedQuestions(questions), [questions]);

  const activeQuizId = meta?.activeQuizId ?? 'default';
  const activeFormId = meta?.activeFormId ?? 'default';
  const activeLivePollId = meta?.activeLivePollId ?? 'default';

  const questionListForActiveSet = useMemo(() => {
    if (!meta) return questionList;
    if (meta.mode === MODES.QUIZ) {
      return questionList.filter((q) => (q.quizId ?? 'default') === activeQuizId);
    }
    if (meta.mode === MODES.FORM) {
      return questionList.filter((q) => (q.formId ?? 'default') === activeFormId);
    }
    if (meta.mode === MODES.LIVE_POLL) {
      return questionList.filter((q) => (q.livePollId ?? 'default') === activeLivePollId);
    }
    return questionList;
  }, [questionList, meta, activeQuizId, activeFormId, activeLivePollId]);

  const questionListForPanel = useMemo(() => {
    if (!filterListByActiveSet) return questionList;
    return questionListForActiveSet;
  }, [filterListByActiveSet, questionList, questionListForActiveSet]);

  useEffect(() => {
    if (!questionList.length) {
      setSelectedQuestionId(null);
      return;
    }
    if (
      meta?.mode === MODES.LIVE_POLL &&
      meta?.activeQuestionId &&
      questionList.some((q) => q.id === meta.activeQuestionId)
    ) {
      setSelectedQuestionId(meta.activeQuestionId);
      return;
    }
    const pool =
      filterListByActiveSet && questionListForPanel.length
        ? questionListForPanel
        : questionList;
    setSelectedQuestionId((prev) =>
      prev && pool.some((q) => q.id === prev) ? prev : pool[0]?.id ?? null
    );
  }, [
    questionList,
    questionListForPanel,
    filterListByActiveSet,
    meta?.activeQuestionId,
    meta?.mode,
  ]);

  useEffect(() => {
    if (meta?.mode !== MODES.QUIZ) return undefined;
    const list = questionListForActiveSet;
    if (!list.length) {
      setQuizPushId(null);
      return undefined;
    }
    if (
      meta?.quizActiveQuestionId &&
      list.some((q) => q.id === meta.quizActiveQuestionId)
    ) {
      setQuizPushId(meta.quizActiveQuestionId);
      return undefined;
    }
    setQuizPushId((prev) =>
      prev && list.some((q) => q.id === prev) ? prev : list[0].id
    );
    return undefined;
  }, [questionListForActiveSet, meta?.quizActiveQuestionId, meta?.mode]);

  const selectedQuestion =
    questionList.find((q) => q.id === selectedQuestionId) || null;
  const selectedResponses = selectedQuestion
    ? responses[selectedQuestion.id] || {}
    : {};

  const leaderboardRows = useMemo(
    () => aggregateLeaderboardFromResponses(responses, questions),
    [responses, questions]
  );

  const prevSessionModeRef = useRef(null);
  useEffect(() => {
    if (!meta?.mode) return;
    if (prevSessionModeRef.current !== meta.mode) {
      setVisibleModesBox(defaultVisibleModesCheckboxes(meta.mode));
      prevSessionModeRef.current = meta.mode;
    }
  }, [meta?.mode]);

  const prevQuizPhaseRef = useRef(null);
  useEffect(() => {
    const phase = meta?.quizPhase;
    const prev = prevQuizPhaseRef.current;
    prevQuizPhaseRef.current = phase;
    if (!meta || meta.mode !== MODES.QUIZ) return undefined;
    if (phase === QUIZ_PHASE.REVEALED && prev !== QUIZ_PHASE.REVEALED) {
      void burstConfetti(1);
    }
    let cancelled = false;
    if (phase === QUIZ_PHASE.LEADERBOARD && prev !== QUIZ_PHASE.LEADERBOARD) {
      void leaderboardConfetti().then((cancel) => {
        if (cancelled) cancel?.();
        else confettiCancelRef.current = cancel;
      });
    }
    return () => {
      cancelled = true;
      confettiCancelRef.current?.();
      confettiCancelRef.current = null;
    };
  }, [meta?.quizPhase, meta?.mode]);

  useEffect(() => {
    if (meta?.musicVolume == null) return;
    setLocalMusicVol(Number(meta.musicVolume));
  }, [meta?.musicVolume]);

  async function handleModeChange(mode) {
    await update(ref(db, roomMetaPath(roomCode)), {
      mode,
      quizPhase: QUIZ_PHASE.IDLE,
      quizOpenedAt: null,
      quizFullMode: false,
    });
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
    const patch = {
      [`questions/${questionId}`]: null,
      [`responses/${questionId}`]: null,
    };
    if (meta?.activeQuestionId === questionId) {
      patch['meta/activeQuestionId'] = null;
    }
    if (meta?.quizActiveQuestionId === questionId) {
      patch['meta/quizActiveQuestionId'] = null;
      patch['meta/quizPhase'] = QUIZ_PHASE.IDLE;
      patch['meta/quizOpenedAt'] = null;
      patch['meta/quizFullMode'] = false;
    }
    await update(ref(db, roomPath(roomCode)), patch);
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

    const isQuiz = meta.mode === MODES.QUIZ;
    const ca = correctAnswer.trim();
    const scoringEnabled = isQuiz && !!ca;
    if (isQuiz && scoringEnabled) {
      if (!options.includes(ca) && newType !== QUESTION_TYPES.RATING) {
        alert('Correct answer must match one of the options.');
        return;
      }
    }

    const qRef = push(ref(db, roomQuestionsPath(roomCode)));
    const id = qRef.key;
    const order =
      questionList.reduce((max, q) => Math.max(max, q.order ?? 0), 0) + 1;
    const tMs = Math.min(600, Math.max(5, Number(timeLimitSec) || 30)) * 1000;
    const quizId = meta.activeQuizId || 'default';
    const formId = meta.activeFormId || 'default';
    const livePollId = meta.activeLivePollId || 'default';
    const visibleModes = visibleModesFromCheckboxes(visibleModesBox);

    await set(qRef, {
      id,
      text,
      type: newType,
      options,
      showNames: true,
      order,
      createdAt: Date.now(),
      correctAnswer: isQuiz && scoringEnabled ? ca : '',
      doublePoints: isQuiz && scoringEnabled ? !!doublePoints : false,
      timeLimitMs: isQuiz ? tMs : 30000,
      scoringEnabled: isQuiz ? scoringEnabled : false,
      allowParticipantPdf: !!allowParticipantPdf,
      visibleModes,
      quizId,
      formId,
      livePollId,
    });

    setNewText('');
    setMcqOptions(defaultOptionsForType(QUESTION_TYPES.MCQ).join('\n'));
    setNewType(QUESTION_TYPES.MCQ);
    setCorrectAnswer('');
    setDoublePoints(false);
    setTimeLimitSec(30);
    setAllowParticipantPdf(false);
    setVisibleModesBox(defaultVisibleModesCheckboxes(meta.mode));
    if (meta.mode === MODES.LIVE_POLL) await handleSetActive(id);
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

  async function handleMusicTrack(id) {
    await update(ref(db, roomMetaPath(roomCode)), { musicTrackId: id });
  }

  async function flushMusicVolume(vol) {
    await update(ref(db, roomMetaPath(roomCode)), {
      musicVolume: Math.min(1, Math.max(0, vol)),
    });
  }

  function handleMusicVolumeInput(vol) {
    const clamped = Math.min(1, Math.max(0, vol));
    setLocalMusicVol(clamped);
    if (musicVolDebounceRef.current) clearTimeout(musicVolDebounceRef.current);
    musicVolDebounceRef.current = setTimeout(() => {
      void flushMusicVolume(clamped);
    }, 400);
  }

  async function handlePrivacyChange(priv) {
    await update(ref(db, roomMetaPath(roomCode)), { responsePrivacy: priv });
  }

  async function handleCommentPrivacy(priv) {
    await update(ref(db, roomMetaPath(roomCode)), { commentPrivacy: priv });
  }

  async function handleCommentsHidden(hidden) {
    await update(ref(db, roomMetaPath(roomCode)), { commentsHidden: !!hidden });
  }

  async function handleSetActiveQuiz(quizId) {
    await update(ref(db, roomMetaPath(roomCode)), { activeQuizId: quizId });
  }

  async function handleSetActiveForm(formId) {
    await update(ref(db, roomMetaPath(roomCode)), { activeFormId: formId });
  }

  async function handleAddForm(e) {
    e.preventDefault();
    const title = newFormTitle.trim() || 'New form';
    const id = generateId('fm');
    const forms = {
      ...(meta?.forms || {}),
      [id]: { title, order: Object.keys(meta?.forms || {}).length },
    };
    await update(ref(db, roomMetaPath(roomCode)), {
      forms,
      activeFormId: id,
    });
    setNewFormTitle('');
  }

  async function handleSetActiveLivePoll(pollId) {
    await update(ref(db, roomMetaPath(roomCode)), { activeLivePollId: pollId });
  }

  async function handleAddLivePollSet(e) {
    e.preventDefault();
    const title = newLivePollTitle.trim() || 'New live poll set';
    const id = generateId('lp');
    const livePolls = {
      ...(meta?.livePolls || {}),
      [id]: { title, order: Object.keys(meta?.livePolls || {}).length },
    };
    await update(ref(db, roomMetaPath(roomCode)), {
      livePolls,
      activeLivePollId: id,
    });
    setNewLivePollTitle('');
  }

  async function handleAddQuiz(e) {
    e.preventDefault();
    const title = newQuizTitle.trim() || 'New quiz';
    const id = generateId('qz');
    const quizzes = {
      ...(meta?.quizzes || {}),
      [id]: { title, order: Object.keys(meta?.quizzes || {}).length },
    };
    await update(ref(db, roomMetaPath(roomCode)), {
      quizzes,
      activeQuizId: id,
    });
    setNewQuizTitle('');
  }

  async function handleReorderQuestion(questionId, delta) {
    const list = questionListForPanel;
    const idx = list.findIndex((q) => q.id === questionId);
    const j = idx + delta;
    if (idx < 0 || j < 0 || j >= list.length) return;
    const a = list[idx];
    const b = list[j];
    const oa = a.order ?? idx;
    const ob = b.order ?? j;
    await update(ref(db, roomQuestionsPath(roomCode)), {
      [`${a.id}/order`]: ob,
      [`${b.id}/order`]: oa,
    });
  }

  async function handleUpdateQuestion(questionId, patch) {
    await update(ref(db, `${roomQuestionsPath(roomCode)}/${questionId}`), patch);
  }

  async function handleSessionStatus(status) {
    await update(ref(db, roomMetaPath(roomCode)), { sessionStatus: status });
  }

  function openResultsWindow() {
    const url = `${window.location.origin}${window.location.pathname}#/admin/${roomCode}/results`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function handleDownloadRoomJson() {
    try {
      const snap = await get(ref(db, roomPath(roomCode)));
      const blob = new Blob([JSON.stringify(snap.val(), null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `live-with-poll-room-${roomCode}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  }

  function handleExportCsv() {
    const csv = exportQuestionsToCsv(questionList);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questions-${roomCode}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleDownloadDemoCsv() {
    const csv = buildDemoCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `live-with-poll-demo.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleImportCsv(ev) {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    const text = await file.text();
    const parsed = parseQuestionsCsv(text);
    if (parsed.error) {
      alert(parsed.error);
      return;
    }
    let orderBase =
      questionList.reduce((max, q) => Math.max(max, q.order ?? 0), 0) + 1;
    let firstImportedId = null;
    const quizId = meta.activeQuizId || 'default';
    const formId = meta.activeFormId || 'default';
    const livePollId = meta.activeLivePollId || 'default';
    const importedVisibleModes = visibleModesFromCheckboxes(
      defaultVisibleModesCheckboxes(meta.mode)
    );
    for (const row of parsed.questions) {
      const opts =
        row.type === QUESTION_TYPES.MCQ && row.options.length
          ? row.options
          : defaultOptionsForType(row.type);
      const qRef = push(ref(db, roomQuestionsPath(roomCode)));
      const id = qRef.key;
      if (!firstImportedId) firstImportedId = id;
      const scoringEnabled =
        meta.mode === MODES.QUIZ ? row.scoringEnabled !== false && !!String(row.correctAnswer || '').trim() : false;
      const tMs =
        row.timeLimitMs != null ? Number(row.timeLimitMs) || 30000 : 30000;
      await set(qRef, {
        id,
        text: row.text,
        type: row.type,
        options: opts,
        showNames: row.showNames,
        order: orderBase,
        createdAt: Date.now(),
        correctAnswer:
          meta.mode === MODES.QUIZ && scoringEnabled ? row.correctAnswer : '',
        doublePoints: meta.mode === MODES.QUIZ && scoringEnabled ? row.doublePoints : false,
        timeLimitMs: tMs,
        scoringEnabled: meta.mode === MODES.QUIZ ? !!scoringEnabled : false,
        allowParticipantPdf: row.allowParticipantPdf,
        visibleModes: importedVisibleModes,
        quizId,
        formId,
        livePollId,
      });
      orderBase += 1;
    }
    if (firstImportedId && meta.mode === MODES.LIVE_POLL) {
      await handleSetActive(firstImportedId);
    }
  }

  async function handleDownloadSetPdf(setType, setId) {
    try {
      const { buildHostPdf } = await import('@shared/utils/pdfHost.js');
      const setQuestions = questionList.filter((q) => {
        if (setType === 'quiz') return (q.quizId ?? 'default') === setId;
        if (setType === 'form') return (q.formId ?? 'default') === setId;
        if (setType === 'livePoll') return (q.livePollId ?? 'default') === setId;
        return false;
      });

      const setResponses = {};
      setQuestions.forEach((q) => {
        setResponses[q.id] = responses[q.id] || {};
      });

      const doc = buildHostPdf({
        title: `Live with Poll — ${setType} set`,
        mode: meta.mode,
        roomCode,
        questions: setQuestions,
        responsesByQuestionId: setResponses,
        setType,
        setTitle: setType === 'quiz' ? quizzesMap[setId]?.title || setId :
                  setType === 'form' ? formsMap[setId]?.title || setId :
                  livePollsMap[setId]?.title || setId,
      });
      doc.save(`live-with-poll-${roomCode}-${setType}-${setId}.pdf`);
    } catch (e) {
      console.error('PDF generation failed:', e);
      alert('PDF generation failed. Please try again.');
    }
  }

  async function handlePushQuizQuestion() {
    const qid = quizPushId;
    if (!qid) return;
    await update(ref(db, roomMetaPath(roomCode)), {
      quizActiveQuestionId: qid,
      quizPhase: QUIZ_PHASE.QUESTION,
      quizOpenedAt: Date.now(),
      quizFullMode: false,
    });
  }

  async function handleGoLiveFullQuiz() {
    await update(ref(db, roomMetaPath(roomCode)), {
      quizActiveQuestionId: null,
      quizPhase: QUIZ_PHASE.QUESTION,
      quizOpenedAt: Date.now(),
      quizFullMode: true,
      activeQuizId: meta.activeQuizId || 'default',
    });
  }

  async function handleRevealQuiz() {
    await update(ref(db, roomMetaPath(roomCode)), {
      quizPhase: QUIZ_PHASE.REVEALED,
      quizFullMode: false,
    });
  }

  async function handleShowLeaderboard() {
    await update(ref(db, roomMetaPath(roomCode)), {
      quizPhase: QUIZ_PHASE.LEADERBOARD,
    });
  }

  async function handleQuizReset() {
    await update(ref(db, roomMetaPath(roomCode)), {
      quizPhase: QUIZ_PHASE.IDLE,
      quizOpenedAt: null,
      quizFullMode: false,
    });
  }

  async function copyParticipantLink() {
    try {
      await navigator.clipboard.writeText(participantRoomUrl(roomCode));
    } catch {
      /* ignore */
    }
  }

  async function openQrModal() {
    setQrOpen(true);
    setQrDataUrl('');
    try {
      const QR = await import('qrcode');
      const url = participantRoomUrl(roomCode);
      const dataUrl = await QR.default.toDataURL(url, { margin: 1, width: 280 });
      setQrDataUrl(dataUrl);
    } catch {
      setQrDataUrl('');
    }
  }

  if (authError === 'missing_token') {
    return (
      <GlassCard className="mx-auto max-w-lg text-center">
        <h1 className="text-lg font-semibold text-neutral-50">Admin access needed</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Open the host console from this device after creating a room, or create a
          new room from host home.
        </p>
        <Link
          to="/"
          className="mt-4 inline-block rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Host home
        </Link>
      </GlassCard>
    );
  }

  if (authError === 'invalid_token') {
    return (
      <GlassCard className="mx-auto max-w-lg text-center">
        <h1 className="text-lg font-semibold text-red-300">Unauthorized</h1>
        <p className="mt-2 text-sm text-neutral-400">
          This browser is not the host for this room PIN.
        </p>
        <Link to="/" className="mt-4 inline-block text-red-300">
          ← Host home
        </Link>
      </GlassCard>
    );
  }

  if (loadError || !meta) {
    return (
      <GlassCard className="mx-auto max-w-lg text-center">
        <p className="text-neutral-200">{loadError || 'Loading…'}</p>
        <Link to="/" className="mt-4 inline-block text-red-300">
          ← Host home
        </Link>
      </GlassCard>
    );
  }

  const musicTrackId = meta.musicTrackId || 'off';
  const musicVolume =
    meta.musicVolume != null ? Number(meta.musicVolume) : DEFAULT_MUSIC_VOLUME;
  const sliderVol = localMusicVol != null ? localMusicVol : musicVolume;
  const responsePrivacy = meta.responsePrivacy || RESPONSE_PRIVACY.PUBLIC;
  const commentPrivacy = meta.commentPrivacy || COMMENT_PRIVACY.PUBLIC;
  const quizzesMap = meta.quizzes || { default: { title: 'Quiz 1', order: 0 } };
  const formsMap = meta.forms || { default: { title: 'Form 1', order: 0 } };
  const livePollsMap = meta.livePolls || { default: { title: 'Live poll 1', order: 0 } };
  const activeSetLabel =
    meta.mode === MODES.QUIZ
      ? quizzesMap[activeQuizId]?.title || activeQuizId
      : meta.mode === MODES.FORM
        ? formsMap[activeFormId]?.title || activeFormId
        : meta.mode === MODES.LIVE_POLL
          ? livePollsMap[activeLivePollId]?.title || activeLivePollId
          : 'All sets';

  const chartQuestionPickList =
    filterListByActiveSet && questionListForPanel.length
      ? questionListForPanel
      : questionList;

  return (
    <div className="flex flex-col gap-6">
      <MusicPlayer musicTrackId={musicTrackId} musicVolume={sliderVol} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">Host dashboard</p>
          <h1 className="text-2xl font-bold text-neutral-50 red-glow-text">
            Room <span className="text-red-400 font-mono">{roomCode}</span>
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Participant URL:{' '}
            <a
              className="text-red-300 underline"
              href={participantRoomUrl(roomCode)}
              target="_blank"
              rel="noreferrer"
            >
              /room/{roomCode}
            </a>
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Live presence:{' '}
            <span className="font-semibold text-neutral-200">{presenceCount}</span> joined
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copyParticipantLink()}
            className="glass-input rounded-xl px-3 py-2 text-xs font-semibold text-neutral-100"
          >
            Copy link
          </button>
          <button
            type="button"
            onClick={() => void openQrModal()}
            className="glass-input rounded-xl px-3 py-2 text-xs font-semibold text-neutral-100"
          >
            QR code
          </button>
          <button
            type="button"
            onClick={handleWipeSession}
            className="futuristic-button rounded-xl border border-red-500/50 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-950/50 glow-pulse"
          >
            Wipe session
          </button>
          <a
            href={participantRoomUrl(roomCode)}
            target="_blank"
            rel="noreferrer"
            className="glass-input rounded-xl px-3 py-2 text-xs font-semibold text-neutral-100 no-underline"
          >
            Participant view
          </a>
        </div>
      </div>

      <GlassCard>
        <h2 className="text-sm font-semibold text-neutral-50">Music (room-wide)</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Host and participants hear the same track when files exist in{' '}
          <code className="rounded bg-black/40 px-1">public/music/</code>.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={musicTrackId}
            onChange={(e) => handleMusicTrack(e.target.value)}
            className="glass-input flex-1 rounded-xl px-3 py-2 text-sm text-neutral-100"
          >
            {MUSIC_TRACKS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <label className="flex flex-1 items-center gap-2 text-xs text-neutral-400">
            Volume
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={sliderVol}
              onChange={(e) => handleMusicVolumeInput(Number(e.target.value))}
              className="w-full accent-red-500"
            />
          </label>
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="text-sm font-semibold text-neutral-50">Session mode</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            [MODES.FORM, 'Form'],
            [MODES.LIVE_POLL, 'Live poll'],
            [MODES.QUIZ, 'Quiz'],
            [MODES.EMOJI, 'Emoji'],
            [MODES.COMMENT, 'Comment'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => handleModeChange(id)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold sm:text-sm ${
                meta.mode === id
                  ? 'bg-red-600 text-white shadow'
                  : 'glass-input text-neutral-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Form: no right/wrong. Quiz: correct answers, timer points, leaderboards.
          Emoji / Comment: lightweight interaction modes.
        </p>
      </GlassCard>

      {meta.mode === MODES.FORM ? (
        <GlassCard>
          <h2 className="text-sm font-semibold text-neutral-50">Form sets</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Group questions like quizzes. Participants in Form mode only see the active set.
          </p>
          <div className="mt-3 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="flex-1">
              <label className="text-xs text-neutral-500">Active form set</label>
              <select
                value={activeFormId}
                onChange={(e) => void handleSetActiveForm(e.target.value)}
                className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm text-neutral-100"
              >
                {Object.entries(formsMap).map(([id, f]) => (
                  <option key={id} value={id}>
                    {(f && f.title) || id}
                  </option>
                ))}
              </select>
            </div>
            <form className="flex flex-1 flex-wrap items-end gap-2" onSubmit={handleAddForm}>
              <input
                value={newFormTitle}
                onChange={(e) => setNewFormTitle(e.target.value)}
                placeholder="New form set title"
                className="glass-input min-w-[8rem] flex-1 rounded-xl px-3 py-2 text-sm text-neutral-100"
              />
              <button
                type="submit"
                className="rounded-xl bg-red-800 px-3 py-2 text-xs font-semibold text-white"
              >
                Add form set
              </button>
            </form>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-200">
                <input
                  type="checkbox"
                  checked={setPdfDownloads.form[activeFormId] || false}
                  onChange={(e) => setSetPdfDownloads(prev => ({
                    ...prev,
                    form: { ...prev.form, [activeFormId]: e.target.checked }
                  }))}
                />
                Allow PDF
              </label>
              {setPdfDownloads.form[activeFormId] && (
                <button
                  type="button"
                  onClick={() => handleDownloadSetPdf('form', activeFormId)}
                  className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white"
                >
                  Download PDF
                </button>
              )}
            </div>
          </div>
        </GlassCard>
      ) : null}

      {meta.mode === MODES.LIVE_POLL ? (
        <GlassCard>
          <h2 className="text-sm font-semibold text-neutral-50">Live poll sets</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Multiple rounds (e.g. Poll 1, Poll 2). Only the active set’s questions appear in the list
            below when filtered.
          </p>
          <div className="mt-3 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="flex-1">
              <label className="text-xs text-neutral-500">Active live poll set</label>
              <select
                value={activeLivePollId}
                onChange={(e) => void handleSetActiveLivePoll(e.target.value)}
                className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm text-neutral-100"
              >
                {Object.entries(livePollsMap).map(([id, p]) => (
                  <option key={id} value={id}>
                    {(p && p.title) || id}
                  </option>
                ))}
              </select>
            </div>
            <form className="flex flex-1 flex-wrap items-end gap-2" onSubmit={handleAddLivePollSet}>
              <input
                value={newLivePollTitle}
                onChange={(e) => setNewLivePollTitle(e.target.value)}
                placeholder="New live poll set title"
                className="glass-input min-w-[8rem] flex-1 rounded-xl px-3 py-2 text-sm text-neutral-100"
              />
              <button
                type="submit"
                className="rounded-xl bg-red-800 px-3 py-2 text-xs font-semibold text-white"
              >
                Add live poll set
              </button>
            </form>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-200">
                <input
                  type="checkbox"
                  checked={setPdfDownloads.livePoll[activeLivePollId] || false}
                  onChange={(e) => setSetPdfDownloads(prev => ({
                    ...prev,
                    livePoll: { ...prev.livePoll, [activeLivePollId]: e.target.checked }
                  }))}
                />
                Allow PDF
              </label>
              {setPdfDownloads.livePoll[activeLivePollId] && (
                <button
                  type="button"
                  onClick={() => handleDownloadSetPdf('livePoll', activeLivePollId)}
                  className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white"
                >
                  Download PDF
                </button>
              )}
            </div>
          </div>
        </GlassCard>
      ) : null}

      {meta.mode === MODES.QUIZ ? (
        <GlassCard>
          <h2 className="text-sm font-semibold text-neutral-50">Quiz controls</h2>
          <div className="mt-3 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="flex-1">
              <label className="text-xs text-neutral-500">Active quiz set</label>
              <select
                value={activeQuizId}
                onChange={(e) => void handleSetActiveQuiz(e.target.value)}
                className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm text-neutral-100"
              >
                {Object.entries(quizzesMap).map(([id, qz]) => (
                  <option key={id} value={id}>
                    {(qz && qz.title) || id}
                  </option>
                ))}
              </select>
            </div>
            <form className="flex flex-1 flex-wrap items-end gap-2" onSubmit={handleAddQuiz}>
              <input
                value={newQuizTitle}
                onChange={(e) => setNewQuizTitle(e.target.value)}
                placeholder="New quiz title"
                className="glass-input min-w-[8rem] flex-1 rounded-xl px-3 py-2 text-sm text-neutral-100"
              />
              <button
                type="submit"
                className="rounded-xl bg-red-800 px-3 py-2 text-xs font-semibold text-white"
              >
                Add quiz
              </button>
            </form>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-200">
                <input
                  type="checkbox"
                  checked={setPdfDownloads.quiz[activeQuizId] || false}
                  onChange={(e) => setSetPdfDownloads(prev => ({
                    ...prev,
                    quiz: { ...prev.quiz, [activeQuizId]: e.target.checked }
                  }))}
                />
                Allow PDF
              </label>
              {setPdfDownloads.quiz[activeQuizId] && (
                <button
                  type="button"
                  onClick={() => handleDownloadSetPdf('quiz', activeQuizId)}
                  className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white"
                >
                  Download PDF
                </button>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="flex-1">
              <label className="text-xs text-neutral-500">Question to push</label>
              <select
                value={quizPushId || ''}
                onChange={(e) => setQuizPushId(e.target.value)}
                className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm text-neutral-100"
              >
                {questionListForActiveSet.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.text.slice(0, 64)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handlePushQuizQuestion}
              className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Push question (start timer)
            </button>
            <button
              type="button"
              onClick={handleGoLiveFullQuiz}
              className="rounded-xl border border-amber-500/40 bg-amber-950/30 px-4 py-2 text-sm font-semibold text-amber-100"
            >
              Go live with full quiz
            </button>
            <button
              type="button"
              onClick={handleRevealQuiz}
              className="glass-input rounded-xl px-4 py-2 text-sm font-semibold text-neutral-100"
            >
              Reveal answer
            </button>
            <button
              type="button"
              onClick={handleShowLeaderboard}
              className="glass-input rounded-xl px-4 py-2 text-sm font-semibold text-neutral-100"
            >
              Show leaderboard
            </button>
            <button
              type="button"
              onClick={handleQuizReset}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm text-neutral-300"
            >
              Reset quiz phase
            </button>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            Phase: <span className="font-mono text-red-200">{meta.quizPhase || 'idle'}</span>
          </p>
        </GlassCard>
      ) : null}

      <GlassCard>
        <h2 className="text-sm font-semibold text-neutral-50">Privacy & results</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handlePrivacyChange(RESPONSE_PRIVACY.PUBLIC)}
            className={`rounded-xl px-3 py-2 text-xs font-semibold ${
              responsePrivacy === RESPONSE_PRIVACY.PUBLIC
                ? 'bg-red-600 text-white'
                : 'glass-input text-neutral-100'
            }`}
          >
            Public responses
          </button>
          <button
            type="button"
            onClick={() => handlePrivacyChange(RESPONSE_PRIVACY.PRIVATE)}
            className={`rounded-xl px-3 py-2 text-xs font-semibold ${
              responsePrivacy === RESPONSE_PRIVACY.PRIVATE
                ? 'bg-red-600 text-white'
                : 'glass-input text-neutral-100'
            }`}
          >
            Private (hide charts from participants)
          </button>
          <button
            type="button"
            onClick={() => handleCommentPrivacy(COMMENT_PRIVACY.PUBLIC)}
            className={`rounded-xl px-3 py-2 text-xs font-semibold ${
              commentPrivacy === COMMENT_PRIVACY.PUBLIC
                ? 'bg-red-600 text-white'
                : 'glass-input text-neutral-100'
            }`}
          >
            Comments: public
          </button>
          <button
            type="button"
            onClick={() => handleCommentPrivacy(COMMENT_PRIVACY.PRIVATE)}
            className={`rounded-xl px-3 py-2 text-xs font-semibold ${
              commentPrivacy === COMMENT_PRIVACY.PRIVATE
                ? 'bg-red-600 text-white'
                : 'glass-input text-neutral-100'
            }`}
          >
            Comments: private
          </button>
          <button
            type="button"
            onClick={() => handleCommentsHidden(!meta.commentsHidden)}
            className={`rounded-xl px-3 py-2 text-xs font-semibold ${
              meta.commentsHidden
                ? 'bg-amber-700 text-white'
                : 'glass-input text-neutral-100'
            }`}
          >
            {meta.commentsHidden ? 'Comments hidden (user screen)' : 'Hide comments on user screen'}
          </button>
          <button
            type="button"
            onClick={() =>
              handleSessionStatus(meta.sessionStatus === 'ended' ? 'live' : 'ended')
            }
            className="glass-input rounded-xl px-3 py-2 text-xs font-semibold text-neutral-100"
          >
            {meta.sessionStatus === 'ended' ? 'Reopen session' : 'End session'}
          </button>
          <button
            type="button"
            onClick={openResultsWindow}
            className="glass-input rounded-xl px-3 py-2 text-xs font-semibold text-neutral-100"
          >
            Results window
          </button>
          <button
            type="button"
            onClick={handleDownloadRoomJson}
            className="glass-input rounded-xl px-3 py-2 text-xs font-semibold text-neutral-100"
          >
            Download data (JSON)
          </button>
        </div>
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-neutral-50">Question management</h2>
            <button
              type="button"
              onClick={() => setAddPanelOpen((v) => !v)}
              className="glass-input rounded-lg px-3 py-1 text-xs font-semibold text-neutral-100"
            >
              {addPanelOpen ? 'Hide add question' : 'Show add question'}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="glass-input rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-100"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => csvInputRef.current?.click()}
              className="glass-input rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-100"
            >
              Import CSV
            </button>
            <button
              type="button"
              onClick={handleDownloadDemoCsv}
              className="glass-input rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-100"
            >
              Download demo CSV
            </button>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleImportCsv}
            />
          </div>

          {addPanelOpen ? (
            <form className="mt-4 space-y-3 border-t border-white/10 pt-4" onSubmit={handleAddQuestion}>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">
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
                  className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-neutral-100"
                >
                  <option value={QUESTION_TYPES.MCQ}>Multiple choice</option>
                  <option value={QUESTION_TYPES.YES_NO}>Yes / No</option>
                  <option value={QUESTION_TYPES.TRUE_FALSE}>True / False</option>
                  <option value={QUESTION_TYPES.RATING}>Rating (0–10)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Prompt
                </label>
                <textarea
                  value={newText}
                  onChange={(ev) => setNewText(ev.target.value)}
                  rows={2}
                  className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-neutral-100"
                  placeholder="What do you want to ask?"
                />
              </div>
              {newType === QUESTION_TYPES.MCQ ? (
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Options (one per line)
                  </label>
                  <textarea
                    value={mcqOptions}
                    onChange={(ev) => setMcqOptions(ev.target.value)}
                    rows={4}
                    className="glass-input mt-1 w-full rounded-xl px-3 py-2 font-mono text-sm text-neutral-100"
                  />
                </div>
              ) : null}

              {meta.mode === MODES.QUIZ ? (
                <div className="space-y-2 rounded-xl border border-red-500/30 bg-red-950/20 p-3">
                  <p className="text-xs font-semibold text-red-200">Quiz scoring</p>
                  <div>
                    <label className="text-xs text-neutral-400">Correct answer</label>
                    {newType === QUESTION_TYPES.MCQ ||
                    newType === QUESTION_TYPES.YES_NO ||
                    newType === QUESTION_TYPES.TRUE_FALSE ? (
                      <select
                        value={correctAnswer}
                        onChange={(e) => setCorrectAnswer(e.target.value)}
                        className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm text-neutral-100"
                      >
                        <option value="">Select…</option>
                        {(newType === QUESTION_TYPES.MCQ
                          ? mcqOptions.split('\n').map((s) => s.trim()).filter(Boolean)
                          : defaultOptionsForType(newType)
                        ).map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={correctAnswer}
                        onChange={(e) => setCorrectAnswer(e.target.value)}
                        className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm text-neutral-100"
                      >
                        <option value="">Select…</option>
                        {Array.from({ length: 11 }, (_, n) => (
                          <option key={n} value={String(n)}>
                            {n}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-xs text-neutral-200">
                    <input
                      type="checkbox"
                      checked={doublePoints}
                      onChange={(e) => setDoublePoints(e.target.checked)}
                    />
                    Double points
                  </label>
                  <div>
                    <label className="text-xs text-neutral-400">Timer window (seconds)</label>
                    <input
                      type="number"
                      min={5}
                      max={600}
                      step={1}
                      value={timeLimitSec}
                      onChange={(e) => setTimeLimitSec(Number(e.target.value))}
                      className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm text-neutral-100"
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Show this question in which modes?
                </label>
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                    <label className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-xs font-medium text-neutral-200 transition-all hover:bg-white/10">
                      <input
                        type="checkbox"
                        checked={visibleModesBox.form}
                        onChange={(e) =>
                          setVisibleModesBox((b) => ({ ...b, form: e.target.checked }))
                        }
                        className="w-4 h-4 rounded border-2 border-red-400 bg-transparent text-red-500 focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-transparent"
                      />
                      <span className="select-none">Form</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-xs font-medium text-neutral-200 transition-all hover:bg-white/10">
                      <input
                        type="checkbox"
                        checked={visibleModesBox.live_poll}
                        onChange={(e) =>
                          setVisibleModesBox((b) => ({ ...b, live_poll: e.target.checked }))
                        }
                        className="w-4 h-4 rounded border-2 border-red-400 bg-transparent text-red-500 focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-transparent"
                      />
                      <span className="select-none">Live Poll</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-xs font-medium text-neutral-200 transition-all hover:bg-white/10">
                      <input
                        type="checkbox"
                        checked={visibleModesBox.quiz}
                        onChange={(e) =>
                          setVisibleModesBox((b) => ({ ...b, quiz: e.target.checked }))
                        }
                        className="w-4 h-4 rounded border-2 border-red-400 bg-transparent text-red-500 focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-transparent"
                      />
                      <span className="select-none">Quiz</span>
                    </label>
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-neutral-500">
                  New questions are filed under the active set for this mode (quiz / form / live poll).
                  Use the lists above to switch sets.
                </p>
              </div>

              
              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-red-700 to-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md"
              >
                Add to session
              </button>
            </form>
          ) : null}

          <div className="mt-8 space-y-3">
            <div className="flex flex-col gap-3 border-b border-white/10 pb-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Your questions
                <span className="mt-0.5 block font-normal normal-case text-neutral-400">
                  {filterListByActiveSet ? (
                    <>
                      Showing: <span className="font-semibold text-neutral-200">{activeSetLabel}</span> (
                      {questionListForPanel.length} of {questionList.length})
                    </>
                  ) : (
                    <>Showing all ({questionList.length})</>
                  )}
                </span>
              </h3>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-red-400/30 bg-red-950/20 px-4 py-2 text-xs font-medium text-neutral-200 transition-all hover:bg-red-950/30 hover:border-red-400/50">
                <input
                  type="checkbox"
                  checked={filterListByActiveSet}
                  onChange={(e) => setFilterListByActiveSet(e.target.checked)}
                  className="w-4 h-4 rounded border-2 border-red-400 bg-transparent text-red-500 focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-transparent"
                />
                <span className="select-none">Only this set</span>
              </label>
            </div>
            {questionListForPanel.length === 0 ? (
              <p className="text-sm text-neutral-500">
                No questions here. Turn off the filter to see all, or switch the active quiz / form /
                live poll set and add questions.
              </p>
            ) : (
              questionListForPanel.map((q, idx) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  sessionMode={meta.mode}
                  isActive={meta.activeQuestionId === q.id}
                  isQuizFocus={meta.quizActiveQuestionId === q.id}
                  index={idx}
                  total={questionListForPanel.length}
                  onTogglePrivacy={handleTogglePrivacy}
                  onSelectActive={handleSetActive}
                  onDelete={handleDeleteQuestion}
                  onUpdate={handleUpdateQuestion}
                  onMoveUp={(id) => void handleReorderQuestion(id, -1)}
                  onMoveDown={(id) => void handleReorderQuestion(id, 1)}
                />
              ))
            )}
          </div>
        </GlassCard>

        <div className="flex flex-col gap-6">
          <GlassCard>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-neutral-50">Smart charts</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setChartView('per')}
                  className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                    chartView === 'per'
                      ? 'bg-red-600 text-white'
                      : 'glass-input text-neutral-200'
                  }`}
                >
                  Per question
                </button>
                <button
                  type="button"
                  onClick={() => setChartView('overall')}
                  className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                    chartView === 'overall'
                      ? 'bg-red-600 text-white'
                      : 'glass-input text-neutral-200'
                  }`}
                >
                  Overall
                </button>
              </div>
            </div>

            {meta.mode === MODES.QUIZ &&
            (meta.quizPhase === QUIZ_PHASE.LEADERBOARD ||
              meta.quizPhase === QUIZ_PHASE.REVEALED) ? (
              <LeaderboardPanel rows={leaderboardRows} />
            ) : null}

            {chartView === 'overall' ? (
              <OverallChart questions={questionList} responses={responses} />
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  {chartQuestionPickList.length ? (
                    <select
                      value={selectedQuestionId || ''}
                      onChange={(ev) => setSelectedQuestionId(ev.target.value)}
                      className="glass-input max-w-full rounded-lg px-2 py-1 text-xs text-neutral-100"
                    >
                      {chartQuestionPickList.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.text.slice(0, 60)}
                          {q.text.length > 60 ? '…' : ''}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
                <LiveResults question={selectedQuestion} responses={selectedResponses} />
              </>
            )}
          </GlassCard>

          <GlassCard>
            <h2 className="mb-3 text-sm font-semibold text-neutral-50">Live response feed</h2>
            <ul className="max-h-56 space-y-2 overflow-y-auto text-xs">
              {feedRows.length === 0 ? (
                <li className="text-neutral-500">Waiting for responses…</li>
              ) : (
                feedRows.map((r) => {
                  const q = questions[r.questionId];
                  const showNames = q?.showNames !== false;
                  return (
                    <li
                      key={r.id}
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5"
                    >
                      <span className="font-semibold text-neutral-100">
                        {showNames ? r.displayName || 'Participant' : 'Anonymous'}
                      </span>
                      <span className="text-neutral-500"> · </span>
                      <span className="text-neutral-400">{q?.text || 'Question'}</span>
                      <span className="text-neutral-500"> → </span>
                      <span className="text-red-300">{String(r.answer)}</span>
                      {r.pointsEarned != null ? (
                        <span className="text-neutral-500"> · {r.pointsEarned} pts</span>
                      ) : null}
                    </li>
                  );
                })
              )}
            </ul>
          </GlassCard>

          {meta.mode === MODES.COMMENT ||
          meta.mode === MODES.FORM ||
          meta.mode === MODES.LIVE_POLL ||
          meta.mode === MODES.QUIZ ? (
            <GlassCard>
              <CommentFeed roomCode={roomCode} comments={comments} isAdmin />
            </GlassCard>
          ) : null}
        </div>
      </div>

      {qrOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
          role="presentation"
          onClick={() => setQrOpen(false)}
        >
          <GlassCard
            className="relative max-w-sm !p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-neutral-50">Join this room</p>
            <p className="mt-1 break-all text-xs text-neutral-400">{participantRoomUrl(roomCode)}</p>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="" className="mx-auto mt-4 h-56 w-56 rounded-lg bg-white p-2" />
            ) : (
              <p className="mt-6 text-xs text-neutral-500">Generating…</p>
            )}
            <button
              type="button"
              onClick={() => setQrOpen(false)}
              className="mt-4 rounded-xl bg-neutral-800 px-4 py-2 text-xs font-semibold text-white"
            >
              Close
            </button>
          </GlassCard>
        </div>
      ) : null}
    </div>
  );
}
