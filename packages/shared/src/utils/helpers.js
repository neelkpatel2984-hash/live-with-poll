export const MODES = {
  FORM: 'form',
  LIVE_POLL: 'live_poll',
  QUIZ: 'quiz',
  EMOJI: 'emoji',
  COMMENT: 'comment',
};

export const RESPONSE_PRIVACY = {
  PUBLIC: 'public',
  PRIVATE: 'private',
};

export const COMMENT_PRIVACY = {
  PUBLIC: 'public',
  PRIVATE: 'private',
};

/** Which session modes a question is intended for (strict mode separation). */
export const QUESTION_VISIBILITY = {
  POLL: 'poll',
  QUIZ: 'quiz',
  BOTH: 'both',
};

export const QUIZ_PHASE = {
  IDLE: 'idle',
  QUESTION: 'question',
  REVEALED: 'revealed',
  LEADERBOARD: 'leaderboard',
};

export const QUESTION_TYPES = {
  MCQ: 'mcq',
  YES_NO: 'yesno',
  TRUE_FALSE: 'tf',
  RATING: 'rating',
};

export function generateRoomCode() {
  return String(Math.floor(10000 + Math.random() * 90000));
}

export function generateId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 11)}_${Date.now().toString(36)}`;
}

export function generateAdminToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const PARTICIPANT_KEY = 'livepoll_participant_id';

export function getOrCreateParticipantId() {
  try {
    let id = localStorage.getItem(PARTICIPANT_KEY);
    if (!id) {
      id = generateId('p');
      localStorage.setItem(PARTICIPANT_KEY, id);
    }
    return id;
  } catch {
    return generateId('p');
  }
}

export function adminStorageKey(roomCode) {
  return `livepoll_admin_${roomCode}`;
}

/** @returns {{ token: string, bundleKey: string | null } | null} */
export function readHostCredential(roomCode) {
  if (typeof window === 'undefined' || !roomCode) return null;
  try {
    const raw = localStorage.getItem(adminStorageKey(roomCode));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && typeof parsed.token === 'string') {
        return {
          token: parsed.token,
          bundleKey: typeof parsed.bundleKey === 'string' ? parsed.bundleKey : null,
        };
      }
    } catch {
      /* legacy plain string token */
    }
    return { token: raw, bundleKey: null };
  } catch {
    return null;
  }
}

export function writeHostCredential(roomCode, token, bundleKey) {
  if (typeof window === 'undefined' || !roomCode) return;
  try {
    localStorage.setItem(
      adminStorageKey(roomCode),
      JSON.stringify({ token, bundleKey: bundleKey || null })
    );
  } catch {
    /* ignore */
  }
}

const HOST_ROOMS_KEY = 'livepoll_host_rooms';

export function trackHostRoom(roomCode) {
  if (typeof window === 'undefined' || !roomCode) return;
  try {
    const raw = localStorage.getItem(HOST_ROOMS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const arr = Array.isArray(list) ? list : [];
    if (!arr.includes(roomCode)) {
      arr.unshift(roomCode);
      localStorage.setItem(HOST_ROOMS_KEY, JSON.stringify(arr.slice(0, 200)));
    }
  } catch {
    /* ignore */
  }
}

export function readHostRoomList() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HOST_ROOMS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function removeHostRoomFromList(roomCode) {
  if (typeof window === 'undefined' || !roomCode) return;
  try {
    const arr = readHostRoomList().filter((c) => c !== roomCode);
    localStorage.setItem(HOST_ROOMS_KEY, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

export function defaultQuestionVisibilityForMode(mode) {
  if (mode === MODES.QUIZ) return QUESTION_VISIBILITY.QUIZ;
  if (mode === MODES.LIVE_POLL) return QUESTION_VISIBILITY.POLL;
  return QUESTION_VISIBILITY.BOTH;
}

/** Modes a question may appear in (multi-select). Legacy `visibility` is mapped here. */
export function getQuestionVisibleModes(question) {
  if (Array.isArray(question?.visibleModes) && question.visibleModes.length) {
    const allowed = new Set([MODES.FORM, MODES.LIVE_POLL, MODES.QUIZ]);
    return question.visibleModes.filter((m) => allowed.has(m));
  }
  const v = question?.visibility;
  if (v === QUESTION_VISIBILITY.POLL) return [MODES.LIVE_POLL];
  if (v === QUESTION_VISIBILITY.QUIZ) return [MODES.QUIZ];
  if (v === QUESTION_VISIBILITY.BOTH) return [MODES.LIVE_POLL, MODES.QUIZ];
  return [MODES.FORM, MODES.LIVE_POLL, MODES.QUIZ];
}

/** Default checkboxes when adding a question while session is in `mode`. */
export function defaultVisibleModesCheckboxes(mode) {
  if (mode === MODES.FORM) return { form: true, live_poll: false, quiz: false };
  if (mode === MODES.LIVE_POLL) return { form: false, live_poll: true, quiz: false };
  if (mode === MODES.QUIZ) return { form: false, live_poll: false, quiz: true };
  return { form: true, live_poll: true, quiz: true };
}

export function visibleModesFromCheckboxes(box) {
  const out = [];
  if (box.form) out.push(MODES.FORM);
  if (box.live_poll) out.push(MODES.LIVE_POLL);
  if (box.quiz) out.push(MODES.QUIZ);
  return out.length ? out : [MODES.FORM, MODES.LIVE_POLL, MODES.QUIZ];
}

/** Participant UI: whether this question should appear in the current session mode. */
export function questionAllowedInMode(question, mode) {
  return getQuestionVisibleModes(question).includes(mode);
}

export function questionBelongsToQuiz(question, activeQuizId) {
  const qid = question?.quizId ?? 'default';
  const active = activeQuizId ?? 'default';
  return qid === active;
}

export function questionBelongsToForm(question, activeFormId) {
  const fid = question?.formId ?? 'default';
  const active = activeFormId ?? 'default';
  return fid === active;
}

export function questionBelongsToLivePollSet(question, activeLivePollId) {
  const pid = question?.livePollId ?? 'default';
  const active = activeLivePollId ?? 'default';
  return pid === active;
}

export function participantNameKey(roomCode) {
  return `livepoll_name_${roomCode}`;
}

export function defaultOptionsForType(type) {
  switch (type) {
    case QUESTION_TYPES.MCQ:
      return ['Option A', 'Option B', 'Option C', 'Option D'];
    case QUESTION_TYPES.YES_NO:
      return ['Yes', 'No'];
    case QUESTION_TYPES.TRUE_FALSE:
      return ['True', 'False'];
    case QUESTION_TYPES.RATING:
      return Array.from({ length: 11 }, (_, i) => String(i));
    default:
      return [];
  }
}

export function normalizeAnswerValue(type, value) {
  if (type === QUESTION_TYPES.RATING) return String(Number(value));
  return String(value);
}

export function answersMatch(type, a, b) {
  return normalizeAnswerValue(type, a) === normalizeAnswerValue(type, b);
}

/** Higher score for faster correct answers during `quizPhase === question`. */
export function computeQuizPoints({
  correct,
  doublePoints,
  answeredAt,
  openedAt,
  timeLimitMs = 30000,
}) {
  if (!correct || !openedAt) return 0;
  const elapsed = Math.max(0, answeredAt - openedAt);
  const windowMs = Math.max(5000, Number(timeLimitMs) || 30000);
  const ratio = Math.min(1, elapsed / windowMs);
  let base = Math.round(50 + (1000 - 50) * (1 - ratio * 0.95));
  if (doublePoints) base *= 2;
  return Math.max(0, base);
}

export function chartPalette(index) {
  const colors = [
    '#f87171',
    '#fb923c',
    '#fbbf24',
    '#34d399',
    '#22d3ee',
    '#a78bfa',
    '#f472b6',
    '#94a3b8',
  ];
  return colors[index % colors.length];
}

export function aggregateLeaderboardFromResponses(responsesMap, questionsMap) {
  const totals = {};
  Object.entries(responsesMap || {}).forEach(([qid, byUser]) => {
    const q = questionsMap?.[qid];
    if (!q) return;
    Object.entries(byUser || {}).forEach(([pid, row]) => {
      if (!totals[pid]) {
        totals[pid] = {
          participantId: pid,
          publicName: '',
          legacyName: '',
          points: 0,
          correctCount: 0,
        };
      }
      const pub = String(row.publicName ?? '').trim();
      const legacy = String(row.displayName ?? '').trim();
      if (pub) totals[pid].publicName = pub;
      else if (legacy && !totals[pid].publicName) {
        totals[pid].legacyName = totals[pid].legacyName || legacy;
      }
      totals[pid].points += Number(row.pointsEarned || 0);
      if (row.correct) totals[pid].correctCount += 1;
    });
  });
  return Object.values(totals)
    .map((row) => ({
      participantId: row.participantId,
      displayName: row.publicName || row.legacyName || 'Player',
      points: row.points,
      correctCount: row.correctCount,
    }))
    .sort((a, b) => b.points - a.points);
}

export function roomAllowsParticipantPdf(questionsMap) {
  return Object.values(questionsMap || {}).some((q) => q.allowParticipantPdf);
}
