import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { QUESTION_TYPES, chartPalette } from '../utils/helpers';

function aggregateCounts(question, responsesByParticipant) {
  const list = Object.values(responsesByParticipant || {});
  const counts = {};

  if (question.type === QUESTION_TYPES.RATING) {
    for (let i = 0; i <= 10; i += 1) counts[String(i)] = 0;
  } else {
    (question.options || []).forEach((o) => {
      counts[o] = 0;
    });
  }

  list.forEach((r) => {
    const key = String(r.answer);
    if (counts[key] === undefined) counts[key] = 0;
    counts[key] += 1;
  });

  if (question.type === QUESTION_TYPES.RATING) {
    return Object.keys(counts)
      .map((k) => ({ name: k, value: counts[k] }))
      .sort((a, b) => Number(a.name) - Number(b.name));
  }

  return (question.options || []).map((opt) => ({
    name: opt,
    value: counts[opt] || 0,
  }));
}

export default function LiveResults({ question, responses }) {
  if (!question) {
    return (
      <p className="text-sm text-neutral-500">
        Select a question to see live charts.
      </p>
    );
  }

  const data = aggregateCounts(question, responses);
  const total = data.reduce((s, d) => s + d.value, 0);

  const usePie =
    question.type === QUESTION_TYPES.YES_NO ||
    question.type === QUESTION_TYPES.TRUE_FALSE;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Live results
          </p>
          <p className="text-sm font-medium text-neutral-100">
            {question.text}
          </p>
        </div>
        <p className="text-xs text-neutral-500">
          {total} response{total === 1 ? '' : 's'}
        </p>
      </div>

      <div className="h-64 w-full min-h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          {usePie ? (
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
                label={({ name, percent }) =>
                  `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
              >
                {data.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={chartPalette(index)}
                    stroke="rgba(15,23,42,0.25)"
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid rgba(148,163,184,0.35)',
                  background: 'rgba(15,23,42,0.92)',
                  color: '#f8fafc',
                }}
              />
              <Legend />
            </PieChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis
                dataKey="name"
                tick={{ fill: 'currentColor', fontSize: 11 }}
                interval={0}
                angle={question.type === QUESTION_TYPES.RATING ? 0 : -15}
                textAnchor={question.type === QUESTION_TYPES.RATING ? 'middle' : 'end'}
                height={question.type === QUESTION_TYPES.RATING ? 32 : 48}
              />
              <YAxis allowDecimals={false} tick={{ fill: 'currentColor', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid rgba(148,163,184,0.35)',
                  background: 'rgba(15,23,42,0.92)',
                  color: '#f8fafc',
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={chartPalette(index)} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
