import Papa from 'papaparse';
import { QUESTION_TYPES } from './helpers';

/** Canonical import/export headers (Type = question type: mcq, yesno, tf, rating). */
export const DEMO_CSV_HEADERS = [
  'Type',
  'Question',
  'Options',
  'Correct Answer',
  'Points',
  'Timer',
];

const LEGACY_HEADERS = [
  'text',
  'type',
  'options',
  'correctAnswer',
  'doublePoints',
  'allowParticipantPdf',
  'showNames',
];

function parseBool(v) {
  const s = String(v ?? '').toLowerCase().trim();
  return s === '1' || s === 'true' || s === 'yes';
}

function normalizeType(raw) {
  const s = String(raw ?? '').trim().toLowerCase();
  const map = {
    mcq: QUESTION_TYPES.MCQ,
    'multiple choice': QUESTION_TYPES.MCQ,
    yesno: QUESTION_TYPES.YES_NO,
    'yes/no': QUESTION_TYPES.YES_NO,
    yes_no: QUESTION_TYPES.YES_NO,
    tf: QUESTION_TYPES.TRUE_FALSE,
    'true/false': QUESTION_TYPES.TRUE_FALSE,
    truefalse: QUESTION_TYPES.TRUE_FALSE,
    rating: QUESTION_TYPES.RATING,
  };
  if (map[s]) return map[s];
  if (Object.values(QUESTION_TYPES).includes(s)) return s;
  return QUESTION_TYPES.MCQ;
}

function rowGet(row, ...keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
      return row[k];
    }
  }
  return '';
}

export function questionsToCsvRows(questionsList) {
  return questionsList.map((q) => ({
    Type: q.type ?? QUESTION_TYPES.MCQ,
    Question: q.text ?? '',
    Options: Array.isArray(q.options) ? q.options.join(' | ') : '',
    'Correct Answer': q.correctAnswer ?? '',
    Points: q.scoringEnabled === false ? '' : q.doublePoints ? 'double' : 'normal',
    Timer: q.timeLimitMs != null ? String(Math.round(Number(q.timeLimitMs) / 1000)) : '30',
  }));
}

export function exportQuestionsToCsv(questionsList) {
  const rows = questionsToCsvRows(questionsList);
  return Papa.unparse(rows, { columns: DEMO_CSV_HEADERS });
}

export function buildDemoCsv() {
  const demo = [
    {
      Type: 'mcq',
      Question: 'Demo: pick a color',
      Options: 'Red | Blue | Green',
      'Correct Answer': 'Blue',
      Points: 'normal',
      Timer: '30',
    },
    {
      Type: 'yesno',
      Question: 'Demo: is the sky blue?',
      Options: '',
      'Correct Answer': 'Yes',
      Points: '',
      Timer: '15',
    },
  ];
  return Papa.unparse(demo, { columns: DEMO_CSV_HEADERS });
}

/**
 * Returns { questions: [...] } or { error: string }
 * Supports new header row (Type, Question, …) and legacy Papa export.
 */
export function parseQuestionsCsv(text) {
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  if (parsed.errors?.length) {
    return { error: parsed.errors[0].message || 'CSV parse error' };
  }
  const first = parsed.meta?.fields?.[0] || Object.keys(parsed.data[0] || {})[0] || '';
  const isLegacy =
    String(first).toLowerCase() === 'text' ||
    (parsed.data[0] && 'text' in parsed.data[0] && !('Question' in parsed.data[0]));

  const out = [];
  if (isLegacy) {
    for (const row of parsed.data) {
      const textVal = String(row.text || '').trim();
      if (!textVal) continue;
      const type = String(row.type || QUESTION_TYPES.MCQ).trim();
      const optionsRaw = String(row.options || '').trim();
      const options = optionsRaw
        ? optionsRaw.split('|').map((s) => s.trim()).filter(Boolean)
        : [];
      out.push({
        text: textVal,
        type: Object.values(QUESTION_TYPES).includes(type) ? type : QUESTION_TYPES.MCQ,
        options,
        correctAnswer: String(row.correctAnswer ?? '').trim(),
        doublePoints: parseBool(row.doublePoints),
        allowParticipantPdf: parseBool(row.allowParticipantPdf),
        showNames: row.showNames === undefined ? true : parseBool(row.showNames),
        timeLimitMs: 30000,
        scoringEnabled: !!String(row.correctAnswer ?? '').trim(),
      });
    }
  } else {
    for (const row of parsed.data) {
      const textVal = String(rowGet(row, 'Question', 'question', 'text')).trim();
      if (!textVal) continue;
      const type = normalizeType(rowGet(row, 'Type', 'type'));
      const optionsRaw = String(rowGet(row, 'Options', 'options')).trim();
      const options = optionsRaw
        ? optionsRaw.split('|').map((s) => s.trim()).filter(Boolean)
        : [];
      const correctAnswer = String(
        rowGet(row, 'Correct Answer', 'correctAnswer', 'Correct')
      ).trim();
      const pointsRaw = String(rowGet(row, 'Points', 'points', 'doublePoints')).trim();
      const timerSec = Number(rowGet(row, 'Timer', 'timer', 'time')) || 30;
      const timeLimitMs = Math.min(600, Math.max(5, timerSec)) * 1000;
      const scoringEnabled = !!(correctAnswer || pointsRaw);
      const doublePoints =
        scoringEnabled &&
        (pointsRaw.toLowerCase().includes('double') || parseBool(pointsRaw));
      out.push({
        text: textVal,
        type,
        options,
        correctAnswer: scoringEnabled ? correctAnswer : '',
        doublePoints,
        allowParticipantPdf: false,
        showNames: true,
        timeLimitMs,
        scoringEnabled,
      });
    }
  }
  if (!out.length) return { error: 'No valid rows found in CSV.' };
  return { questions: out };
}
