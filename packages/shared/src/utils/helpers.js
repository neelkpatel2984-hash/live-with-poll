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
          displayName: row.displayName || 'Player',
          points: 0,
          correctCount: 0,
        };
      }
      if (row.displayName) totals[pid].displayName = row.displayName;
      totals[pid].points += Number(row.pointsEarned || 0);
      if (row.correct) totals[pid].correctCount += 1;
    });
  });
  return Object.values(totals).sort((a, b) => b.points - a.points);
}

export function roomAllowsParticipantPdf(questionsMap) {
  return Object.values(questionsMap || {}).some((q) => q.allowParticipantPdf);
}
