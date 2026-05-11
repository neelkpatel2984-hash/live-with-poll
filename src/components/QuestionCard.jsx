import { QUESTION_TYPES, MODES } from '../utils/helpers';

const TYPE_LABELS = {
  [QUESTION_TYPES.MCQ]: 'Multiple choice',
  [QUESTION_TYPES.YES_NO]: 'Yes / No',
  [QUESTION_TYPES.TRUE_FALSE]: 'True / False',
  [QUESTION_TYPES.RATING]: 'Rating (0–10)',
};

export default function QuestionCard({
  question,
  mode,
  isActive,
  onTogglePrivacy,
  onSelectActive,
  onDelete,
}) {
  const opts = Array.isArray(question.options) ? question.options : [];

  return (
    <div
      className={`rounded-xl border p-4 transition ${
        isActive
          ? 'border-cyan-500/60 bg-cyan-500/10 dark:border-cyan-400/50 dark:bg-cyan-500/10'
          : 'border-white/15 bg-white/5 dark:border-slate-600/30 dark:bg-slate-900/30'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {TYPE_LABELS[question.type] ?? question.type}
          </p>
          <p className="mt-1 font-medium text-slate-900 dark:text-slate-50">
            {question.text}
          </p>
          {question.type === QUESTION_TYPES.MCQ ? (
            <ul className="mt-2 list-inside list-disc text-sm text-slate-600 dark:text-slate-400">
              {opts.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {mode === MODES.LIVE_POLL ? (
            <button
              type="button"
              onClick={() => onSelectActive?.(question.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? 'bg-cyan-600 text-white dark:bg-cyan-500'
                  : 'glass-input text-slate-800 dark:text-slate-100'
              }`}
            >
              {isActive ? 'Live' : 'Go live'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onTogglePrivacy?.(question.id, !question.showNames)}
            className="glass-input rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100"
          >
            {question.showNames ? 'Names: on' : 'Anonymous'}
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(question.id)}
            className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-500/10 dark:text-red-300"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
