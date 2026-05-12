import { useState } from 'react';
import { QUESTION_TYPES, MODES, getQuestionVisibleModes } from '@shared/utils/helpers.js';

const TYPE_LABELS = {
  [QUESTION_TYPES.MCQ]: 'Multiple choice',
  [QUESTION_TYPES.YES_NO]: 'Yes / No',
  [QUESTION_TYPES.TRUE_FALSE]: 'True / False',
  [QUESTION_TYPES.RATING]: 'Rating (0–10)',
};

const MODE_SHORT = {
  [MODES.FORM]: 'Form',
  [MODES.LIVE_POLL]: 'Poll',
  [MODES.QUIZ]: 'Quiz',
};

function visibleModesLabel(question) {
  const modes = getQuestionVisibleModes(question);
  return modes.map((m) => MODE_SHORT[m] || m).join(' · ');
}

export default function QuestionCard({
  question,
  sessionMode,
  isActive,
  isQuizFocus,
  index,
  total,
  onTogglePrivacy,
  onSelectActive,
  onDelete,
  onUpdate,
  onMoveUp,
  onMoveDown,
}) {
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(question.text || '');
  const [editOptions, setEditOptions] = useState(
    Array.isArray(question.options) ? question.options.join('\n') : ''
  );
  const [editCorrect, setEditCorrect] = useState(String(question.correctAnswer ?? ''));
  const [editScoring, setEditScoring] = useState(question.scoringEnabled !== false);

  const opts = Array.isArray(question.options) ? question.options : [];
  const showGoLive = sessionMode === MODES.LIVE_POLL;
  const highlighted =
    (sessionMode === MODES.LIVE_POLL && isActive) ||
    (sessionMode === MODES.QUIZ && isQuizFocus);

  const setLine = `Quiz: ${question.quizId ?? 'default'} · Form: ${question.formId ?? 'default'} · Live poll: ${question.livePollId ?? 'default'}`;

  function beginEdit() {
    setEditText(question.text || '');
    setEditOptions(Array.isArray(question.options) ? question.options.join('\n') : '');
    setEditCorrect(String(question.correctAnswer ?? ''));
    setEditScoring(question.scoringEnabled !== false);
    setEditing(true);
    setDeleteArmed(false);
  }

  async function saveEdit(e) {
    e.preventDefault();
    const text = editText.trim();
    if (!text) return;
    const nextOpts =
      question.type === QUESTION_TYPES.MCQ
        ? editOptions
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
        : question.options;
    if (question.type === QUESTION_TYPES.MCQ && nextOpts.length < 2) return;
    if (sessionMode === MODES.QUIZ) {
      const ca = String(editCorrect ?? '').trim();
      const scoringEnabled = editScoring && !!ca;
      await onUpdate?.(question.id, {
        text,
        options: nextOpts,
        correctAnswer: scoringEnabled ? ca : '',
        scoringEnabled,
        doublePoints: scoringEnabled ? !!question.doublePoints : false,
      });
    } else {
      await onUpdate?.(question.id, { text, options: nextOpts });
    }
    setEditing(false);
  }

  function handleDeleteClick() {
    if (!deleteArmed) {
      setDeleteArmed(true);
      return;
    }
    setDeleteArmed(false);
    onDelete?.(question.id);
  }

  return (
    <div
      className={`rounded-xl border p-4 transition ${
        highlighted
          ? 'border-red-500/50 bg-red-950/30'
          : 'border-white/10 bg-white/5'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {TYPE_LABELS[question.type] ?? question.type}
            <span className="ml-2 text-neutral-600">
              · Modes: {visibleModesLabel(question)}
            </span>
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-neutral-500">{setLine}</p>
          {editing ? (
            <form className="mt-2 space-y-2" onSubmit={saveEdit}>
              <textarea
                value={editText}
                onChange={(ev) => setEditText(ev.target.value)}
                rows={2}
                className="glass-input w-full rounded-lg px-2 py-1.5 text-sm text-neutral-100"
              />
              {question.type === QUESTION_TYPES.MCQ ? (
                <textarea
                  value={editOptions}
                  onChange={(ev) => setEditOptions(ev.target.value)}
                  rows={3}
                  className="glass-input w-full rounded-lg px-2 py-1.5 font-mono text-xs text-neutral-100"
                  placeholder="One option per line"
                />
              ) : null}
              {sessionMode === MODES.QUIZ ? (
                <div className="space-y-1 rounded-lg border border-white/10 p-2">
                  <label className="flex items-center gap-2 text-xs text-neutral-300">
                    <input
                      type="checkbox"
                      checked={editScoring}
                      onChange={(ev) => setEditScoring(ev.target.checked)}
                    />
                    Point scoring (requires correct answer)
                  </label>
                  {editScoring ? (
                    <input
                      value={editCorrect}
                      onChange={(ev) => setEditCorrect(ev.target.value)}
                      className="glass-input w-full rounded-lg px-2 py-1 text-xs text-neutral-100"
                      placeholder="Correct answer"
                    />
                  ) : null}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="glass-input rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <p className="mt-1 font-medium text-neutral-50">{question.text}</p>
              {question.type === QUESTION_TYPES.MCQ ? (
                <ul className="mt-2 list-inside list-disc text-sm text-neutral-400">
                  {opts.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              ) : null}
              {sessionMode === MODES.QUIZ && question.correctAnswer ? (
                <p className="mt-2 text-xs text-red-300/90">
                  Correct: <span className="font-semibold">{question.correctAnswer}</span>
                  {question.doublePoints ? ' · Double points' : ''}
                  {question.scoringEnabled === false ? ' · Scoring off' : ''}
                </p>
              ) : null}
              {question.allowParticipantPdf ? (
                <p className="mt-1 text-[10px] uppercase tracking-wide text-amber-300/90">
                  PDF download enabled for participants
                </p>
              ) : null}
            </>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={index <= 0}
              onClick={() => onMoveUp?.(question.id)}
              className="glass-input rounded-lg px-2 py-1 text-xs font-semibold text-neutral-200 disabled:opacity-30"
              title="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={index >= total - 1}
              onClick={() => onMoveDown?.(question.id)}
              className="glass-input rounded-lg px-2 py-1 text-xs font-semibold text-neutral-200 disabled:opacity-30"
              title="Move down"
            >
              ↓
            </button>
            {showGoLive ? (
              <button
                type="button"
                onClick={() => onSelectActive?.(question.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isActive ? 'bg-red-600 text-white' : 'glass-input text-neutral-100'
                }`}
              >
                {isActive ? 'Live' : 'Go live'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onTogglePrivacy?.(question.id, !question.showNames)}
              className="glass-input rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-100"
            >
              {question.showNames ? 'Names: on' : 'Anonymous'}
            </button>
            <button
              type="button"
              onClick={beginEdit}
              className="glass-input rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-100"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleDeleteClick}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                deleteArmed
                  ? 'border-red-400 bg-red-900/50 text-red-100'
                  : 'border-red-500/40 text-red-300 hover:bg-red-950/40'
              }`}
            >
              {deleteArmed ? 'Confirm delete?' : 'Delete'}
            </button>
          </div>
          {deleteArmed ? (
            <button
              type="button"
              onClick={() => setDeleteArmed(false)}
              className="text-[10px] text-neutral-500 underline"
            >
              Cancel delete
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
