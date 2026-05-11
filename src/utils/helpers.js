export const MODES = {
  LIVE_POLL: 'live_poll',
  FORM: 'form',
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

export function chartPalette(index) {
  const colors = [
    '#06b6d4',
    '#8b5cf6',
    '#10b981',
    '#f59e0b',
    '#ec4899',
    '#3b82f6',
    '#ef4444',
    '#84cc16',
  ];
  return colors[index % colors.length];
}
