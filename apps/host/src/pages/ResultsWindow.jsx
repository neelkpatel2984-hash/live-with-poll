import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ref, onValue, get } from 'firebase/database';
import {
  db,
  roomMetaPath,
  roomQuestionsPath,
  roomResponsesPath,
  roomPath,
  roomHostBundlePath,
} from '@shared/firebase/config.js';
import {
  readHostCredential,
  aggregateLeaderboardFromResponses,
  MODES,
} from '@shared/utils/helpers.js';
import GlassCard from '@shared/components/GlassCard.jsx';
import LiveResults from '@shared/components/LiveResults.jsx';
import OverallChart from '@shared/components/OverallChart.jsx';
import LeaderboardPanel from '@shared/components/LeaderboardPanel.jsx';
import BackButton from '@shared/components/BackButton.jsx';

function sortedQuestions(questionsMap) {
  const list = Object.values(questionsMap || {});
  list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return list;
}

export default function ResultsWindow() {
  const { roomCode } = useParams();
  const [meta, setMeta] = useState(null);
  const [questions, setQuestions] = useState({});
  const [responses, setResponses] = useState({});
  const [authError, setAuthError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);

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
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode || authError || !meta) return undefined;
    const qRef = ref(db, roomQuestionsPath(roomCode));
    return onValue(qRef, (snap) => setQuestions(snap.val() || {}));
  }, [roomCode, meta, authError]);

  useEffect(() => {
    if (!roomCode || authError || !meta) return undefined;
    const rRef = ref(db, roomResponsesPath(roomCode));
    return onValue(rRef, (snap) => setResponses(snap.val() || {}));
  }, [roomCode, meta, authError]);

  const questionList = useMemo(() => sortedQuestions(questions), [questions]);

  useEffect(() => {
    if (!questionList.length) {
      setSelectedQuestionId(null);
      return;
    }
    setSelectedQuestionId((prev) =>
      prev && questionList.some((q) => q.id === prev) ? prev : questionList[0].id
    );
  }, [questionList]);

  const selectedQuestion =
    questionList.find((q) => q.id === selectedQuestionId) || null;
  const selectedResponses = selectedQuestion
    ? responses[selectedQuestion.id] || {}
    : {};

  const leaderboardRows = useMemo(
    () => aggregateLeaderboardFromResponses(responses, questions),
    [responses, questions]
  );

  async function handleDownloadJson() {
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

  if (authError) {
    return (
      <GlassCard className="mx-auto max-w-lg text-center">
        <p className="text-neutral-200">Open this window from the host dashboard.</p>
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
      </GlassCard>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">Results window</p>
          <h1 className="text-2xl font-bold text-neutral-50">
            Room <span className="text-red-400">{roomCode}</span>
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <BackButton to={`/admin/${roomCode}`}>Back to dashboard</BackButton>
          <button
            type="button"
            onClick={handleDownloadJson}
            className="glass-input rounded-xl px-3 py-2 text-xs font-semibold text-neutral-100"
          >
            Download JSON
          </button>
        </div>
      </div>

      <GlassCard>
        <h2 className="text-sm font-semibold text-neutral-50">Overview</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Total responses per question (aggregate).
        </p>
        <div className="mt-4">
          <OverallChart questions={questionList} responses={responses} />
        </div>
      </GlassCard>

      {meta.mode === MODES.QUIZ ? (
        <GlassCard>
          <LeaderboardPanel rows={leaderboardRows} title="Quiz leaderboard" />
        </GlassCard>
      ) : null}

      <GlassCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-neutral-50">Per-question chart</h2>
          {questionList.length ? (
            <select
              value={selectedQuestionId || ''}
              onChange={(ev) => setSelectedQuestionId(ev.target.value)}
              className="glass-input max-w-full rounded-lg px-2 py-1 text-xs text-neutral-100"
            >
              {questionList.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.text.slice(0, 56)}
                  {q.text.length > 56 ? '…' : ''}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <LiveResults question={selectedQuestion} responses={selectedResponses} />
      </GlassCard>
    </div>
  );
}
