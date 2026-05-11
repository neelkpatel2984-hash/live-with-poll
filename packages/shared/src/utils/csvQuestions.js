import Papa from 'papaparse';
import { QUESTION_TYPES } from './helpers';

const CSV_HEADERS = [
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

export function questionsToCsvRows(questionsList) {
  return questionsList.map((q) => ({
    text: q.text ?? '',
    type: q.type ?? QUESTION_TYPES.MCQ,
    options: Array.isArray(q.options) ? q.options.join(' | ') : '',
    correctAnswer: q.correctAnswer ?? '',
    doublePoints: q.doublePoints ? 'true' : 'false',
    allowParticipantPdf: q.allowParticipantPdf ? 'true' : 'false',
    showNames: q.showNames !== false ? 'true' : 'false',
  }));
}

export function exportQuestionsToCsv(questionsList) {
  const rows = questionsToCsvRows(questionsList);
  return Papa.unparse(rows, { columns: CSV_HEADERS });
}

/**
 * Returns { questions: [...] } or { error: string }
 */
export function parseQuestionsCsv(text) {
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  if (parsed.errors?.length) {
    return { error: parsed.errors[0].message || 'CSV parse error' };
  }
  const out = [];
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
    });
  }
  if (!out.length) return { error: 'No valid rows found in CSV.' };
  return { questions: out };
}
