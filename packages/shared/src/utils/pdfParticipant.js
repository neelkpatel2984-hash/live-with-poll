import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MODES, normalizeAnswerValue } from './helpers';

export function buildParticipantPdf({
  title,
  mode,
  displayName,
  roomCode,
  questions,
  responsesByQuestionId,
  leaderboardRank,
}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let y = 48;
  doc.setFontSize(18);
  doc.text(title, 40, y);
  y += 28;
  doc.setFontSize(11);
  doc.text(`Room: ${roomCode}`, 40, y);
  y += 16;
  doc.text(`Name: ${displayName}`, 40, y);
  y += 16;
  doc.text(`Mode: ${mode}`, 40, y);
  if (leaderboardRank != null) {
    y += 16;
    doc.text(`Leaderboard rank: #${leaderboardRank}`, 40, y);
  }
  y += 28;

  const rows = [];
  (questions || []).forEach((q) => {
    const r = responsesByQuestionId?.[q.id];
    const ans = r?.answer != null ? String(r.answer) : '—';
    const pts =
      r?.pointsEarned != null ? String(r.pointsEarned) : mode === MODES.QUIZ ? '0' : '—';
    const ok =
      mode === MODES.QUIZ && q.correctAnswer
        ? normalizeAnswerValue(q.type, r?.answer) ===
          normalizeAnswerValue(q.type, q.correctAnswer)
          ? 'Yes'
          : 'No'
        : '—';
    rows.push([q.text, ans, pts, ok]);
  });

  autoTable(doc, {
    startY: y,
    head: [['Question', 'Your answer', 'Points', 'Correct (quiz)']],
    body: rows,
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [30, 30, 30] },
  });

  return doc;
}
