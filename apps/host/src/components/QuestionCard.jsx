import { QUESTION_TYPES, MODES } from '@shared/utils/helpers.js';

const TYPE_LABELS = {
  [QUESTION_TYPES.MCQ]: 'Multiple choice',
  [QUESTION_TYPES.YES_NO]: 'Yes / No',
  [QUESTION_TYPES.TRUE_FALSE]: 'True / False',
  [QUESTION_TYPES.RATING]: 'Rating (0–10)',
};

export default function QuestionCard({
  question,
  sessionMode,
  isActive,
  isQuizFocus,
  onTogglePrivacy,
  onSelectActive,
  onDelete,
}) {
  const opts = Array.isArray(question.options) ? question.options : [];
  const showGoLive = sessionMode === MODES.LIVE_POLL;
  const highlighted =
    (sessionMode === MODES.LIVE_POLL && isActive) ||
    (sessionMode === MODES.QUIZ && isQuizFocus);

  return (
    <div
      className={`rounded-xl border p-4 transition ${
        highlighted
          ? 'border-red-500/50 bg-red-950/30'
          : 'border-white/10 bg-white/5'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {TYPE_LABELS[question.type] ?? question.type}
          </p>
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
            </p>
          ) : null}
          {question.allowParticipantPdf ? (
            <p className="mt-1 text-[10px] uppercase tracking-wide text-amber-300/90">
              PDF download enabled for participants
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {showGoLive ? (
            <button
              type="button"
              onClick={() => onSelectActive?.(question.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? 'bg-red-600 text-white'
                  : 'glass-input text-neutral-100'
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
            onClick={() => onDelete?.(question.id)}
            className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-950/40"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
