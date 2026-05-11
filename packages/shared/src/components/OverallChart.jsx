import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { chartPalette } from '../utils/helpers';

/** One bar per question: total response count. */
export default function OverallChart({ questions, responses }) {
  const list = (questions || []).map((q, i) => {
    const byUser = responses?.[q.id] || {};
    const total = Object.keys(byUser).length;
    return {
      name:
        q.text.length > 28 ? `${q.text.slice(0, 28)}…` : q.text || `Q${i + 1}`,
      value: total,
    };
  });

  if (!list.length) {
    return (
      <p className="text-sm text-neutral-400">Add questions to see the overview.</p>
    );
  }

  return (
    <div className="h-64 w-full min-h-[240px] text-neutral-100">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={list} layout="vertical" margin={{ left: 8, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis type="number" allowDecimals={false} tick={{ fill: '#a3a3a3', fontSize: 10 }} />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fill: '#d4d4d4', fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: '1px solid rgba(248,113,113,0.35)',
              background: 'rgba(10,10,10,0.95)',
              color: '#fafafa',
            }}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
            {list.map((_, i) => (
              <Cell key={i} fill={chartPalette(i)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
