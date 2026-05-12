import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MODES, normalizeAnswerValue } from './helpers';

export function buildHostPdf({
  title,
  mode,
  roomCode,
  questions,
  responsesByQuestionId,
  setType,
  setTitle,
}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let y = 48;
  
  // Title and metadata
  doc.setFontSize(18);
  doc.text(title, 40, y);
  y += 28;
  doc.setFontSize(11);
  doc.text(`Room: ${roomCode}`, 40, y);
  y += 16;
  doc.text(`Mode: ${mode}`, 40, y);
  y += 16;
  doc.text(`Set Type: ${setType}`, 40, y);
  y += 16;
  doc.text(`Set Name: ${setTitle}`, 40, y);
  y += 28;

  // Questions and responses summary
  const rows = [];
  (questions || []).forEach((q) => {
    const responses = responsesByQuestionId?.[q.id] || {};
    const responseCount = Object.keys(responses).length;
    const correctAnswer = q.correctAnswer || '—';
    
    // Calculate response distribution
    const answerCounts = {};
    Object.values(responses).forEach((r) => {
      const key = String(r.answer || 'No answer');
      answerCounts[key] = (answerCounts[key] || 0) + 1;
    });
    
    const mostCommon = Object.entries(answerCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || '—';
    
    rows.push([
      q.text?.slice(0, 60) + (q.text?.length > 60 ? '…' : ''),
      responseCount.toString(),
      mostCommon,
      correctAnswer,
    ]);
  });

  autoTable(doc, {
    startY: y,
    head: [['Question', 'Total Responses', 'Most Common', 'Correct Answer']],
    body: rows,
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [30, 30, 30] },
    columnStyles: {
      0: { cellWidth: 200 },
      1: { cellWidth: 80 },
      2: { cellWidth: 80 },
      3: { cellWidth: 80 },
    },
  });

  return doc;
}
